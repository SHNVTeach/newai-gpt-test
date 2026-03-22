import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { useCondition, useConditionSymptoms } from '../hooks/useConditions';
import { logSymptom } from '../hooks/useSymptomLogs';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';

const SEVERITY_LABELS: Record<number, string> = {
  1: 'Barely noticeable',
  2: 'Very mild',
  3: 'Mild',
  4: 'Mild-moderate',
  5: 'Moderate',
  6: 'Moderate-severe',
  7: 'Severe',
  8: 'Very severe',
  9: 'Extremely severe',
  10: 'Worst possible',
};

function severityColor(v: number) {
  if (v <= 2) return 'text-green-600';
  if (v <= 4) return 'text-lime-600';
  if (v <= 6) return 'text-yellow-600';
  if (v <= 8) return 'text-orange-600';
  return 'text-red-600';
}

function severityBg(v: number) {
  if (v <= 2) return 'bg-green-500';
  if (v <= 4) return 'bg-lime-500';
  if (v <= 6) return 'bg-yellow-500';
  if (v <= 8) return 'bg-orange-500';
  return 'bg-red-500';
}

export function DailySymptomLog() {
  const { id } = useParams();
  const navigate = useNavigate();
  const conditionId = Number(id);

  const condition = useCondition(conditionId);
  const symptoms = useConditionSymptoms(conditionId);

  const today = new Date().toISOString().split('T')[0];

  // Pre-fill with today's existing logs
  const existingLogs = useLiveQuery(
    () => db.symptomLogs.where('conditionId').equals(conditionId).and(l => l.date === today).toArray(),
    [conditionId, today]
  ) ?? [];

  const [severities, setSeverities] = useState<Record<number, number>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (existingLogs.length > 0) {
      const sevMap: Record<number, number> = {};
      const notesMap: Record<number, string> = {};
      for (const log of existingLogs) {
        sevMap[log.symptomId] = log.severity;
        notesMap[log.symptomId] = log.notes ?? '';
      }
      setSeverities(sevMap);
      setNotes(notesMap);
    } else if (symptoms.length > 0) {
      const defaults: Record<number, number> = {};
      for (const s of symptoms) {
        if (s.id) defaults[s.id] = 5;
      }
      setSeverities(defaults);
    }
  }, [existingLogs.length, symptoms.length]);

  async function handleSave() {
    const now = Date.now();
    for (const symptom of symptoms) {
      const sId = symptom.id!;
      const severity = severities[sId] ?? 5;
      await logSymptom({
        symptomId: sId,
        conditionId,
        severity,
        notes: notes[sId]?.trim() || undefined,
        loggedAt: now,
        date: today,
      });
    }
    setSaved(true);
    setTimeout(() => navigate(`/conditions/${conditionId}`), 1200);
  }

  if (!condition) return null;

  if (saved) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <Check size={32} className="text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-800">Logged!</h2>
        <p className="text-gray-500 mt-1">Today's symptoms saved successfully.</p>
      </div>
    );
  }

  if (symptoms.length === 0) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 text-gray-500">
            <ArrowLeft size={22} />
          </button>
          <h2 className="text-xl font-bold text-gray-800">Log Symptoms</h2>
        </div>
        <div className="text-center py-12 text-gray-400">
          <p>No symptoms to track for this condition.</p>
          <button
            onClick={() => navigate(`/conditions/${conditionId}`)}
            className="mt-4 text-indigo-600 text-sm font-medium"
          >
            Go back and add symptoms
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-28">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1 text-gray-500">
          <ArrowLeft size={22} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-gray-800">Daily Check-in</h2>
          <p className="text-xs text-gray-400">{condition.name} · {new Date(today + 'T00:00:00').toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
        </div>
      </div>

      <p className="text-sm text-gray-500">Rate each symptom from 1 (barely noticeable) to 10 (worst possible).</p>

      <div className="space-y-4">
        {symptoms.map(symptom => {
          const sId = symptom.id!;
          const value = severities[sId] ?? 5;
          return (
            <div key={sId} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">{symptom.name}</h3>
                <div className="text-right">
                  <span className={`text-2xl font-bold ${severityColor(value)}`}>{value}</span>
                  <span className="text-gray-400 text-sm">/10</span>
                </div>
              </div>

              <p className={`text-xs font-medium ${severityColor(value)}`}>{SEVERITY_LABELS[value]}</p>

              {/* Slider */}
              <div className="relative">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>1</span>
                  <span>5</span>
                  <span>10</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={value}
                  onChange={e => setSeverities(prev => ({ ...prev, [sId]: Number(e.target.value) }))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, ${value <= 4 ? '#22c55e' : value <= 7 ? '#eab308' : '#ef4444'} 0%, ${value <= 4 ? '#22c55e' : value <= 7 ? '#eab308' : '#ef4444'} ${(value - 1) / 9 * 100}%, #e5e7eb ${(value - 1) / 9 * 100}%, #e5e7eb 100%)`
                  }}
                />
              </div>

              {/* Quick buttons */}
              <div className="flex gap-1">
                {[1,2,3,4,5,6,7,8,9,10].map(n => (
                  <button
                    key={n}
                    onClick={() => setSeverities(prev => ({ ...prev, [sId]: n }))}
                    className={`flex-1 py-1 rounded text-xs font-medium transition-colors ${
                      value === n
                        ? `${severityBg(n)} text-white`
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>

              {/* Notes */}
              <input
                className="input text-sm"
                placeholder="Optional note (e.g. worse in morning)..."
                value={notes[sId] ?? ''}
                onChange={e => setNotes(prev => ({ ...prev, [sId]: e.target.value }))}
              />
            </div>
          );
        })}
      </div>

      {/* Overall summary */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
        <p className="text-sm font-semibold text-gray-700 mb-2">Today's Summary</p>
        <div className="flex flex-wrap gap-2">
          {symptoms.map(s => {
            const v = severities[s.id!] ?? 5;
            return (
              <div key={s.id} className={`text-xs px-2 py-1 rounded-full font-medium ${
                v <= 3 ? 'bg-green-100 text-green-700' :
                v <= 6 ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {s.name}: {v}/10
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={handleSave}
        className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold text-base shadow-sm"
      >
        Save Today's Log
      </button>
    </div>
  );
}
