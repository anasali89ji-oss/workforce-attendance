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

// Fix 2.1: Standardized colon-notation permissions, aligned with setup/seed seeded roles
export function hasPermission(user: CurrentUser, permission: string): boolean {
  const rolePermissions: Record<UserRole, string[]> = {
    owner: ['*'],
    admin: [
      'employees:read', 'employees:write', 'employees:delete',
      'departments:read', 'departments:write',
      'roles:read', 'roles:write',
      'settings:read', 'settings:write',
      'analytics:read', 'reports:read',
      'attendance:read', 'attendance:manage',
      'leave:approve', 'leave:request',
      'overtime:approve', 'overtime:request',
      'payroll:read', 'payroll:write',
      'kanban:read', 'kanban:write',
      'audit:read',
      'team:read',
      'profile:read', 'profile:write',
    ],
    manager: [
      'employees:read', 'departments:read', 'team:read',
      'analytics:read', 'reports:read',
      'attendance:read', 'attendance:clock',
      'leave:approve', 'leave:request',
      'overtime:approve', 'overtime:request',
      'kanban:read', 'kanban:write',
      'profile:read', 'profile:write',
    ],
    worker: [
      'profile:read', 'profile:write',
      'attendance:clock',
      'leave:request',
      'overtime:request',
      'kanban:read',
    ],
  }
  const perms = rolePermissions[user.role as UserRole] || []
  return perms.includes('*') || perms.includes(permission)
}
