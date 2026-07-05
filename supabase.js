import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ваш-проект.supabase.co'
const SUPABASE_ANON_KEY = 'ваш-anon-ключ'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
