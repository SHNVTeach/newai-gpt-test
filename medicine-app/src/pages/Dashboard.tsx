import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, SkipForward, Pill } from 'lucide-react';
import { db } from '../db/database';
import { useMedications } from '../hooks/useMedications';
import { useProfile } from '../context/ProfileContext';
import type { Medication, Schedule, DoseLog } from '../types';

interface DoseEntry {
  med: Medication;
  schedule: Schedule;
  time: string;
  scheduledTime: string;
  log: DoseLog | null;
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function getScheduledTimes(schedule: Schedule): string[] {
  const today = new Date().getDay();
  if (schedule.days.length > 0 && !schedule.days.includes(today)) return [];
  const todayDate = todayStr();
  if (schedule.endDate && todayDate > schedule.endDate) return [];
  if (todayDate < schedule.startDate) return [];
  return schedule.times;
}

export function Dashboard() {
  const navigate = useNavigate();
  const { activeProfileId } = useProfile();
  const { medications } = useMedications(activeProfileId ?? undefined);
  const [entries, setEntries] = useState<DoseEntry[]>([]);

  useEffect(() => {
    if (!medications.length) { setEntries([]); return; }
    buildEntries();
  }, [medications]);

  async function buildEntries() {
    const today = todayStr();
    const result: DoseEntry[] = [];
    for (const med of medications) {
      const schedule = await db.schedules.where('medicationId').equals(med.id!).first();
      if (!schedule) continue;
      const times = getScheduledTimes(schedule);
      for (const time of times) {
        const scheduledTime = `${today}T${time}:00`;
        const log = await db.doseLogs.where('scheduledTime').equals(scheduledTime).first();
        result.push({ med, schedule, time, scheduledTime, log: log ?? null });
      }
    }
    result.sort((a, b) => a.time.localeCompare(b.time));
    setEntries(result);
  }

  async function markDose(entry: DoseEntry, status: DoseLog['status']) {
    if (entry.log?.id) {
      await db.doseLogs.update(entry.log.id, {
        status,
        takenAt: status === 'taken' ? Date.now() : undefined,
      });
    } else {
      await db.doseLogs.add({
        medicationId: entry.med.id!,
        scheduledTime: entry.scheduledTime,
        takenAt: status === 'taken' ? Date.now() : undefined,
        status,
      });
    }
    // Decrement count if taken
    if (status === 'taken' && entry.med.currentCount > 0) {
      await db.medications.update(entry.med.id!, { currentCount: entry.med.currentCount - 1 });
    }
    buildEntries();
  }

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

  const pending = entries.filter(e => !e.log);
  const done = entries.filter(e => !!e.log);

  if (!activeProfileId) {
    return (
      <div className="p-4 text-center text-gray-500 mt-8">
        <p>No profile selected.</p>
        <button onClick={() => navigate('/profiles')} className="mt-2 text-indigo-600 font-medium">Go to Profiles →</button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <p className="text-2xl font-bold text-gray-800">{timeStr}</p>
        <p className="text-sm text-gray-500">{dateStr}</p>
      </div>

      {entries.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Pill size={40} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">No doses scheduled today</p>
          <button onClick={() => navigate('/medications')} className="mt-2 text-indigo-600 text-sm font-medium">
            Add medications →
          </button>
        </div>
      )}

      {pending.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Upcoming</h3>
          <div className="space-y-2">
            {pending.map((e, i) => (
              <DoseCard key={i} entry={e} onAction={markDose} />
            ))}
          </div>
        </div>
      )}

      {done.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Done</h3>
          <div className="space-y-2">
            {done.map((e, i) => (
              <DoseCard key={i} entry={e} onAction={markDose} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DoseCard({ entry, onAction }: { entry: DoseEntry; onAction: (e: DoseEntry, s: DoseLog['status']) => void }) {
  const status = entry.log?.status;

  const statusStyles: Record<string, string> = {
    taken: 'bg-green-50 border-green-200',
    missed: 'bg-red-50 border-red-200',
    skipped: 'bg-gray-50 border-gray-200',
  };

  return (
    <div className={`bg-white rounded-xl border p-4 flex items-center gap-3 ${status ? statusStyles[status] : 'border-gray-200'}`}>
      <div className="flex-1">
        <p className="font-semibold text-gray-800">{entry.med.name}</p>
        <p className="text-sm text-gray-500">{entry.med.dosage}{entry.med.instructions ? ` · ${entry.med.instructions}` : ''}</p>
        <p className="text-xs text-gray-400 mt-0.5">{entry.time}</p>
      </div>
      {!status ? (
        <div className="flex gap-2">
          <button
            onClick={() => onAction(entry, 'taken')}
            className="p-2 text-green-500 hover:bg-green-50 rounded-lg transition-colors"
            title="Taken"
          >
            <CheckCircle2 size={22} />
          </button>
          <button
            onClick={() => onAction(entry, 'skipped')}
            className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg transition-colors"
            title="Skip"
          >
            <SkipForward size={20} />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          {status === 'taken' && <CheckCircle2 size={20} className="text-green-500" />}
          {status === 'missed' && <XCircle size={20} className="text-red-500" />}
          {status === 'skipped' && <SkipForward size={20} className="text-gray-400" />}
          <span className="text-xs text-gray-500 capitalize">{status}</span>
        </div>
      )}
    </div>
  );
}
