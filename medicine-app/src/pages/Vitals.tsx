import { useNavigate } from 'react-router-dom';
import { Plus, Thermometer, Heart, Moon, Activity, Trash2 } from 'lucide-react';
import { useVitalLogs, deleteVitalLog } from '../hooks/useVitals';
import { useProfile } from '../context/ProfileContext';
import type { VitalLog } from '../types';

export function Vitals() {
  const navigate = useNavigate();
  const { activeProfileId } = useProfile();
  const logs = useVitalLogs(activeProfileId ?? undefined, 60);

  const today = new Date().toISOString().split('T')[0];
  const hasTodayLog = logs.some(l => l.date === today);

  if (!activeProfileId) {
    return (
      <div className="p-6 text-center text-gray-500">
        <Activity size={40} className="mx-auto mb-2 opacity-30" />
        <p>Select a profile to track vitals.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">Vitals</h2>
        <button
          onClick={() => navigate('/vitals/log')}
          className="flex items-center gap-1 bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-medium"
        >
          <Plus size={16} /> Log Today
        </button>
      </div>

      {/* Today's summary */}
      {hasTodayLog && (() => {
        const todayLog = logs.find(l => l.date === today)!;
        return (
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-2">Today</p>
            <VitalChips log={todayLog} />
          </div>
        );
      })()}

      {/* Trend charts */}
      {logs.length >= 2 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
          <h3 className="font-semibold text-gray-700">Trends (last 30 days)</h3>
          {hasAny(logs, 'temperature') && (
            <TrendChart
              label="Temperature"
              icon={<Thermometer size={14} className="text-orange-500" />}
              data={logs.filter(l => l.temperature != null).map(l => ({ date: l.date, value: l.temperature! }))}
              unit={logs[0]?.temperatureUnit === 'F' ? '°F' : '°C'}
              colorFn={v => v > 38 ? 'bg-red-400' : v > 37.5 ? 'bg-orange-400' : 'bg-green-400'}
            />
          )}
          {hasAny(logs, 'heartRate') && (
            <TrendChart
              label="Heart Rate"
              icon={<Heart size={14} className="text-red-500" />}
              data={logs.filter(l => l.heartRate != null).map(l => ({ date: l.date, value: l.heartRate! }))}
              unit="bpm"
              colorFn={v => v > 100 ? 'bg-red-400' : v < 60 ? 'bg-blue-400' : 'bg-green-400'}
            />
          )}
          {hasAny(logs, 'sleepHours') && (
            <TrendChart
              label="Sleep"
              icon={<Moon size={14} className="text-indigo-500" />}
              data={logs.filter(l => l.sleepHours != null).map(l => ({ date: l.date, value: l.sleepHours! }))}
              unit="hrs"
              colorFn={v => v >= 7 ? 'bg-green-400' : v >= 5 ? 'bg-yellow-400' : 'bg-red-400'}
            />
          )}
          {hasAny(logs, 'oxygenSaturation') && (
            <TrendChart
              label="O₂ Saturation"
              icon={<Activity size={14} className="text-blue-500" />}
              data={logs.filter(l => l.oxygenSaturation != null).map(l => ({ date: l.date, value: l.oxygenSaturation! }))}
              unit="%"
              colorFn={v => v >= 95 ? 'bg-green-400' : v >= 90 ? 'bg-yellow-400' : 'bg-red-400'}
            />
          )}
        </div>
      )}

      {/* Log history */}
      {logs.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Activity size={40} className="mx-auto mb-2 opacity-30" />
          <p className="font-medium">No vitals logged yet</p>
          <p className="text-sm mt-1">Log temperature, blood pressure, heart rate, sleep, and more.</p>
          <button
            onClick={() => navigate('/vitals/log')}
            className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold"
          >
            + Log First Vital
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">History</h3>
          {logs.map(log => (
            <div key={log.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700">
                  {new Date(log.date + 'T00:00:00').toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
                <button onClick={() => deleteVitalLog(log.id!)} className="text-gray-300 hover:text-red-400">
                  <Trash2 size={14} />
                </button>
              </div>
              <VitalChips log={log} />
              {log.notes && <p className="text-xs text-gray-400 mt-2">{log.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function VitalChips({ log }: { log: VitalLog }) {
  const chips: { label: string; value: string; color: string }[] = [];

  if (log.temperature != null) {
    const hot = (log.temperatureUnit === 'F' ? log.temperature > 100.4 : log.temperature > 38);
    chips.push({ label: '🌡️', value: `${log.temperature}°${log.temperatureUnit ?? 'C'}`, color: hot ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200' });
  }
  if (log.bloodPressureSystolic && log.bloodPressureDiastolic) {
    const high = log.bloodPressureSystolic > 130;
    chips.push({ label: '💗', value: `${log.bloodPressureSystolic}/${log.bloodPressureDiastolic}`, color: high ? 'bg-red-50 text-red-700 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-200' });
  }
  if (log.heartRate != null) {
    const fast = log.heartRate > 100;
    chips.push({ label: '❤️', value: `${log.heartRate} bpm`, color: fast ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-green-50 text-green-700 border-green-200' });
  }
  if (log.sleepHours != null) {
    const good = log.sleepHours >= 7;
    chips.push({ label: '🌙', value: `${log.sleepHours}h sleep`, color: good ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200' });
  }
  if (log.oxygenSaturation != null) {
    const low = log.oxygenSaturation < 95;
    chips.push({ label: '💨', value: `${log.oxygenSaturation}% O₂`, color: low ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200' });
  }
  if (log.weight != null) {
    chips.push({ label: '⚖️', value: `${log.weight} ${log.weightUnit ?? 'kg'}`, color: 'bg-gray-50 text-gray-700 border-gray-200' });
  }

  if (chips.length === 0) return <p className="text-xs text-gray-400 italic">No values recorded</p>;

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((c, i) => (
        <span key={i} className={`text-xs border rounded-full px-2.5 py-1 font-medium ${c.color}`}>
          {c.label} {c.value}
        </span>
      ))}
    </div>
  );
}

function hasAny(logs: VitalLog[], key: keyof VitalLog): boolean {
  return logs.some(l => l[key] != null);
}

function TrendChart({ label, icon, data, unit, colorFn }: {
  label: string;
  icon: React.ReactNode;
  data: { date: string; value: number }[];
  unit: string;
  colorFn: (v: number) => string;
}) {
  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date)).slice(-14);
  const max = Math.max(...sorted.map(d => d.value));
  const min = Math.min(...sorted.map(d => d.value));
  const range = max - min || 1;
  const latest = sorted[sorted.length - 1];

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
          {icon} {label}
        </div>
        {latest && (
          <span className="text-xs font-bold text-gray-700">{latest.value} {unit}</span>
        )}
      </div>
      <div className="flex items-end gap-0.5 h-10">
        {sorted.map((d, i) => {
          const height = Math.max(10, ((d.value - min) / range) * 100);
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5" title={`${d.date}: ${d.value} ${unit}`}>
              <div className={`w-full rounded-sm ${colorFn(d.value)}`} style={{ height: `${height}%` }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
