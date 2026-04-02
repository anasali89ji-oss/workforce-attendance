'use client'
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Timer, Plus, Check, X, Clock, AlertCircle } from 'lucide-react'
import { Modal, DataTable, Column, Avatar, ConfirmDialog } from '@/components/ui'

interface OTRequest { id:string; user_id:string; date:string; hours:number; reason:string; status:string; created_at:string; user?:{full_name:string} }

const STATUS_CFG: Record<string,{label:string;cls:string}> = {
  pending:  {label:'Pending',  cls:'badge badge-warning'},
  approved: {label:'Approved', cls:'badge badge-success'},
  rejected: {label:'Rejected', cls:'badge badge-danger'},
}

export default function OvertimePage() {
  const [requests, setRequests] = useState<OTRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ date:'', hours:2, reason:'' })
  const [saving, setSaving] = useState(false)
  const [rejectId, setRejectId] = useState<string|null>(null)

  const load = useCallback(async () => {
    // Mock data since we don't have an overtime table yet
    setRequests([
      {id:'1',user_id:'u1',date:'2026-04-01',hours:2,reason:'Urgent deployment',status:'pending',created_at:new Date().toISOString(),user:{full_name:'Anas Ali'}},
      {id:'2',user_id:'u2',date:'2026-03-30',hours:3,reason:'Client presentation prep',status:'approved',created_at:new Date().toISOString(),user:{full_name:'Ahmed Khan'}},
    ])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = tab === 'all' ? requests : requests.filter(r => r.status === tab)
  const counts = { pending:requests.filter(r=>r.status==='pending').length, approved:requests.filter(r=>r.status==='approved').length, rejected:requests.filter(r=>r.status==='rejected').length }

  const submit = async () => {
    if (!form.date || !form.reason) { toast.error('Fill all fields'); return }
    setSaving(true)
    await new Promise(r=>setTimeout(r,800))
    toast.success('Overtime request submitted')
    setShowModal(false)
    setForm({date:'',hours:2,reason:''})
    setSaving(false)
  }

  const doAction = async (id:string, action:string) => {
    setRequests(prev => prev.map(r => r.id===id ? {...r, status:action==='approve'?'approved':'rejected'} : r))
    toast.success(action==='approve'?'OT request approved':'OT request rejected')
    setRejectId(null)
  }

  const fmtDate = (d:string) => new Date(d+'T00:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})

  const columns: Column<OTRequest>[] = [
    { key:'user', header:'Employee', render:(r) => (
      <div style={{display:'flex',alignItems:'center',gap:9}}>
        <Avatar name={r.user?.full_name||'?'} size="sm"/>
        <span style={{fontWeight:600,fontSize:13,color:'var(--text)'}}>{r.user?.full_name||'—'}</span>
      </div>
    )},
    { key:'date', header:'Date', sortable:true, render:(r) => <span style={{fontSize:12}}>{fmtDate(r.date)}</span> },
    { key:'hours', header:'Hours', sortable:true, render:(r) => <span style={{fontFamily:'monospace',fontWeight:700,color:'var(--text)'}}>{r.hours}h</span> },
    { key:'reason', header:'Reason', render:(r) => <span style={{fontSize:12,color:'var(--text-2)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:200,display:'block'}}>{r.reason}</span> },
    { key:'status', header:'Status', render:(r) => { const s=STATUS_CFG[r.status]||STATUS_CFG.pending; return <span className={s.cls}>{s.label}</span> } },
    { key:'actions', header:'', render:(r) => r.status==='pending' ? (
      <div style={{display:'flex',gap:6}}>
        <button onClick={()=>doAction(r.id,'approve')} className="btn btn-success btn-sm" style={{gap:4,padding:'4px 8px'}}><Check size={11} strokeWidth={2.5}/>Approve</button>
        <button onClick={()=>setRejectId(r.id)} className="btn btn-danger btn-sm" style={{gap:4,padding:'4px 8px'}}><X size={11} strokeWidth={2.5}/>Reject</button>
      </div>
    ) : null },
  ]

  return (
    <div className="page anim-fade-up">
      <div className="section-header">
        <div>
          <h1 style={{fontSize:20,fontWeight:800,color:'var(--text)',letterSpacing:'-0.02em',display:'flex',alignItems:'center',gap:8}}>
            <Timer size={20} color="var(--brand-500)" strokeWidth={2}/>Overtime Requests
          </h1>
          <p style={{color:'var(--text-3)',fontSize:13,marginTop:3}}>Manage overtime approvals</p>
        </div>
        <button onClick={()=>setShowModal(true)} className="btn btn-primary" style={{gap:6}}>
          <Plus size={14} strokeWidth={2.5}/>Request Overtime
        </button>
      </div>

      <div style={{display:'flex',gap:4,marginBottom:14}}>
        {(['all','pending','approved','rejected'] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{padding:'5px 12px',borderRadius:7,border:'1px solid',cursor:'pointer',fontSize:12,fontWeight:600,transition:'all 0.15s',
            background:tab===t?'var(--brand-600)':'var(--surface-2)',color:tab===t?'#fff':'var(--text-2)',borderColor:tab===t?'var(--brand-600)':'var(--border-strong)'}}>
            {t.charAt(0).toUpperCase()+t.slice(1)}
            <span style={{marginLeft:5,padding:'0 5px',background:tab===t?'rgba(255,255,255,0.2)':'var(--surface-3)',borderRadius:99,fontSize:10,fontWeight:700}}>
              {t==='all'?requests.length:counts[t as keyof typeof counts]}
            </span>
          </button>
        ))}
      </div>

      <div className="card" style={{overflow:'hidden'}}>
        <DataTable data={filtered} columns={columns} loading={loading} searchable exportable exportFileName="overtime"
          emptyTitle="No overtime requests" emptyMessage="No overtime requests found for this filter"/>
      </div>

      <Modal open={showModal} onClose={()=>setShowModal(false)} title="Request Overtime" description="Submit an overtime request for approval" size="sm"
        footer={<div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button onClick={()=>setShowModal(false)} className="btn btn-ghost">Cancel</button>
          <button onClick={submit} disabled={saving} className="btn btn-primary" style={{gap:6}}>
            {saving?<><span className="spinner spinner-sm"/>Submitting...</>:<><Timer size={14} strokeWidth={2}/>Submit</>}
          </button>
        </div>}>
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div className="form-group">
              <label className="form-label">Date *</label>
              <input type="date" className="input" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/>
            </div>
            <div className="form-group">
              <label className="form-label">Hours *</label>
              <input type="number" className="input" min={0.5} max={8} step={0.5} value={form.hours} onChange={e=>setForm(f=>({...f,hours:parseFloat(e.target.value)||0}))}/>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Reason *</label>
            <textarea className="input" rows={3} value={form.reason} onChange={e=>setForm(f=>({...f,reason:e.target.value}))} placeholder="Why is overtime needed?" style={{height:'auto',padding:'10px 12px',resize:'vertical'}}/>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!rejectId} onClose={()=>setRejectId(null)} onConfirm={()=>doAction(rejectId!,'reject')}
        title="Reject Overtime" message="Are you sure you want to reject this overtime request?" confirmLabel="Reject" variant="danger"/>
    </div>
  )
}
