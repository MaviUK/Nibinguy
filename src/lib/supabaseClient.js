import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://cvduwxumfnasfpbfpbwk.supabase.co'
const supabaseKey = 'your-key-here'

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: localStorage  // explicitly use localStorage
  }
})
