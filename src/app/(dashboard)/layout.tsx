import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:'#F1F5F9' }}>
      <Sidebar user={user} />
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, overflow:'hidden' }}>
        <TopBar user={user} />
        <main style={{ flex:1, overflowY:'auto', padding:'24px 28px' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
