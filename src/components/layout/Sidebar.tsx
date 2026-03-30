'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { CurrentUser } from '@/types'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/attendance', label: 'Attendance', icon: '⏰' },
  { href: '/leave-requests', label: 'Leave Requests', icon: '📋' },
  { href: '/team-directory', label: 'Team', icon: '👥' },
  { href: '/kanban', label: 'Kanban', icon: '🗂️' },
  { href: '/admin/analytics', label: 'Analytics', icon: '📈', roles: ['owner','admin','manager'] },
  { href: '/admin/employees', label: 'Employees', icon: '🧑‍💼', roles: ['owner','admin'] },
  { href: '/admin/roles', label: 'Roles', icon: '🔑', roles: ['owner','admin'] },
  { href: '/admin/settings', label: 'Settings', icon: '⚙️', roles: ['owner','admin'] },
]

export default function Sidebar({ user }: { user: CurrentUser }) {
  const pathname = usePathname()
  const visible = NAV.filter(n => !n.roles || n.roles.includes(user.role))
  const initials = user.full_name.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase()

  return (
    <aside style={{ width: 240, background: '#0f172a', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      <div style={{ padding: '20px 16px', borderBottom: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, background: '#4f46e5', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⚡</div>
          <div>
            <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 14 }}>WorkForce</div>
            <div style={{ color: '#64748b', fontSize: 11, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.tenant?.name}</div>
          </div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
        {visible.map(item => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link key={item.href} href={item.href} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8,
              marginBottom: 2, textDecoration: 'none', fontSize: 13, fontWeight: active ? 600 : 400,
              background: active ? '#4f46e5' : 'transparent',
              color: active ? '#fff' : '#94a3b8',
            }}>
              <span style={{ fontSize: 15 }}>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div style={{ padding: '12px 16px', borderTop: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
          {initials}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: '#f1f5f9', fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.full_name}</div>
          <div style={{ color: '#64748b', fontSize: 11, textTransform: 'capitalize' }}>{user.role}</div>
        </div>
      </div>
    </aside>
  )
}
