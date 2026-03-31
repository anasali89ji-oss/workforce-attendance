'use client'
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { CalendarOff, Plus, Check, X, Clock, AlertCircle, FileText, User } from 'lucide-react'

interface LeaveReq {
  id: string; start_date: string; end_date: string; days_count: number
  reason?: string; status: string; leave_type: string; created_at: string
  rejection_reason?: string
  user?: { full_name: string }
}
interface LeaveType { id: string; name: string; code: string; color: string }

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; Icon: React.FC<{size?:number;strokeWidth?:number;color?:string}> }> = {
  pending:   { label: 'Pending',   color: '#D97706', bg: '#FFFBEB', Icon: Clock },
  approved:  { label: 'Approved',  color: '#16A34A', bg: '#F0FDF4', Icon: Check },
  rejected:  { label: 'Rejected',  color: '#DC2626', bg: '#FEF2F2', Icon: X },
  cancelled: { label: 'Cancelled', color: '#64748B', bg: '#F8FAFC', Icon: AlertCircle },
}

export default function LeaveRequestsPage() {
  const [requests, setRequests] = useState<LeaveReq[]>([])
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'all'|'pending'|'approved'|'rejected'>('all')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ leave_type_id: 'annual', start_date: '', end_date: '', reason: '' })
  const [submitting, setSubmitting] = useState(false)
  const [rejectId, setRejectId] = useState<string|null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const load = useCallback(async () => {
    const [r, t] = await Promise.all([fetch('/api/leave-requests'), fetch('/api/leave-requests/types')])
    const rj = await r.json(); const tj = await t.json()
    if (rj.data) setRequests(rj.data)
    if (tj.data) setLeaveTypes(tj.data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = requests.filter(r => tab === 'all' || r.status === tab)
  const counts = {
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  }

  const apply = async () => {
    if (!form.leave_type_id || !form.start_date || !form.end_date) { toast.error('Fill all required fields'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/leave-requests', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(form)
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error); return }
      toast.success('Leave request submitted')
      setShowForm(false)
      setForm(f => ({ ...f, start_date: '', end_date: '', reason: '' }))
      await load()
    } finally { setSubmitting(false) }
  }

  const doAction = async (id: string, action: string, extra?: Record<string,string>) => {
    const res = await fetch('/api/leave-requests', {
      method: 'PATCH', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ id, action, ...extra })
    })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error); return }
    toast.success(action === 'approve' ? 'Leave approved' : action === 'reject' ? 'Leave rejected' : 'Done')
    setRejectId(null); setRejectReason('')
    await load()
  }

  const inp = (v: string, onChange: (v:string)=>void, type='text', placeholder='') => (
    <input type={type} value={v} onChange={e => onChange(e.target.value)} placeholder={placeholder}
    style={{ width:'100%', height:40, border:'1.5px solid #E2E8F0', borderRadius:8, padding:'0 12px', fontSize:13, color:'#0F172A', outline:'none', background:'#fff', transition:'border-color 0.15s' }}
    onFocus={e => e.target.style.borderColor='#2563EB'} onBlur={e => e.target.style.borderColor='#E2E8F0'} />
  )

  const LEAVE_LABEL: Record<string,string> = { annual:'Annual', sick:'Sick', emergency:'Emergency', unpaid:'Unpaid', maternity:'Maternity', paternity:'Paternity', bereavement:'Bereavement', jury_duty:'Jury Duty', training:'Training', compassionate:'Compassionate' }
  const LEAVE_COLOR: Record<string,string> = { annual:'#3B82F6', sick:'#EF4444', emergency:'#F59E0B', unpaid:'#6B7280', maternity:'#8B5CF6', paternity:'#0891B2', bereavement:'#475569', jury_duty:'#64748B', training:'#7C3AED', compassionate:'#BE185D' }

  return (
    <div style={{ maxWidth:900, animation:'fadeUp 0.35s ease' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700, color:'#0F172A', display:'flex', alignItems:'center', gap:8 }}>
            <CalendarOff size={20} color="#2563EB" strokeWidth={2} />
            Leave Requests
          </h1>
          <p style={{ color:'#64748B', fontSize:13, marginTop:3 }}>Manage time-off requests and approvals</p>
        </div>
        <button onClick={() => setShowForm(v => !v)} style={{
          display:'flex', alignItems:'center', gap:7, height:38, padding:'0 16px',
          background: showForm?'#F1F5F9':'#2563EB', color: showForm?'#64748B':'#fff',
          border: showForm?'1px solid #E2E8F0':'none', borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer',
          boxShadow: showForm?'none':'0 2px 8px rgba(37,99,235,0.3)',
        }}>
          {showForm ? <><X size={14} strokeWidth={2.5} />Cancel</> : <><Plus size={14} strokeWidth={2.5} />Apply for Leave</>}
        </button>
      </div>

      {showForm && (
        <div style={{ background:'#fff', borderRadius:14, padding:24, marginBottom:20, border:'1px solid #E2E8F0', boxShadow:'0 4px 20px rgba(0,0,0,0.07)', animation:'fadeUp 0.25s ease' }}>
          <h2 style={{ fontSize:14, fontWeight:700, color:'#0F172A', marginBottom:18, display:'flex', alignItems:'center', gap:7 }}>
            <FileText size={15} color="#2563EB" strokeWidth={2} />
            New Leave Request
          </h2>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <div style={{ gridColumn:'1/-1' }}>
              <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#64748B', textTransform:'uppercase', letterSpacing:0.6, marginBottom:6 }}>Leave Type *</label>
              <select value={form.leave_type_id} onChange={e => setForm(f => ({ ...f, leave_type_id: e.target.value }))}
              style={{ width:'100%', height:40, border:'1.5px solid #E2E8F0', borderRadius:8, padding:'0 12px', fontSize:13, color:'#0F172A', outline:'none', background:'#fff', cursor:'pointer' }}>
                {leaveTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#64748B', textTransform:'uppercase', letterSpacing:0.6, marginBottom:6 }}>From *</label>
              {inp(form.start_date, v => setForm(f => ({ ...f, start_date:v })), 'date')}
            </div>
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#64748B', textTransform:'uppercase', letterSpacing:0.6, marginBottom:6 }}>To *</label>
              {inp(form.end_date, v => setForm(f => ({ ...f, end_date:v })), 'date')}
            </div>
            <div style={{ gridColumn:'1/-1' }}>
              <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#64748B', textTransform:'uppercase', letterSpacing:0.6, marginBottom:6 }}>Reason</label>
              <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason:e.target.value }))} rows={3} placeholder="Optional reason..."
              style={{ width:'100%', border:'1.5px solid #E2E8F0', borderRadius:8, padding:'10px 12px', fontSize:13, color:'#0F172A', outline:'none', resize:'vertical', fontFamily:'inherit' }}
              onFocus={e => e.target.style.borderColor='#2563EB'} onBlur={e => e.target.style.borderColor='#E2E8F0'} />
            </div>
          </div>
          <div style={{ display:'flex', gap:10, marginTop:16 }}>
            <button onClick={apply} disabled={submitting} style={{ height:38, padding:'0 20px', background:submitting?'#93C5FD':'#2563EB', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:submitting?'not-allowed':'pointer', display:'flex', alignItems:'center', gap:6 }}>
              {submitting ? 'Submitting...' : <><Check size={13} strokeWidth={2.5} />Submit Request</>}
            </button>
            <button onClick={() => setShowForm(false)} style={{ height:38, padding:'0 16px', background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:8, fontSize:13, color:'#64748B', cursor:'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', boxShadow:'0 1px 4px rgba(0,0,0,0.05)', overflow:'hidden' }}>
        <div style={{ display:'flex', borderBottom:'1px solid #F1F5F9' }}>
          {([['all', requests.length], ['pending', counts.pending], ['approved', counts.approved], ['rejected', counts.rejected]] as const).map(([t, count]) => (
            <button key={t} onClick={() => setTab(t as typeof tab)} style={{
              flex:1, height:46, border:'none', cursor:'pointer', fontSize:13, fontWeight:tab===t?700:500,
              background:'none', color:tab===t?'#2563EB':'#64748B',
              borderBottom:`2px solid ${tab===t?'#2563EB':'transparent'}`,
              textTransform:'capitalize', transition:'all 0.15s',
              display:'flex', alignItems:'center', justifyContent:'center', gap:7,
            }}>
              {t}
              <span style={{ padding:'1px 7px', borderRadius:99, background:tab===t?'#EFF6FF':'#F1F5F9', color:tab===t?'#2563EB':'#94A3B8', fontSize:11, fontWeight:700 }}>{count}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ padding:48, textAlign:'center', color:'#94A3B8' }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding:56, textAlign:'center' }}>
            <CalendarOff size={36} color="#E2E8F0" strokeWidth={1.2} style={{ display:'block', margin:'0 auto 12px' }} />
            <p style={{ fontWeight:600, color:'#374151' }}>No {tab === 'all' ? '' : tab} requests found</p>
          </div>
        ) : (
          <div>
            {filtered.map(req => {
              const cfg = STATUS_CFG[req.status] || STATUS_CFG.cancelled
              const { Icon: StatusIcon } = cfg
              const leaveColor = LEAVE_COLOR[req.leave_type] || '#64748B'
              const leaveLabel = LEAVE_LABEL[req.leave_type] || req.leave_type
              return (
                <div key={req.id} style={{ padding:'16px 20px', borderBottom:'1px solid #F8FAFC', transition:'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background='#FAFAFA'}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background='#fff'}
                >
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
                    <div style={{ display:'flex', gap:12, flex:1, minWidth:0 }}>
                      <div style={{ width:36, height:36, borderRadius:9, background:'#EFF6FF', color:'#2563EB', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <User size={16} strokeWidth={2} />
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:600, color:'#0F172A', fontSize:13, display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                          {req.user?.full_name || 'You'}
                          <span style={{ padding:'2px 8px', borderRadius:5, fontSize:11, fontWeight:700, background:`${leaveColor}15`, color:leaveColor }}>
                            {leaveLabel}
                          </span>
                        </div>
                        <div style={{ fontSize:12, color:'#64748B', marginTop:3, display:'flex', alignItems:'center', gap:6 }}>
                          <span>{new Date(req.start_date+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span>
                          <span style={{ color:'#CBD5E1' }}>→</span>
                          <span>{new Date(req.end_date+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span>
                          <span style={{ color:'#CBD5E1' }}>·</span>
                          <strong style={{ color:'#374151' }}>{req.days_count} day{req.days_count!==1?'s':''}</strong>
                        </div>
                        {req.reason && <div style={{ fontSize:12, color:'#94A3B8', marginTop:4, fontStyle:'italic' }}>"{req.reason}"</div>}
                        {req.rejection_reason && <div style={{ fontSize:11, color:'#DC2626', marginTop:4, display:'flex', alignItems:'center', gap:4 }}><X size={10} strokeWidth={2.5} />{req.rejection_reason}</div>}
                      </div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                      <span style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:7, fontSize:11, fontWeight:700, background:cfg.bg, color:cfg.color }}>
                        <StatusIcon size={11} strokeWidth={2.5} color={cfg.color} />
                        {cfg.label}
                      </span>
                      {req.status === 'pending' && (
                        <>
                          <button onClick={() => doAction(req.id,'approve')} style={{ display:'flex', alignItems:'center', gap:5, height:30, padding:'0 12px', background:'#F0FDF4', border:'1px solid #86EFAC', borderRadius:7, color:'#16A34A', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                            <Check size={12} strokeWidth={2.5} />Approve
                          </button>
                          <button onClick={() => setRejectId(req.id)} style={{ display:'flex', alignItems:'center', gap:5, height:30, padding:'0 12px', background:'#FEF2F2', border:'1px solid #FCA5A5', borderRadius:7, color:'#DC2626', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                            <X size={12} strokeWidth={2.5} />Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {rejectId === req.id && (
                    <div style={{ marginTop:12, display:'flex', gap:8, animation:'fadeUp 0.2s ease' }}>
                      {inp(rejectReason, setRejectReason, 'text', 'Rejection reason...')}
                      <button onClick={() => doAction(req.id,'reject',{rejection_reason:rejectReason})} style={{ height:40, padding:'0 14px', background:'#DC2626', color:'#fff', border:'none', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }}>Confirm</button>
                      <button onClick={() => setRejectId(null)} style={{ height:40, padding:'0 12px', background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:8, fontSize:12, color:'#64748B', cursor:'pointer' }}>Cancel</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
