import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

// Client-side (respects RLS) — safe for browser
export const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null as never

// Server-side admin (bypasses RLS) — NEVER exposed to client
export const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null as never

// Runtime guard — throws only at request time, not at build time
export function assertSupabase() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }
  if (!SUPABASE_SERVICE_KEY) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
  }
}

// Typed database helper for common queries
export async function getTenantData(tenantId: string, table: string, options?: { limit?: number; order?: string }) {
  const query_base = supabaseAdmin.from(table).select('*').eq('tenant_id', tenantId)
  let query = options?.limit ? query_base.limit(options.limit) : query_base
  if (options?.order) query = query.order(options.order, { ascending: false })
  const { data, error } = await query
  if (error) throw error
  return data
}
