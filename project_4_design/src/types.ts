/**
 * SPDX-License-Identifier: Apache-2.0
 */

export type Language = 'EN' | 'SR';
export type Theme = 'light' | 'dark';

export interface PatientProfile {
  fullName: string;
  email: string;
  birthYear?: string;
  gender?: 'Female' | 'Male' | 'Other';
  occupation?: string;
  weight?: string;
  height?: string;
  recentWeightChange?: 'Yes' | 'No';
  weightChangeAmount?: string;
  weightChangePeriod?: string;
  weightChangeReason?: string;
  profileCompleted: boolean;
}

export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';

export interface MealLog {
  id: string;
  type: MealType;
  name: string;
  time: string;
  description: string;
  status: 'synced' | 'pending';
  timestamp: string;
}

export interface HydrationLog {
  id: string;
  amountCups: number;
  type: string;
  time: string;
  status: 'synced' | 'pending';
  timestamp: string;
}

export interface SleepLog {
  id: string;
  wakeTime: string;
  sleepTime: string;
  durationHours: number;
  durationMinutes: number;
  quality: 'Good' | 'Fair' | 'Poor';
  status: 'synced' | 'pending';
  timestamp: string;
}

export interface SymptomLog {
  id: string;
  symptoms: string[]; // 'Bloating' | 'Nausea' | 'Fatigue' | 'Pain'
  startDate?: string;
  startTime?: string;
  isOngoing?: boolean;
  painDetails?: {
    intensity: '1' | '2' | '3'; // Mild, Moderate, Severe
    description: string;
    affectsDaily: 'Not at all' | 'A little' | 'Moderately' | 'A lot';
  };
  status: 'synced' | 'pending';
  timestamp: string;
}

export interface StoolLog {
  id: string;
  bristolType: number; // 1-7
  urgency: 'None' | 'Mild' | 'Moderate' | 'Severe';
  painCramping: boolean;
  mucusInStool: boolean;
  bloodInStool: boolean;
  fattyOilyStool: boolean;
  blackTarryStool: boolean;
  notes: string;
  status: 'synced' | 'pending';
  timestamp: string;
}

export interface MedicationLog {
  id: string;
  name: string;
  dose: string;
  time: string;
  reason: string;
  isChronic: boolean;
  status: 'synced' | 'pending';
  timestamp: string;
}

export interface ExerciseLog {
  id: string;
  activityType: string;
  durationMinutes: number;
  intensity: 'Light' | 'Moderate' | 'Vigorous';
  notes: string;
  status: 'synced' | 'pending';
  timestamp: string;
}

export interface MenstruationLog {
  id: string;
  flow: 'Light' | 'Moderate' | 'Heavy';
  symptoms: string[];
  notes: string;
  status: 'synced' | 'pending';
  timestamp: string;
}

export interface CustomNoteLog {
  id: string;
  noteType: string;
  title: string;
  content: string;
  voiceUrl?: string;
  photoUrl?: string;
  status: 'synced' | 'pending';
  timestamp: string;
}

export type PatientEntry =
  | { type: 'meal'; data: MealLog }
  | { type: 'hydration'; data: HydrationLog }
  | { type: 'sleep'; data: SleepLog }
  | { type: 'symptom'; data: SymptomLog }
  | { type: 'stool'; data: StoolLog }
  | { type: 'medication'; data: MedicationLog }
  | { type: 'exercise'; data: ExerciseLog }
  | { type: 'menstruation'; data: MenstruationLog }
  | { type: 'note'; data: CustomNoteLog };

export interface InviteCode {
  code: string;
  created: string;
  expires: string;
  status: 'Unused' | 'Redeemed' | 'Expired' | 'Revoked';
  patientName?: string;
}

export interface ExportSetup {
  period: 'all' | 'custom' | 'current_month';
  customDate?: string;
  exportContent: 'all_data' | 'all_with_images' | 'images_only';
  exportFormat: 'json_files' | 'raw_audit' | 'embedded_base64';
}

export function getPatientEntryDetails(entry: PatientEntry): {
  id: string;
  name: string;
  description: string;
  time: string;
  timestamp: string;
  status: 'synced' | 'pending';
} {
  switch (entry.type) {
    case 'meal':
      return {
        id: entry.data.id,
        name: entry.data.name,
        description: entry.data.description,
        time: entry.data.time,
        timestamp: entry.data.timestamp,
        status: entry.data.status
      };
    case 'hydration':
      return {
        id: entry.data.id,
        name: `Water Intake (${entry.data.amountCups} cups)`,
        description: `Registered hydration tracker. Total: ${(entry.data.amountCups * 250) / 1000} Liters.`,
        time: entry.data.time,
        timestamp: entry.data.timestamp,
        status: entry.data.status
      };
    case 'sleep':
      return {
        id: entry.data.id,
        name: 'Sleep Quality Log',
        description: `Slept ${entry.data.durationHours} hours ${entry.data.durationMinutes} mins. Reported quality: ${entry.data.quality}.`,
        time: entry.data.wakeTime,
        timestamp: entry.data.timestamp,
        status: entry.data.status
      };
    case 'symptom': {
      const d = entry.data;
      const title = `Symptoms: ${d.symptoms.join(', ')}`;
      const desc = d.painDetails 
        ? `Intensity: ${d.painDetails.intensity} (1-3). Affects day: ${d.painDetails.affectsDaily}. Note: ${d.painDetails.description}`
        : `Logged: ${d.symptoms.join(', ')}.`;
      return {
        id: d.id,
        name: title,
        description: desc,
        time: d.startTime || '00:00',
        timestamp: d.timestamp,
        status: d.status
      };
    }
    case 'stool':
      return {
        id: entry.data.id,
        name: `Stool Log (Bristol Scale ${entry.data.bristolType})`,
        description: `Urgency: ${entry.data.urgency}. Cramps: ${entry.data.painCramping ? 'Yes' : 'No'}. Notes: ${entry.data.notes}`,
        time: '14:10', // Default typical stool log time in board
        timestamp: entry.data.timestamp,
        status: entry.data.status
      };
    case 'medication':
      return {
        id: entry.data.id,
        name: `Medication: ${entry.data.name}`,
        description: `Dose: ${entry.data.dose}. Chronic: ${entry.data.isChronic ? 'Yes' : 'No'}. Reason: ${entry.data.reason}`,
        time: entry.data.time,
        timestamp: entry.data.timestamp,
        status: entry.data.status
      };
    case 'exercise':
      return {
        id: entry.data.id,
        name: `Exercise: ${entry.data.activityType}`,
        description: `Duration: ${entry.data.durationMinutes} mins. Intensity: ${entry.data.intensity}. Notes: ${entry.data.notes}`,
        time: '16:45', // Default typical walk time in board
        timestamp: entry.data.timestamp,
        status: entry.data.status
      };
    case 'menstruation':
      return {
        id: entry.data.id,
        name: 'Menstrual Cycle Log',
        description: `Flow: ${entry.data.flow}. Symptoms: ${entry.data.symptoms.join(', ')}. Details: ${entry.data.notes}`,
        time: '09:00',
        timestamp: entry.data.timestamp,
        status: entry.data.status
      };
    case 'note':
      return {
        id: entry.data.id,
        name: entry.data.title || 'General Note',
        description: entry.data.content,
        time: '19:10', // Default note log time
        timestamp: entry.data.timestamp,
        status: entry.data.status
      };
  }
}

