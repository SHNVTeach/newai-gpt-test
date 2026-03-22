import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import type { Trigger, TriggerLog } from '../types';

export function useTriggers(profileId?: number) {
  return useLiveQuery(
    () => profileId ? db.triggers.where('profileId').equals(profileId).toArray() : [],
    [profileId]
  ) ?? [];
}

export function useTriggerLogs(profileId?: number, limit = 50) {
  return useLiveQuery(
    () => profileId
      ? db.triggerLogs.where('profileId').equals(profileId).reverse().limit(limit).toArray()
      : [],
    [profileId, limit]
  ) ?? [];
}

export function useTodayTriggerLogs(profileId?: number) {
  const today = new Date().toISOString().split('T')[0];
  return useLiveQuery(
    () => profileId
      ? db.triggerLogs.where('profileId').equals(profileId).and(l => l.date === today).toArray()
      : [],
    [profileId, today]
  ) ?? [];
}

export async function addTrigger(data: Omit<Trigger, 'id'>): Promise<number> {
  return db.triggers.add(data);
}

export async function deleteTrigger(id: number): Promise<void> {
  await db.transaction('rw', db.triggers, db.triggerLogs, async () => {
    await db.triggerLogs.where('triggerId').equals(id).delete();
    await db.triggers.delete(id);
  });
}

export async function logTrigger(data: Omit<TriggerLog, 'id'>): Promise<number> {
  return db.triggerLogs.add(data);
}

export async function deleteTriggerLog(id: number): Promise<void> {
  await db.triggerLogs.delete(id);
}
