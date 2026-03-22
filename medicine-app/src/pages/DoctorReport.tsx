import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Share2, Printer, Copy, Check } from 'lucide-react';
import { useProfile } from '../context/ProfileContext';
import { useProfiles } from '../hooks/useProfiles';
import { db } from '../db/database';

interface ReportData {
  generatedAt: string;
  profileName: string;
  medications: {
    name: string; dosage: string; form: string; instructions?: string;
    schedule?: string; active: boolean;
  }[];
  conditions: {
    name: string; status: string; startDate: string; endDate?: string;
    description?: string;
    linkedMeds: string[];
    symptoms: {
      name: string;
      logs: { date: string; severity: number; notes?: string }[];
      avgSeverity: number;
      trend: 'improving' | 'worsening' | 'stable' | 'insufficient';
    }[];
  }[];
  vitals: {
    date: string;
    temperature?: string; bloodPressure?: string; heartRate?: string;
    sleepHours?: string; oxygenSaturation?: string; weight?: string;
    notes?: string;
  }[];
  sideEffects: { medName: string; name: string; severity: number; date: string; notes?: string }[];
  triggers: { name: string; category: string; logsCount: number; avgIntensity: number }[];
  doseLogs: { taken: number; missed: number; skipped: number };
}

function calcTrend(logs: { severity: number }[]): 'improving' | 'worsening' | 'stable' | 'insufficient' {
  if (logs.length < 3) return 'insufficient';
  const first = logs.slice(0, Math.ceil(logs.length / 2));
  const last = logs.slice(Math.floor(logs.length / 2));
  const avg = (arr: { severity: number }[]) => arr.reduce((s, l) => s + l.severity, 0) / arr.length;
  const diff = avg(last) - avg(first);
  if (diff <= -1) return 'improving';
  if (diff >= 1) return 'worsening';
  return 'stable';
}

async function buildReport(profileId: number, profileName: string): Promise<ReportData> {
  const meds = await db.medications.where('profileId').equals(profileId).toArray();
  const conditions = await db.conditions.where('profileId').equals(profileId).toArray();
  const allDoseLogs = await db.doseLogs.where('medicationId').anyOf(meds.map(m => m.id!)).toArray();
  const allVitals = await db.vitalLogs.where('profileId').equals(profileId).sortBy('date');
  const allSideEffects = await db.sideEffects.where('profileId').equals(profileId).sortBy('date');
  const allTriggers = await db.triggers.where('profileId').equals(profileId).toArray();
  const allTriggerLogs = await db.triggerLogs.where('profileId').equals(profileId).toArray();

  // Medications
  const medsData = await Promise.all(meds.map(async med => {
    const schedule = await db.schedules.where('medicationId').equals(med.id!).first();
    let scheduleStr: string | undefined;
    if (schedule) {
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const days = schedule.days.length === 0 ? 'Daily' : schedule.days.map(d => dayNames[d]).join(', ');
      scheduleStr = `${schedule.times.join(', ')} · ${days}`;
    }
    return {
      name: med.name, dosage: med.dosage, form: med.form,
      instructions: med.instructions, schedule: scheduleStr, active: med.active,
    };
  }));

  // Conditions
  const conditionsData = await Promise.all(conditions.map(async cond => {
    const links = await db.conditionMedications.where('conditionId').equals(cond.id!).toArray();
    const linkedMeds = (await db.medications.bulkGet(links.map(l => l.medicationId)))
      .filter(Boolean).map(m => `${m!.name} ${m!.dosage}`);

    const symptoms = await db.symptoms.where('conditionId').equals(cond.id!).toArray();
    const symptomsData = await Promise.all(symptoms.map(async s => {
      const logs = await db.symptomLogs.where('symptomId').equals(s.id!).sortBy('date');
      const avgSeverity = logs.length ? logs.reduce((sum, l) => sum + l.severity, 0) / logs.length : 0;
      return {
        name: s.name,
        logs: logs.map(l => ({ date: l.date, severity: l.severity, notes: l.notes })),
        avgSeverity: Math.round(avgSeverity * 10) / 10,
        trend: calcTrend(logs),
      };
    }));

    return {
      name: cond.name, status: cond.status, startDate: cond.startDate,
      endDate: cond.endDate, description: cond.description,
      linkedMeds, symptoms: symptomsData,
    };
  }));

  // Vitals
  const vitalsData = (await allVitals).slice(-30).map(v => ({
    date: v.date,
    temperature: v.temperature != null ? `${v.temperature}°${v.temperatureUnit ?? 'C'}` : undefined,
    bloodPressure: v.bloodPressureSystolic && v.bloodPressureDiastolic
      ? `${v.bloodPressureSystolic}/${v.bloodPressureDiastolic} mmHg` : undefined,
    heartRate: v.heartRate != null ? `${v.heartRate} bpm` : undefined,
    sleepHours: v.sleepHours != null ? `${v.sleepHours}h` : undefined,
    oxygenSaturation: v.oxygenSaturation != null ? `${v.oxygenSaturation}%` : undefined,
    weight: v.weight != null ? `${v.weight} ${v.weightUnit ?? 'kg'}` : undefined,
    notes: v.notes,
  }));

  // Side effects
  const sideEffectsData = await Promise.all(
    (await allSideEffects).map(async se => {
      const med = await db.medications.get(se.medicationId);
      return { medName: med?.name ?? 'Unknown', name: se.name, severity: se.severity, date: se.date, notes: se.notes };
    })
  );

  // Triggers
  const triggersData = allTriggers.map(t => {
    const tLogs = allTriggerLogs.filter(l => l.triggerId === t.id);
    const avgIntensity = tLogs.length ? Math.round(tLogs.reduce((s, l) => s + l.intensity, 0) / tLogs.length * 10) / 10 : 0;
    return { name: t.name, category: t.category, logsCount: tLogs.length, avgIntensity };
  }).filter(t => t.logsCount > 0);

  // Dose adherence
  const taken = allDoseLogs.filter(l => l.status === 'taken').length;
  const missed = allDoseLogs.filter(l => l.status === 'missed').length;
  const skipped = allDoseLogs.filter(l => l.status === 'skipped').length;

  return {
    generatedAt: new Date().toLocaleString(),
    profileName,
    medications: medsData,
    conditions: conditionsData,
    vitals: vitalsData,
    sideEffects: sideEffectsData,
    triggers: triggersData,
    doseLogs: { taken, missed, skipped },
  };
}

function formatReportText(r: ReportData): string {
  const line = (n = 50) => '─'.repeat(n);
  let out = '';

  out += `HEALTH REPORT\n`;
  out += `Patient: ${r.profileName}\n`;
  out += `Generated: ${r.generatedAt}\n`;
  out += `${line()}\n\n`;

  // Medications
  out += `MEDICATIONS\n${line(20)}\n`;
  const activeMeds = r.medications.filter(m => m.active);
  const inactiveMeds = r.medications.filter(m => !m.active);
  if (activeMeds.length) {
    out += `Active (${activeMeds.length}):\n`;
    activeMeds.forEach(m => {
      out += `  • ${m.name} ${m.dosage} (${m.form})\n`;
      if (m.instructions) out += `    Instructions: ${m.instructions}\n`;
      if (m.schedule) out += `    Schedule: ${m.schedule}\n`;
    });
  }
  if (inactiveMeds.length) {
    out += `\nInactive (${inactiveMeds.length}): ${inactiveMeds.map(m => m.name).join(', ')}\n`;
  }

  // Dose adherence
  const total = r.doseLogs.taken + r.doseLogs.missed + r.doseLogs.skipped;
  if (total > 0) {
    const pct = Math.round((r.doseLogs.taken / total) * 100);
    out += `\nAdherence: ${pct}% (${r.doseLogs.taken} taken / ${r.doseLogs.missed} missed / ${r.doseLogs.skipped} skipped)\n`;
  }

  // Conditions
  if (r.conditions.length) {
    out += `\n\nCONDITIONS\n${line(20)}\n`;
    r.conditions.forEach(c => {
      out += `\n${c.name.toUpperCase()} [${c.status}]\n`;
      out += `  Started: ${c.startDate}${c.endDate ? ` · Ended: ${c.endDate}` : ''}\n`;
      if (c.description) out += `  Notes: ${c.description}\n`;
      if (c.linkedMeds.length) out += `  Medications: ${c.linkedMeds.join(', ')}\n`;
      if (c.symptoms.length) {
        out += `  Symptoms tracked:\n`;
        c.symptoms.forEach(s => {
          const trendIcon = s.trend === 'improving' ? '↓' : s.trend === 'worsening' ? '↑' : s.trend === 'stable' ? '→' : '?';
          out += `    • ${s.name}: avg ${s.avgSeverity}/10 ${trendIcon} (${s.logs.length} logs)\n`;
          if (s.logs.length > 0) {
            const recent = s.logs.slice(-3);
            out += `      Recent: ${recent.map(l => `${l.date}=${l.severity}`).join(', ')}\n`;
          }
        });
      }
    });
  }

  // Vitals
  if (r.vitals.length) {
    out += `\n\nVITALS (last ${r.vitals.length} entries)\n${line(20)}\n`;
    r.vitals.slice(-10).forEach(v => {
      const parts = [
        v.temperature && `Temp: ${v.temperature}`,
        v.bloodPressure && `BP: ${v.bloodPressure}`,
        v.heartRate && `HR: ${v.heartRate}`,
        v.sleepHours && `Sleep: ${v.sleepHours}`,
        v.oxygenSaturation && `O₂: ${v.oxygenSaturation}`,
        v.weight && `Weight: ${v.weight}`,
      ].filter(Boolean);
      out += `  ${v.date}: ${parts.join(' | ')}\n`;
      if (v.notes) out += `    Notes: ${v.notes}\n`;
    });
  }

  // Side effects
  if (r.sideEffects.length) {
    out += `\n\nSIDE EFFECTS\n${line(20)}\n`;
    r.sideEffects.forEach(se => {
      out += `  • ${se.name} (${se.severity}/10) from ${se.medName} — ${se.date}\n`;
      if (se.notes) out += `    ${se.notes}\n`;
    });
  }

  // Triggers
  if (r.triggers.length) {
    out += `\n\nTRIGGERS\n${line(20)}\n`;
    r.triggers.forEach(t => {
      out += `  • ${t.name} [${t.category}]: logged ${t.logsCount}× · avg intensity ${t.avgIntensity}/10\n`;
    });
  }

  out += `\n${line()}\n`;
  out += `Note: This report is for informational purposes only and is not a substitute for professional medical advice.\n`;

  return out;
}

export function DoctorReport() {
  const navigate = useNavigate();
  const { activeProfileId } = useProfile();
  const { profiles } = useProfiles();
  const profile = profiles.find(p => p.id === activeProfileId);

  const [report, setReport] = useState<ReportData | null>(null);
  const [reportText, setReportText] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generate() {
    if (!activeProfileId || !profile) return;
    setLoading(true);
    const data = await buildReport(activeProfileId, profile.name);
    setReport(data);
    setReportText(formatReportText(data));
    setLoading(false);
  }

  async function copyToClipboard() {
    await navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function printReport() {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>Health Report — ${profile?.name}</title>
      <style>
        body { font-family: monospace; white-space: pre-wrap; padding: 2rem; font-size: 13px; line-height: 1.6; }
        @media print { body { padding: 1rem; } }
      </style></head>
      <body>${reportText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</body></html>
    `);
    win.document.close();
    win.print();
  }

  async function share() {
    if (navigator.share) {
      await navigator.share({ title: 'Health Report', text: reportText });
    } else {
      copyToClipboard();
    }
  }

  return (
    <div className="p-4 space-y-4 pb-24">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1 text-gray-500">
          <ArrowLeft size={22} />
        </button>
        <h2 className="text-xl font-bold text-gray-800">Doctor Report</h2>
      </div>

      {!report && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-indigo-100 p-5 space-y-4">
          <div className="flex items-start gap-3">
            <FileText size={24} className="text-indigo-600 mt-0.5" />
            <div>
              <p className="font-semibold text-indigo-800 mb-1">Health Summary Report</p>
              <ul className="text-sm text-indigo-700 space-y-1">
                <li>• All active & past medications with schedules</li>
                <li>• Dose adherence percentage</li>
                <li>• Conditions with symptom trends</li>
                <li>• Vitals history (last 30 entries)</li>
                <li>• Side effects per medication</li>
                <li>• Trigger patterns</li>
              </ul>
              <p className="text-xs text-indigo-500 mt-2">Everything formatted to share with your doctor.</p>
            </div>
          </div>
          <button
            onClick={generate}
            disabled={loading || !activeProfileId}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold disabled:opacity-40"
          >
            {loading ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
      )}

      {report && (
        <>
          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={copyToClipboard}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                copied ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-gray-300 text-gray-700'
              }`}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={printReport}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border border-gray-300 bg-white text-gray-700"
            >
              <Printer size={16} /> Print / PDF
            </button>
            <button
              onClick={share}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 text-white"
            >
              <Share2 size={16} /> Share
            </button>
          </div>

          <button onClick={() => { setReport(null); setReportText(''); }} className="text-xs text-indigo-600 w-full text-center">
            Re-generate
          </button>

          {/* Preview */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <FileText size={16} /> Report Preview
            </h3>
            <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto max-h-[60vh] overflow-y-auto">
              {reportText}
            </pre>
          </div>

          <p className="text-xs text-gray-400 text-center">
            For informational purposes only. Not a substitute for medical advice.
          </p>
        </>
      )}
    </div>
  );
}
