// Server-only auth utilities (next/headers, supabaseAdmin)
import { cookies } from 'next/headers'
import { supabaseAdmin } from './supabase'
import type { CurrentUser } from '@/types'
import { CURRENT_USER_COOKIE, CSRF_COOKIE } from './auth'

export { CURRENT_USER_COOKIE, CSRF_COOKIE }

export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get(CURRENT_USER_COOKIE)?.value
    if (!sessionToken) return null

    const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(sessionToken)
    if (authError || !authUser) return null

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select(`
        id, email, full_name, first_name, last_name, avatar_url,
        role, phone, employee_id, department, position,
        is_active, joining_date, created_at, updated_at, tenant_id,
        tenant:tenants(
          id, name, slug, logo_url, timezone,
          working_hours_start, working_hours_end, working_days,
          late_threshold, created_at
        )
      `)
      .eq('id', authUser.id)
      .eq('is_active', true)
      .single()

    if (profileError || !profile) return null
    return profile as unknown as CurrentUser
  } catch (err) {
    console.error('[getCurrentUser] error:', err)
    return null
  }
}

export async function generateCsrfToken(): Promise<string> {
  const token = crypto.randomUUID()
  const cookieStore = await cookies()
  cookieStore.set(CSRF_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60,
    path: '/',
  })
  return token
}

export async function validateCsrfToken(token: string): Promise<boolean> {
  const cookieStore = await cookies()
  const stored = cookieStore.get(CSRF_COOKIE)?.value
  return stored === token
}
