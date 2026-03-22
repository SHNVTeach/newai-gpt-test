import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import type { Medication } from '../types';

export function useMedications(profileId?: number) {
  const medications = useLiveQuery(
    () =>
      profileId !== undefined
        ? db.medications.where('profileId').equals(profileId).toArray()
        : db.medications.toArray(),
    [profileId]
  ) ?? [];

  async function addMedication(data: Omit<Medication, 'id'>) {
    return db.medications.add(data);
  }

  async function updateMedication(id: number, data: Partial<Medication>) {
    return db.medications.update(id, data);
  }

  async function deleteMedication(id: number) {
    await db.doseLogs.where('medicationId').equals(id).delete();
    await db.schedules.where('medicationId').equals(id).delete();
    await db.medications.delete(id);
  }

  async function adjustCount(id: number, delta: number) {
    const med = await db.medications.get(id);
    if (!med) return;
    const newCount = Math.max(0, med.currentCount + delta);
    return db.medications.update(id, { currentCount: newCount });
  }

  return { medications, addMedication, updateMedication, deleteMedication, adjustCount };
}
