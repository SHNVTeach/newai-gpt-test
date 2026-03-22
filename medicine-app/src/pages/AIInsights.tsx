import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Brain, Loader2, AlertCircle, Key, ChevronDown, ChevronUp } from 'lucide-react';
import Anthropic from '@anthropic-ai/sdk';
import { db } from '../db/database';
import { useProfile } from '../context/ProfileContext';

interface InsightSection {
  title: string;
  content: string;
}

function parseInsights(text: string): InsightSection[] {
  const sections: InsightSection[] = [];
  const lines = text.split('\n');
  let currentTitle = '';
  let currentContent: string[] = [];

  for (const line of lines) {
    const headerMatch = line.match(/^#{1,3}\s+(.+)/);
    if (headerMatch) {
      if (currentTitle) {
        sections.push({ title: currentTitle, content: currentContent.join('\n').trim() });
      }
      currentTitle = headerMatch[1];
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }
  if (currentTitle) {
    sections.push({ title: currentTitle, content: currentContent.join('\n').trim() });
  }
  if (sections.length === 0 && text.trim()) {
    sections.push({ title: 'Analysis', content: text.trim() });
  }
  return sections;
}

export function AIInsights() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { activeProfileId } = useProfile();
  const conditionId = searchParams.get('conditionId') ? Number(searchParams.get('conditionId')) : undefined;

  const [apiKey, setApiKey] = useState(() => localStorage.getItem('anthropic_api_key') ?? '');
  const [showKeyInput, setShowKeyInput] = useState(!localStorage.getItem('anthropic_api_key'));
  const [loading, setLoading] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [sections, setSections] = useState<InsightSection[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<number | null>(0);
  const [conditionName, setConditionName] = useState('');

  useEffect(() => {
    if (conditionId) {
      db.conditions.get(conditionId).then(c => { if (c) setConditionName(c.name); });
    }
  }, [conditionId]);

  async function buildPrompt(): Promise<string> {
    if (!activeProfileId) return '';

    const conditions = conditionId
      ? [await db.conditions.get(conditionId)].filter(Boolean)
      : await db.conditions.where('profileId').equals(activeProfileId).toArray();

    const medications = await db.medications.where('profileId').equals(activeProfileId).toArray();
    const doseLogs = await db.doseLogs.where('medicationId').anyOf(medications.map(m => m.id!)).toArray();

    let dataStr = '# Health Data Summary\n\n';

    for (const cond of conditions) {
      if (!cond) continue;
      dataStr += `## Condition: ${cond.name}\n`;
      dataStr += `Status: ${cond.status}\n`;
      dataStr += `Started: ${cond.startDate}\n`;
      if (cond.description) dataStr += `Notes: ${cond.description}\n`;
      dataStr += '\n';

      const symptoms = await db.symptoms.where('conditionId').equals(cond.id!).toArray();
      const linkedMeds = await db.conditionMedications.where('conditionId').equals(cond.id!).toArray();
      const linkedMedDetails = await db.medications.bulkGet(linkedMeds.map(l => l.medicationId));

      if (linkedMedDetails.filter(Boolean).length > 0) {
        dataStr += `### Linked Medications\n`;
        for (const med of linkedMedDetails.filter(Boolean)) {
          dataStr += `- ${med!.name} ${med!.dosage}\n`;
          const logs = doseLogs.filter(l => l.medicationId === med!.id);
          const taken = logs.filter(l => l.status === 'taken').length;
          dataStr += `  Taken ${taken} times\n`;
        }
        dataStr += '\n';
      }

      if (symptoms.length > 0) {
        dataStr += `### Symptom Logs\n`;
        for (const symptom of symptoms) {
          const logs = await db.symptomLogs
            .where('symptomId').equals(symptom.id!)
            .sortBy('date');

          if (logs.length === 0) continue;
          dataStr += `\n**${symptom.name}** (${logs.length} entries)\n`;
          dataStr += `Date | Severity (1-10)\n`;
          for (const log of logs) {
            dataStr += `${log.date} | ${log.severity}${log.notes ? ` (${log.notes})` : ''}\n`;
          }
        }
      }
      dataStr += '\n---\n\n';
    }

    return dataStr;
  }

  async function runAnalysis() {
    const key = apiKey.trim();
    if (!key) {
      setShowKeyInput(true);
      setError('Please enter your Anthropic API key.');
      return;
    }

    localStorage.setItem('anthropic_api_key', key);
    setError(null);
    setStreamText('');
    setSections([]);
    setLoading(true);

    try {
      const healthData = await buildPrompt();
      if (!healthData.trim()) {
        setError('No health data found. Add conditions and log symptoms first.');
        setLoading(false);
        return;
      }

      const client = new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true });

      const systemPrompt = `You are a helpful personal health assistant analyzing symptom tracking data.
Provide clear, compassionate, data-driven insights. Always remind the user you are not a medical professional.
Format your response with clear section headers using ## for each section.
Be specific about dates, trends, and patterns you observe in the data.`;

      const userPrompt = `Please analyze my health data and provide insights. Focus on:
1. **Recovery Trends** — Are symptoms improving, stable, or worsening over time?
2. **Medication Impact** — Does symptom severity correlate with when medications were taken?
3. **Pattern Recognition** — Any notable patterns (time of day, frequency, severity spikes)?
4. **Recovery Estimate** — Based on the trend, how is recovery progressing?
5. **Recommendations** — Practical suggestions (not medical advice) for tracking or lifestyle

Here is my health data:

${healthData}`;

      const stream = client.messages.stream({
        model: 'claude-opus-4-6',
        max_tokens: 2048,
        thinking: { type: 'adaptive' },
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });

      let fullText = '';
      for await (const event of stream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          fullText += event.delta.text;
          setStreamText(fullText);
        }
      }

      setSections(parseInsights(fullText));
      setStreamText('');
    } catch (err) {
      if (err instanceof Anthropic.AuthenticationError) {
        setError('Invalid API key. Please check your Anthropic API key and try again.');
        setShowKeyInput(true);
      } else if (err instanceof Anthropic.RateLimitError) {
        setError('Rate limit reached. Please wait a moment and try again.');
      } else if (err instanceof Error) {
        setError(`Error: ${err.message}`);
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 space-y-4 pb-24">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1 text-gray-500">
          <ArrowLeft size={22} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-gray-800">AI Insights</h2>
          {conditionName && <p className="text-xs text-gray-400">{conditionName}</p>}
        </div>
      </div>

      {/* API Key Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key size={16} className="text-gray-500" />
            <span className="text-sm font-semibold text-gray-700">Anthropic API Key</span>
          </div>
          <button
            className="text-xs text-indigo-600"
            onClick={() => setShowKeyInput(v => !v)}
          >
            {showKeyInput ? 'Hide' : 'Change'}
          </button>
        </div>

        {showKeyInput ? (
          <div className="space-y-2">
            <input
              type="password"
              className="input text-sm"
              placeholder="sk-ant-..."
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
            />
            <p className="text-xs text-gray-400">
              Your key is stored locally on this device only. Get one at{' '}
              <span className="text-indigo-600">console.anthropic.com</span>
            </p>
          </div>
        ) : (
          <p className="text-xs text-gray-400">
            {apiKey ? `Key saved (${apiKey.slice(0, 8)}...)` : 'No key saved yet'}
          </p>
        )}
      </div>

      {/* What will be analyzed */}
      {!loading && sections.length === 0 && (
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-indigo-100 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <Brain size={24} className="text-indigo-600 mt-0.5" />
            <div>
              <p className="font-semibold text-indigo-800 mb-1">What Claude will analyze</p>
              <ul className="text-sm text-indigo-700 space-y-1">
                <li>• Symptom severity trends over time</li>
                <li>• Correlation between medications & symptom changes</li>
                <li>• Recovery progress & patterns</li>
                <li>• Personalized suggestions for tracking</li>
              </ul>
              <p className="text-xs text-indigo-500 mt-2">
                Powered by Claude Opus 4.6 · Analysis stays on your device
              </p>
            </div>
          </div>
          <button
            onClick={runAnalysis}
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold text-base"
          >
            Analyze My Health Data
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={runAnalysis} className="text-xs text-red-600 font-medium mt-2 underline">
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Streaming in progress */}
      {loading && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Loader2 size={16} className="animate-spin text-indigo-600" />
            <span className="text-sm font-medium text-gray-700">Claude is analyzing your data...</span>
          </div>
          {streamText && (
            <div className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
              {streamText}
              <span className="animate-pulse text-indigo-400">▋</span>
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {sections.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-600">Analysis Complete</p>
            <button
              onClick={runAnalysis}
              disabled={loading}
              className="text-xs text-indigo-600 border border-indigo-200 px-3 py-1 rounded-lg"
            >
              Re-analyze
            </button>
          </div>

          {sections.map((section, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <button
                className="w-full flex items-center justify-between p-4 text-left"
                onClick={() => setExpandedSection(expandedSection === i ? null : i)}
              >
                <span className="font-semibold text-gray-800 text-sm">{section.title}</span>
                {expandedSection === i ? (
                  <ChevronUp size={16} className="text-gray-400" />
                ) : (
                  <ChevronDown size={16} className="text-gray-400" />
                )}
              </button>
              {expandedSection === i && (
                <div className="px-4 pb-4 border-t border-gray-100">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed pt-3">
                    {section.content}
                  </p>
                </div>
              )}
            </div>
          ))}

          <p className="text-xs text-gray-400 text-center">
            This is not medical advice. Always consult a healthcare professional.
          </p>
        </div>
      )}
    </div>
  );
}
