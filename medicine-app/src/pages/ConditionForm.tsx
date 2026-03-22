import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { db } from '../db/database';
import { useMedications } from '../hooks/useMedications';
import { useProfile } from '../context/ProfileContext';
import {
  createCondition,
  updateCondition,
  addSymptom,
  deleteSymptom,
  useConditionSymptoms,
  useConditionMedications,
  linkMedication,
  unlinkMedication,
} from '../hooks/useConditions';

const COMMON_SYMPTOMS: Record<string, string[]> = {
  'Cold / Flu': ['Congestion', 'Sore throat', 'Headache', 'Fatigue', 'Fever', 'Cough'],
  'Migraine': ['Headache intensity', 'Nausea', 'Light sensitivity', 'Aura'],
  'Allergy': ['Sneezing', 'Itchy eyes', 'Runny nose', 'Congestion'],
  'Anxiety': ['Worry level', 'Sleep quality', 'Energy', 'Focus'],
  'Back pain': ['Pain intensity', 'Mobility', 'Sleep quality'],
};

export function ConditionForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeProfileId } = useProfile();
  const medications = useMedications(activeProfileId ?? undefined);
  const isEdit = !!id;
  const conditionId = id ? Number(id) : undefined;

  const existingSymptoms = useConditionSymptoms(conditionId);
  const existingLinks = useConditionMedications(conditionId);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [newSymptom, setNewSymptom] = useState('');
  const [linkedMedIds, setLinkedMedIds] = useState<Set<number>>(new Set());
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (!isEdit || !conditionId) return;
    db.conditions.get(conditionId).then(c => {
      if (c) {
        setName(c.name);
        setDescription(c.description ?? '');
        setStartDate(c.startDate);
      }
    });
  }, [conditionId, isEdit]);

  useEffect(() => {
    if (existingLinks.length > 0) {
      setLinkedMedIds(new Set(existingLinks.map(l => l.medicationId)));
    }
  }, [existingLinks.length]);

  const suggestedSymptoms = Object.entries(COMMON_SYMPTOMS).find(
    ([key]) => name.toLowerCase().includes(key.toLowerCase().split(' ')[0])
  )?.[1] ?? [];

  async function handleAddSymptom(symptomName: string) {
    const trimmed = symptomName.trim();
    if (!trimmed || !conditionId) return;
    await addSymptom({ conditionId, name: trimmed });
    setNewSymptom('');
  }

  async function toggleMedLink(medId: number) {
    if (!conditionId) {
      setLinkedMedIds(prev => {
        const next = new Set(prev);
        next.has(medId) ? next.delete(medId) : next.add(medId);
        return next;
      });
      return;
    }
    if (linkedMedIds.has(medId)) {
      await unlinkMedication(conditionId, medId);
      setLinkedMedIds(prev => { const n = new Set(prev); n.delete(medId); return n; });
    } else {
      await linkMedication(conditionId, medId);
      setLinkedMedIds(prev => new Set([...prev, medId]));
    }
  }

  async function handleSubmit() {
    if (!name.trim()) return;
    const profileId = activeProfileId ?? 0;

    if (isEdit && conditionId) {
      await updateCondition(conditionId, { name, description, startDate });
      navigate(`/conditions/${conditionId}`);
    } else {
      const newId = await createCondition({
        profileId,
        name,
        description,
        startDate,
        status: 'active',
        createdAt: Date.now(),
      });
      // Link meds
      for (const medId of linkedMedIds) {
        await linkMedication(newId, medId);
      }
      navigate(`/conditions/${newId}`);
    }
  }

  return (
    <div className="p-4 space-y-4 pb-24">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1 text-gray-500">
          <ArrowLeft size={22} />
        </button>
        <h2 className="text-xl font-bold text-gray-800">
          {isEdit ? 'Edit Condition' : 'Track a Condition'}
        </h2>
      </div>

      {/* Condition Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <Field label="Condition Name">
          <input
            className="input"
            placeholder="e.g. Cold, Migraine, Allergy..."
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </Field>
        <Field label="Notes (optional)">
          <input
            className="input"
            placeholder="e.g. Started after travel"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </Field>
        <Field label="Start Date">
          <input
            type="date"
            className="input"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
          />
        </Field>
      </div>

      {/* Symptoms */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <h3 className="font-semibold text-gray-700">Symptoms to Track</h3>

        {/* Existing symptoms (edit mode) */}
        {isEdit && existingSymptoms.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {existingSymptoms.map(s => (
              <div
                key={s.id}
                className="flex items-center gap-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-sm px-3 py-1 rounded-full"
              >
                {s.name}
                <button onClick={() => deleteSymptom(s.id!)} className="text-indigo-400 hover:text-red-500 ml-1">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* New condition — show add-symptom UI after initial save, or pre-fill */}
        {!isEdit && (
          <p className="text-xs text-gray-500">You can add symptoms after creating the condition, or pick from suggestions below.</p>
        )}

        {/* Add symptom input */}
        {isEdit && (
          <div className="flex gap-2">
            <input
              className="input flex-1"
              placeholder="Add symptom..."
              value={newSymptom}
              onChange={e => setNewSymptom(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddSymptom(newSymptom)}
            />
            <button
              onClick={() => handleAddSymptom(newSymptom)}
              disabled={!newSymptom.trim()}
              className="bg-indigo-600 text-white px-3 rounded-lg disabled:opacity-40"
            >
              <Plus size={16} />
            </button>
          </div>
        )}

        {/* Suggestions based on condition name */}
        {suggestedSymptoms.length > 0 && (
          <div>
            <button
              className="text-xs text-indigo-600 font-medium mb-2"
              onClick={() => setShowSuggestions(v => !v)}
            >
              {showSuggestions ? 'Hide' : 'Show'} suggestions for "{name}"
            </button>
            {showSuggestions && (
              <div className="flex flex-wrap gap-2">
                {suggestedSymptoms.map(s => {
                  const alreadyAdded = existingSymptoms.some(es => es.name.toLowerCase() === s.toLowerCase());
                  return (
                    <button
                      key={s}
                      disabled={alreadyAdded || !isEdit}
                      onClick={() => handleAddSymptom(s)}
                      className={`text-sm px-3 py-1 rounded-full border transition-colors ${
                        alreadyAdded
                          ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-default'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400 hover:text-indigo-600'
                      }`}
                    >
                      + {s}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Linked Medications */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <h3 className="font-semibold text-gray-700">Linked Medications</h3>
        <p className="text-xs text-gray-500">Select medications you're taking for this condition.</p>
        {(medications.medications ?? []).filter(m => m.active).length === 0 ? (
          <p className="text-sm text-gray-400 italic">No active medications found.</p>
        ) : (
          <div className="space-y-2">
            {(medications.medications ?? []).filter(m => m.active).map(med => (
              <label key={med.id} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={linkedMedIds.has(med.id!)}
                  onChange={() => toggleMedLink(med.id!)}
                  className="w-4 h-4 accent-indigo-600"
                />
                <span className="text-sm text-gray-800">{med.name}</span>
                <span className="text-xs text-gray-400">{med.dosage}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={!name.trim()}
        className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold text-base disabled:opacity-40"
      >
        {isEdit ? 'Save Changes' : 'Create Condition'}
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-gray-500 font-medium block mb-1">{label}</label>
      {children}
    </div>
  );
}
