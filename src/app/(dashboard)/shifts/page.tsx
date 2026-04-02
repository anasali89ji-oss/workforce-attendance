'use client'
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Clock, Plus, Moon, Sun, Edit2, Users, Check } from 'lucide-react'
import { Modal, DataTable, Column, ConfirmDialog } from '@/components/ui'

interface Shift { id:string; name:string; start_time:string; end_time:string; is_night_shift:boolean; color:string; days:string; tenant_id:string }

const COLORS = ['#4f46e5','#0891b2','#10b981','#d97706','#7c3aed','#ef4444']

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name:'', start_time:'09:00', end_time:'18:00', is_night_shift:false, color:COLORS[0] })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/shifts')
    const json = await res.json()
    if (json.data) setShifts(json.data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const save = async () => {
    if (!form.name.trim()) { toast.error('Shift name required'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/shifts', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error || 'Failed'); return }
      toast.success('Shift created')
      setShowModal(false)
      setForm({ name:'', start_time:'09:00', end_time:'18:00', is_night_shift:false, color:COLORS[0] })
      await load()
    } finally { setSaving(false) }
  }

  const columns: Column<Shift>[] = [
    { key:'name', header:'Shift Name', sortable:true, render:(s) => (
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <div style={{width:10,height:10,borderRadius:'50%',background:s.color,flexShrink:0}}/>
        <span style={{fontWeight:600,fontSize:13,color:'var(--text)'}}>{s.name}</span>
        {s.is_night_shift && <span className="badge badge-purple" style={{fontSize:10,gap:3}}><Moon size={9} strokeWidth={2}/>Night</span>}
      </div>
    )},
    { key:'start_time', header:'Start Time', render:(s) => (
      <span style={{fontFamily:'monospace',fontSize:13,fontWeight:600,color:'var(--text)'}}>{s.start_time}</span>
    )},
    { key:'end_time', header:'End Time', render:(s) => (
      <span style={{fontFamily:'monospace',fontSize:13,fontWeight:600,color:'var(--text)'}}>{s.end_time}</span>
    )},
    { key:'hours', header:'Duration', render:(s) => {
      const [sh,sm]=s.start_time.split(':').map(Number); const [eh,em]=s.end_time.split(':').map(Number)
      let mins = (eh*60+em)-(sh*60+sm); if(mins<0) mins+=1440
      return <span style={{fontSize:12,color:'var(--text-2)'}}>{Math.floor(mins/60)}h {mins%60>0?`${mins%60}m`:''}</span>
    }},
    { key:'days', header:'Working Days', render:(s) => (
      <span style={{fontSize:12,color:'var(--text-2)'}}>{s.days||'Mon–Fri'}</span>
    )},
  ]

  return (
    <div className="page anim-fade-up">
      <div className="section-header">
        <div>
          <h1 style={{fontSize:20,fontWeight:800,color:'var(--text)',letterSpacing:'-0.02em',display:'flex',alignItems:'center',gap:8}}>
            <Clock size={20} color="var(--brand-500)" strokeWidth={2}/>Shifts
          </h1>
          <p style={{color:'var(--text-3)',fontSize:13,marginTop:3}}>{shifts.length} shift{shifts.length!==1?'s':''} configured</p>
        </div>
        <button onClick={()=>setShowModal(true)} className="btn btn-primary" style={{gap:6}}>
          <Plus size={14} strokeWidth={2.5}/>Create Shift
        </button>
      </div>

      <div className="card" style={{overflow:'hidden'}}>
        <DataTable data={shifts} columns={columns} loading={loading} searchable exportable exportFileName="shifts"
          emptyTitle="No shifts" emptyMessage="Create your first shift to assign to employees"
          emptyAction={<button onClick={()=>setShowModal(true)} className="btn btn-primary btn-sm" style={{marginTop:8,gap:5}}><Plus size={13}/>Create Shift</button>}/>
      </div>

      <Modal open={showModal} onClose={()=>setShowModal(false)} title="Create Shift" size="sm"
        footer={<div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button onClick={()=>setShowModal(false)} className="btn btn-ghost">Cancel</button>
          <button onClick={save} disabled={saving} className="btn btn-primary" style={{gap:6}}>
            {saving?<><span className="spinner spinner-sm"/>Saving...</>:<><Check size={14} strokeWidth={2.5}/>Create</>}
          </button>
        </div>}>
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <div className="form-group">
            <label className="form-label">Shift Name *</label>
            <input className="input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Morning Shift"/>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div className="form-group">
              <label className="form-label">Start Time</label>
              <input type="time" className="input" value={form.start_time} onChange={e=>setForm(f=>({...f,start_time:e.target.value}))}/>
            </div>
            <div className="form-group">
              <label className="form-label">End Time</label>
              <input type="time" className="input" value={form.end_time} onChange={e=>setForm(f=>({...f,end_time:e.target.value}))}/>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Color</label>
            <div style={{display:'flex',gap:8,marginTop:4}}>
              {COLORS.map(c => (
                <button key={c} type="button" onClick={()=>setForm(f=>({...f,color:c}))} style={{width:28,height:28,borderRadius:7,background:c,border:`2.5px solid ${form.color===c?'#0f172a':'transparent'}`,cursor:'pointer',transform:form.color===c?'scale(1.15)':'scale(1)',transition:'all 0.15s'}}/>
              ))}
            </div>
          </div>
          <label style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',padding:'10px 12px',borderRadius:10,background:'var(--surface-2)',border:'1px solid var(--border)'}}>
            <input type="checkbox" checked={form.is_night_shift} onChange={e=>setForm(f=>({...f,is_night_shift:e.target.checked}))} style={{accentColor:'var(--brand-500)',width:15,height:15}}/>
            <Moon size={15} strokeWidth={1.8} color={form.is_night_shift?'#8b5cf6':'var(--text-3)'}/>
            <span style={{fontSize:13,color:'var(--text)',fontWeight:500}}>Night Shift</span>
          </label>
        </div>
      </Modal>
    </div>
  )
}
