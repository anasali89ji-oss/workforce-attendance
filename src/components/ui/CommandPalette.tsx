'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import {
  Search, LayoutDashboard, Clock, CalendarOff, Users, Columns2,
  BarChart2, UserCog, ShieldCheck, Settings, Map, DollarSign,
  FileBarChart, LogIn, Plus, User, ArrowRight
} from 'lucide-react'

interface CmdItem {
  id: string; label: string; description?: string; icon: React.ReactNode
  href?: string; action?: () => void; category: string; keywords?: string[]
}

interface CommandPaletteProps { open: boolean; onClose: () => void }

const NAV_ITEMS: CmdItem[] = [
  { id:'dash',   label:'Dashboard',        icon:<LayoutDashboard size={16}/>, href:'/dashboard',        category:'Pages' },
  { id:'att',    label:'Attendance',        icon:<Clock size={16}/>,           href:'/attendance',        category:'Pages' },
  { id:'leave',  label:'Leave Requests',    icon:<CalendarOff size={16}/>,     href:'/leave-requests',    category:'Pages' },
  { id:'team',   label:'Team Directory',    icon:<Users size={16}/>,            href:'/team-directory',    category:'Pages' },
  { id:'kanban', label:'Kanban Board',      icon:<Columns2 size={16}/>,         href:'/kanban',            category:'Pages' },
  { id:'map',    label:'Live Map',          icon:<Map size={16}/>,              href:'/live-map',           category:'Pages' },
  { id:'analy',  label:'Analytics',         icon:<BarChart2 size={16}/>,        href:'/admin/analytics',   category:'Pages' },
  { id:'emp',    label:'Employees',         icon:<UserCog size={16}/>,          href:'/admin/employees',   category:'Pages' },
  { id:'roles',  label:'Roles & Permissions',icon:<ShieldCheck size={16}/>,    href:'/admin/roles',       category:'Pages' },
  { id:'set',    label:'Settings',          icon:<Settings size={16}/>,         href:'/admin/settings',    category:'Pages' },
  { id:'pay',    label:'Payroll',           icon:<DollarSign size={16}/>,       href:'/payroll',           category:'Pages' },
  { id:'rep',    label:'Reports',           icon:<FileBarChart size={16}/>,     href:'/reports',           category:'Pages' },
  { id:'prof',   label:'My Profile',        icon:<User size={16}/>,             href:'/profile',           category:'Pages' },
]

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = NAV_ITEMS.filter(item => {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return item.label.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q) || item.keywords?.some(k => k.includes(q))
  })

  const select = useCallback((item: CmdItem) => {
    if (item.action) item.action()
    else if (item.href) router.push(item.href)
    onClose()
  }, [router, onClose])

  useEffect(() => {
    if (open) { setQuery(''); setCursor(0); setTimeout(() => inputRef.current?.focus(), 50) }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, filtered.length - 1)) }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)) }
      if (e.key === 'Enter' && filtered[cursor]) { e.preventDefault(); select(filtered[cursor]) }
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, filtered, cursor, select, onClose])

  if (!open || typeof document === 'undefined') return null

  const grouped = filtered.reduce((acc, item) => {
    (acc[item.category] ??= []).push(item)
    return acc
  }, {} as Record<string, CmdItem[]>)

  return createPortal(
    <div className="cmd-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="cmd-panel">
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <Search size={16} color="var(--text-3)" strokeWidth={1.8} style={{ flexShrink: 0 }} />
          <input
            ref={inputRef}
            className="cmd-input"
            placeholder="Search pages, actions..."
            value={query}
            onChange={e => { setQuery(e.target.value); setCursor(0) }}
          />
          <kbd style={{ fontSize: 11, color: 'var(--text-3)', background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 5, padding: '2px 6px', flexShrink: 0 }}>ESC</kbd>
        </div>

        <div style={{ overflowY: 'auto', maxHeight: 400, padding: '6px 0' }}>
          {filtered.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px 24px' }}>
              <Search size={32} strokeWidth={1.2} />
              <h3>No results for &ldquo;{query}&rdquo;</h3>
            </div>
          ) : (
            Object.entries(grouped).map(([cat, items]) => (
              <div key={cat}>
                <div className="cmd-category">{cat}</div>
                {items.map(item => {
                  const globalIdx = filtered.indexOf(item)
                  const isActive = globalIdx === cursor
                  return (
                    <div
                      key={item.id}
                      className={`cmd-item ${isActive ? 'active' : ''}`}
                      onClick={() => select(item)}
                      onMouseEnter={() => setCursor(globalIdx)}
                    >
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: isActive ? 'var(--brand-50)' : 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isActive ? 'var(--brand-600)' : 'var(--text-3)', flexShrink: 0 }}>
                        {item.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{item.label}</div>
                        {item.description && <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{item.description}</div>}
                      </div>
                      {isActive && <ArrowRight size={14} color="var(--text-3)" />}
                    </div>
                  )
                })}
              </div>
            ))
          )}
        </div>

        <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 14, flexShrink: 0 }}>
          {[['↑↓','Navigate'],['↵','Open'],['ESC','Close']].map(([key, label]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-3)' }}>
              <kbd style={{ background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 6px', fontSize: 10 }}>{key}</kbd>
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  )
}
