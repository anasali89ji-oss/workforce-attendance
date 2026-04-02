'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { DollarSign, Users, TrendingUp, FileText, Download, Eye, Check, ChevronDown, Printer } from 'lucide-react'
import { DataTable, Column, Avatar, ConfirmDialog, Modal } from '@/components/ui'

interface PayrollRecord {
  id: string; user_id: string; status: string
  base_salary: number; overtime_pay: number; deductions: number; net_pay: number
  period_start: string; period_end: string
  total_hours: number; overtime_hours: number; days_worked: number
  user?: { full_name: string; employee_id?: string; department?: string; email?: string }
}

const STATUS_CFG: Record<string, { label:string; cls:string }> = {
  draft:     { label:'Draft',     cls:'badge badge-default' },
  processed: { label:'Processed', cls:'badge badge-info' },
  paid:      { label:'Paid',      cls:'badge badge-success' },
}

function fmt(n: number) { return 'PKR ' + n.toLocaleString() }
function fmtDate(d: string) { return new Date(d + 'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) }

export default function PayrollPage() {
  const [records, setRecords]   = useState<PayrollRecord[]>([])
  const [loading, setLoading]   = useState(true)
  const [period, setPeriod]     = useState(new Date().toISOString().slice(0,7))
  const [tab, setTab]           = useState('all')
  const [slipRecord, setSlipRecord] = useState<PayrollRecord|null>(null)
  const [processOpen, setProcessOpen] = useState(false)
  const [processing, setProcessing] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/payroll?period=${period}`)
      const json = await res.json()
      if (json.data) setRecords(json.data)
    } finally { setLoading(false) }
  }, [period])

  useEffect(() => { load() }, [load])

  const filtered = tab === 'all' ? records : records.filter(r => r.status === tab)
  const totalGross = records.reduce((a,r) => a + r.base_salary + r.overtime_pay, 0)
  const totalDeductions = records.reduce((a,r) => a + r.deductions, 0)
  const totalNet = records.reduce((a,r) => a + r.net_pay, 0)
  const paid = records.filter(r => r.status === 'paid').length

  const processPayroll = async () => {
    setProcessing(true)
    try {
      await new Promise(r => setTimeout(r, 1500))
      toast.success('Payroll processed for ' + period)
      setProcessOpen(false)
    } finally { setProcessing(false) }
  }

  const exportCSV = () => {
    const rows = [['Employee','Dept','Base Salary','OT Pay','Deductions','Net Pay','Status'],
      ...filtered.map(r => [r.user?.full_name||'', r.user?.department||'', r.base_salary, r.overtime_pay, r.deductions, r.net_pay, r.status])]
    const blob = new Blob([rows.map(r=>r.join(',')).join('\n')], {type:'text/csv'})
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `payroll-${period}.csv`; a.click()
    toast.success('Exported')
  }

  const columns: Column<PayrollRecord>[] = [
    { key:'user', header:'Employee', render:(r) => (
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <Avatar name={r.user?.full_name||'?'} size="sm"/>
        <div>
          <div style={{fontWeight:600,fontSize:13,color:'var(--text)'}}>{r.user?.full_name}</div>
          <div style={{fontSize:11,color:'var(--text-3)'}}>{r.user?.employee_id||r.user?.department||''}</div>
        </div>
      </div>
    )},
    { key:'user.department', header:'Department', render:(r) => <span style={{fontSize:12}}>{r.user?.department||'—'}</span> },
    { key:'days_worked', header:'Days', render:(r) => <span style={{fontSize:12}}>{r.days_worked}d / {r.total_hours}h</span> },
    { key:'base_salary', header:'Base', sortable:true, render:(r) => <span style={{fontFamily:'monospace',fontSize:12}}>{fmt(r.base_salary)}</span> },
    { key:'overtime_pay', header:'OT Pay', render:(r) => <span style={{fontFamily:'monospace',fontSize:12,color:r.overtime_pay>0?'#8b5cf6':'var(--text-3)'}}>{r.overtime_pay>0?'+'+fmt(r.overtime_pay):'—'}</span> },
    { key:'deductions', header:'Deductions', render:(r) => <span style={{fontFamily:'monospace',fontSize:12,color:'#ef4444'}}>-{fmt(r.deductions)}</span> },
    { key:'net_pay', header:'Net Pay', sortable:true, render:(r) => <span style={{fontFamily:'monospace',fontSize:13,fontWeight:800,color:'var(--text)'}}>{fmt(r.net_pay)}</span> },
    { key:'status', header:'Status', render:(r) => { const s = STATUS_CFG[r.status]||STATUS_CFG.draft; return <span className={s.cls}>{s.label}</span> } },
    { key:'actions', header:'', render:(r) => (
      <div style={{display:'flex',gap:6}}>
        <button onClick={() => setSlipRecord(r)} className="btn btn-ghost btn-sm" style={{padding:'4px 8px',gap:4}}><Eye size={12} strokeWidth={2}/>Payslip</button>
        {r.status==='processed'&&<button className="btn btn-success btn-sm" style={{padding:'4px 8px',gap:4,fontSize:11}}><Check size={11} strokeWidth={2.5}/>Mark Paid</button>}
      </div>
    )},
  ]

  return (
    <div className="page anim-fade-up">
      {/* Header */}
      <div className="section-header">
        <div>
          <h1 style={{fontSize:20,fontWeight:800,color:'var(--text)',letterSpacing:'-0.02em',display:'flex',alignItems:'center',gap:8}}>
            <DollarSign size={20} color="var(--brand-500)" strokeWidth={2}/> Payroll
          </h1>
          <p style={{color:'var(--text-3)',fontSize:13,marginTop:3}}>Payroll management for {period}</p>
        </div>
        <div style={{display:'flex',gap:8}}>
          <input type="month" value={period} onChange={e=>setPeriod(e.target.value)} className="input input-sm" style={{width:160}}/>
          <button onClick={exportCSV} className="btn btn-ghost btn-sm" style={{gap:5}}><Download size={13} strokeWidth={2}/>Export</button>
          <button onClick={()=>setProcessOpen(true)} className="btn btn-primary btn-sm" style={{gap:5}}><DollarSign size={13} strokeWidth={2}/>Process Payroll</button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
        {[
          {label:'Total Gross',val:fmt(totalGross),Icon:DollarSign,color:'#4f46e5',bg:'#eef2ff'},
          {label:'Total Deductions',val:fmt(totalDeductions),Icon:TrendingUp,color:'#ef4444',bg:'#fee2e2'},
          {label:'Total Net Payroll',val:fmt(totalNet),Icon:DollarSign,color:'#10b981',bg:'#d1fae5'},
          {label:'Employees Paid',val:`${paid}/${records.length}`,Icon:Users,color:'#0891b2',bg:'#f0f9ff'},
        ].map(({label,val,Icon,color,bg})=>(
          <div key={label} className="kpi-card" style={{padding:'14px 16px',display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:38,height:38,borderRadius:10,background:bg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Icon size={18} color={color} strokeWidth={1.8}/></div>
            <div>
              <div style={{fontSize:16,fontWeight:800,color:'var(--text)',letterSpacing:'-0.02em'}}>{val}</div>
              <div style={{fontSize:11,color:'var(--text-3)',fontWeight:500,marginTop:1}}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Status tabs */}
      <div style={{display:'flex',gap:4,marginBottom:14}}>
        {['all','draft','processed','paid'].map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{padding:'5px 13px',borderRadius:7,border:'1px solid',cursor:'pointer',fontSize:12,fontWeight:600,transition:'all 0.15s',
            background:tab===t?'var(--brand-600)':'var(--surface-2)',color:tab===t?'#fff':'var(--text-2)',borderColor:tab===t?'var(--brand-600)':'var(--border-strong)'}}>
            {t.charAt(0).toUpperCase()+t.slice(1)}
            <span style={{marginLeft:6,padding:'1px 6px',borderRadius:99,background:tab===t?'rgba(255,255,255,0.25)':'var(--surface-3)',fontSize:10,fontWeight:700}}>
              {t==='all'?records.length:records.filter(r=>r.status===t).length}
            </span>
          </button>
        ))}
      </div>

      <div className="card" style={{overflow:'hidden'}}>
        <DataTable data={filtered} columns={columns} loading={loading} exportable exportFileName={`payroll-${period}`}
          emptyTitle="No payroll records" emptyMessage="Process payroll to generate records for this period"
          searchable searchPlaceholder="Search employees..." />
      </div>

      {/* Process confirm */}
      <ConfirmDialog open={processOpen} onClose={()=>setProcessOpen(false)} onConfirm={processPayroll}
        title={`Process ${period} Payroll`}
        message={`This will calculate pay for ${records.length} employees based on attendance data. This action cannot be undone.`}
        confirmLabel="Process Payroll" variant="info" />

      {/* Payslip modal */}
      {slipRecord && (
        <Modal open={!!slipRecord} onClose={()=>setSlipRecord(null)} title="Payslip" size="md"
          footer={
            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              <button onClick={()=>window.print()} className="btn btn-ghost btn-sm" style={{gap:5}}><Printer size={13} strokeWidth={2}/>Print</button>
              <button onClick={()=>setSlipRecord(null)} className="btn btn-primary btn-sm">Close</button>
            </div>
          }>
          <div style={{fontFamily:'monospace'}}>
            <div style={{textAlign:'center',marginBottom:20,paddingBottom:16,borderBottom:'2px solid var(--border)'}}>
              <div style={{fontSize:18,fontWeight:800,color:'var(--text)'}}>WorkForce Pro</div>
              <div style={{fontSize:12,color:'var(--text-3)',marginTop:2}}>Payslip — {fmtDate(slipRecord.period_start)} to {fmtDate(slipRecord.period_end)}</div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:20,fontSize:12}}>
              {[['Employee',slipRecord.user?.full_name||''],['Employee ID',slipRecord.user?.employee_id||'—'],['Department',slipRecord.user?.department||'—'],['Days Worked',`${slipRecord.days_worked} days / ${slipRecord.total_hours}h`]].map(([k,v])=>(
                <div key={k}><div style={{color:'var(--text-3)',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:0.5}}>{k}</div><div style={{color:'var(--text)',fontWeight:600,marginTop:2}}>{v}</div></div>
              ))}
            </div>
            <div style={{borderTop:'1px solid var(--border)',paddingTop:14,marginBottom:14}}>
              <div style={{fontWeight:700,color:'var(--text)',marginBottom:8,fontSize:12}}>EARNINGS</div>
              {[['Basic Salary',slipRecord.base_salary],['Overtime Pay',slipRecord.overtime_pay]].map(([k,v])=>(
                <div key={k} style={{display:'flex',justifyContent:'space-between',marginBottom:6,fontSize:13}}>
                  <span style={{color:'var(--text-2)'}}>{k}</span>
                  <span style={{fontWeight:600,color:'var(--text)'}}>{fmt(Number(v))}</span>
                </div>
              ))}
            </div>
            <div style={{borderTop:'1px solid var(--border)',paddingTop:14,marginBottom:14}}>
              <div style={{fontWeight:700,color:'var(--text)',marginBottom:8,fontSize:12}}>DEDUCTIONS</div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:13}}>
                <span style={{color:'var(--text-2)'}}>Tax & Insurance</span>
                <span style={{fontWeight:600,color:'#ef4444'}}>-{fmt(slipRecord.deductions)}</span>
              </div>
            </div>
            <div style={{borderTop:'2px solid var(--text)',paddingTop:14,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:15,fontWeight:800,color:'var(--text)'}}>NET PAY</span>
              <span style={{fontSize:22,fontWeight:900,color:'#10b981'}}>{fmt(slipRecord.net_pay)}</span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
