import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tbaptguhwkiuozcmunal.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_-YZzIF9UHezIBObs0DZNow_fq-JTzpT'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
