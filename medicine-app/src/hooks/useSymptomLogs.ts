import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import type { SymptomLog } from '../types';

export function useSymptomLogs(conditionId?: number) {
  return useLiveQuery(
    () => conditionId
      ? db.symptomLogs.where('conditionId').equals(conditionId).sortBy('loggedAt')
      : [],
    [conditionId]
  ) ?? [];
}

export function useSymptomLogsByDate(conditionId?: number, date?: string) {
  return useLiveQuery(
    () => conditionId && date
      ? db.symptomLogs
          .where('conditionId').equals(conditionId)
          .and(log => log.date === date)
          .toArray()
      : [],
    [conditionId, date]
  ) ?? [];
}

export function useTodaySymptomLogs(conditionId?: number) {
  const today = new Date().toISOString().split('T')[0];
  return useSymptomLogsByDate(conditionId, today);
}

export async function logSymptom(data: Omit<SymptomLog, 'id'>): Promise<number> {
  // If already logged today for this symptom, update instead
  const existing = await db.symptomLogs
    .where('symptomId').equals(data.symptomId)
    .and(log => log.date === data.date)
    .first();
  if (existing?.id) {
    await db.symptomLogs.update(existing.id, { severity: data.severity, notes: data.notes, loggedAt: data.loggedAt });
    return existing.id;
  }
  return db.symptomLogs.add(data);
}

export async function getSymptomHistory(symptomId: number): Promise<SymptomLog[]> {
  return db.symptomLogs.where('symptomId').equals(symptomId).sortBy('date');
}

export async function getAllConditionSymptomHistory(conditionId: number): Promise<{
  symptomId: number;
  symptomName: string;
  logs: SymptomLog[];
}[]> {
  const symptoms = await db.symptoms.where('conditionId').equals(conditionId).toArray();
  const result = await Promise.all(
    symptoms.map(async (s) => ({
      symptomId: s.id!,
      symptomName: s.name,
      logs: await db.symptomLogs.where('symptomId').equals(s.id!).sortBy('date'),
    }))
  );
  return result;
}

// Returns the most recent date that has logs for this condition
export async function getLastLogDate(conditionId: number): Promise<string | null> {
  const latest = await db.symptomLogs
    .where('conditionId').equals(conditionId)
    .toArray()
    .then(logs => logs.sort((a, b) => b.loggedAt - a.loggedAt)[0]);
  return latest?.date ?? null;
}

// Check if all symptoms have been logged today
export async function isTodayLogged(conditionId: number): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];
  const symptoms = await db.symptoms.where('conditionId').equals(conditionId).toArray();
  if (symptoms.length === 0) return false;
  const todayLogs = await db.symptomLogs
    .where('conditionId').equals(conditionId)
    .and(log => log.date === today)
    .toArray();
  return todayLogs.length >= symptoms.length;
}
