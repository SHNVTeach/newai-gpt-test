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
