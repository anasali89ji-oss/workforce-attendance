'use client'

import { useEffect, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface DrawerProps {
  open: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  width?: number
  footer?: ReactNode
  children: ReactNode
}

export function Drawer({ open, onClose, title, subtitle, width = 480, footer, children }: DrawerProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = '' }
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer-panel" style={{ width }}>
        {(title || subtitle) && (
          <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
            <div>
              {title && <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{title}</h2>}
              {subtitle && <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{subtitle}</p>}
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 5, borderRadius: 7, display: 'flex', transition: 'all 0.15s', flexShrink: 0 }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.background = 'var(--surface-2)'; el.style.color = 'var(--text)' }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.background = 'none'; el.style.color = 'var(--text-3)' }}
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>
        )}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>{children}</div>
        {footer && (
          <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>{footer}</div>
        )}
      </div>
    </>,
    document.body
  )
}
