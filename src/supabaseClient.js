import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://iivlxixcmlrqwdhewbuz.supabase.co'
const supabaseAnonKey = 'sb_publishable_H_obrhzr2n6zhfq-sQUKKw_Adp37KL7'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)