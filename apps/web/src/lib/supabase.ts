import { createAppSupabaseClient } from '@project4/supabase-client';

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(url && publishableKey);

export const supabase = isSupabaseConfigured
  ? createAppSupabaseClient({ url, publishableKey })
  : null;
