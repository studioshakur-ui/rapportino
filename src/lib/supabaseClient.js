import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '❌ VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY manquant. ' +
      'Vérifie ton .env.local et les variables Netlify.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
