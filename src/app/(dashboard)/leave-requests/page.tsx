'use client'
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'

interface LeaveReq { id: string; start_date: string; end_date: string; days_count: number; reason?: string; status: string; leave_type: string; created_at: string; rejection_reason?: string; user?: { full_name: string }; approver?: { full_name: string } }
interface LeaveType { id: string; name: string; code: string; color: string }

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: 'Pending', color: '#d97706', bg: '#fffbeb' },
  approved:  { label: 'Approved', color: '#059669', bg: '#f0fdf4' },
  rejected:  { label: 'Rejected', color: '#dc2626', bg: '#fef2f2' },
  cancelled: { label: 'Cancelled', color: '#64748b', bg: '#f8fafc' },
}

export default function LeaveRequestsPage() {
  const [requests, setRequests] = useState<LeaveReq[]>([])
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'all'|'pending'|'approved'|'rejected'>('all')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ leave_type: '', start_date: '', end_date: '', reason: '' })
  const [submitting, setSubmitting] = useState(false)
  const [rejectId, setRejectId] = useState<string|null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const load = useCallback(async () => {
    const [r, t] = await Promise.all([fetch('/api/leave-requests'), fetch('/api/leave-requests/types')])
    const rj = await r.json(); const tj = await t.json()
    if (rj.data) setRequests(rj.data)
    if (tj.data) { setLeaveTypes(tj.data); if (!form.leave_type && tj.data[0]) setForm(f => ({ ...f, leave_type: tj.data[0].id })) }
    setLoading(false)
  }, [form.leave_type])

  useEffect(() => { load() }, [load])

  const filtered = requests.filter(r => tab === 'all' || r.status === tab)

  const apply = async () => {
    if (!form.leave_type || !form.start_date || !form.end_date) { toast.error('Fill all required fields'); return }
    setSubmitting(true)
    try {
      const body = { ...form, leave_type: leaveTypes.find(t => t.id === form.leave_type)?.name.toLowerCase() || form.leave_type }
      const res = await fetch('/api/leave-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error); return }
      toast.success('Leave request submitted!')
      setShowForm(false)
      await load()
    } finally { setSubmitting(false) }
  }

  const doAction = async (id: string, action: string, extra?: Record<string,string>) => {
    const res = await fetch('/api/leave-requests', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action, ...extra }) })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error); return }
    toast.success(`Request ${action}d`)
    setRejectId(null); setRejectReason('')
    await load()
  }

  const Input = ({ label, type = 'text', value, onChange, children }: { label: string; type?: string; value: string; onChange: (v: string) => void; children?: React.ReactNode }) => (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>{label}</label>
      {children || <input type={type} value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', height: 40, border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '0 12px', fontSize: 13, color: '#0f172a', outline: 'none', transition: 'border-color 0.2s' }} onFocus={e => e.target.style.borderColor = '#4f46e5'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />}
    </div>
  )

  const counts = { pending: requests.filter(r => r.status === 'pending').length, approved: requests.filter(r => r.status === 'approved').length, rejected: requests.filter(r => r.status === 'rejected').length }

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' }}>Leave Requests</h1>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>Manage time-off requests and approvals</p>
        </div>
        <button onClick={() => setShowForm(v => !v)} style={{ height: 40, padding: '0 20px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 8px rgba(79,70,229,0.3)' }}>
          {showForm ? '✕ Cancel' : '+ Apply for Leave'}
        </button>
      </div>

      {showForm && (
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, marginBottom: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid #f1f5f9', animation: 'fadeUp 0.3s ease' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 20 }}>New Leave Request</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ gridColumn: '1/-1' }}>
              <Input label="Leave Type *" value={form.leave_type} onChange={v => setForm(f => ({ ...f, leave_type: v }))}>
                <select value={form.leave_type} onChange={e => setForm(f => ({ ...f, leave_type: e.target.value }))} style={{ width: '100%', height: 40, border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '0 12px', fontSize: 13, color: '#0f172a', outline: 'none', background: '#fff', cursor: 'pointer' }}>
                  {leaveTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </Input>
            </div>
            <Input label="From *" type="date" value={form.start_date} onChange={v => setForm(f => ({ ...f, start_date: v }))} />
            <Input label="To *" type="date" value={form.end_date} onChange={v => setForm(f => ({ ...f, end_date: v }))} />
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Reason</label>
              <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} rows={3} placeholder="Optional reason for leave..." style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#0f172a', outline: 'none', resize: 'none' }} onFocus={e => e.target.style.borderColor = '#4f46e5'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button onClick={apply} disabled={submitting} style={{ height: 40, padding: '0 20px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}>{submitting ? 'Submitting...' : 'Submit Request'}</button>
            <button onClick={() => setShowForm(false)} style={{ height: 40, padding: '0 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#64748b', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9' }}>
          {([['all', requests.length], ['pending', counts.pending], ['approved', counts.approved], ['rejected', counts.rejected]] as const).map(([t, count]) => (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, height: 48, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: tab === t ? 700 : 500, background: 'none', color: tab === t ? '#4f46e5' : '#64748b', borderBottom: `2px solid ${tab === t ? '#4f46e5' : 'transparent'}`, textTransform: 'capitalize', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {t}
              <span style={{ padding: '1px 6px', borderRadius: 99, background: tab === t ? '#eef2ff' : '#f1f5f9', color: tab === t ? '#4f46e5' : '#94a3b8', fontSize: 11, fontWeight: 700 }}>{count}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📭</div>
            <p style={{ color: '#374151', fontWeight: 600 }}>No {tab === 'all' ? '' : tab} requests</p>
          </div>
        ) : (
          <div>
            {filtered.map(req => {
              const meta = STATUS[req.status] || STATUS.cancelled
              return (
                <div key={req.id} style={{ padding: '16px 20px', borderBottom: '1px solid #f8fafc', transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#fafafa'}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = '#fff'}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 12, flex: 1 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#eef2ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                        {req.user?.full_name?.[0] || '?'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 13 }}>
                          {req.user?.full_name || 'You'}
                          <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 5, fontSize: 11, fontWeight: 700, background: '#f1f5f9', color: '#64748b', textTransform: 'capitalize' }}>{req.leave_type}</span>
                        </div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                          {new Date(req.start_date).toLocaleDateString()} → {new Date(req.end_date).toLocaleDateString()}
                          <span style={{ margin: '0 6px', color: '#cbd5e1' }}>·</span>
                          <strong style={{ color: '#374151' }}>{req.days_count} day{req.days_count !== 1 ? 's' : ''}</strong>
                        </div>
                        {req.reason && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 3, fontStyle: 'italic' }}>"{req.reason}"</div>}
                        {req.rejection_reason && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 3 }}>❌ {req.rejection_reason}</div>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <span style={{ padding: '4px 10px', borderRadius: 7, fontSize: 11, fontWeight: 700, background: meta.bg, color: meta.color }}>{meta.label}</span>
                      {req.status === 'pending' && (
                        <>
                          <button onClick={() => doAction(req.id, 'approve')} style={{ height: 30, padding: '0 12px', background: '#f0fdf4', border: '1px solid #a7f3d0', borderRadius: 7, color: '#059669', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Approve</button>
                          <button onClick={() => setRejectId(req.id)} style={{ height: 30, padding: '0 12px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 7, color: '#dc2626', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Reject</button>
                        </>
                      )}
                    </div>
                  </div>
                  {rejectId === req.id && (
                    <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                      <input value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Rejection reason..." style={{ flex: 1, height: 36, border: '1px solid #e2e8f0', borderRadius: 7, padding: '0 10px', fontSize: 12, outline: 'none' }} />
                      <button onClick={() => doAction(req.id, 'reject', { rejection_reason: rejectReason })} style={{ height: 36, padding: '0 14px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Confirm</button>
                      <button onClick={() => setRejectId(null)} style={{ height: 36, padding: '0 10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 12, color: '#64748b', cursor: 'pointer' }}>Cancel</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
      <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  )
}
