// Server-only auth utilities (next/headers, supabaseAdmin, prisma)
import { cookies } from 'next/headers'
import { supabaseAdmin } from './supabase'
import { prisma } from './prisma'
import type { CurrentUser } from '@/types'
import { CURRENT_USER_COOKIE, CSRF_COOKIE } from './auth'

export { CURRENT_USER_COOKIE, CSRF_COOKIE }

export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get(CURRENT_USER_COOKIE)?.value
    if (!sessionToken) return null

    // Verify Supabase session
    const {
      data: { user: authUser },
      error: authError,
    } = await supabaseAdmin.auth.getUser(sessionToken)
    if (authError || !authUser) return null

    // Fetch profile from Prisma (single source of truth).
    // Primary lookup by id — must match Supabase auth UUID (enforced since the ID-sync fix).
    // Fallback to email for any accounts created before the fix to avoid hard lockout.
    let profile = await prisma.profile.findFirst({
      where: { id: authUser.id, is_active: true },
      include: { tenant: true },
    })

    if (!profile && authUser.email) {
      // Fallback: look up by email for legacy accounts with mismatched UUIDs
      profile = await prisma.profile.findFirst({
        where: { email: authUser.email.toLowerCase(), is_active: true },
        include: { tenant: true },
      })
      // If found by email, log warning so the mismatch can be fixed in DB
      if (profile) {
        console.warn(`[getCurrentUser] UUID mismatch: Supabase id=${authUser.id} but Prisma profile id=${profile.id} (email=${authUser.email}). Run a migration to align these.`)
      }
    }

    if (!profile) return null

    // Shape into CurrentUser contract
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
        id: profile.tenant.id,
        name: profile.tenant.name,
        slug: profile.tenant.slug,
        logo_url: profile.tenant.logo_url ?? undefined,
        timezone: profile.tenant.timezone,
        working_hours_start: profile.tenant.working_hours_start,
        working_hours_end: profile.tenant.working_hours_end,
        working_days: profile.tenant.working_days,
        late_threshold: profile.tenant.late_threshold,
        created_at: profile.tenant.created_at.toISOString(),
        updated_at: profile.tenant.updated_at.toISOString(),
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
