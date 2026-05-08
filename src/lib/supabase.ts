import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let client;

const isValidUrl = (url: string | undefined) => {
  if (!url) return false;
  try {
    new URL(url);
    return url.startsWith('http');
  } catch {
    return false;
  }
};

export const isRealSupabase = isValidUrl(supabaseUrl) && supabaseAnonKey && supabaseAnonKey !== 'your_supabase_anon_key' && !supabaseAnonKey.includes('your_');

if (isRealSupabase) {
  console.log('Initializing real Supabase client');
  client = createClient(supabaseUrl!, supabaseAnonKey!);
} else {
  console.warn('Supabase URL or Anon Key is missing or invalid. Using mock client.');
  const mockQuery: any = {
    select: () => mockQuery,
    insert: () => mockQuery,
    update: () => mockQuery,
    delete: () => mockQuery,
    eq: () => mockQuery,
    single: () => mockQuery,
    then: (resolve: any) => resolve({ data: null, error: null }),
  };

  client = {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      getUser: async () => ({ data: { user: null } }),
      signInWithPassword: async () => ({ data: { session: null, user: null }, error: null }),
      signUp: async () => ({ data: { session: null, user: null }, error: null }),
      signOut: async () => ({ error: null }),
    },
    from: () => mockQuery
  } as any;
}

export const supabase = client;
