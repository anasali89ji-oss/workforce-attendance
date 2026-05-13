import { create } from 'zustand'

interface AuthState {
  user: {
    id: string
    email: string
    firstName: string
    lastName: string
    role: string
    tenantId: string
  } | null
  
  isAuthenticated: boolean
  isLoading: boolean
  
  setUser: (user: AuthState['user']) => void
  clearUser: () => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>(set => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  
  setUser: user => set({ 
    user, 
    isAuthenticated: !!user,
    isLoading: false 
  }),
  
  clearUser: () => set({ 
    user: null, 
    isAuthenticated: false,
    isLoading: false 
  }),
  
  setLoading: isLoading => set({ isLoading }),
}))
