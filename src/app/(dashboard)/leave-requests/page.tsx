'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { CalendarOff, Plus, Check, X, Clock, AlertCircle, User, FileText, ChevronDown } from 'lucide-react'

interface LeaveReq {
  id: string; leave_type: string; start_date: string; end_date: string
  days_count: number; reason?: string; status: string; created_at: string
  rejection_reason?: string
  user?: { full_name: string }
}
interface LeaveType { id: string; name: string; code: string; color: string; days_per_year: number }

const STATUS_CFG: Record<string, { label: string; cls: string; Icon: React.FC<{size?:number;strokeWidth?:number;color?:string}> }> = {
  pending:   { label: 'Pending',   cls: 'badge-warning', Icon: Clock },
  approved:  { label: 'Approved',  cls: 'badge-success', Icon: Check },
  rejected:  { label: 'Rejected',  cls: 'badge-danger',  Icon: X },
  cancelled: { label: 'Cancelled', cls: 'badge-default', Icon: AlertCircle },
}

const LEAVE_COLORS: Record<string, string> = {
  annual: '#3b82f6', sick: '#ef4444', emergency: '#f59e0b', unpaid: '#6b7280',
  maternity: '#8b5cf6', paternity: '#0891b2', bereavement: '#475569',
  training: '#7c3aed', compassionate: '#be185d',
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function LeaveRequestsPage() {
  const [requests, setRequests] = useState<LeaveReq[]>([])
  const [types, setTypes] = useState<LeaveType[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'all'|'pending'|'approved'|'rejected'>('all')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ leave_type_id: 'annual', start_date: '', end_date: '', reason: '' })
  const [submitting, setSubmitting] = useState(false)
  const [rejectId, setRejectId] = useState<string|null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const load = useCallback(async () => {
    const [r, t] = await Promise.all([fetch('/api/leave-requests'), fetch('/api/leave-requests/types')])
    const rj = await r.json(); const tj = await t.json()
    if (rj.data) setRequests(rj.data)
    if (tj.data) setTypes(tj.data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = requests.filter(r => tab === 'all' || r.status === tab)
  const counts = { pending: requests.filter(r=>r.status==='pending').length, approved: requests.filter(r=>r.status==='approved').length, rejected: requests.filter(r=>r.status==='rejected').length }

  const calcDays = () => {
    if (!form.start_date || !form.end_date) return 0
    const s = new Date(form.start_date), e = new Date(form.end_date)
    let days = 0; const c = new Date(s)
    while (c <= e) { const d = c.getDay(); if (d !== 0 && d !== 6) days++; c.setDate(c.getDate()+1) }
    return days
  }

  const submit = async () => {
    if (!form.start_date || !form.end_date) { toast.error('Select date range'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/leave-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error); return }
      toast.success('Leave request submitted')
      setShowModal(false); setForm({ leave_type_id: 'annual', start_date: '', end_date: '', reason: '' })
      await load()
    } finally { setSubmitting(false) }
  }

  const doAction = async (id: string, action: string, extra?: Record<string,string>) => {
    const res = await fetch('/api/leave-requests', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action, ...extra }) })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error); return }
    toast.success(action === 'approve' ? '✓ Leave approved' : action === 'reject' ? 'Leave rejected' : 'Done')
    setRejectId(null); setRejectReason('')
    await load()
  }

  const days = calcDays()

  return (
    <div className="page anim-fade-up">

      {/* Header */}
      <div className="section-header">
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 8 }}>
            <CalendarOff size={20} color="var(--brand-500)" strokeWidth={2} />
            Leave Requests
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: 13, marginTop: 3 }}>Manage time-off and track your leave balance</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary" style={{ gap: 6 }}>
          <Plus size={14} strokeWidth={2.5} />Apply for Leave
        </button>
      </div>

      {/* Leave type balance pills */}
      {types.length > 0 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          {types.slice(0, 5).map(t => (
            <div key={t.id} style={{
              padding: '8px 14px', borderRadius: 10, background: 'var(--surface)',
              border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: LEAVE_COLORS[t.id] || '#64748b', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{t.name}</div>
                <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{t.days_per_year > 0 ? `${t.days_per_year} days/year` : 'Unlimited'}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs + Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="tabs-underline" style={{ padding: '0 18px' }}>
          {([['all', requests.length], ['pending', counts.pending], ['approved', counts.approved], ['rejected', counts.rejected]] as const).map(([t, count]) => (
            <button key={t} onClick={() => setTab(t as typeof tab)} className={`tab-underline ${tab === t ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
              <span style={{
                padding: '1px 7px', borderRadius: 99, fontSize: 10, fontWeight: 700,
                background: tab === t ? 'var(--brand-50)' : 'var(--surface-3)',
                color: tab === t ? 'var(--brand-600)' : 'var(--text-3)',
              }}>{count}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><span className="spinner spinner-md" style={{ borderTopColor: 'var(--brand-500)' }} /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <CalendarOff size={40} strokeWidth={1.2} /><h3>No {tab === 'all' ? '' : tab} requests</h3>
            <p>Submit a leave request using the button above</p>
            <button onClick={() => setShowModal(true)} className="btn btn-primary btn-sm" style={{ marginTop: 8 }}><Plus size={13} />Apply for Leave</button>
          </div>
        ) : (
          <div>
            {filtered.map(req => {
              const cfg = STATUS_CFG[req.status] || STATUS_CFG.pending
              const leaveColor = LEAVE_COLORS[req.leave_type] || '#64748b'
              return (
                <div key={req.id} style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-2)'}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 12, flex: 1, minWidth: 0 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--brand-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <User size={16} color="var(--brand-600)" strokeWidth={2} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>
                            {req.user?.full_name || 'You'}
                          </span>
                          <span className="badge" style={{ background: `${leaveColor}15`, color: leaveColor, border: `1px solid ${leaveColor}30`, fontSize: 11 }}>
                            {req.leave_type.charAt(0).toUpperCase() + req.leave_type.slice(1)}
                          </span>
                          <span className={`badge ${cfg.cls}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                            <cfg.Icon size={9} strokeWidth={2.5} />{cfg.label}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span>{fmtDate(req.start_date)}</span>
                          <span style={{ color: 'var(--text-3)' }}>→</span>
                          <span>{fmtDate(req.end_date)}</span>
                          <span style={{ fontWeight: 700, color: 'var(--text)' }}>{req.days_count} day{req.days_count!==1?'s':''}</span>
                        </div>
                        {req.reason && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4, fontStyle: 'italic' }}>"{req.reason}"</div>}
                        {req.rejection_reason && <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}><X size={10} strokeWidth={2.5} />{req.rejection_reason}</div>}
                      </div>
                    </div>

                    {req.status === 'pending' && (
                      <div style={{ display: 'flex', gap: 7, flexShrink: 0 }}>
                        <button onClick={() => doAction(req.id, 'approve')} className="btn btn-success btn-sm" style={{ gap: 5 }}>
                          <Check size={12} strokeWidth={2.5} />Approve
                        </button>
                        <button onClick={() => setRejectId(req.id)} className="btn btn-danger btn-sm" style={{ gap: 5 }}>
                          <X size={12} strokeWidth={2.5} />Reject
                        </button>
                      </div>
                    )}
                  </div>

                  {rejectId === req.id && (
                    <div style={{ marginTop: 12, display: 'flex', gap: 8, animation: 'fadeUp 0.2s ease' }}>
                      <input
                        className="input input-sm" placeholder="Rejection reason..."
                        value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <button onClick={() => doAction(req.id,'reject',{rejection_reason:rejectReason})} className="btn btn-danger btn-sm">Confirm</button>
                      <button onClick={() => setRejectId(null)} className="btn btn-ghost btn-sm">Cancel</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Leave Request Modal ── */}
      {showModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="modal-panel modal-md" style={{ padding: 0 }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>New Leave Request</h2>
                <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Submit a time-off request for approval</p>
              </div>
              <button onClick={() => setShowModal(false)} className="btn btn-ghost btn-icon" style={{ padding: 6 }}>
                <X size={16} strokeWidth={2} />
              </button>
            </div>

            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Leave type cards */}
              <div>
                <label className="form-label">Leave Type</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 6 }}>
                  {types.slice(0,6).map(t => (
                    <button key={t.id} type="button" onClick={() => setForm(f => ({ ...f, leave_type_id: t.id }))} style={{
                      padding: '10px 12px', borderRadius: 10, border: `2px solid`, cursor: 'pointer',
                      textAlign: 'left', transition: 'all 0.15s',
                      borderColor: form.leave_type_id === t.id ? LEAVE_COLORS[t.id] || '#4f46e5' : 'var(--border)',
                      background: form.leave_type_id === t.id ? `${LEAVE_COLORS[t.id] || '#4f46e5'}10` : 'var(--surface-2)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: LEAVE_COLORS[t.id] || '#64748b', flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{t.name}</span>
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{t.days_per_year > 0 ? `${t.days_per_year} days/yr` : 'Unlimited'}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Start Date *</label>
                  <input type="date" className="input" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date *</label>
                  <input type="date" className="input" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} min={form.start_date} />
                </div>
              </div>

              {days > 0 && (
                <div style={{ padding: '10px 14px', borderRadius: 9, background: 'var(--brand-50)', border: '1px solid var(--brand-100)' }}>
                  <span style={{ fontSize: 13, color: 'var(--brand-700)', fontWeight: 600 }}>
                    Duration: <strong>{days} working day{days!==1?'s':''}</strong>
                  </span>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Reason</label>
                <textarea
                  className="input" rows={3} placeholder="Optional reason for your leave request..."
                  value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  style={{ height: 'auto', padding: '10px 12px', resize: 'vertical' }}
                />
              </div>
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} className="btn btn-ghost">Cancel</button>
              <button onClick={submit} disabled={submitting || !form.start_date || !form.end_date} className="btn btn-primary" style={{ gap: 6 }}>
                {submitting ? <><span className="spinner spinner-sm" />Submitting...</> : <><FileText size={14} strokeWidth={2} />Submit Request</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
