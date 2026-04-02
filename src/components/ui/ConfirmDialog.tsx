'use client'
// ─── ConfirmDialog ────────────────────────────────────────────
import { useState, ReactNode } from 'react'
import { Modal } from './Modal'
import { AlertTriangle, Trash2, Info } from 'lucide-react'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'info'
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', variant = 'danger' }: ConfirmDialogProps) {
  const [loading, setLoading] = useState(false)
  const Icon = variant === 'danger' ? Trash2 : variant === 'warning' ? AlertTriangle : Info
  const iconBg = variant === 'danger' ? '#fee2e2' : variant === 'warning' ? '#fef3c7' : '#dbeafe'
  const iconColor = variant === 'danger' ? '#dc2626' : variant === 'warning' ? '#d97706' : '#2563eb'
  const btnCls = variant === 'danger' ? 'btn btn-danger' : variant === 'warning' ? 'btn btn-primary' : 'btn btn-primary'

  const handle = async () => {
    setLoading(true)
    try { await onConfirm() } finally { setLoading(false); onClose() }
  }

  return (
    <Modal open={open} onClose={onClose} size="sm" hideClose>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '8px 0 4px' }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
          <Icon size={24} color={iconColor} strokeWidth={1.8} />
        </div>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>{title}</h3>
        <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, maxWidth: 320 }}>{message}</p>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'center' }}>
        <button onClick={onClose} className="btn btn-ghost" style={{ minWidth: 90 }}>{cancelLabel}</button>
        <button onClick={handle} disabled={loading} className={btnCls} style={{ minWidth: 110, gap: 6 }}>
          {loading ? <><span className="spinner spinner-sm" />{confirmLabel}...</> : confirmLabel}
        </button>
      </div>
    </Modal>
  )
}

export { ConfirmDialog as default }
