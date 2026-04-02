'use client'

import { useEffect, useRef, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  footer?: ReactNode
  hideClose?: boolean
  children: ReactNode
}

const SIZES = { sm: 480, md: 600, lg: 780, xl: 960, full: 'calc(100vw - 80px)' }

export function Modal({ open, onClose, title, description, size = 'md', footer, hideClose, children }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = '' }
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null

  const maxW = typeof SIZES[size] === 'number' ? `${SIZES[size]}px` : SIZES[size]

  return createPortal(
    <div
      className="modal-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal
    >
      <div
        ref={panelRef}
        className="modal-panel"
        style={{ maxWidth: maxW, display: 'flex', flexDirection: 'column' }}
      >
        {(title || !hideClose) && (
          <div style={{ padding: '18px 22px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
            <div>
              {title && <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{title}</h2>}
              {description && <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>{description}</p>}
            </div>
            {!hideClose && (
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4, borderRadius: 7, display: 'flex', transition: 'all 0.15s', flexShrink: 0, marginLeft: 12 }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.background = 'var(--surface-2)'; el.style.color = 'var(--text)' }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.background = 'none'; el.style.color = 'var(--text-3)' }}
              >
                <X size={16} strokeWidth={2} />
              </button>
            )}
          </div>
        )}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>{children}</div>
        {footer && (
          <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
