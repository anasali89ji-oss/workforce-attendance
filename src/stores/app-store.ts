import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface AppState {
  // Sidebar state
  sidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void
  
  // Theme state (managed by next-themes, but we can track preferences)
  themePreference: 'light' | 'dark' | 'system'
  setThemePreference: (preference: 'light' | 'dark' | 'system') => void
  
  // Current tenant
  currentTenantId: string | null
  setCurrentTenantId: (tenantId: string | null) => void
  
  // Notifications
  unreadNotifications: number
  setUnreadNotifications: (count: number) => void
  
  // Reset store
  reset: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    set => ({
      // Sidebar
      sidebarCollapsed: false,
      setSidebarCollapsed: collapsed => set({ sidebarCollapsed: collapsed }),
      
      // Theme
      themePreference: 'system',
      setThemePreference: preference => set({ themePreference: preference }),
      
      // Tenant
      currentTenantId: null,
      setCurrentTenantId: tenantId => set({ currentTenantId: tenantId }),
      
      // Notifications
      unreadNotifications: 0,
      setUnreadNotifications: count => set({ unreadNotifications: count }),
      
      // Reset
      reset: () => set({
        sidebarCollapsed: false,
        themePreference: 'system',
        currentTenantId: null,
        unreadNotifications: 0,
      }),
    }),
    {
      name: 'workforce-app-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: state => ({
        sidebarCollapsed: state.sidebarCollapsed,
        themePreference: state.themePreference,
        unreadNotifications: state.unreadNotifications,
      }),
    }
  )
)
