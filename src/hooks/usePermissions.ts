'use client'

import { useAuth } from './useAuth'
import { hasPermission as checkPermission } from '@/lib/auth'
import type { CurrentUser } from '@/types'

export function usePermissions() {
  const { user } = useAuth()

  const can = (permission: string) => {
    if (!user) return false
    return checkPermission(user as CurrentUser, permission)
  }

  const isAdmin = () => {
    if (!user) return false
    return ['owner', 'admin'].includes(user.role)
  }

  const isManager = () => {
    if (!user) return false
    return ['owner', 'admin', 'manager'].includes(user.role)
  }

  return { can, isAdmin, isManager, user }
}
