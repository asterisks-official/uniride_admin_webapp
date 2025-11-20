import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './types';

// This module is SERVER-ONLY and must never be exposed to the client
// It uses the service role key which has elevated privileges

// Validate required environment variables
function validateEnv(): void {
  const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required Supabase environment variables: ${missing.join(', ')}`
    );
  }
}

// Initialize Supabase client with service role key
function createSupabaseServerClient(): SupabaseClient<Database> {
  validateEnv();

  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        // Disable auth persistence for server-side client
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );
}

// Export singleton Supabase client instance
export const supabase = createSupabaseServerClient();
