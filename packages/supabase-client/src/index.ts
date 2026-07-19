import { createClient, type SupabaseClientOptions } from '@supabase/supabase-js';

import type { Database } from './database';

export type { Session } from '@supabase/supabase-js';
export type { Database } from './database';
export type { Database as GeneratedDatabase } from './database.types';

export interface SupabaseClientConfig {
  url: string;
  publishableKey: string;
  auth?: SupabaseClientOptions<'public'>['auth'];
}

export function createAppSupabaseClient(config: SupabaseClientConfig) {
  return createClient<Database>(config.url, config.publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      ...config.auth,
    },
  });
}

export type AppSupabaseClient = ReturnType<typeof createAppSupabaseClient>;

export * from './auth';
export * from './errors';
export * from './patientEntries';
export * from './patientExercises';
export * from './patientFoodForms';
export * from './patientMeals';
export * from './patientMedications';
export * from './patientMenstruation';
export * from './patientNotes';
export * from './patientPhotos';
export * from './patientSymptoms';
export * from './patientStools';
export * from './patientBaseline';
export * from './patientDailyForms';
export * from './profiles';
export * from './doctorPanel';
export * from './doctorTimeline';
