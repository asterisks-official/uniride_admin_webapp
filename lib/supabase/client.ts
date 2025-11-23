import { createClient, SupabaseClient } from '@supabase/supabase-js';

// This module is CLIENT-SIDE and uses the anon key (safe to expose)
// It's used for Realtime subscriptions and client-side queries

let supabaseClientInstance: SupabaseClient<any> | null = null;

// Check if running in browser environment
function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

// Validate required environment variables
function validateEnv(): void {
  const required = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required Supabase environment variables: ${missing.join(', ')}`
    );
  }
}

// Initialize Supabase client with anon key (lazy)
function createSupabaseClient(): SupabaseClient<any> {
  if (supabaseClientInstance) {
    return supabaseClientInstance;
  }

  validateEnv();

  supabaseClientInstance = createClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    }
  );

  return supabaseClientInstance;
}

// Export lazy-initialized Supabase client instance
export function getSupabaseClient(): SupabaseClient<any> {
  return createSupabaseClient();
}

// Export singleton for backward compatibility using Proxy
export const supabaseClient = new Proxy({} as SupabaseClient<any>, {
  get(target, prop) {
    if (!isBrowser()) {
      throw new Error('Supabase client cannot be accessed during SSR');
    }
    const client = getSupabaseClient();
    const value = client[prop as keyof SupabaseClient<any>];
    // Bind methods to the client instance
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  }
});
