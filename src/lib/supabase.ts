import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || supabaseUrl.includes('your-project-id')) {
  const msg = 'Supabase URL is missing or invalid. Please set VITE_SUPABASE_URL in your environment variables.';
  console.error(msg);
}

if (!supabaseKey || supabaseKey === 'your-anon-key') {
  const msg = 'Supabase Anon Key is missing or invalid. Please set VITE_SUPABASE_ANON_KEY in your environment variables.';
  console.error(msg);
}

export const isSupabaseConfigured = !!(
  supabaseUrl && 
  !supabaseUrl.includes('your-project-id') &&
  supabaseKey && 
  supabaseKey !== 'your-anon-key'
);

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseKey || 'placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'psms-pro-auth-token-v2',
      flowType: 'pkce',
      storage: window.localStorage,
    }
  }
);

/**
 * Helper to check if the Supabase connection is working
 */
export async function checkSupabaseConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('stations').select('id').limit(1);
    if (error) {
      if (error.message.includes('Failed to fetch')) {
        return { 
          success: false, 
          error: 'Connection failed. Please verify your VITE_SUPABASE_URL and ensure your project is active.' 
        };
      }
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('Failed to fetch')) {
      return { 
        success: false, 
        error: 'Network error: Failed to connect to Supabase. Check your internet and Supabase URL.' 
      };
    }
    return { success: false, error: message };
  }
}
