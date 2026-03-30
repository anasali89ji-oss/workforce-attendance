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
      .select('*, tenant:tenants(*)')
      .eq('id', userId)
      .eq('is_active', true)
      .single()

    if (error || !profile) return null

    return profile as CurrentUser
  } catch {
    return null
  }
}

export async function requireAuth(): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (!user) throw new Error('Unauthorized')
  return user
}

export function isPrivileged(user: CurrentUser): boolean {
  return ['admin', 'owner', 'manager'].includes(user.role)
}

export function isOwnerOrAdmin(user: CurrentUser): boolean {
  return ['owner', 'admin'].includes(user.role)
}
