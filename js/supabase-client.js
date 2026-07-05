import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://ваш-проект.supabase.co';
const SUPABASE_ANON_KEY = 'ваш-anon-ключ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
