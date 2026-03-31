'use client'
import { useState, useEffect, useCallback } from 'react'
import { BarChart2, TrendingUp, Users, UserCheck, AlertTriangle, Plane, FileText, Clock, Calendar } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'

interface Summary { total_employees:number; present_today:number; absent_today:number; late_today:number; on_leave_today:number; attendance_rate:number; pending_leaves:number }

const KPIS = [
  { key:'total_employees',  label:'Total',       Icon:Users,          color:'#2563EB', bg:'#EFF6FF' },
  { key:'present_today',    label:'Present',     Icon:UserCheck,      color:'#16A34A', bg:'#F0FDF4' },
  { key:'absent_today',     label:'Absent',      Icon:Clock,          color:'#DC2626', bg:'#FEF2F2' },
  { key:'late_today',       label:'Late',        Icon:AlertTriangle,  color:'#D97706', bg:'#FFFBEB' },
  { key:'on_leave_today',   label:'On Leave',    Icon:Plane,          color:'#7C3AED', bg:'#F5F3FF' },
  { key:'attendance_rate',  label:'Rate',        Icon:TrendingUp,     color:'#0891B2', bg:'#F0F9FF', pct:true },
  { key:'pending_leaves',   label:'Pending',     Icon:FileText,       color:'#F97316', bg:'#FFF7ED' },
]
const PIE_COLORS = ['#2563EB','#16A34A','#D97706','#DC2626','#7C3AED','#0891B2']

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

  return (
    <div style={{ maxWidth:1100, animation:'fadeUp 0.35s ease' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700, color:'#0F172A', display:'flex', alignItems:'center', gap:8 }}>
            <BarChart2 size={20} color="#2563EB" strokeWidth={2} />
            Analytics
          </h1>
          <p style={{ color:'#64748B', fontSize:13, marginTop:3 }}>Workforce insights and attendance metrics</p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6, background:'#fff', border:'1px solid #E2E8F0', borderRadius:9, padding:'0 12px', height:38 }}>
          <Calendar size={14} color="#64748B" strokeWidth={2} />
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
          style={{ border:'none', outline:'none', fontSize:13, color:'#374151', background:'transparent', cursor:'pointer' }} />
        </div>
      </div>

      {/* KPIs */}
      {summary && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px,1fr))', gap:12, marginBottom:20 }}>
          {KPIS.map(({ key, label, Icon, color, bg, pct }) => {
            const val = summary[key as keyof Summary]
            return (
              <div key={key} style={{ background:'#fff', borderRadius:12, padding:'14px 16px', border:'1px solid #E2E8F0', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ width:34, height:34, background:bg, borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:10 }}>
                  <Icon size={17} strokeWidth={1.8} color={color} />
                </div>
                <div style={{ fontSize:22, fontWeight:800, color:'#0F172A', letterSpacing:'-0.03em' }}>{val}{pct?'%':''}</div>
                <div style={{ fontSize:11, color:'#64748B', marginTop:2, fontWeight:500 }}>{label}</div>
              </div>
            )
          })}
        </div>
      )}

      {monthly.length > 0 && (
        <div style={{ background:'#fff', borderRadius:14, padding:'20px 24px', border:'1px solid #E2E8F0', boxShadow:'0 1px 4px rgba(0,0,0,0.05)', marginBottom:16 }}>
          <h2 style={{ fontSize:14, fontWeight:700, color:'#0F172A', marginBottom:16 }}>Monthly Attendance Trend</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthly as {date:string;present:number;late:number;absent:number}[]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="date" tick={{fontSize:11, fill:'#94A3B8'}} tickFormatter={d => new Date(d).getDate().toString()} />
              <YAxis tick={{fontSize:11, fill:'#94A3B8'}} />
              <Tooltip contentStyle={{borderRadius:10, border:'1px solid #E2E8F0', fontSize:12}} />
              <Line type="monotone" dataKey="present" stroke="#16A34A" strokeWidth={2.5} dot={false} name="Present" />
              <Line type="monotone" dataKey="late" stroke="#D97706" strokeWidth={2} dot={false} name="Late" />
              <Line type="monotone" dataKey="absent" stroke="#DC2626" strokeWidth={2} dot={false} name="Absent" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        {deptStats.length > 0 && (
          <div style={{ background:'#fff', borderRadius:14, padding:'20px 24px', border:'1px solid #E2E8F0', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
            <h2 style={{ fontSize:14, fontWeight:700, color:'#0F172A', marginBottom:16 }}>Dept. Attendance Rate</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={deptStats as {department:string;attendance_rate:number}[]} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis type="number" domain={[0,100]} tick={{fontSize:11, fill:'#94A3B8'}} />
                <YAxis dataKey="department" type="category" tick={{fontSize:11, fill:'#94A3B8'}} width={80} />
                <Tooltip formatter={v => `${v}%`} contentStyle={{borderRadius:10, fontSize:12}} />
                <Bar dataKey="attendance_rate" fill="#2563EB" radius={[0,6,6,0]} name="Rate %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {leaveStats.length > 0 && (
          <div style={{ background:'#fff', borderRadius:14, padding:'20px 24px', border:'1px solid #E2E8F0', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
            <h2 style={{ fontSize:14, fontWeight:700, color:'#0F172A', marginBottom:16 }}>Leave Distribution</h2>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={leaveStats as {name:string;days:number}[]} dataKey="days" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({name,percent}) => `${name} ${Math.round(percent*100)}%`} labelLine={false} fontSize={10}>
                  {(leaveStats as {name:string}[]).map((_,i) => <Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={v => `${v} days`} contentStyle={{borderRadius:10, fontSize:12}} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
        {deptStats.length === 0 && leaveStats.length === 0 && (
          <div style={{ gridColumn:'1/-1', padding:56, textAlign:'center', background:'#fff', borderRadius:14, border:'1px solid #E2E8F0' }}>
            <BarChart2 size={36} color="#E2E8F0" strokeWidth={1.2} style={{ display:'block', margin:'0 auto 12px' }} />
            <p style={{ fontWeight:600, color:'#374151' }}>No data yet</p>
            <p style={{ fontSize:12, color:'#94A3B8', marginTop:4 }}>Analytics will appear once employees start checking in</p>
          </div>
        )}
      </div>
    </div>
  )
}
