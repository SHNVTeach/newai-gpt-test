import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import type { SideEffect } from '../types';

export function useSideEffects(profileId?: number) {
  return useLiveQuery(
    () => profileId
      ? db.sideEffects.where('profileId').equals(profileId).reverse().toArray()
      : [],
    [profileId]
  ) ?? [];
}

export function useSideEffectsForMed(medicationId?: number) {
  return useLiveQuery(
    () => medicationId
      ? db.sideEffects.where('medicationId').equals(medicationId).reverse().toArray()
      : [],
    [medicationId]
  ) ?? [];
}

export async function addSideEffect(data: Omit<SideEffect, 'id'>): Promise<number> {
  return db.sideEffects.add(data);
}

export async function deleteSideEffect(id: number): Promise<void> {
  await db.sideEffects.delete(id);
}
