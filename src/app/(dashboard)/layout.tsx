export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth.server'
import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { RealtimeProvider } from '@/components/providers/RealtimeProvider'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { ErrorBoundary } from 'react-error-boundary'
import { ErrorFallback } from '@/components/ui/ErrorFallback'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  return (
    <QueryProvider>
      <ThemeProvider>
        <AuthProvider>
          <RealtimeProvider>
            <div className="flex h-screen bg-[var(--bg)] overflow-hidden">
              <Sidebar user={user} />
              <div className="flex-1 flex flex-col min-w-0">
                <TopBar user={user} />
                <main className="flex-1 overflow-y-auto overflow-x-hidden">
                  <ErrorBoundary FallbackComponent={ErrorFallback}>
                    {children}
                  </ErrorBoundary>
                </main>
              </div>
            </div>
          </RealtimeProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryProvider>
  )
}
