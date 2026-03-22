import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit2, Plus, Trash2, TrendingDown, TrendingUp, Minus, Activity, Brain } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import {
  useCondition,
  useConditionSymptoms,
  useConditionMedications,
  addSymptom,
  deleteSymptom,
  deleteCondition,
  updateCondition,
} from '../hooks/useConditions';
import { useSymptomLogs } from '../hooks/useSymptomLogs';
import type { SymptomLog, Symptom } from '../types';

export function ConditionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const conditionId = Number(id);

  const condition = useCondition(conditionId);
  const symptoms = useConditionSymptoms(conditionId);
  const linkedMeds = useConditionMedications(conditionId);
  const allLogs = useSymptomLogs(conditionId);

  const [newSymptomName, setNewSymptomName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const linkedMedDetails = (useLiveQuery(
    async () => linkedMeds.length > 0
      ? db.medications.bulkGet(linkedMeds.map(l => l.medicationId))
      : [],
    [linkedMeds.length]
  ) ?? []) as (import('../types').Medication | undefined)[];

  const today = new Date().toISOString().split('T')[0];
  const todayLogs = allLogs.filter(l => l.date === today);
  const allLogged = symptoms.length > 0 && todayLogs.length >= symptoms.length;

  async function handleAddSymptom() {
    if (!newSymptomName.trim()) return;
    await addSymptom({ conditionId, name: newSymptomName.trim() });
    setNewSymptomName('');
  }

  async function handleDelete() {
    await deleteCondition(conditionId);
    navigate('/conditions');
  }

  async function handleMarkRecovered() {
    await updateCondition(conditionId, {
      status: 'recovered',
      endDate: today,
    });
  }

  if (!condition) return null;

  const daysSinceStart = Math.floor(
    (Date.now() - new Date(condition.startDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/conditions')} className="p-1 text-gray-500">
          <ArrowLeft size={22} />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-800">{condition.name}</h2>
          <p className="text-xs text-gray-400">Day {daysSinceStart + 1} · Started {condition.startDate}</p>
        </div>
        <button onClick={() => navigate(`/conditions/${conditionId}/edit`)} className="p-2 text-gray-500">
          <Edit2 size={18} />
        </button>
      </div>

      {/* Today's Log CTA */}
      {condition.status !== 'recovered' && symptoms.length > 0 && (
        <div
          className={`rounded-xl p-4 flex items-center justify-between cursor-pointer ${
            allLogged ? 'bg-green-50 border border-green-200' : 'bg-indigo-50 border border-indigo-200'
          }`}
          onClick={() => navigate(`/conditions/${conditionId}/log`)}
        >
          <div>
            <p className={`font-semibold ${allLogged ? 'text-green-700' : 'text-indigo-700'}`}>
              {allLogged ? '✓ Today logged' : 'Log today\'s symptoms'}
            </p>
            <p className={`text-xs mt-0.5 ${allLogged ? 'text-green-500' : 'text-indigo-500'}`}>
              {allLogged
                ? `All ${symptoms.length} symptoms recorded`
                : `Rate your ${symptoms.length} symptom${symptoms.length !== 1 ? 's' : ''} on a scale of 1–10`}
            </p>
          </div>
          <Activity size={24} className={allLogged ? 'text-green-400' : 'text-indigo-400'} />
        </div>
      )}

      {/* AI Insights CTA */}
      {allLogs.length >= 3 && (
        <button
          onClick={() => navigate(`/ai-insights?conditionId=${conditionId}`)}
          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl p-4 flex items-center gap-3"
        >
          <Brain size={20} />
          <div className="text-left">
            <p className="font-semibold text-sm">AI Insights</p>
            <p className="text-xs opacity-80">Analyze your symptom trends & medication impact</p>
          </div>
        </button>
      )}

      {/* Symptom Trends */}
      {symptoms.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
          <h3 className="font-semibold text-gray-700">Symptom Trends</h3>
          {symptoms.map(symptom => (
            <SymptomTrendRow
              key={symptom.id}
              symptom={symptom}
              logs={allLogs.filter(l => l.symptomId === symptom.id)}
              onDelete={() => deleteSymptom(symptom.id!)}
            />
          ))}
        </div>
      )}

      {/* Add Symptom */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <h3 className="font-semibold text-gray-700">Symptoms</h3>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="Add symptom to track..."
            value={newSymptomName}
            onChange={e => setNewSymptomName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddSymptom()}
          />
          <button
            onClick={handleAddSymptom}
            disabled={!newSymptomName.trim()}
            className="bg-indigo-600 text-white px-3 rounded-lg disabled:opacity-40"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Linked Medications */}
      {linkedMedDetails.filter(Boolean).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-700 mb-2">Linked Medications</h3>
          <div className="flex flex-wrap gap-2">
            {linkedMedDetails.filter(Boolean).map(med => (
              <span key={med!.id} className="bg-blue-50 border border-blue-200 text-blue-700 text-sm px-3 py-1 rounded-full">
                {med!.name} · {med!.dosage}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Log History */}
      {allLogs.length > 0 && (
        <LogHistory logs={allLogs} symptoms={symptoms} />
      )}

      {/* Actions */}
      <div className="space-y-2">
        {condition.status !== 'recovered' && (
          <button
            onClick={handleMarkRecovered}
            className="w-full bg-green-50 text-green-700 border border-green-200 py-3 rounded-xl font-semibold"
          >
            Mark as Recovered
          </button>
        )}
        {showDeleteConfirm ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
            <p className="text-sm text-red-700 mb-3">Delete this condition and all its symptom logs?</p>
            <div className="flex gap-2">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 border border-gray-300 py-2 rounded-lg text-sm">Cancel</button>
              <button onClick={handleDelete} className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-semibold">Delete</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full text-red-500 border border-red-200 py-2.5 rounded-xl text-sm"
          >
            Delete Condition
          </button>
        )}
      </div>
    </div>
  );
}

function SymptomTrendRow({
  symptom,
  logs,
  onDelete,
}: {
  symptom: Symptom;
  logs: SymptomLog[];
  onDelete: () => void;
}) {
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted[sorted.length - 1];
  const previous = sorted[sorted.length - 2];

  const trend =
    !latest ? null :
    !previous ? null :
    latest.severity < previous.severity ? 'improving' :
    latest.severity > previous.severity ? 'worsening' : 'stable';

  const TrendIcon = trend === 'improving' ? TrendingDown : trend === 'worsening' ? TrendingUp : Minus;
  const trendColor = trend === 'improving' ? 'text-green-500' : trend === 'worsening' ? 'text-red-500' : 'text-gray-400';

  // Build sparkline data (last 7 days)
  const last7 = sorted.slice(-7);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">{symptom.name}</span>
          {trend && <TrendIcon size={14} className={trendColor} />}
        </div>
        <div className="flex items-center gap-2">
          {latest && (
            <span className={`text-sm font-bold ${
              latest.severity <= 3 ? 'text-green-600' :
              latest.severity <= 6 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {latest.severity}/10
            </span>
          )}
          <button onClick={onDelete} className="text-gray-300 hover:text-red-400">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Sparkline */}
      {last7.length > 1 && (
        <div className="flex items-end gap-1 h-8">
          {last7.map((log, i) => {
            const height = Math.max(4, (log.severity / 10) * 100);
            const color =
              log.severity <= 3 ? 'bg-green-400' :
              log.severity <= 6 ? 'bg-yellow-400' : 'bg-red-400';
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <div
                  className={`w-full rounded-sm ${color} transition-all`}
                  style={{ height: `${height}%` }}
                />
                <span className="text-[9px] text-gray-400">
                  {new Date(log.date + 'T00:00:00').toLocaleDateString('en', { weekday: 'narrow' })}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {logs.length === 0 && (
        <p className="text-xs text-gray-400 italic">No logs yet — log today's severity to start tracking.</p>
      )}
    </div>
  );
}

function LogHistory({ logs, symptoms }: { logs: SymptomLog[]; symptoms: Symptom[] }) {
  const symptomMap = Object.fromEntries(symptoms.map(s => [s.id!, s.name]));

  // Group by date
  const byDate: Record<string, SymptomLog[]> = {};
  for (const log of logs) {
    if (!byDate[log.date]) byDate[log.date] = [];
    byDate[log.date].push(log);
  }
  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  if (dates.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="font-semibold text-gray-700 mb-3">Log History</h3>
      <div className="space-y-3">
        {dates.slice(0, 7).map(date => (
          <div key={date}>
            <p className="text-xs font-semibold text-gray-500 mb-1">
              {new Date(date + 'T00:00:00').toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
            </p>
            <div className="grid grid-cols-2 gap-1">
              {byDate[date].map(log => {
                const sev = log.severity;
                const bg = sev <= 3 ? 'bg-green-50 border-green-200' : sev <= 6 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200';
                const text = sev <= 3 ? 'text-green-700' : sev <= 6 ? 'text-yellow-700' : 'text-red-700';
                return (
                  <div key={log.id} className={`border rounded-lg px-3 py-2 ${bg}`}>
                    <p className="text-xs text-gray-600 truncate">{symptomMap[log.symptomId] ?? 'Unknown'}</p>
                    <p className={`text-sm font-bold ${text}`}>{sev}/10</p>
                    {log.notes && <p className="text-xs text-gray-400 truncate">{log.notes}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
