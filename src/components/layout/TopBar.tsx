'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { toast } from 'sonner'
import { useTheme } from '../providers/ThemeProvider'
import { CommandPalette } from '../ui/CommandPalette'
import type { CurrentUser } from '@/types'
import {
  Search, Bell, Plus, Moon, Sun, ChevronDown,
  Clock, CalendarOff, UserPlus, Command, LogOut, User, Settings,
  CheckCircle2, Info, AlertTriangle, X
} from 'lucide-react'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard', '/attendance': 'Attendance', '/leave-requests': 'Leave Requests',
  '/team-directory': 'Team Directory', '/kanban': 'Kanban Board', '/live-map': 'Live Map',
  '/payroll': 'Payroll', '/reports': 'Reports', '/profile': 'My Profile', '/shifts': 'Shifts',
  '/overtime': 'Overtime', '/admin/analytics': 'Analytics', '/admin/employees': 'Employees',
  '/admin/roles': 'Roles & Permissions', '/admin/settings': 'Settings', '/admin/departments': 'Departments',
}

const NOTIF_ICONS: Record<string, React.ReactNode> = {
  success: <CheckCircle2 size={14} color="#10b981" strokeWidth={2} />,
  info:    <Info size={14} color="#3b82f6" strokeWidth={2} />,
  warning: <AlertTriangle size={14} color="#f59e0b" strokeWidth={2} />,
  error:   <X size={14} color="#ef4444" strokeWidth={2} />,
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s/60)}m ago`
  if (s < 86400) return `${Math.floor(s/3600)}h ago`
  return `${Math.floor(s/86400)}d ago`
}

export default function TopBar({ user }: { user: CurrentUser }) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, toggle: toggleTheme } = useTheme()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [newOpen, setNewOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unread, setUnread] = useState(0)
  const newRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)

  const title = PAGE_TITLES[pathname] || PAGE_TITLES[Object.keys(PAGE_TITLES).find(k => pathname.startsWith(k) && k !== '/') || ''] || 'WorkForce Pro'

  // Global Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setPaletteOpen(true) }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (newRef.current && !newRef.current.contains(e.target as Node)) setNewOpen(false)
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false)
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const fetchNotifs = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      const json = await res.json()
      if (json.data) {
        setNotifications(json.data)
        setUnread(json.data.filter((n: any) => !n.is_read).length)
      }
    } catch {}
  }, [])

  useEffect(() => { fetchNotifs() }, [fetchNotifs])

  const markAllRead = async () => {
    await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'mark_all_read' }) })
    setUnread(0)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    toast.success('Signed out')
    router.push('/login')
    router.refresh()
  }

  const initials = user.full_name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <>
      <header style={{
        height: 60, flexShrink: 0,
        background: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderBottom: '1px solid rgba(0,0,0,0.07)',
        display: 'flex', alignItems: 'center',
        padding: '0 28px', gap: 16,
        position: 'sticky', top: 0, zIndex: 30,
      }}>
        <div style={{ flex: '0 0 auto' }}>
          <h1 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>{title}</h1>
        </div>

        {/* Search trigger */}
        <div style={{ flex: 1, maxWidth: 440, margin: '0 auto' }}>
          <button onClick={() => setPaletteOpen(true)} style={{
            width: '100%', height: 36, background: 'var(--surface-3)',
            border: '1.5px solid var(--border-strong)', borderRadius: 10,
            display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px',
            cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = 'var(--brand-400)'; el.style.background = 'var(--surface)' }}
          onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = 'var(--border-strong)'; el.style.background = 'var(--surface-3)' }}
          >
            <Search size={14} color="var(--text-3)" strokeWidth={2} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1, textAlign: 'left', color: 'var(--text-3)', fontSize: 13 }}>Search pages, actions...</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 2, background: 'var(--surface-4)', borderRadius: 5, padding: '2px 7px', fontSize: 10, color: 'var(--text-3)', fontWeight: 600 }}>
              <Command size={9} strokeWidth={2} />K
            </span>
          </button>
        </div>

        {/* Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>

          {/* + New */}
          <div style={{ position: 'relative' }} ref={newRef}>
            <button onClick={() => { setNewOpen(v => !v); setUserOpen(false); setNotifOpen(false) }}
              className="btn btn-primary btn-sm" style={{ gap: 5 }}>
              <Plus size={13} strokeWidth={2.5} />New
              <ChevronDown size={11} strokeWidth={2} style={{ opacity: 0.7 }} />
            </button>
            {newOpen && (
              <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, minWidth: 200, background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden', zIndex: 100, animation: 'fadeDown 0.15s ease' }}>
                {[{ label:'Clock In/Out', Icon:Clock, href:'/attendance' }, { label:'Leave Request', Icon:CalendarOff, href:'/leave-requests' }, { label:'Add Employee', Icon:UserPlus, href:'/admin/employees' }].map(({ label, Icon, href }) => (
                  <button key={label} onClick={() => { setNewOpen(false); router.push(href) }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', fontSize: 13, transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-2)'}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'none'}
                  ><Icon size={15} strokeWidth={1.8} color="var(--brand-500)" />{label}</button>
                ))}
              </div>
            )}
          </div>

          {/* Theme */}
          <button onClick={toggleTheme} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 9, cursor: 'pointer', color: 'var(--text-2)', padding: 7, display: 'flex', transition: 'all 0.15s' }}
          onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.background = 'var(--surface-3)' }}
          onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.background = 'none' }}
          >
            {theme === 'light' ? <Moon size={15} strokeWidth={1.8} /> : <Sun size={15} strokeWidth={1.8} />}
          </button>

          {/* Notifications */}
          <div style={{ position: 'relative' }} ref={notifRef}>
            <button onClick={() => { setNotifOpen(v => !v); setNewOpen(false); setUserOpen(false); fetchNotifs() }}
              style={{ position: 'relative', background: 'none', border: '1px solid var(--border)', borderRadius: 9, cursor: 'pointer', color: 'var(--text-2)', padding: 7, display: 'flex', transition: 'all 0.15s' }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-3)'}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'none'}
            >
              <Bell size={15} strokeWidth={1.8} />
              {unread > 0 && <span style={{ position: 'absolute', top: 3, right: 3, width: 8, height: 8, borderRadius: '50%', background: 'var(--danger)', border: '1.5px solid var(--surface)' }} />}
            </button>

            {notifOpen && (
              <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 340, background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)', zIndex: 100, animation: 'fadeDown 0.15s ease', overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Notifications</span>
                  {unread > 0 && <button onClick={markAllRead} style={{ fontSize: 11, color: 'var(--brand-500)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Mark all read</button>}
                </div>
                <div style={{ maxHeight: 340, overflowY: 'auto' }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                      <Bell size={32} color="var(--border)" strokeWidth={1.2} style={{ display: 'block', margin: '0 auto 8px' }} />
                      <p style={{ fontSize: 13, color: 'var(--text-3)' }}>You&apos;re all caught up!</p>
                    </div>
                  ) : (
                    notifications.slice(0, 10).map(n => (
                      <div key={n.id} style={{ display: 'flex', gap: 10, padding: '11px 16px', borderBottom: '1px solid var(--border)', background: n.is_read ? 'transparent' : 'var(--brand-50)', transition: 'background 0.1s', cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-2)'}
                      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = n.is_read ? 'transparent' : 'var(--brand-50)'}
                      >
                        <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {NOTIF_ICONS[n.type] || NOTIF_ICONS.info}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: n.is_read ? 400 : 600, color: 'var(--text)', lineHeight: 1.4 }}>{n.title}</div>
                          {n.message && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.message}</div>}
                          <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 3 }}>{timeAgo(n.created_at)}</div>
                        </div>
                        {!n.is_read && <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--brand-500)', flexShrink: 0, marginTop: 4 }} />}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User */}
          <div style={{ position: 'relative' }} ref={userRef}>
            <button onClick={() => { setUserOpen(v => !v); setNewOpen(false); setNotifOpen(false) }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 9, padding: '5px 10px 5px 6px', cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-3)'}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-2)'}
            >
              <div style={{ width: 26, height: 26, borderRadius: 7, background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 10, flexShrink: 0 }}>{initials}</div>
              <div style={{ lineHeight: 1.2 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap' }}>{user.first_name || user.full_name.split(' ')[0]}</div>
                <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'capitalize' }}>{user.role}</div>
              </div>
              <ChevronDown size={12} color="var(--text-3)" strokeWidth={2} style={{ transform: userOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>

            {userOpen && (
              <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, minWidth: 200, background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden', zIndex: 100, animation: 'fadeDown 0.15s ease' }}>
                <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{user.full_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{user.email}</div>
                </div>
                {[{ label:'My Profile', Icon:User, href:'/profile' }, { label:'Settings', Icon:Settings, href:'/admin/settings' }].map(({ label, Icon, href }) => (
                  <button key={label} onClick={() => { setUserOpen(false); router.push(href) }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', fontSize: 13, transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-2)'}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'none'}
                  ><Icon size={14} strokeWidth={1.8} />{label}</button>
                ))}
                <div style={{ height: 1, background: 'var(--border)', margin: '4px 10px' }} />
                <button onClick={() => { setUserOpen(false); logout() }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 13, transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = '#fee2e2'}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'none'}
                >
                  <LogOut size={14} strokeWidth={1.8} />Sign Out
                </button>
              </div>
            )}
          </div>
        </div>

        <style>{`
          [data-theme="dark"] header { background: rgba(13,22,41,0.92) !important; border-bottom-color: rgba(255,255,255,0.06) !important; }
          @keyframes fadeDown { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
        `}</style>
      </header>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  )
}
