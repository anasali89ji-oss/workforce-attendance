'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Clock, CalendarDays, Users, KanbanSquare,
  Settings, Shield, BarChart3, MapPin, Briefcase, FileText,
  ChevronLeft, ChevronRight, LogOut, ChevronDown, User,
  Wallet, Timer
} from 'lucide-react'
import type { CurrentUser } from '@/types'
import { usePermissions } from '@/hooks/usePermissions'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string; size?: number | string }>
  admin?: boolean
}

interface NavGroup {
  label: string
  items: NavItem[]
}

interface SidebarProps {
  user: CurrentUser
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Main',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/attendance', label: 'Attendance', icon: Clock },
      { href: '/leave-requests', label: 'Leave', icon: CalendarDays },
      { href: '/overtime', label: 'Overtime', icon: Timer },
    ]
  },
  {
    label: 'Team',
    items: [
      { href: '/team-directory', label: 'Directory', icon: Users },
      { href: '/shifts', label: 'Shifts', icon: Briefcase },
      { href: '/kanban', label: 'Tasks', icon: KanbanSquare },
      { href: '/live-map', label: 'Live Map', icon: MapPin },
    ]
  },
  {
    label: 'Finance',
    items: [
      { href: '/payroll', label: 'Payroll', icon: Wallet },
      { href: '/reports', label: 'Reports', icon: FileText },
    ]
  },
  {
    label: 'Admin',
    items: [
      { href: '/admin/analytics', label: 'Analytics', icon: BarChart3, admin: true },
      { href: '/admin/employees', label: 'Employees', icon: Users, admin: true },
      { href: '/admin/departments', label: 'Departments', icon: Briefcase, admin: true },
      { href: '/admin/roles', label: 'Roles', icon: Shield, admin: true },
      { href: '/admin/settings', label: 'Settings', icon: Settings, admin: true },
    ]
  },
]

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['Main', 'Team']))
  const { isAdmin } = usePermissions()

  const toggleGroup = (label: string) => {
    const next = new Set(expandedGroups)
    if (next.has(label)) next.delete(label)
    else next.add(label)
    setExpandedGroups(next)
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  const sidebarContent = (
    <>
      <div className="flex items-center gap-3 px-4 py-5 border-b border-[var(--sidebar-border)]">
        <div className="w-9 h-9 rounded-xl bg-[#6366f1] flex items-center justify-center flex-shrink-0">
          <Shield size={18} className="text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="text-sm font-bold text-white whitespace-nowrap">WorkForce Pro</div>
            <div className="text-[9px] text-white/40 tracking-widest uppercase whitespace-nowrap">{user.tenant.name}</div>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
        {NAV_GROUPS.map(group => {
          const visibleItems = group.items.filter(item => !item.admin || isAdmin())
          if (visibleItems.length === 0) return null
          const isExpanded = expandedGroups.has(group.label)

          return (
            <div key={group.label}>
              {!collapsed && (
                <button onClick={() => toggleGroup(group.label)} className="nav-section-label w-full flex items-center justify-between">
                  {group.label}
                  <ChevronDown size={10} className={`transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                </button>
              )}
              {(collapsed || isExpanded) && (
                <div className="space-y-0.5">
                  {visibleItems.map(item => {
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                    return (
                      <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                        className={`nav-item ${isActive ? 'active' : ''}`} title={collapsed ? item.label : undefined}>
                        <item.icon size={18} className="flex-shrink-0" />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                        {isActive && !collapsed && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--brand-400)]" />}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      <div className="border-t border-[var(--sidebar-border)] p-3">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group">
          <div className="w-8 h-8 rounded-full bg-[#6366f1]/20 flex items-center justify-center text-xs font-bold text-[#a5b4fc] flex-shrink-0">
            {user.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">{user.full_name}</div>
              <div className="text-[10px] text-white/40 truncate">{user.email}</div>
            </div>
          )}
        </div>
        <div className="mt-1 space-y-0.5">
          <Link href="/profile" className="nav-item text-white/40 hover:text-white/70">
            <User size={16} />
            {!collapsed && <span>My Profile</span>}
          </Link>
          <button onClick={handleLogout} className="nav-item text-white/40 hover:text-[var(--danger)] w-full">
            <LogOut size={16} />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </div>
    </>
  )

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />}
      <button onClick={() => setMobileOpen(!mobileOpen)} className="fixed top-3 left-3 z-50 lg:hidden w-10 h-10 rounded-xl bg-[var(--sidebar-bg)] flex items-center justify-center text-white shadow-lg">
        {mobileOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
      </button>
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 bg-[var(--sidebar-bg)] flex flex-col transition-all duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} ${collapsed ? 'w-[var(--sidebar-collapsed-w)]' : 'w-[var(--sidebar-w)]'}`}>
        {sidebarContent}
        <button onClick={() => setCollapsed(!collapsed)} className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 rounded-full bg-[var(--sidebar-bg)] border border-[var(--sidebar-border)] items-center justify-center text-white/50 hover:text-white transition-colors">
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </aside>
    </>
  )
}
