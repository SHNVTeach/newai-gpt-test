import { useState } from 'react';
import { Plus, AlertCircle, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useSideEffects, addSideEffect, deleteSideEffect } from '../hooks/useSideEffects';
import { useMedications } from '../hooks/useMedications';
import { useProfile } from '../context/ProfileContext';

const COMMON_SIDE_EFFECTS = [
  'Nausea', 'Headache', 'Dizziness', 'Fatigue', 'Stomach upset',
  'Dry mouth', 'Insomnia', 'Rash', 'Constipation', 'Diarrhea',
  'Drowsiness', 'Appetite loss', 'Mood changes', 'Palpitations',
];

export function SideEffects() {
  const { activeProfileId } = useProfile();
  const sideEffects = useSideEffects(activeProfileId ?? undefined);
  const { medications } = useMedications(activeProfileId ?? undefined);
  const activeMeds = (medications ?? []).filter(m => m.active);

  const [showForm, setShowForm] = useState(false);
  const [selectedMedId, setSelectedMedId] = useState<number | ''>('');
  const [effectName, setEffectName] = useState('');
  const [severity, setSeverity] = useState(5);
  const [notes, setNotes] = useState('');
  const [expandedMed, setExpandedMed] = useState<number | null>(null);

  async function handleAdd() {
    if (!activeProfileId || !selectedMedId || !effectName.trim()) return;
    await addSideEffect({
      profileId: activeProfileId,
      medicationId: Number(selectedMedId),
      name: effectName.trim(),
      severity,
      date: new Date().toISOString().split('T')[0],
      loggedAt: Date.now(),
      notes: notes.trim() || undefined,
    });
    setEffectName('');
    setNotes('');
    setSeverity(5);
    setShowForm(false);
  }

  // Group by medication
  const byMed: Record<number, typeof sideEffects> = {};
  for (const se of sideEffects) {
    if (!byMed[se.medicationId]) byMed[se.medicationId] = [];
    byMed[se.medicationId].push(se);
  }

  if (!activeProfileId) {
    return (
      <div className="p-6 text-center text-gray-500">
        <AlertCircle size={40} className="mx-auto mb-2 opacity-30" />
        <p>Select a profile to track side effects.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">Side Effects</h2>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1 bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-medium"
        >
          <Plus size={16} /> Log
        </button>
      </div>

      {/* Log form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-indigo-200 p-4 space-y-3">
          <h3 className="font-semibold text-gray-700">Log a Side Effect</h3>

          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">Medication</label>
            <select
              className="input"
              value={selectedMedId}
              onChange={e => setSelectedMedId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">Select medication...</option>
              {activeMeds.map(m => (
                <option key={m.id} value={m.id}>{m.name} — {m.dosage}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">Side Effect</label>
            <input
              className="input"
              placeholder="e.g. Nausea, Dizziness..."
              value={effectName}
              onChange={e => setEffectName(e.target.value)}
            />
            <div className="flex flex-wrap gap-1 mt-2">
              {COMMON_SIDE_EFFECTS.map(s => (
                <button
                  key={s}
                  onClick={() => setEffectName(s)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    effectName === s
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">
              Severity: <span className={`font-bold ${severity <= 3 ? 'text-green-600' : severity <= 6 ? 'text-yellow-600' : 'text-red-600'}`}>{severity}/10</span>
            </label>
            <input
              type="range" min={1} max={10} value={severity}
              onChange={e => setSeverity(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-0.5">
              <span>Mild</span><span>Moderate</span><span>Severe</span>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">Notes (optional)</label>
            <input className="input" placeholder="When did it start? After eating?" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="flex-1 border border-gray-300 py-2 rounded-lg text-sm text-gray-600">Cancel</button>
            <button
              onClick={handleAdd}
              disabled={!selectedMedId || !effectName.trim()}
              className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-semibold disabled:opacity-40"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* No data state */}
      {sideEffects.length === 0 && !showForm && (
        <div className="text-center py-12 text-gray-400">
          <AlertCircle size={40} className="mx-auto mb-2 opacity-30" />
          <p className="font-medium">No side effects logged</p>
          <p className="text-sm mt-1">Track reactions to your medications here.</p>
        </div>
      )}

      {/* Grouped by medication */}
      {Object.entries(byMed).map(([medIdStr, effects]) => {
        const medId = Number(medIdStr);
        const med = activeMeds.find(m => m.id === medId)
          ?? (medications ?? []).find(m => m.id === medId);
        const isExpanded = expandedMed === medId;

        return (
          <div key={medId} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
              className="w-full flex items-center justify-between p-4"
              onClick={() => setExpandedMed(isExpanded ? null : medId)}
            >
              <div className="text-left">
                <p className="font-semibold text-gray-800">{med?.name ?? 'Unknown Med'}</p>
                <p className="text-xs text-gray-400">{effects.length} effect{effects.length !== 1 ? 's' : ''} logged</p>
              </div>
              {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </button>

            {isExpanded && (
              <div className="border-t border-gray-100 divide-y divide-gray-100">
                {effects.sort((a, b) => b.loggedAt - a.loggedAt).map(se => (
                  <div key={se.id} className="flex items-start justify-between px-4 py-3 gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-800">{se.name}</span>
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                          se.severity <= 3 ? 'bg-green-100 text-green-700' :
                          se.severity <= 6 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>{se.severity}/10</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{se.date}{se.notes ? ` · ${se.notes}` : ''}</p>
                    </div>
                    <button onClick={() => deleteSideEffect(se.id!)} className="text-gray-300 hover:text-red-400 mt-0.5">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
