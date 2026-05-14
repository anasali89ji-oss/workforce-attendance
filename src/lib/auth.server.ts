import { cookies } from 'next/headers'
import { jwtVerify, SignJWT } from 'jose'
import { supabaseAdmin } from './supabase'
import type { CurrentUser, UserRole } from '@/types'
import { CURRENT_USER_COOKIE, CSRF_COOKIE } from './auth'

export { CURRENT_USER_COOKIE, CSRF_COOKIE }

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'workforce-fallback-secret-change-in-production-min-32-chars'
)

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.error('CRITICAL: JWT_SECRET env var not set in production!')
}

export async function createSessionToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET)
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(CURRENT_USER_COOKIE)?.value
    if (!token) return null

    // Verify JWT properly — BUG-004 fix
    const { payload } = await jwtVerify(token, JWT_SECRET, { clockTolerance: 60 })
    const userId = payload.sub
    if (!userId || typeof userId !== 'string') return null

    const { data: profile, error } = await supabaseAdmin
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
      .eq('id', userId)
      .eq('is_active', true)
      .single()

    if (error || !profile) {
      console.error('[getCurrentUser] Profile fetch error:', error?.message)
      return null
    }

    return profile as unknown as CurrentUser
  } catch (err) {
    // JWT expired, tampered, or invalid
    console.error('[getCurrentUser] JWT error:', (err as Error).message)
    return null
  }
}

export function isOwnerOrAdmin(user: CurrentUser): boolean {
  return ['owner', 'admin'].includes(user.role as UserRole)
}

export function isPrivileged(user: CurrentUser): boolean {
  return ['owner', 'admin', 'manager'].includes(user.role as UserRole)
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
