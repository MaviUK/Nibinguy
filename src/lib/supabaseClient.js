import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://cvduwxumfnasfpbfpbwk.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2ZHV3eHVtZm5hc2ZwYmZwYndrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNDQ0MjEsImV4cCI6MjA2NzgyMDQyMX0.IIDcHoXIGELwySwb_0aiNCph-oXmElQXQ6p02mSkXtQ'

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: localStorage // ✅ ensures session is remembered
  }
})
