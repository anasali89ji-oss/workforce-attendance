import { cookies } from 'next/headers'
import { supabaseAdmin } from './supabase'
import type { CurrentUser } from '@/types'

export const CURRENT_USER_COOKIE = 'workforce_user_id'

export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get(CURRENT_USER_COOKIE)?.value
    if (!userId) return null

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select(`
        *,
        tenant:tenants(*),
        role:roles(*, permissions:role_permissions(permission:permissions(*))),
        department:departments(*),
        position:positions(*)
      `)
      .eq('id', userId)
      .eq('is_active', true)
      .single()

    if (error || !user) return null

    // Flatten permissions
    const permissions: string[] = (user.role?.permissions || [])
      .map((rp: { permission?: { slug: string } }) => rp.permission?.slug)
      .filter(Boolean)

    return {
      ...user,
      permissions,
    } as CurrentUser
  } catch {
    return null
  }
}

export async function requireAuth(): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}

export function hasPermission(user: CurrentUser, permission: string): boolean {
  return user.permissions.includes(permission) || user.role?.slug === 'owner'
}

export function isOwnerOrAdmin(user: CurrentUser): boolean {
  return ['owner', 'admin'].includes(user.role?.slug || '')
}
