import Dexie, { type Table } from 'dexie';
import type {
  Profile, Medication, Schedule, DoseLog,
  Condition, ConditionMedication, Symptom, SymptomLog,
  VitalLog, SideEffect, Trigger, TriggerLog, WeatherLog,
} from '../types';

class MedTrackerDB extends Dexie {
  profiles!: Table<Profile>;
  medications!: Table<Medication>;
  schedules!: Table<Schedule>;
  doseLogs!: Table<DoseLog>;
  conditions!: Table<Condition>;
  conditionMedications!: Table<ConditionMedication>;
  symptoms!: Table<Symptom>;
  symptomLogs!: Table<SymptomLog>;
  vitalLogs!: Table<VitalLog>;
  sideEffects!: Table<SideEffect>;
  triggers!: Table<Trigger>;
  triggerLogs!: Table<TriggerLog>;
  weatherLogs!: Table<WeatherLog>;

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
    this.version(3).stores({
      profiles: '++id, name',
      medications: '++id, profileId, active',
      schedules: '++id, medicationId',
      doseLogs: '++id, medicationId, scheduledTime, status',
      conditions: '++id, profileId, status',
      conditionMedications: '++id, conditionId, medicationId',
      symptoms: '++id, conditionId',
      symptomLogs: '++id, symptomId, conditionId, date, loggedAt',
      vitalLogs: '++id, profileId, date, loggedAt',
      sideEffects: '++id, profileId, medicationId, date',
      triggers: '++id, profileId, category',
      triggerLogs: '++id, triggerId, profileId, conditionId, date',
      weatherLogs: '++id, profileId, date',
    });
  }
}

export const db = new MedTrackerDB();
