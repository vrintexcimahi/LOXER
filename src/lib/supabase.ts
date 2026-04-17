import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

function canCreateClient(url: string | undefined, key: string | undefined) {
  if (!url || !key) return false;
  if (!url.trim() || !key.trim()) return false;
  try {
    // Basic sanity check to avoid createClient throwing on invalid/missing URL.
    // (Auth features will still require a real Supabase project.)
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export const isSupabaseConfigured = canCreateClient(supabaseUrl, supabaseAnonKey);
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;
