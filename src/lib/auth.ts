// Client-safe auth utilities (no next/headers, no server-only APIs)
import type { CurrentUser, UserRole } from '@/types'

export const CURRENT_USER_COOKIE = 'workforce_session_token'
export const CSRF_COOKIE = 'workforce_csrf'

export function isOwnerOrAdmin(user: CurrentUser): boolean {
  return ['owner', 'admin'].includes(user.role as UserRole)
}

export function isPrivileged(user: CurrentUser): boolean {
  return ['owner', 'admin', 'manager'].includes(user.role as UserRole)
}

export function hasPermission(user: CurrentUser, permission: string): boolean {
  const rolePermissions: Record<UserRole, string[]> = {
    owner: ['*'],
    admin: [
      'employees:read', 'employees:write', 'employees:delete',
      'departments:read', 'departments:write',
      'roles:read', 'roles:write',
      'settings:read', 'settings:write',
      'analytics:read', 'reports:read',
      'leave:approve', 'overtime:approve',
      'payroll:read', 'payroll:write',
      'audit:read'
    ],
    manager: [
      'employees:read', 'departments:read',
      'analytics:read', 'reports:read',
      'leave:approve', 'overtime:approve',
      'team:read'
    ],
    worker: [
      'profile:read', 'profile:write',
      'attendance:clock', 'leave:request',
      'overtime:request'
    ]
  }
  const perms = rolePermissions[user.role as UserRole] || []
  return perms.includes('*') || perms.includes(permission)
}
