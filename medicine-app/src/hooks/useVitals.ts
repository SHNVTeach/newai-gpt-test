import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import type { VitalLog } from '../types';

export function useVitalLogs(profileId?: number, limit = 30) {
  return useLiveQuery(
    () => profileId
      ? db.vitalLogs.where('profileId').equals(profileId).reverse().limit(limit).toArray()
      : [],
    [profileId, limit]
  ) ?? [];
}

export function useVitalLogByDate(profileId?: number, date?: string) {
  return useLiveQuery(
    () => profileId && date
      ? db.vitalLogs.where('profileId').equals(profileId).and(v => v.date === date).first()
      : undefined,
    [profileId, date]
  );
}

export async function saveVitalLog(data: Omit<VitalLog, 'id'>): Promise<number> {
  const existing = await db.vitalLogs
    .where('profileId').equals(data.profileId)
    .and(v => v.date === data.date)
    .first();
  if (existing?.id) {
    await db.vitalLogs.update(existing.id, { ...data });
    return existing.id;
  }
  return db.vitalLogs.add(data);
}

export async function deleteVitalLog(id: number): Promise<void> {
  await db.vitalLogs.delete(id);
}
