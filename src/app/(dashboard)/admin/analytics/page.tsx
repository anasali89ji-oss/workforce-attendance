'use client'

import { useState, useEffect, useCallback } from 'react'
import { BarChart2, TrendingUp, Users, UserCheck, AlertTriangle, Plane, FileText, Clock, Calendar, Download, RefreshCw } from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

interface Summary { total_employees:number; present_today:number; absent_today:number; late_today:number; on_leave_today:number; attendance_rate:number; pending_leaves:number }

const KPIS = [
  { key:'total_employees',  label:'Total',       Icon:Users,          color:'#4f46e5', bg:'#eef2ff' },
  { key:'present_today',    label:'Present',     Icon:UserCheck,      color:'#10b981', bg:'#d1fae5' },
  { key:'absent_today',     label:'Absent',      Icon:Clock,          color:'#ef4444', bg:'#fee2e2' },
  { key:'late_today',       label:'Late',        Icon:AlertTriangle,  color:'#f59e0b', bg:'#fef3c7' },
  { key:'on_leave_today',   label:'On Leave',    Icon:Plane,          color:'#8b5cf6', bg:'#ede9fe' },
  { key:'attendance_rate',  label:'Rate %',      Icon:TrendingUp,     color:'#0891b2', bg:'#f0f9ff', pct: true },
  { key:'pending_leaves',   label:'Pending',     Icon:FileText,       color:'#f97316', bg:'#ffedd5' },
]

const PIE_COLORS = ['#4f46e5','#10b981','#f59e0b','#ef4444','#8b5cf6','#0891b2']

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', boxShadow: 'var(--shadow-md)', fontSize: 12 }}>
      {label && <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>{label}</div>}
      {payload.map((p: any) => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
          <span style={{ color: 'var(--text-2)' }}>{p.name}: <strong style={{ color: 'var(--text)' }}>{p.value}{p.name === 'rate' ? '%' : ''}</strong></span>
        </div>
      ))}
    </div>
  )
}

type Period = 'week' | 'month' | 'quarter'

export default function AnalyticsPage() {
  const [summary, setSummary]     = useState<Summary|null>(null)
  const [monthly, setMonthly]     = useState<any[]>([])
  const [deptStats, setDeptStats] = useState<any[]>([])
  const [leaveStats, setLeaveStats] = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [period, setPeriod]       = useState<Period>('month')
  const [month, setMonth]         = useState(new Date().toISOString().slice(0,7))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [s, m, d, l] = await Promise.all([
        fetch('/api/analytics?type=summary').then(r => r.json()),
        fetch(`/api/analytics?type=monthly_attendance&month=${month}`).then(r => r.json()),
        fetch('/api/analytics?type=department_stats').then(r => r.json()),
        fetch(`/api/analytics?type=leave_summary&month=${month}`).then(r => r.json()),
      ])
      if (s.data) setSummary(s.data)
      if (m.data) setMonthly(m.data)
      if (d.data) setDeptStats(d.data)
      if (l.data) setLeaveStats(l.data)
    } finally { setLoading(false) }
  }, [month])

  useEffect(() => { load() }, [load])

  const exportData = () => {
    if (!monthly.length) { toast.error?.('No data to export'); return }
    const rows = [['Date','Present','Late','Absent'], ...monthly.map((r:any) => [r.date, r.present, r.late, r.absent])]
    const blob = new Blob([rows.map(r=>r.join(',')).join('\n')], {type:'text/csv'})
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `analytics-${month}.csv`; a.click()
  }

  function toast(x: any) {}  // placeholder

  return (
    <div className="page anim-fade-up">
      {/* Header */}
      <div className="section-header">
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart2 size={20} color="var(--brand-500)" strokeWidth={2} />
            Analytics
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: 13, marginTop: 3 }}>Workforce insights and attendance metrics</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 9, padding: '0 12px', height: 38 }}>
            <Calendar size={14} color="var(--text-3)" strokeWidth={1.8} />
            <input type="month" value={month} onChange={e => setMonth(e.target.value)}
              style={{ border: 'none', outline: 'none', fontSize: 13, color: 'var(--text)', background: 'transparent', cursor: 'pointer' }} />
          </div>
          <button onClick={load} className="btn btn-ghost btn-sm" style={{ gap: 5 }}>
            <RefreshCw size={13} strokeWidth={2} />Refresh
          </button>
          <button onClick={exportData} className="btn btn-secondary btn-sm" style={{ gap: 5 }}>
            <Download size={13} strokeWidth={2} />Export
          </button>
        </div>
      </div>

      {/* KPI row */}
      {summary ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))', gap: 12, marginBottom: 22 }}>
          {KPIS.map(({ key, label, Icon, color, bg, pct }, i) => {
            const val = summary[key as keyof Summary]
            return (
              <div key={key} className={`kpi-card anim-fade-up delay-${i+1}`}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <Icon size={18} color={color} strokeWidth={1.8} />
                </div>
                <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.04em', lineHeight: 1 }}>
                  {val}{pct ? '%' : ''}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 5, fontWeight: 500 }}>{label}</div>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 12, marginBottom: 22 }}>
          {Array.from({length:7}).map((_,i) => <div key={i} className="skeleton" style={{ height: 100 }} />)}
        </div>
      )}

      {/* Main trend chart */}
      {monthly.length > 0 && (
        <div className="chart-card anim-fade-up delay-3" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div className="chart-title" style={{ marginBottom: 0 }}>
              <TrendingUp size={15} color="var(--brand-500)" strokeWidth={2} />
              Monthly Attendance Trend
            </div>
            <div style={{ display: 'flex', gap: 14, fontSize: 11 }}>
              {[{c:'#4f46e5',l:'Present'},{c:'#f59e0b',l:'Late'},{c:'#ef4444',l:'Absent'}].map(({c,l}) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-3)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, display: 'inline-block' }} />
                  {l}
                </div>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthly} margin={{ top: 2, right: 4, bottom: 0, left: -20 }}>
              <defs>
                {[['#4f46e5','gP'],['#f59e0b','gL'],['#ef4444','gA']].map(([c,id]) => (
                  <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={c} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={c} stopOpacity={0.02} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickFormatter={d => new Date(d).getDate().toString()} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="present" stroke="#4f46e5" strokeWidth={2.5} fill="url(#gP)" name="Present" dot={false} />
              <Area type="monotone" dataKey="late"    stroke="#f59e0b" strokeWidth={2}   fill="url(#gL)" name="Late"    dot={false} />
              <Area type="monotone" dataKey="absent"  stroke="#ef4444" strokeWidth={1.5} fill="url(#gA)" name="Absent"  dot={false} strokeDasharray="4 3" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Department bar */}
        {deptStats.length > 0 ? (
          <div className="chart-card">
            <div className="chart-title">
              <Users size={15} color="var(--brand-500)" strokeWidth={2} />
              Department Attendance Rate
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={deptStats} layout="vertical" margin={{ left: 0, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" domain={[0,100]} tick={{ fontSize: 10, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} tickFormatter={v=>`${v}%`} />
                <YAxis dataKey="department" type="category" tick={{ fontSize: 11, fill: 'var(--text-2)' }} width={90} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="attendance_rate" name="rate" radius={[0,6,6,0]}>
                  {deptStats.map((d:any, i:number) => (
                    <Cell key={i} fill={d.attendance_rate >= 90 ? '#10b981' : d.attendance_rate >= 75 ? '#f59e0b' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="chart-card">
            <div className="chart-title"><Users size={15} color="var(--brand-500)" strokeWidth={2} />Department Attendance</div>
            <div className="empty-state" style={{ padding: '30px 0' }}>
              <BarChart2 size={36} strokeWidth={1.2} />
              <p>No department data yet</p>
            </div>
          </div>
        )}

        {/* Leave pie */}
        {leaveStats.length > 0 ? (
          <div className="chart-card">
            <div className="chart-title">
              <Plane size={15} color="var(--brand-500)" strokeWidth={2} />
              Leave Distribution
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={leaveStats} dataKey="days" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={36} paddingAngle={3}
                  label={({ name, percent }) => percent > 0.06 ? `${name} ${Math.round(percent*100)}%` : ''} labelLine={false} fontSize={10}>
                  {leaveStats.map((_:any, i:number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v:any) => [`${v} days`]} contentStyle={{ borderRadius: 10, fontSize: 12, border: '1px solid var(--border)' }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: 'var(--text-2)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="chart-card">
            <div className="chart-title"><Plane size={15} color="var(--brand-500)" strokeWidth={2} />Leave Distribution</div>
            <div className="empty-state" style={{ padding: '30px 0' }}>
              <Plane size={36} strokeWidth={1.2} />
              <p>No leave data this month</p>
            </div>
          </div>
        )}
      </div>

      {loading && (
        <div style={{ position: 'fixed', bottom: 20, right: 24, display: 'flex', alignItems: 'center', gap: 8, background: 'var(--text)', color: 'var(--surface)', padding: '8px 14px', borderRadius: 99, fontSize: 12, fontWeight: 600, boxShadow: 'var(--shadow-lg)', animation: 'fadeUp 0.2s ease' }}>
          <span className="spinner spinner-sm" style={{ borderTopColor: 'var(--surface)' }} />
          Loading analytics...
        </div>
      )}
    </div>
  )
}
