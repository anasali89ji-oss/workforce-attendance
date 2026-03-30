'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { CurrentUser } from '@/types'

interface NavItem {
  href: string
  label: string
  icon: string
  roles?: string[]
}

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/attendance', label: 'Attendance', icon: '⏰' },
  { href: '/leave-requests', label: 'Leave Requests', icon: '📋' },
  { href: '/team-directory', label: 'Team Directory', icon: '👥' },
  { href: '/kanban', label: 'Kanban Board', icon: '🗂️' },
  { href: '/admin/analytics', label: 'Analytics', icon: '📈', roles: ['owner','admin','hr','manager'] },
  { href: '/admin/employees', label: 'Employees', icon: '🧑‍💼', roles: ['owner','admin','hr'] },
  { href: '/admin/roles', label: 'Roles & Permissions', icon: '🔑', roles: ['owner','admin'] },
  { href: '/admin/settings', label: 'Settings', icon: '⚙️', roles: ['owner','admin'] },
]

export default function Sidebar({ user }: { user: CurrentUser }) {
  const pathname = usePathname()
  const roleSlug = user.role?.slug || 'employee'

  const visibleNav = NAV.filter(item => {
    if (!item.roles) return true
    return item.roles.includes(roleSlug)
  })

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="p-5 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-xl">⚡</div>
          <div>
            <div className="font-bold text-sm leading-tight">WorkForce</div>
            <div className="text-xs text-slate-400 truncate max-w-[140px]">{user.tenant?.name}</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {visibleNav.map(item => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-sm font-bold flex-shrink-0">
            {user.first_name[0]}{user.last_name[0]}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-white truncate">{user.first_name} {user.last_name}</div>
            <div className="text-xs text-slate-400 truncate">{user.role?.name}</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
