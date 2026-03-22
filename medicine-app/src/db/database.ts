import Dexie, { type Table } from 'dexie';
import type { Profile, Medication, Schedule, DoseLog, Condition, ConditionMedication, Symptom, SymptomLog } from '../types';

class MedTrackerDB extends Dexie {
  profiles!: Table<Profile>;
  medications!: Table<Medication>;
  schedules!: Table<Schedule>;
  doseLogs!: Table<DoseLog>;
  conditions!: Table<Condition>;
  conditionMedications!: Table<ConditionMedication>;
  symptoms!: Table<Symptom>;
  symptomLogs!: Table<SymptomLog>;

  constructor() {
    super('MedTrackerDB');
    this.version(1).stores({
      profiles: '++id, name',
      medications: '++id, profileId, active',
      schedules: '++id, medicationId',
      doseLogs: '++id, medicationId, scheduledTime, status',
    });
    this.version(2).stores({
      profiles: '++id, name',
      medications: '++id, profileId, active',
      schedules: '++id, medicationId',
      doseLogs: '++id, medicationId, scheduledTime, status',
      conditions: '++id, profileId, status',
      conditionMedications: '++id, conditionId, medicationId',
      symptoms: '++id, conditionId',
      symptomLogs: '++id, symptomId, conditionId, date, loggedAt',
    });
  }
}

export const db = new MedTrackerDB();
