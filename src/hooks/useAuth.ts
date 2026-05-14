'use client'

import { useQuery } from '@tanstack/react-query'

export function useAuth() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['auth-user'],
    queryFn: async () => {
      const res = await fetch('/api/auth/me')
      if (!res.ok) return null
      const json = await res.json()
      return json.user
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
  })

  return {
    user: data,
    isLoading,
    isAuthenticated: !!data,
    error,
    refetch,
  }
}
