'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Bell, Moon, Sun, Command, X, Check } from 'lucide-react'
import { useTheme } from 'next-themes'
import type { CurrentUser } from '@/types'

interface TopBarProps {
  user: CurrentUser
}

export default function TopBar({ user }: TopBarProps) {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [cmdOpen, setCmdOpen] = useState(false)
  const [cmdQuery, setCmdQuery] = useState('')
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications] = useState([
    { id: '1', title: 'Leave request approved', message: 'Your annual leave for June 15-18 was approved.', time: '2h ago', read: false, type: 'success' as const },
    { id: '2', title: 'Late arrival warning', message: 'You were 12 minutes late today.', time: '5h ago', read: false, type: 'warning' as const },
    { id: '3', title: 'New team member', message: 'Sarah Johnson joined the Engineering team.', time: '1d ago', read: true, type: 'info' as const },
  ])

  const cmdInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCmdOpen(prev => !prev)
      }
      if (e.key === 'Escape') {
        setCmdOpen(false)
        setNotifOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (cmdOpen && cmdInputRef.current) cmdInputRef.current.focus()
  }, [cmdOpen])

  const commands = [
    { label: 'Go to Dashboard', shortcut: 'D', action: () => router.push('/dashboard') },
    { label: 'Go to Attendance', shortcut: 'A', action: () => router.push('/attendance') },
    { label: 'Go to Leave Requests', shortcut: 'L', action: () => router.push('/leave-requests') },
    { label: 'Go to Team Directory', shortcut: 'T', action: () => router.push('/team-directory') },
    { label: 'Go to Reports', shortcut: 'R', action: () => router.push('/reports') },
    { label: 'Toggle Dark Mode', shortcut: 'M', action: () => setTheme(theme === 'dark' ? 'light' : 'dark') },
  ]

  const filteredCommands = commands.filter(c => c.label.toLowerCase().includes(cmdQuery.toLowerCase()))
  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <>
      <header className="h-[var(--header-h)] bg-[var(--surface)] border-b border-[var(--border)] flex items-center justify-between px-6 flex-shrink-0">
        <button onClick={() => setCmdOpen(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--text-3)] hover:text-[var(--text)] hover:border-[var(--border-strong)] transition-all">
          <Search size={14} />
          <span className="hidden sm:inline">Search or jump to...</span>
          <span className="hidden md:flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[var(--surface-3)] text-[10px] font-mono text-[var(--text-3)]">
            <Command size={10} /> K
          </span>
        </button>

        <div className="flex items-center gap-2">
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="btn btn-icon btn-sm" title="Toggle theme">
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <div className="relative">
            <button onClick={() => setNotifOpen(!notifOpen)} className="btn btn-icon btn-sm relative">
              <Bell size={16} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[var(--danger)] text-white text-[9px] font-bold flex items-center justify-center">{unreadCount}</span>
              )}
            </button>
            {notifOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-80 card z-50 shadow-xl anim-scale-in overflow-hidden">
                  <div className="flex items-center justify-between p-3 border-b border-[var(--border)]">
                    <span className="text-sm font-bold text-[var(--text)]">Notifications</span>
                    <button className="text-xs text-[var(--brand-500)] hover:text-[var(--brand-600)] font-medium">Mark all read</button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.map(n => (
                      <div key={n.id} className={`p-3 border-b border-[var(--border)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer ${n.read ? 'opacity-60' : ''}`}>
                        <div className="flex items-start gap-2.5">
                          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.type === 'success' ? 'bg-[var(--success)]' : n.type === 'warning' ? 'bg-[var(--warning)]' : 'bg-[var(--brand-500)]'}`} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-[var(--text)]">{n.title}</div>
                            <div className="text-xs text-[var(--text-3)] mt-0.5">{n.message}</div>
                            <div className="text-[10px] text-[var(--text-3)] mt-1">{n.time}</div>
                          </div>
                          {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-[var(--brand-500)] flex-shrink-0 mt-1" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 pl-3 border-l border-[var(--border)]">
            <div className="w-8 h-8 rounded-full bg-[var(--brand-500)]/10 flex items-center justify-center text-xs font-bold text-[var(--brand-600)]">
              {user.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?'}
            </div>
            <div className="hidden md:block">
              <div className="text-sm font-medium text-[var(--text)]">{user.full_name}</div>
              <div className="text-[10px] text-[var(--text-3)] capitalize">{user.role}</div>
            </div>
          </div>
        </div>
      </header>

      {cmdOpen && (
        <div className="cmd-overlay" onClick={() => setCmdOpen(false)}>
          <div className="cmd-panel" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
              <Search size={16} className="text-[var(--text-3)]" />
              <input ref={cmdInputRef} type="text" value={cmdQuery} onChange={e => setCmdQuery(e.target.value)}
                placeholder="Type a command or search..." className="flex-1 bg-transparent border-none outline-none text-sm text-[var(--text)] placeholder:text-[var(--text-3)]" />
              <button onClick={() => setCmdOpen(false)} className="text-[var(--text-3)] hover:text-[var(--text)]"><X size={14} /></button>
            </div>
            <div className="max-h-80 overflow-y-auto py-1">
              {filteredCommands.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-[var(--text-3)]">No commands found</div>
              ) : (
                filteredCommands.map(cmd => (
                  <button key={cmd.label} onClick={() => { cmd.action(); setCmdOpen(false) }}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[var(--surface-2)] transition-colors text-left">
                    <span className="text-sm text-[var(--text)]">{cmd.label}</span>
                    <span className="text-xs font-mono text-[var(--text-3)] bg-[var(--surface-2)] px-1.5 py-0.5 rounded">{cmd.shortcut}</span>
                  </button>
                ))
              )}
            </div>
            <div className="px-4 py-2 border-t border-[var(--border)] text-[10px] text-[var(--text-3)] flex items-center gap-3">
              <span className="flex items-center gap-1"><span className="font-mono bg-[var(--surface-2)] px-1 rounded">↵</span> to select</span>
              <span className="flex items-center gap-1"><span className="font-mono bg-[var(--surface-2)] px-1 rounded">esc</span> to close</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
