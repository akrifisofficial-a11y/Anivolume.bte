import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fkjqlcgsftkyerwnakkd.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZranFsY2dzZnRreWVyd25ha2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyNjk4ODIsImV4cCI6MjA5ODg0NTg4Mn0.zrDG6Lsmrxr4eunZO1kXoZgRIwCAPcMmdYHy9NbuzGg'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
