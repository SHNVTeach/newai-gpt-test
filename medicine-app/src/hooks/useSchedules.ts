import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import type { Schedule } from '../types';

export function useSchedules(medicationId?: number) {
  const schedules = useLiveQuery(
    () =>
      medicationId !== undefined
        ? db.schedules.where('medicationId').equals(medicationId).toArray()
        : db.schedules.toArray(),
    [medicationId]
  ) ?? [];

  async function setSchedule(data: Omit<Schedule, 'id'>) {
    const existing = await db.schedules.where('medicationId').equals(data.medicationId).first();
    if (existing?.id) {
      return db.schedules.update(existing.id, data);
    }
    return db.schedules.add(data);
  }

  async function deleteSchedule(id: number) {
    return db.schedules.delete(id);
  }

  return { schedules, setSchedule, deleteSchedule };
}
