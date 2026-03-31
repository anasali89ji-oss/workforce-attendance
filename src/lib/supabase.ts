import { createClient } from '@supabase/supabase-js'

// Hardcoded fallbacks for Vercel (env vars may not be set in dashboard)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  || 'https://ftgmhxonpalytrnficfp.supabase.co'

const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0Z21oeG9ucGFseXRybmZpY2ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzMjAyOTgsImV4cCI6MjA1ODg5NjI5OH0.EuqnxIECj7JEAWHsOVwl89vx0sWAKH0QD3lFTy2Bsck'

const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0Z21oeG9ucGFseXRybmZpY2ZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc2MzYxNCwiZXhwIjoyMDkwMzM5NjE0fQ.B71EIHIpRkspwa1FBbOvv9jmH8Ik7CXtLYva2qiWM9Q'

// Client-side (respects RLS)
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Server-side admin (bypasses RLS)
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})
