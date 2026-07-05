import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://hiehzjvhtnibkemrvarj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpZWh6anZodG5pYmtlbXJ2YXJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyNjc3OTEsImV4cCI6MjA5ODg0Mzc5MX0.9d28QFEjvEZ8uxFRPgPIm6Ig1_vJTN4WcWL4mPwnHP4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
