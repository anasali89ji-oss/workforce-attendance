import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

// BUG-3.2 FIX: Use Proxy to throw meaningful errors at call time, not silent null casts
function createSafeClient<T extends object>(url: string, key: string, config: object, name: string): T {
  if (url && key) {
    return createClient(url, key, config) as unknown as T
  }
  return new Proxy({} as unknown as T, {
    get(_, prop) {
      if (prop === 'then') return undefined // avoid Promise.resolve() treating proxy as thenable
      throw new Error(`${name} is not configured. Check your environment variables.`)
    },
  })
}

// Client-side (respects RLS) — safe for browser
export const supabase = createSafeClient<ReturnType<typeof createClient>>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  { auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true } },
  'Supabase client (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)'
)

// Server-side admin (bypasses RLS) — NEVER exposed to client
export const supabaseAdmin = createSafeClient<ReturnType<typeof createClient>>(
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
  'Supabase admin (SUPABASE_SERVICE_ROLE_KEY)'
)

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
