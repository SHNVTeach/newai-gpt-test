import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import type { Condition, ConditionMedication, Symptom } from '../types';

export function useConditions(profileId?: number) {
  const conditions = useLiveQuery(
    () => profileId ? db.conditions.where('profileId').equals(profileId).toArray() : [],
    [profileId]
  );
  return conditions ?? [];
}

export function useCondition(conditionId?: number) {
  return useLiveQuery(
    () => conditionId ? db.conditions.get(conditionId) : undefined,
    [conditionId]
  );
}

export async function createCondition(data: Omit<Condition, 'id'>): Promise<number> {
  return db.conditions.add(data);
}

export async function updateCondition(id: number, data: Partial<Condition>): Promise<void> {
  await db.conditions.update(id, data);
}

export async function deleteCondition(id: number): Promise<void> {
  await db.transaction('rw', db.conditions, db.conditionMedications, db.symptoms, db.symptomLogs, async () => {
    const symptoms = await db.symptoms.where('conditionId').equals(id).toArray();
    const symptomIds = symptoms.map(s => s.id!);
    if (symptomIds.length > 0) {
      await db.symptomLogs.where('symptomId').anyOf(symptomIds).delete();
    }
    await db.symptoms.where('conditionId').equals(id).delete();
    await db.conditionMedications.where('conditionId').equals(id).delete();
    await db.conditions.delete(id);
  });
}

export function useConditionMedications(conditionId?: number) {
  return useLiveQuery(
    () => conditionId ? db.conditionMedications.where('conditionId').equals(conditionId).toArray() : [],
    [conditionId]
  ) ?? [];
}

export async function linkMedication(conditionId: number, medicationId: number): Promise<void> {
  const existing = await db.conditionMedications
    .where('conditionId').equals(conditionId)
    .and(cm => cm.medicationId === medicationId)
    .first();
  if (!existing) {
    await db.conditionMedications.add({ conditionId, medicationId });
  }
}

export async function unlinkMedication(conditionId: number, medicationId: number): Promise<void> {
  await db.conditionMedications
    .where('conditionId').equals(conditionId)
    .and(cm => cm.medicationId === medicationId)
    .delete();
}

export function useConditionSymptoms(conditionId?: number) {
  return useLiveQuery(
    () => conditionId ? db.symptoms.where('conditionId').equals(conditionId).toArray() : [],
    [conditionId]
  ) ?? [];
}

export async function addSymptom(data: Omit<Symptom, 'id'>): Promise<number> {
  return db.symptoms.add(data);
}

export async function deleteSymptom(id: number): Promise<void> {
  await db.transaction('rw', db.symptoms, db.symptomLogs, async () => {
    await db.symptomLogs.where('symptomId').equals(id).delete();
    await db.symptoms.delete(id);
  });
}

export async function getConditionMedications(conditionId: number): Promise<ConditionMedication[]> {
  return db.conditionMedications.where('conditionId').equals(conditionId).toArray();
}
