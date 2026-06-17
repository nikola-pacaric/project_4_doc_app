import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAppSupabaseClient } from '@project4/supabase-client';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(url && publishableKey);

export const supabase = isSupabaseConfigured
  ? createAppSupabaseClient({
      url: url!,
      publishableKey: publishableKey!,
      auth: {
        storage: AsyncStorage,
        detectSessionInUrl: false,
      },
    })
  : null;
