'use client'
import { useState, useEffect, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'

interface Summary { total_employees:number; present_today:number; absent_today:number; late_today:number; on_leave_today:number; attendance_rate:number; pending_leaves:number }

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<Summary|null>(null)
  const [monthly, setMonthly] = useState<unknown[]>([])
  const [deptStats, setDeptStats] = useState<unknown[]>([])
  const [leaveStats, setLeaveStats] = useState<unknown[]>([])
  const [month, setMonth] = useState(new Date().toISOString().slice(0,7))

  const load = useCallback(async () => {
    const [s,m,d,l] = await Promise.all([
      fetch('/api/analytics?type=summary').then(r=>r.json()),
      fetch(`/api/analytics?type=monthly_attendance&month=${month}`).then(r=>r.json()),
      fetch('/api/analytics?type=department_stats').then(r=>r.json()),
      fetch(`/api/analytics?type=leave_summary&month=${month}`).then(r=>r.json()),
    ])
    if (s.data) setSummary(s.data)
    if (m.data) setMonthly(m.data)
    if (d.data) setDeptStats(d.data)
    if (l.data) setLeaveStats(l.data)
  }, [month])

  useEffect(() => { load() }, [load])

  const kpis = summary ? [
    { label: 'Total Employees', val: summary.total_employees, color: '#4f46e5', bg: '#eef2ff', icon: '👥', trend: null },
    { label: 'Present Today', val: summary.present_today, color: '#10b981', bg: '#f0fdf4', icon: '✅', trend: null },
    { label: 'Absent Today', val: summary.absent_today, color: '#ef4444', bg: '#fef2f2', icon: '⊘', trend: null },
    { label: 'Late Arrivals', val: summary.late_today, color: '#f59e0b', bg: '#fffbeb', icon: '⏱', trend: null },
    { label: 'On Leave', val: summary.on_leave_today, color: '#8b5cf6', bg: '#f5f3ff', icon: '✈', trend: null },
    { label: 'Attendance Rate', val: `${summary.attendance_rate}%`, color: '#0891b2', bg: '#f0f9ff', icon: '📊', trend: null },
    { label: 'Pending Leaves', val: summary.pending_leaves, color: '#f97316', bg: '#fff7ed', icon: '📋', trend: null },
  ] : []

  const LEAF_COLORS = ['#4f46e5','#10b981','#f59e0b','#ef4444','#8b5cf6','#0891b2']

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' }}>Analytics</h1>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>Workforce insights and attendance metrics</p>
        </div>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)} style={{ height: 38, border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '0 12px', fontSize: 13, color: '#374151', outline: 'none', background: '#fff', cursor: 'pointer' }} />
      </div>

      {/* KPI grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px,1fr))', gap: 12, marginBottom: 24 }}>
        {kpis.map(k => (
          <div key={k.label} style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', transition: 'all 0.2s' }}
          onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(-2px)'; el.style.boxShadow = '0 6px 20px rgba(0,0,0,0.1)' }}
          onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(0)'; el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)' }}
          >
            <div style={{ fontSize: 20, marginBottom: 8 }}>{k.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em' }}>{k.val}</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, fontWeight: 500 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 16 }}>
        {monthly.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 16, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>Monthly Attendance Trend</h2>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={monthly as {date:string;present:number;late:number;absent:number}[]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={d => new Date(d).getDate().toString()} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #f1f5f9', fontSize: 12 }} />
                <Line type="monotone" dataKey="present" stroke="#10b981" strokeWidth={2.5} dot={false} name="Present" />
                <Line type="monotone" dataKey="late" stroke="#f59e0b" strokeWidth={2} dot={false} name="Late" />
                <Line type="monotone" dataKey="absent" stroke="#ef4444" strokeWidth={2} dot={false} name="Absent" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {deptStats.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 16, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>Department Attendance</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={deptStats as {department:string;attendance_rate:number}[]} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" domain={[0,100]} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis dataKey="department" type="category" tick={{ fontSize: 11, fill: '#94a3b8' }} width={80} />
                <Tooltip formatter={(v) => `${v}%`} contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                <Bar dataKey="attendance_rate" fill="#4f46e5" radius={[0,6,6,0]} name="Rate %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {leaveStats.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 16, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>Leave Distribution</h2>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={leaveStats as {name:string;days:number}[]} dataKey="days" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, percent }) => `${name} ${Math.round(percent*100)}%`} labelLine={false} fontSize={10}>
                  {(leaveStats as {name:string;days:number}[]).map((_, i) => <Cell key={i} fill={LEAF_COLORS[i % LEAF_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={v => `${v} days`} contentStyle={{ borderRadius: 10, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {deptStats.length === 0 && leaveStats.length === 0 && (
          <div style={{ gridColumn: '1/-1', padding: 48, textAlign: 'center', background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
            <p style={{ color: '#374151', fontWeight: 600 }}>No analytics data yet</p>
            <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 4 }}>Data will appear once employees start checking in</p>
          </div>
        )}
      </div>
    </div>
  )
}
