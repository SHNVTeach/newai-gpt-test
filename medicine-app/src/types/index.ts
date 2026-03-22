export interface Profile {
  id?: number;
  name: string;
  color: string;
  avatar: string;
  createdAt: Date;
}

export interface Medication {
  id?: number;
  profileId: number;
  name: string;
  dosage: string;
  form: 'pill' | 'liquid' | 'injection' | 'patch' | 'other';
  instructions?: string;
  currentCount: number;
  refillAt: number;
  color?: string;
  active: boolean;
}

export interface Schedule {
  id?: number;
  medicationId: number;
  times: string[];
  days: number[]; // 0=Sun..6=Sat, empty = every day
  startDate: string;
  endDate?: string;
}

export interface DoseLog {
  id?: number;
  medicationId: number;
  scheduledTime: string;
  takenAt?: number; // timestamp ms
  status: 'taken' | 'missed' | 'skipped';
  notes?: string;
}

export interface Condition {
  id?: number;
  profileId: number;
  name: string;
  description?: string;
  startDate: string; // ISO date string
  endDate?: string;
  status: 'active' | 'recovered' | 'monitoring';
  createdAt: number; // timestamp ms
}

export interface ConditionMedication {
  id?: number;
  conditionId: number;
  medicationId: number;
}

export interface Symptom {
  id?: number;
  conditionId: number;
  name: string; // e.g. "headache", "congestion"
}

export interface SymptomLog {
  id?: number;
  symptomId: number;
  conditionId: number;
  severity: number; // 1-10
  notes?: string;
  loggedAt: number; // timestamp ms
  date: string; // ISO date string YYYY-MM-DD
}

export interface VitalLog {
  id?: number;
  profileId: number;
  date: string; // YYYY-MM-DD
  loggedAt: number;
  temperature?: number;       // °C or °F depending on user pref
  temperatureUnit?: 'C' | 'F';
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;         // bpm
  sleepHours?: number;        // hours
  weight?: number;            // kg or lbs
  weightUnit?: 'kg' | 'lbs';
  oxygenSaturation?: number;  // %
  notes?: string;
}

export interface SideEffect {
  id?: number;
  profileId: number;
  medicationId: number;
  name: string;               // e.g. "Nausea", "Dizziness"
  severity: number;           // 1-10
  date: string;               // YYYY-MM-DD
  loggedAt: number;
  notes?: string;
}

export interface Trigger {
  id?: number;
  profileId: number;
  name: string;               // e.g. "Stress", "Caffeine", "Poor sleep"
  category: 'food' | 'lifestyle' | 'environment' | 'stress' | 'other';
}

export interface TriggerLog {
  id?: number;
  triggerId: number;
  profileId: number;
  conditionId?: number;
  date: string;               // YYYY-MM-DD
  loggedAt: number;
  intensity: number;          // 1-10
  notes?: string;
}

export interface WeatherLog {
  id?: number;
  date: string;               // YYYY-MM-DD
  profileId: number;
  tempC?: number;
  humidity?: number;          // %
  description?: string;       // e.g. "Partly cloudy"
  windSpeed?: number;         // km/h
  pressure?: number;          // hPa
  city?: string;
  fetchedAt: number;
}
