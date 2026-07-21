import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://mqikasdtpnqnzsrevunv.supabase.co/rest/v1/";
const SUPABASE_PUBLIC_KEY = "sb_publishable_BMfGHJ5MmI_NwTFUxhgDOg_csLt2QQL";

// Clean the URL if it contains the REST API suffix
const cleanUrl = SUPABASE_URL.endsWith('/rest/v1/')
  ? SUPABASE_URL.slice(0, -9)
  : SUPABASE_URL;

export const supabase = createClient(cleanUrl, SUPABASE_PUBLIC_KEY);
export { SUPABASE_URL, SUPABASE_PUBLIC_KEY };

