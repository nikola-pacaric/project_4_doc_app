import { createClient, type SupabaseClientOptions } from '@supabase/supabase-js';

export type { Session } from '@supabase/supabase-js';

export interface SupabaseClientConfig {
  url: string;
  publishableKey: string;
  auth?: SupabaseClientOptions<'public'>['auth'];
}

export function createAppSupabaseClient(config: SupabaseClientConfig) {
  return createClient(config.url, config.publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      ...config.auth,
    },
  });
}

export type AppSupabaseClient = ReturnType<typeof createAppSupabaseClient>;

export * from './auth';
export * from './patientEntries';
export * from './patientBaseline';
export * from './profiles';
