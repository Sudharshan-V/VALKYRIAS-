import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLIC_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLIC_KEY) {
  throw new Error(
    'Missing Supabase configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.',
  );
}

// Clean the URL if it contains the REST API suffix
const cleanUrl = SUPABASE_URL.endsWith('/rest/v1/')
  ? SUPABASE_URL.slice(0, -9)
  : SUPABASE_URL;

export const supabase = createClient(cleanUrl, SUPABASE_PUBLIC_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
export { SUPABASE_URL, SUPABASE_PUBLIC_KEY };
