import Dexie, { type Table } from 'dexie';
import type { Profile, Medication, Schedule, DoseLog } from '../types';

class MedTrackerDB extends Dexie {
  profiles!: Table<Profile>;
  medications!: Table<Medication>;
  schedules!: Table<Schedule>;
  doseLogs!: Table<DoseLog>;

  constructor() {
    super('MedTrackerDB');
    this.version(1).stores({
      profiles: '++id, name',
      medications: '++id, profileId, active',
      schedules: '++id, medicationId',
      doseLogs: '++id, medicationId, scheduledTime, status',
    });
  }
}

export const db = new MedTrackerDB();
