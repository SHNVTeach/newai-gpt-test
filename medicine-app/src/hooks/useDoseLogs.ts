import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import type { DoseLog } from '../types';

export function useDoseLogs(medicationId?: number) {
  const logs = useLiveQuery(
    () =>
      medicationId !== undefined
        ? db.doseLogs.where('medicationId').equals(medicationId).reverse().sortBy('scheduledTime')
        : db.doseLogs.orderBy('scheduledTime').reverse().toArray(),
    [medicationId]
  ) ?? [];

  async function logDose(data: Omit<DoseLog, 'id'>) {
    return db.doseLogs.add(data);
  }

  async function updateLog(id: number, data: Partial<DoseLog>) {
    return db.doseLogs.update(id, data);
  }

  async function getLogsForDate(date: string, medIds?: number[]) {
    const start = `${date}T00:00:00`;
    const end = `${date}T23:59:59`;
    let query = db.doseLogs.where('scheduledTime').between(start, end, true, true);
    const results = await query.toArray();
    if (medIds) return results.filter(l => medIds.includes(l.medicationId));
    return results;
  }

  return { logs, logDose, updateLog, getLogsForDate };
}
