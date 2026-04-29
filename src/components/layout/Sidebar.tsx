'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { useTheme } from '../providers/ThemeProvider'
import type { CurrentUser } from '@/types'
import {
  LayoutDashboard, Clock, CalendarOff, Users, Columns2, BarChart2,
  UserCog, ShieldCheck, Settings, LogOut, Zap, Map, ChevronRight,
  Moon, Sun, HelpCircle, User, DollarSign, FileBarChart, Menu,
  ChevronDown, Bell,
} from 'lucide-react'

interface NavItem {
  href: string; label: string
  Icon: React.FC<{ size?: number; strokeWidth?: number }>
  badge?: number; roles?: string[]
}

interface NavGroup { label: string; items: NavItem[] }

function buildNav(role: string): NavGroup[] {
  const isAdmin = ['owner', 'admin'].includes(role)
  const isManager = isAdmin || role === 'manager'

  return [
    {
      label: 'OVERVIEW',
      items: [
        { href: '/dashboard',    label: 'Dashboard',    Icon: LayoutDashboard },
        { href: '/live-map',     label: 'Live Map',     Icon: Map },
      ],
    },
    {
      label: 'WORKFORCE',
      items: [
        { href: '/attendance',     label: 'Attendance',     Icon: Clock },
        { href: '/leave-requests', label: 'Leave Requests', Icon: CalendarOff },
        { href: '/team-directory', label: 'Team Directory', Icon: Users },
      ],
    },
    {
      label: 'PRODUCTIVITY',
      items: [
        { href: '/kanban', label: 'Kanban Board', Icon: Columns2 },
      ],
    },
    ...(isManager ? [{
      label: 'REPORTS',
      items: [
        { href: '/admin/analytics', label: 'Analytics', Icon: BarChart2 },
        { href: '/payroll',         label: 'Payroll',   Icon: DollarSign, roles: ['owner','admin'] },
        { href: '/reports',         label: 'Reports',   Icon: FileBarChart },
      ],
    }] : []),
    ...(isAdmin ? [{
      label: 'ADMIN',
      items: [
        { href: '/admin/employees', label: 'Employees',          Icon: UserCog },
        { href: '/admin/roles',     label: 'Roles & Permissions', Icon: ShieldCheck },
        { href: '/admin/settings',  label: 'Settings',            Icon: Settings },
      ],
    }] : []),
  ]
}

const ROLE_HEX: Record<string, string> = {
  owner: '#7c3aed', admin: '#2563eb', manager: '#d97706', worker: '#0891b2',
}

export default function Sidebar({ user }: { user: CurrentUser }) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, toggle: toggleTheme } = useTheme()
  const [collapsed, setCollapsed] = useState(false)
  const [userOpen, setUserOpen] = useState(false)

  const navGroups = buildNav(user.role)
  const initials = user.full_name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
  const roleHex = ROLE_HEX[user.role] || '#64748b'

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    toast.success('Signed out')
    router.push('/login')
    router.refresh()
  }

  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href))

  const W = collapsed ? 64 : 256

  return (
    <aside style={{
      width: W, minWidth: W, background: '#0a0f1e',
      display: 'flex', flexDirection: 'column', height: '100vh',
      borderRight: '1px solid rgba(255,255,255,0.05)',
      transition: 'width 0.25s cubic-bezier(0.16,1,0.3,1)',
      overflow: 'hidden', position: 'relative', zIndex: 40, flexShrink: 0,
    }}>

      {/* ── Brand ── */}
      <div style={{
        height: 64, display: 'flex', alignItems: 'center',
        padding: '0 14px', borderBottom: '1px solid rgba(255,255,255,0.05)',
        gap: 10, flexShrink: 0,
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10, flexShrink: 0,
          background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 14px rgba(79,70,229,0.45)',
        }}>
          <Zap size={16} color="#fff" strokeWidth={2.5} />
        </div>
        {!collapsed && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#f1f5f9', fontWeight: 800, fontSize: 14, letterSpacing: '-0.02em', lineHeight: 1.2 }}>WorkForce Pro</div>
            <div style={{ color: 'rgba(255,255,255,0.28)', fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
              {user.tenant?.name}
            </div>
          </div>
        )}
        <button onClick={() => setCollapsed(v => !v)} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'rgba(255,255,255,0.28)', padding: 4, borderRadius: 6,
          display: 'flex', transition: 'color 0.15s', flexShrink: 0,
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.28)')}
        >
          {collapsed ? <ChevronRight size={15} /> : <Menu size={15} />}
        </button>
      </div>

      {/* ── Nav ── */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '6px 8px 0', display: 'flex', flexDirection: 'column' }}>
        {navGroups.map(group => (
          <div key={group.label} style={{ marginBottom: 4 }}>
            {!collapsed && (
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.2)', padding: '8px 12px 3px',
              }}>
                {group.label}
              </div>
            )}
            {group.items.map(({ href, label, Icon, badge, roles }) => {
              if (roles && !roles.includes(user.role)) return null
              const active = isActive(href)
              return (
                <Link
                  key={href} href={href}
                  title={collapsed ? label : undefined}
                  style={{
                    display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 10,
                    padding: collapsed ? '9px 0' : '9px 12px',
                    borderRadius: 10, textDecoration: 'none',
                    color: active ? '#a5b4fc' : 'rgba(255,255,255,0.42)',
                    background: active ? 'rgba(99,102,241,0.16)' : 'transparent',
                    fontSize: 13, fontWeight: active ? 600 : 500,
                    position: 'relative', transition: 'all 0.15s',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    marginBottom: 2,
                  }}
                  onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.75)' }}}
                  onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.42)' }}}
                >
                  {active && (
                    <span style={{
                      position: 'absolute', left: 0, top: '24%', bottom: '24%',
                      width: 3, background: '#818cf8', borderRadius: '0 3px 3px 0',
                    }} />
                  )}
                  <Icon size={16} strokeWidth={active ? 2.5 : 1.8} {...{ style: { flexShrink: 0 } } as any} />
                  {!collapsed && <span style={{ flex: 1 }}>{label}</span>}
                  {!collapsed && badge && badge > 0 && (
                    <span style={{ background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 99, lineHeight: 1.6 }}>
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                  {collapsed && badge && badge > 0 && (
                    <span style={{ position: 'absolute', top: 5, right: 5, width: 7, height: 7, borderRadius: '50%', background: '#ef4444', border: '1.5px solid #0a0f1e' }} />
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* ── Bottom ── */}
      <div style={{ padding: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <button
          onClick={toggleTheme}
          title={collapsed ? 'Toggle Theme' : undefined}
          style={{
            display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 10,
            padding: collapsed ? '9px 0' : '9px 12px', borderRadius: 10,
            border: 'none', background: 'transparent', cursor: 'pointer',
            color: 'rgba(255,255,255,0.42)', fontSize: 13, fontWeight: 500,
            justifyContent: collapsed ? 'center' : 'flex-start', width: '100%',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.75)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.42)' }}
        >
          {theme === 'light' ? <Moon size={16} strokeWidth={1.8} style={{ flexShrink: 0 }} /> : <Sun size={16} strokeWidth={1.8} style={{ flexShrink: 0 }} />}
          {!collapsed && <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>}
        </button>

        {/* User card */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setUserOpen(v => !v)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center',
              gap: collapsed ? 0 : 10, padding: collapsed ? '10px 0' : '9px 10px',
              borderRadius: 10, border: 'none', background: 'transparent',
              cursor: 'pointer', justifyContent: collapsed ? 'center' : 'flex-start',
              transition: 'background 0.15s', marginTop: 2,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <div style={{
              width: 32, height: 32, borderRadius: 9, flexShrink: 0,
              background: `${roleHex}28`, border: `1.5px solid ${roleHex}45`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: roleHex, fontWeight: 800, fontSize: 11, position: 'relative',
            }}>
              {initials}
              <span style={{ position: 'absolute', bottom: -1, right: -1, width: 8, height: 8, borderRadius: '50%', background: '#10b981', border: '1.5px solid #0a0f1e' }} />
            </div>
            {!collapsed && (
              <>
                <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                  <div style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.full_name}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.28)', fontSize: 10, textTransform: 'capitalize', marginTop: 1 }}>{user.role}</div>
                </div>
                <ChevronDown size={12} color="rgba(255,255,255,0.28)" strokeWidth={2} style={{ flexShrink: 0, transform: userOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </>
            )}
          </button>

          {userOpen && !collapsed && (
            <div style={{
              position: 'absolute', bottom: 'calc(100% + 6px)', left: 0, right: 0,
              background: '#111c35', borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
              overflow: 'hidden', animation: 'fadeDown 0.15s ease', zIndex: 100,
            }}>
              {([
                { href: '/profile', label: 'My Profile', Icon: User },
                { href: '/admin/settings', label: 'Settings', Icon: Settings },
              ] as const).map(({ href, label, Icon }) => (
                <Link key={href} href={href} onClick={() => setUserOpen(false)} style={{
                  display: 'flex', alignItems: 'center', gap: 9, padding: '10px 14px',
                  color: 'rgba(255,255,255,0.65)', fontSize: 13, textDecoration: 'none',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.06)')}
                onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.background = 'transparent')}
                >
                  <Icon size={14} strokeWidth={1.8} />{label}
                </Link>
              ))}
              <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '0 10px' }} />
              <button
                onClick={() => { setUserOpen(false); logout() }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9, padding: '10px 14px',
                  color: '#fca5a5', fontSize: 13, width: '100%', background: 'none',
                  border: 'none', cursor: 'pointer', transition: 'background 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <LogOut size={14} strokeWidth={1.8} />Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
