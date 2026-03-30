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
  }

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
      <div className="text-sm text-gray-500">
        {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600">{user.first_name} {user.last_name}</span>
        <button
          onClick={logout}
          className="text-sm text-gray-500 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-all"
        >
          Sign Out
        </button>
      </div>
    </header>
  )
}
