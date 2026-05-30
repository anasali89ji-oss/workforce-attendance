// Server-only auth utilities
import { cookies } from 'next/headers'
import { prisma } from './prisma'
import { verifySession } from './session'
import type { CurrentUser } from '@/types'
import { CURRENT_USER_COOKIE, CSRF_COOKIE } from './auth'

export { CURRENT_USER_COOKIE, CSRF_COOKIE }

export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(CURRENT_USER_COOKIE)?.value
    if (!token) return null

    // Verify our own JWT — no Supabase dependency
    const session = await verifySession(token)
    if (!session?.sub) return null

    // Fetch profile from Prisma (single source of truth)
    // Cast role to text because DB uses a PostgreSQL enum type
    const profiles = await prisma.$queryRaw<Array<{
      id: string; tenant_id: string; email: string; full_name: string | null
      first_name: string | null; last_name: string | null; phone: string | null
      avatar_url: string | null; role: string; department: string | null
      position: string | null; employee_id: string | null; is_active: boolean
      joining_date: Date | null; created_at: Date; updated_at: Date
    }>>`
      SELECT id, tenant_id, email, full_name, first_name, last_name, phone,
             avatar_url, role::text AS role, department, position, employee_id,
             is_active, joining_date, created_at, updated_at
      FROM profiles
      WHERE id = ${session.sub} AND is_active = true
      LIMIT 1
    `

    const profile = profiles[0]
    if (!profile) return null

    // Fetch tenant
    const tenants = await prisma.$queryRaw<Array<{
      id: string; name: string; slug: string; logo_url: string | null
      timezone: string; working_hours_start: string; working_hours_end: string
      working_days: string[]; late_threshold: number
      created_at: Date; updated_at: Date
    }>>`
      SELECT id, name, slug, logo_url, timezone,
             working_hours_start, working_hours_end,
             working_days, late_threshold, created_at, updated_at
      FROM tenants WHERE id = ${profile.tenant_id} LIMIT 1
    `

    const tenant = tenants[0]
    if (!tenant) return null

    return {
      id: profile.id,
      tenant_id: profile.tenant_id,
      email: profile.email,
      full_name: profile.full_name ?? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim(),
      first_name: profile.first_name ?? undefined,
      last_name: profile.last_name ?? undefined,
      avatar_url: profile.avatar_url ?? undefined,
      role: profile.role as CurrentUser['role'],
      phone: profile.phone ?? undefined,
      employee_id: profile.employee_id ?? undefined,
      department: profile.department ?? undefined,
      position: profile.position ?? undefined,
      is_active: profile.is_active,
      joining_date: profile.joining_date?.toISOString().split('T')[0],
      created_at: profile.created_at.toISOString(),
      updated_at: profile.updated_at.toISOString(),
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        logo_url: tenant.logo_url ?? undefined,
        timezone: tenant.timezone,
        working_hours_start: tenant.working_hours_start,
        working_hours_end: tenant.working_hours_end,
        working_days: tenant.working_days,
        late_threshold: tenant.late_threshold,
        created_at: tenant.created_at.toISOString(),
        updated_at: tenant.updated_at.toISOString(),
      },
    }
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
    sameSite: 'lax',
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
