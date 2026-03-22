import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, SkipForward, Clock } from 'lucide-react';
import { db } from '../db/database';
import { useMedications } from '../hooks/useMedications';
import { useProfile } from '../context/ProfileContext';
import type { DoseLog, Medication } from '../types';

interface EnrichedLog extends DoseLog {
  medName: string;
  dosage: string;
}

const STATUS_ICON = {
  taken: <CheckCircle2 size={16} className="text-green-500" />,
  missed: <XCircle size={16} className="text-red-500" />,
  skipped: <SkipForward size={16} className="text-gray-400" />,
};

const STATUS_LABEL = {
  taken: 'text-green-600',
  missed: 'text-red-500',
  skipped: 'text-gray-400',
};

function groupByDate(logs: EnrichedLog[]) {
  const groups: Record<string, EnrichedLog[]> = {};
  for (const log of logs) {
    const date = log.scheduledTime.split('T')[0];
    if (!groups[date]) groups[date] = [];
    groups[date].push(log);
  }
  return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
}

export function History() {
  const { activeProfileId } = useProfile();
  const { medications } = useMedications(activeProfileId ?? undefined);
  const [logs, setLogs] = useState<EnrichedLog[]>([]);
  const [filter, setFilter] = useState<'all' | 'taken' | 'missed' | 'skipped'>('all');

  useEffect(() => {
    if (!medications.length) { setLogs([]); return; }
    loadLogs(medications);
  }, [medications, filter]);

  async function loadLogs(meds: Medication[]) {
    const medIds = meds.map(m => m.id!);
    let query = db.doseLogs.where('medicationId').anyOf(medIds);
    const all = await query.reverse().sortBy('scheduledTime');
    const filtered = filter === 'all' ? all : all.filter(l => l.status === filter);
    const enriched: EnrichedLog[] = filtered.map(log => {
      const med = meds.find(m => m.id === log.medicationId);
      return { ...log, medName: med?.name ?? 'Unknown', dosage: med?.dosage ?? '' };
    });
    setLogs(enriched);
  }

  const grouped = groupByDate(logs);

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold text-gray-800">History</h2>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['all', 'taken', 'missed', 'skipped'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === f ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {grouped.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Clock size={40} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">No history yet</p>
        </div>
      ) : (
        grouped.map(([date, entries]) => (
          <div key={date}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              {new Date(date + 'T12:00:00').toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
            <div className="space-y-2">
              {entries.map((log, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3">
                  {STATUS_ICON[log.status]}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">{log.medName}</p>
                    <p className="text-xs text-gray-400">{log.dosage} · {log.scheduledTime.split('T')[1]?.slice(0, 5)}</p>
                  </div>
                  <span className={`text-xs font-medium capitalize ${STATUS_LABEL[log.status]}`}>
                    {log.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
