import { createClient } from '@supabase/supabase-js';

export interface SupabaseClientConfig {
  url: string;
  publishableKey: string;
}

export function createAppSupabaseClient(config: SupabaseClientConfig) {
  return createClient(config.url, config.publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}
