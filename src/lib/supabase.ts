import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { localClient } from './localClient';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const useLocalDb = import.meta.env.VITE_USE_LOCAL_DB === 'true';

function canCreateClient(url: string | undefined, key: string | undefined) {
  if (!url || !key) return false;
  if (!url.trim() || !key.trim()) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

const hasCloudSupabase = canCreateClient(supabaseUrl, supabaseAnonKey) && !useLocalDb;

export const isLocalMode = !hasCloudSupabase;
export const isSupabaseConfigured = true;
export const supabase: SupabaseClient = hasCloudSupabase
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : (localClient as unknown as SupabaseClient);
