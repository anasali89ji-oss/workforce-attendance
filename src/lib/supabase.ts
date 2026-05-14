import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// Throw clearly at module load (request-time on server, build-time skipped by Next.js)
// Use IIFE so we can conditionally throw without breaking client bundle
function createBrowserClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    if (typeof window !== 'undefined') {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
    }
    // At build time on server, return a lazy proxy — real calls will fail at request time
    return null as never
  }
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
  })
}

function createServerClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return null as never
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// Client-side (respects RLS) — safe for browser
export const supabase = createBrowserClient()

// Server-side admin (bypasses RLS) — NEVER expose to client
export const supabaseAdmin = createServerClient()

// Runtime assertion — call this in API routes to surface missing env vars clearly
export function requireSupabase() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_KEY) {
    throw new Error(
      'Missing required Supabase environment variables. ' +
      'Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.'
    )
  }
}

export async function getTenantData(tenantId: string, table: string, options?: { limit?: number; order?: string }) {
  let query = supabaseAdmin.from(table).select('*').eq('tenant_id', tenantId)
  if (options?.limit) query = query.limit(options.limit)
  if (options?.order) query = query.order(options.order, { ascending: false })
  const { data, error } = await query
  if (error) throw error
  return data
}
