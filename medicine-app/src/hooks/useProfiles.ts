import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import type { Profile } from '../types';

export function useProfiles() {
  const profiles = useLiveQuery(() => db.profiles.toArray(), []) ?? [];

  async function addProfile(data: Omit<Profile, 'id' | 'createdAt'>) {
    return db.profiles.add({ ...data, createdAt: new Date() });
  }

  async function updateProfile(id: number, data: Partial<Profile>) {
    return db.profiles.update(id, data);
  }

  async function deleteProfile(id: number) {
    const meds = await db.medications.where('profileId').equals(id).toArray();
    const medIds = meds.map(m => m.id!);
    await db.doseLogs.where('medicationId').anyOf(medIds).delete();
    await db.schedules.where('medicationId').anyOf(medIds).delete();
    await db.medications.where('profileId').equals(id).delete();
    await db.profiles.delete(id);
  }

  return { profiles, addProfile, updateProfile, deleteProfile };
}
