'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { FileBarChart, BarChart2, CalendarOff, Clock, AlertTriangle, DollarSign, Download, Play } from 'lucide-react'
import { DataTable, Column } from '@/components/ui'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

type ReportType = 'attendance_summary' | 'leave_report' | 'overtime' | 'late_arrivals'

const REPORT_TYPES = [
  { id:'attendance_summary' as ReportType, label:'Attendance Summary', Icon:BarChart2, desc:'Daily attendance records per employee', color:'#4f46e5' },
  { id:'leave_report'       as ReportType, label:'Leave Report',       Icon:CalendarOff, desc:'Leave requests and approvals',         color:'#8b5cf6' },
  { id:'overtime'           as ReportType, label:'Overtime Report',    Icon:Clock,       desc:'Overtime hours by employee',            color:'#0891b2' },
  { id:'late_arrivals'      as ReportType, label:'Late Arrivals',      Icon:AlertTriangle, desc:'Late clock-in events',               color:'#f59e0b' },
]

const PIE_COLORS = ['#4f46e5','#10b981','#f59e0b','#ef4444','#8b5cf6']

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>('attendance_summary')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [data, setData] = useState<any[]>([])
  const [chartData, setChartData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(false)

  const generate = async () => {
    if (!from || !to) { toast.error('Please select a date range'); return }
    setLoading(true)
    try {
      const params = new URLSearchParams({ from, to, type: reportType })
      const res = await fetch(`/api/analytics?${params}`)
      // Fallback: build report from available data
      const attRes = await fetch(`/api/attendance?limit=500`)
      const attJson = await attRes.json()
      const logs = attJson.data || []

      if (reportType === 'attendance_summary') {
        const byUser: Record<string, any> = {}
        logs.forEach((l: any) => {
          if (!byUser[l.user_id]) byUser[l.user_id] = { id: l.user_id, employee: l.user_id, present: 0, late: 0, absent: 0, leave: 0, total: 0 }
          byUser[l.user_id].total++
          if (['punched_in','punched_out','on_break'].includes(l.status)) byUser[l.user_id].present++
          if (l.is_late) byUser[l.user_id].late++
          if (l.status === 'missed') byUser[l.user_id].absent++
          if (l.status === 'on_leave') byUser[l.user_id].leave++
        })
        const rows = Object.values(byUser).map((r: any) => ({
          ...r,
          attendance_rate: r.total > 0 ? Math.round(r.present / r.total * 100) + '%' : '—'
        }))
        setData(rows)
        setChartData(rows.slice(0, 8).map((r: any) => ({ name: r.employee.slice(0, 8), rate: parseInt(r.attendance_rate) || 0 })))
      } else if (reportType === 'late_arrivals') {
        const late = logs.filter((l: any) => l.is_late).map((l: any) => ({
          id: l.id,
          employee: l.user_id,
          date: l.attendance_date,
          clock_in: l.punch_in_at ? new Date(l.punch_in_at).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}) : '—',
          status: l.status,
        }))
        setData(late)
        setChartData([])
      } else {
        setData(logs.slice(0, 50).map((l: any) => ({ ...l, id: l.id || Math.random().toString() })))
        setChartData([])
      }
      setGenerated(true)
      toast.success(`Report generated — ${data.length || 'some'} records`)
    } catch { toast.error('Failed to generate report') }
    finally { setLoading(false) }
  }

  const exportCSV = () => {
    if (!data.length) return
    const keys = Object.keys(data[0]).filter(k => k !== 'id')
    const rows = [keys.join(','), ...data.map(r => keys.map(k => `"${String(r[k]||'').replace(/"/g,'""')}"`).join(','))]
    const blob = new Blob([rows.join('\n')], {type:'text/csv'})
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${reportType}-${from}-${to}.csv`; a.click()
    toast.success('CSV exported')
  }

  const columns: Column<any>[] = Object.keys(data[0] || {}).filter(k => k !== 'id').map(k => ({
    key: k, header: k.replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase()),
    sortable: true,
    render: (row: any) => {
      const v = row[k]
      if (k === 'status') return <span className={`badge ${v === 'approved' ? 'badge-success' : v === 'pending' ? 'badge-warning' : 'badge-default'}`}>{v}</span>
      return <span style={{fontSize:12}}>{v != null ? String(v) : '—'}</span>
    }
  }))

  return (
    <div className="page anim-fade-up" style={{display:'grid',gridTemplateColumns:'280px 1fr',gap:20,alignItems:'start'}}>

      {/* Left config panel */}
      <div style={{display:'flex',flexDirection:'column',gap:14,position:'sticky',top:20}}>
        <div className="card" style={{padding:'16px 18px'}}>
          <div style={{fontSize:13,fontWeight:700,color:'var(--text)',marginBottom:12}}>Report Type</div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {REPORT_TYPES.map(({id,label,Icon,desc,color})=>(
              <button key={id} onClick={()=>{setReportType(id);setGenerated(false)}} style={{
                padding:'10px 12px',borderRadius:10,border:`2px solid ${reportType===id?color:'var(--border)'}`,
                background:reportType===id?`${color}10`:'transparent',cursor:'pointer',textAlign:'left',transition:'all 0.15s',
              }}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                  <Icon size={14} color={reportType===id?color:'var(--text-3)'} strokeWidth={reportType===id?2.5:1.8}/>
                  <span style={{fontSize:12,fontWeight:700,color:reportType===id?color:'var(--text)'}}>{label}</span>
                </div>
                <div style={{fontSize:10,color:'var(--text-3)',marginLeft:22}}>{desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="card" style={{padding:'16px 18px'}}>
          <div style={{fontSize:13,fontWeight:700,color:'var(--text)',marginBottom:12}}>Date Range</div>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            <div className="form-group">
              <label className="form-label">From</label>
              <input type="date" className="input input-sm" value={from} onChange={e=>setFrom(e.target.value)}/>
            </div>
            <div className="form-group">
              <label className="form-label">To</label>
              <input type="date" className="input input-sm" value={to} onChange={e=>setTo(e.target.value)} min={from}/>
            </div>
            {/* Quick presets */}
            <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
              {[
                {label:'This Month', fn:()=>{ const n=new Date(); setFrom(`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-01`); setTo(n.toISOString().split('T')[0]) }},
                {label:'Last 30d', fn:()=>{ const n=new Date(); const f=new Date(n-30*864e5); setFrom(f.toISOString().split('T')[0]); setTo(n.toISOString().split('T')[0]) }},
              ].map(({label,fn})=>(
                <button key={label} onClick={fn} style={{padding:'3px 9px',borderRadius:6,background:'var(--surface-3)',border:'1px solid var(--border)',fontSize:11,cursor:'pointer',color:'var(--text-2)',fontWeight:500}}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button onClick={generate} disabled={loading||!from||!to} className="btn btn-primary" style={{gap:6,width:'100%'}}>
          {loading?<><span className="spinner spinner-sm"/>Generating...</>:<><Play size={14} strokeWidth={2.5}/>Generate Report</>}
        </button>
      </div>

      {/* Right output */}
      <div>
        {!generated && !loading && (
          <div className="card"><div className="empty-state" style={{padding:'60px 24px'}}>
            <FileBarChart size={48} strokeWidth={1.2}/>
            <h3>Select a report type and date range</h3>
            <p>Configure the options on the left, then click Generate Report to preview your data.</p>
          </div></div>
        )}

        {loading && (
          <div className="card" style={{padding:24}}>
            {Array.from({length:4}).map((_,i)=><div key={i} className="skeleton" style={{height:44,borderRadius:8,marginBottom:10}}/>)}
          </div>
        )}

        {generated && !loading && (
          <>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
              <div style={{fontSize:13,color:'var(--text-3)'}}>{data.length} results for {from} → {to}</div>
              <button onClick={exportCSV} className="btn btn-secondary btn-sm" style={{gap:5}}>
                <Download size={13} strokeWidth={2}/>Export CSV
              </button>
            </div>

            {chartData.length > 0 && (
              <div className="chart-card" style={{marginBottom:16}}>
                <div className="chart-title"><BarChart2 size={15} color="var(--brand-500)" strokeWidth={2}/>Data Overview</div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                    <XAxis dataKey="name" tick={{fontSize:10,fill:'var(--text-3)'}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:10,fill:'var(--text-3)'}} axisLine={false} tickLine={false}/>
                    <Tooltip contentStyle={{borderRadius:10,fontSize:12,border:'1px solid var(--border)'}}/>
                    <Bar dataKey="rate" fill="var(--brand-500)" radius={[6,6,0,0]} name="Rate %"/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="card" style={{overflow:'hidden'}}>
              <DataTable data={data} columns={columns} exportable exportFileName={`${reportType}-${from}`}
                searchable emptyTitle="No data found" emptyMessage="Try a different date range or report type" />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
