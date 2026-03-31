'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { CurrentUser } from '@/types'
import {
  LayoutDashboard, Clock, CalendarOff, Users, Columns,
  BarChart2, UserCog, Shield, Settings, LogOut, Zap,
  Building2
} from 'lucide-react'

interface NavItem {
  href: string
  label: string
  Icon: React.FC<{ size?: number; strokeWidth?: number; className?: string }>
  roles?: string[]
}

const NAV: NavItem[] = [
  { href: '/dashboard',      label: 'Dashboard',    Icon: LayoutDashboard },
  { href: '/attendance',     label: 'Attendance',   Icon: Clock },
  { href: '/leave-requests', label: 'Leave Requests', Icon: CalendarOff },
  { href: '/team-directory', label: 'Team Directory', Icon: Users },
  { href: '/kanban',         label: 'Kanban Board',  Icon: Columns },
  { href: '/admin/analytics', label: 'Analytics',  Icon: BarChart2, roles: ['owner','admin','manager'] },
  { href: '/admin/employees', label: 'Employees',  Icon: UserCog, roles: ['owner','admin'] },
  { href: '/admin/roles',     label: 'Roles & Permissions', Icon: Shield, roles: ['owner','admin'] },
  { href: '/admin/settings',  label: 'Settings',   Icon: Settings, roles: ['owner','admin'] },
]

const ROLE_COLORS: Record<string, string> = {
  owner: '#7C3AED', admin: '#2563EB', manager: '#D97706', worker: '#0891B2'
}

export default function Sidebar({ user }: { user: CurrentUser }) {
  const pathname = usePathname()
  const router = useRouter()
  const visible = NAV.filter(n => !n.roles || n.roles.includes(user.role))
  const initials = user.full_name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
  const roleColor = ROLE_COLORS[user.role] || '#64748B'

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    toast.success('Signed out')
    router.push('/login')
    router.refresh()
  }

  return (
    <aside style={{
      width: 'var(--sidebar-w)', background: '#0F172A',
      display: 'flex', flexDirection: 'column', flexShrink: 0,
      height: '100vh', position: 'sticky', top: 0,
      borderRight: '1px solid rgba(255,255,255,0.05)',
    }}>
      {/* Brand */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
            borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 10px rgba(37,99,235,0.4)',
          }}>
            <Zap size={17} color="#fff" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ color: '#F1F5F9', fontWeight: 700, fontSize: 14, letterSpacing: '-0.01em' }}>WorkForce</div>
            <div style={{ color: '#475569', fontSize: 11, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
              {user.tenant?.name}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {visible.map(({ href, label, Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link key={href} href={href} style={{
              display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px', borderRadius: 8,
              textDecoration: 'none', fontSize: 13, fontWeight: active ? 600 : 400,
              background: active ? 'rgba(37,99,235,0.2)' : 'transparent',
              color: active ? '#BFDBFE' : '#64748B',
              borderLeft: `2px solid ${active ? '#2563EB' : 'transparent'}`,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLAnchorElement).style.color = '#CBD5E1' }}}
            onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; (e.currentTarget as HTMLAnchorElement).style.color = '#64748B' }}}
            >
              <Icon size={15} strokeWidth={active ? 2.5 : 1.8} />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Company indicator */}
      <div style={{ padding: '8px 16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#334155', fontSize: 11 }}>
          <Building2 size={12} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.tenant?.subdomain}</span>
        </div>
      </div>

      {/* User profile */}
      <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 9, flexShrink: 0,
          background: `linear-gradient(135deg, ${roleColor}40, ${roleColor}20)`,
          border: `1.5px solid ${roleColor}50`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: roleColor, fontWeight: 700, fontSize: 12,
        }}>{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#E2E8F0', fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.full_name}
          </div>
          <div style={{ color: '#475569', fontSize: 10, textTransform: 'capitalize', marginTop: 1 }}>{user.role}</div>
        </div>
        <button onClick={logout} title="Sign out" style={{
          background: 'none', border: 'none', cursor: 'pointer', color: '#475569',
          padding: 6, borderRadius: 6, display: 'flex', alignItems: 'center',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(220,38,38,0.15)'; (e.currentTarget as HTMLButtonElement).style.color = '#FCA5A5' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; (e.currentTarget as HTMLButtonElement).style.color = '#475569' }}
        >
          <LogOut size={14} />
        </button>
      </div>
    </aside>
  )
}
