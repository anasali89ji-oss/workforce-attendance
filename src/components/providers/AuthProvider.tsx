'use client'

import { createContext, useContext } from 'react'
import { useAuth } from '@/hooks/useAuth'
import type { CurrentUser } from '@/types'

interface AuthContextType {
  user: CurrentUser | null
  isLoading: boolean
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType>({ user: null, isLoading: true, isAuthenticated: false })

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth()

  return (
    <AuthContext.Provider value={{
      user: auth.user,
      isLoading: auth.isLoading,
      isAuthenticated: auth.isAuthenticated,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuthContext = () => useContext(AuthContext)
