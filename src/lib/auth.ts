import { cookies } from 'next/headers'
import { supabaseAdmin } from './supabase'
import type { CurrentUser } from '@/types'

export const CURRENT_USER_COOKIE = 'workforce_user_id'

export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get(CURRENT_USER_COOKIE)?.value
    if (!userId) return null

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select(`
        id, email, full_name, first_name, last_name, avatar_url,
        role, phone, employee_id, department, position,
        is_active, joining_date, created_at, updated_at, tenant_id,
        tenant:tenants(
          id, name, subdomain, logo_url, timezone,
          work_start_time, work_end_time, work_days,
          late_threshold, created_at
        )
      `)
      .eq('id', userId)
      .eq('is_active', true)
      .single()

    if (error || !profile) return null
    return profile as unknown as CurrentUser
  } catch (err) {
    console.error('[getCurrentUser] error:', err)
    return null
  }
}

export function isOwnerOrAdmin(user: CurrentUser): boolean {
  return ['owner', 'admin'].includes(user.role)
}

export function isPrivileged(user: CurrentUser): boolean {
  return ['owner', 'admin', 'manager'].includes(user.role)
}
