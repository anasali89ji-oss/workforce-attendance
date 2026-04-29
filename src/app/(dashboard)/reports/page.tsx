'use client'
import { useState } from 'react'
import { FileBarChart, Download, Calendar } from 'lucide-react'
import { toast } from 'sonner'

const REPORT_TYPES = [
  {id:'attendance',label:'Attendance Summary',desc:'Daily attendance records for all employees'},
  {id:'leave',label:'Leave Report',desc:'All leave requests and approvals'},
  {id:'overtime',label:'Overtime Report',desc:'Overtime hours by employee and department'},
  {id:'late',label:'Late Arrivals',desc:'Employees with late clock-ins this period'},
]

export default function ReportsPage() {
  const [type,setType] = useState('attendance')
  const [from,setFrom] = useState('')
  const [to,setTo]     = useState('')

  const generate = () => {
    if (!from || !to) { toast.error('Select a date range'); return }
    toast.success(`Generating ${type} report...`)
  }

  return (
    <div className="page anim-fade-up page-sm">
      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:20,fontWeight:800,color:'var(--text)',letterSpacing:'-0.02em',display:'flex',alignItems:'center',gap:8}}>
          <FileBarChart size={20} color="var(--brand-500)" strokeWidth={2}/>Reports
        </h1>
        <p style={{color:'var(--text-3)',fontSize:13,marginTop:3}}>Generate and export workforce reports</p>
      </div>

      <div className="card" style={{padding:'22px 24px',marginBottom:16}}>
        <h2 style={{fontSize:14,fontWeight:700,color:'var(--text)',marginBottom:16}}>Report Builder</h2>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:16}}>
          <div className="form-group" style={{gridColumn:'1/-1'}}>
            <label className="form-label">Report Type</label>
            <select className="input" value={type} onChange={e=>setType(e.target.value)}>
              {REPORT_TYPES.map(r=><option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
            <span className="form-hint">{REPORT_TYPES.find(r=>r.id===type)?.desc}</span>
          </div>
          <div className="form-group">
            <label className="form-label">From Date</label>
            <input type="date" className="input" value={from} onChange={e=>setFrom(e.target.value)}/>
          </div>
          <div className="form-group">
            <label className="form-label">To Date</label>
            <input type="date" className="input" value={to} onChange={e=>setTo(e.target.value)} min={from}/>
          </div>
        </div>
        <div style={{display:'flex',gap:10}}>
          <button onClick={generate} className="btn btn-primary" style={{gap:6}}>
            <FileBarChart size={14} strokeWidth={2}/>Generate Report
          </button>
          <button onClick={generate} className="btn btn-secondary" style={{gap:6}}>
            <Download size={14} strokeWidth={2}/>Export CSV
          </button>
        </div>
      </div>

      <div className="card"><div className="empty-state"><FileBarChart size={44} strokeWidth={1.2}/><h3>Select a report type</h3><p>Choose a report type and date range above, then click Generate Report to preview your data.</p></div></div>
    </div>
  )
}
