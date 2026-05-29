'use client'

import { useQuery } from '@tanstack/react-query'
import type { CurrentUser } from '@/types'

export function useAuth() {
  const { data, isLoading, error, refetch } = useQuery<CurrentUser | null>({
    queryKey: ['auth-user'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/auth/me')
        if (!res.ok) {
          if (res.status === 401) return null
          throw new Error(`Auth check failed: ${res.status}`)
        }
        const json = await res.json()
        return json.user ?? null
      } catch (err) {
        console.error('[useAuth] error:', err)
        return null
      }
    },
    staleTime: 1000 * 60 * 5,
    retry: false,
    refetchOnWindowFocus: true,
  })

  return {
    user: data ?? null,
    isLoading,
    isAuthenticated: !!data,
    error,
    refetch,
  }
}
