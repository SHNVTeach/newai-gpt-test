import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { db } from '../db/database';
import { useMedications } from '../hooks/useMedications';
import { useProfile } from '../context/ProfileContext';
import type { Medication } from '../types';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function MedicationForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeProfileId } = useProfile();
  const { addMedication, updateMedication } = useMedications(activeProfileId ?? undefined);
  const isEdit = !!id;

  const [form, setForm] = useState<Omit<Medication, 'id'>>({
    profileId: activeProfileId ?? 0,
    name: '',
    dosage: '',
    form: 'pill',
    instructions: '',
    currentCount: 30,
    refillAt: 7,
    color: '#6366f1',
    active: true,
  });

  const [times, setTimes] = useState<string[]>(['08:00']);
  const [days, setDays] = useState<number[]>([]); // empty = every day

  useEffect(() => {
    if (!isEdit) return;
    db.medications.get(Number(id)).then(med => {
      if (med) setForm({ ...med });
    });
    db.schedules.where('medicationId').equals(Number(id)).first().then(s => {
      if (s) {
        setTimes(s.times);
        setDays(s.days);
      }
    });
  }, [id, isEdit]);

  function toggleDay(d: number) {
    setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort());
  }

  async function handleSubmit() {
    if (!form.name.trim()) return;
    let medId: number;
    if (isEdit) {
      await updateMedication(Number(id), form);
      medId = Number(id);
    } else {
      medId = (await addMedication({ ...form, profileId: activeProfileId ?? 0 })) as number;
    }

    // Save schedule
    const existing = await db.schedules.where('medicationId').equals(medId).first();
    const scheduleData = {
      medicationId: medId,
      times,
      days,
      startDate: new Date().toISOString().split('T')[0],
    };
    if (existing?.id) {
      await db.schedules.update(existing.id, scheduleData);
    } else {
      await db.schedules.add(scheduleData);
    }

    navigate('/medications');
  }

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm(f => ({ ...f, [key]: value }));
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1 text-gray-500">
          <ArrowLeft size={22} />
        </button>
        <h2 className="text-xl font-bold text-gray-800">{isEdit ? 'Edit Medication' : 'Add Medication'}</h2>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <Field label="Medication Name">
          <input
            className="input"
            placeholder="e.g. Lisinopril"
            value={form.name}
            onChange={e => set('name', e.target.value)}
          />
        </Field>

        <Field label="Dosage">
          <input
            className="input"
            placeholder="e.g. 10mg"
            value={form.dosage}
            onChange={e => set('dosage', e.target.value)}
          />
        </Field>

        <Field label="Form">
          <select className="input" value={form.form} onChange={e => set('form', e.target.value as Medication['form'])}>
            <option value="pill">Pill / Tablet</option>
            <option value="liquid">Liquid</option>
            <option value="injection">Injection</option>
            <option value="patch">Patch</option>
            <option value="other">Other</option>
          </select>
        </Field>

        <Field label="Instructions (optional)">
          <input
            className="input"
            placeholder="e.g. Take with food"
            value={form.instructions ?? ''}
            onChange={e => set('instructions', e.target.value)}
          />
        </Field>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <h3 className="font-semibold text-gray-700">Schedule</h3>
        <div className="space-y-2">
          {times.map((t, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="time"
                className="input flex-1"
                value={t}
                onChange={e => setTimes(prev => prev.map((v, j) => j === i ? e.target.value : v))}
              />
              {times.length > 1 && (
                <button onClick={() => setTimes(prev => prev.filter((_, j) => j !== i))} className="text-red-400">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={() => setTimes(prev => [...prev, '12:00'])}
            className="flex items-center gap-1 text-indigo-600 text-sm"
          >
            <Plus size={14} /> Add Time
          </button>
        </div>

        <div>
          <p className="text-sm text-gray-600 mb-1">Days (empty = every day)</p>
          <div className="flex gap-1 flex-wrap">
            {DAYS.map((d, i) => (
              <button
                key={i}
                onClick={() => toggleDay(i)}
                className={`px-2 py-1 rounded-lg text-xs font-medium border transition-colors ${
                  days.includes(i) ? 'bg-indigo-600 text-white border-indigo-600' : 'text-gray-600 border-gray-300'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <h3 className="font-semibold text-gray-700">Inventory</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Current Count">
            <input
              type="number"
              className="input"
              min={0}
              value={form.currentCount}
              onChange={e => set('currentCount', Number(e.target.value))}
            />
          </Field>
          <Field label="Refill Alert At">
            <input
              type="number"
              className="input"
              min={1}
              value={form.refillAt}
              onChange={e => set('refillAt', Number(e.target.value))}
            />
          </Field>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold text-base"
      >
        {isEdit ? 'Save Changes' : 'Add Medication'}
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
