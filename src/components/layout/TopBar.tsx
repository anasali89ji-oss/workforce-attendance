'use client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { CurrentUser } from '@/types'

export default function TopBar({ user }: { user: CurrentUser }) {
  const router = useRouter()
  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    toast.success('Logged out')
    router.push('/login')
    router.refresh()
  }
  return (
    <header style={{ height: 56, background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', flexShrink: 0 }}>
      <span style={{ fontSize: 13, color: '#64748b' }}>
        {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 13, color: '#334155', fontWeight: 500 }}>{user.full_name}</span>
        <button onClick={logout} style={{ fontSize: 12, color: '#64748b', background: 'none', border: '1px solid #e2e8f0', borderRadius: 6, padding: '5px 12px', cursor: 'pointer' }}>
          Sign Out
        </button>
      </div>
    </header>
  )
}
