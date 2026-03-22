import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { useProfile } from '../context/ProfileContext';
import { saveVitalLog, useVitalLogByDate } from '../hooks/useVitals';

export function VitalLogForm() {
  const navigate = useNavigate();
  const { activeProfileId } = useProfile();
  const today = new Date().toISOString().split('T')[0];
  const existing = useVitalLogByDate(activeProfileId ?? undefined, today);

  const [date, setDate] = useState(today);
  const [temperature, setTemperature] = useState('');
  const [tempUnit, setTempUnit] = useState<'C' | 'F'>('C');
  const [bpSys, setBpSys] = useState('');
  const [bpDia, setBpDia] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [sleepHours, setSleepHours] = useState('');
  const [weight, setWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [o2, setO2] = useState('');
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (existing) {
      setDate(existing.date);
      if (existing.temperature != null) setTemperature(String(existing.temperature));
      if (existing.temperatureUnit) setTempUnit(existing.temperatureUnit);
      if (existing.bloodPressureSystolic != null) setBpSys(String(existing.bloodPressureSystolic));
      if (existing.bloodPressureDiastolic != null) setBpDia(String(existing.bloodPressureDiastolic));
      if (existing.heartRate != null) setHeartRate(String(existing.heartRate));
      if (existing.sleepHours != null) setSleepHours(String(existing.sleepHours));
      if (existing.weight != null) setWeight(String(existing.weight));
      if (existing.weightUnit) setWeightUnit(existing.weightUnit);
      if (existing.oxygenSaturation != null) setO2(String(existing.oxygenSaturation));
      if (existing.notes) setNotes(existing.notes);
    }
  }, [existing?.date]);

  const hasAnyValue = !![temperature, bpSys, heartRate, sleepHours, weight, o2].some(v => v !== '');

  async function handleSave() {
    if (!activeProfileId || !hasAnyValue) return;
    await saveVitalLog({
      profileId: activeProfileId,
      date,
      loggedAt: Date.now(),
      temperature: temperature ? Number(temperature) : undefined,
      temperatureUnit: tempUnit,
      bloodPressureSystolic: bpSys ? Number(bpSys) : undefined,
      bloodPressureDiastolic: bpDia ? Number(bpDia) : undefined,
      heartRate: heartRate ? Number(heartRate) : undefined,
      sleepHours: sleepHours ? Number(sleepHours) : undefined,
      weight: weight ? Number(weight) : undefined,
      weightUnit,
      oxygenSaturation: o2 ? Number(o2) : undefined,
      notes: notes.trim() || undefined,
    });
    setSaved(true);
    setTimeout(() => navigate('/vitals'), 1000);
  }

  if (saved) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <Check size={32} className="text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-800">Vitals Saved!</h2>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-28">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1 text-gray-500">
          <ArrowLeft size={22} />
        </button>
        <h2 className="text-xl font-bold text-gray-800">Log Vitals</h2>
      </div>

      <Field label="Date">
        <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
      </Field>

      {/* Temperature */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2">🌡️ Temperature <span className="text-xs text-gray-400 font-normal">(optional)</span></h3>
        <div className="flex gap-2">
          <input
            type="number"
            step="0.1"
            className="input flex-1"
            placeholder={tempUnit === 'C' ? '36.6' : '97.9'}
            value={temperature}
            onChange={e => setTemperature(e.target.value)}
          />
          <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm">
            {(['C', 'F'] as const).map(u => (
              <button
                key={u}
                onClick={() => setTempUnit(u)}
                className={`px-3 py-2 font-medium transition-colors ${tempUnit === u ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'}`}
              >
                °{u}
              </button>
            ))}
          </div>
        </div>
        {temperature && (
          <p className={`text-xs font-medium ${
            (tempUnit === 'C' && Number(temperature) > 38) || (tempUnit === 'F' && Number(temperature) > 100.4)
              ? 'text-red-500' : 'text-green-600'
          }`}>
            {(tempUnit === 'C' && Number(temperature) > 38) || (tempUnit === 'F' && Number(temperature) > 100.4)
              ? '⚠️ Fever detected' : '✓ Normal range'}
          </p>
        )}
      </div>

      {/* Blood Pressure */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2">💗 Blood Pressure <span className="text-xs text-gray-400 font-normal">(optional)</span></h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            className="input flex-1"
            placeholder="Systolic"
            value={bpSys}
            onChange={e => setBpSys(e.target.value)}
          />
          <span className="text-gray-400 font-bold">/</span>
          <input
            type="number"
            className="input flex-1"
            placeholder="Diastolic"
            value={bpDia}
            onChange={e => setBpDia(e.target.value)}
          />
          <span className="text-xs text-gray-400">mmHg</span>
        </div>
        {bpSys && bpDia && (
          <p className={`text-xs font-medium ${Number(bpSys) > 130 || Number(bpDia) > 80 ? 'text-orange-500' : 'text-green-600'}`}>
            {Number(bpSys) > 140 ? '⚠️ High' : Number(bpSys) < 90 ? '⚠️ Low' : '✓ Normal range'}
          </p>
        )}
      </div>

      {/* Heart Rate */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2">❤️ Heart Rate <span className="text-xs text-gray-400 font-normal">(optional)</span></h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            className="input flex-1"
            placeholder="72"
            value={heartRate}
            onChange={e => setHeartRate(e.target.value)}
          />
          <span className="text-xs text-gray-400 w-8">bpm</span>
        </div>
      </div>

      {/* Sleep */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2">🌙 Sleep Hours <span className="text-xs text-gray-400 font-normal">(optional)</span></h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            step="0.5"
            min={0}
            max={24}
            className="input flex-1"
            placeholder="7.5"
            value={sleepHours}
            onChange={e => setSleepHours(e.target.value)}
          />
          <span className="text-xs text-gray-400 w-6">hrs</span>
        </div>
        {sleepHours && (
          <div className="flex items-center gap-1">
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className={`h-2 flex-1 rounded-full ${i < Number(sleepHours) ? (Number(sleepHours) >= 7 ? 'bg-indigo-400' : Number(sleepHours) >= 5 ? 'bg-yellow-400' : 'bg-red-400') : 'bg-gray-200'}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Weight */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2">⚖️ Weight <span className="text-xs text-gray-400 font-normal">(optional)</span></h3>
        <div className="flex gap-2">
          <input
            type="number"
            step="0.1"
            className="input flex-1"
            placeholder={weightUnit === 'kg' ? '70.0' : '154'}
            value={weight}
            onChange={e => setWeight(e.target.value)}
          />
          <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm">
            {(['kg', 'lbs'] as const).map(u => (
              <button
                key={u}
                onClick={() => setWeightUnit(u)}
                className={`px-3 py-2 font-medium transition-colors ${weightUnit === u ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'}`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* O2 Saturation */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2">💨 O₂ Saturation <span className="text-xs text-gray-400 font-normal">(optional)</span></h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={100}
            className="input flex-1"
            placeholder="98"
            value={o2}
            onChange={e => setO2(e.target.value)}
          />
          <span className="text-xs text-gray-400 w-4">%</span>
        </div>
        {o2 && (
          <p className={`text-xs font-medium ${Number(o2) < 95 ? 'text-red-500' : 'text-green-600'}`}>
            {Number(o2) < 90 ? '⚠️ Critically low' : Number(o2) < 95 ? '⚠️ Below normal' : '✓ Normal'}
          </p>
        )}
      </div>

      <Field label="Notes (optional)">
        <textarea
          className="input resize-none"
          rows={2}
          placeholder="e.g. Feeling tired today..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
      </Field>

      <button
        onClick={handleSave}
        disabled={!hasAnyValue}
        className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold text-base disabled:opacity-40"
      >
        Save Vitals
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
      <label className="text-sm font-semibold text-gray-700">{label}</label>
      {children}
    </div>
  );
}
