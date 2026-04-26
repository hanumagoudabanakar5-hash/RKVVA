import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || (!supabaseAnonKey && !supabaseServiceRoleKey)) {
  console.warn("Supabase credentials missing! Authentication flows will fail.");
}

// Use Service Role Key for backend operations if available to bypass RLS
const supabaseKey = supabaseServiceRoleKey || supabaseAnonKey;

if (supabaseServiceRoleKey) {
  console.log("[Supabase] Initialized with Service Role Key (RLS Bypassed)");
} else {
  console.warn("[Supabase] Initialized with Anon Key (RLS Enabled - Storage uploads may fail)");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
