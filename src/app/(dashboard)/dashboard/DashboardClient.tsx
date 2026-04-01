'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import {
  Users, UserCheck, UserX, AlertTriangle, Plane, FileText,
  Clock, LogIn, LogOut, ArrowUpRight, ArrowDownRight,
  Zap, BarChart2, CalendarCheck, Settings, TrendingUp
} from 'lucide-react'
import type { CurrentUser } from '@/types'

interface MyLog { punch_in_at?: string | null; punch_out_at?: string | null; is_late?: boolean; net_duration_minutes?: number }
interface LeaveReq { id: string; leave_type: string; days_count: number; status: string; start_date: string; user?: { full_name: string } }
interface ChartPoint { date: string; present: number; late: number; absent: number }

interface Props {
  user: CurrentUser
  data: {
    total: number; present: number; late: number; onLeave: number; absent: number
    pendingLeaves: number; attendanceRate: number; myLog: MyLog | null
    recentLeaves: LeaveReq[]; chartData: ChartPoint[]
  }
}

function fmtTime(iso?: string | null) {
  if (!iso) return '--:--'
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}
function fmtDur(mins?: number | null) {
  if (!mins || mins <= 0) return ''
  const h = Math.floor(mins / 60), m = mins % 60
  return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ''}` : `${m}m`
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', boxShadow: 'var(--shadow-md)', fontSize: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--text)' }}>{label ? fmtDate(label) : ''}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
          <span style={{ color: 'var(--text-2)' }}>{p.name}: <strong style={{ color: 'var(--text)' }}>{p.value}</strong></span>
        </div>
      ))}
    </div>
  )
}

const LEAVE_STATUS_CLASS: Record<string, string> = {
  pending: 'status-pending', approved: 'status-approved', rejected: 'status-rejected', cancelled: 'status-inactive',
}
const LEAVE_COLOR: Record<string, string> = {
  annual: '#3b82f6', sick: '#ef4444', emergency: '#f59e0b', unpaid: '#6b7280', maternity: '#8b5cf6', paternity: '#0891b2'
}

export default function DashboardClient({ user, data }: Props) {
  const [timeStr, setTimeStr] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [acting, setActing] = useState(false)
  const [myLog, setMyLog] = useState<MyLog | null>(data.myLog)

  const firstName = user.first_name || user.full_name.split(' ')[0]
  const greeting = () => {
    const h = new Date().getHours()
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  }

  useEffect(() => {
    const tick = () => setTimeStr(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    tick(); const t = setInterval(tick, 1000); return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!myLog?.punch_in_at || myLog.punch_out_at) return
    const calc = () => setElapsed(Math.floor((Date.now() - new Date(myLog.punch_in_at!).getTime()) / 60000))
    calc(); const t = setInterval(calc, 30000); return () => clearInterval(t)
  }, [myLog])

  const clockAction = async (action: 'clock_in' | 'clock_out') => {
    setActing(true)
    try {
      const res = await fetch('/api/attendance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error); return }
      setMyLog(json.data)
      toast.success(action === 'clock_in' ? '✅ Clocked in successfully!' : '👋 Clocked out. Great work!')
    } finally { setActing(false) }
  }

  const clockedIn = !!myLog?.punch_in_at
  const clockedOut = !!myLog?.punch_out_at

  const kpis = [
    { label: 'Total Employees', value: data.total, Icon: Users, color: '#4f46e5', bg: '#eef2ff', trend: null },
    { label: 'Present Today', value: data.present, Icon: UserCheck, color: '#10b981', bg: '#d1fae5', trend: data.total ? `${Math.round(data.present / data.total * 100)}%` : '0%' },
    { label: 'Absent', value: data.absent, Icon: UserX, color: '#ef4444', bg: '#fee2e2', trend: null },
    { label: 'Late Arrivals', value: data.late, Icon: AlertTriangle, color: '#f59e0b', bg: '#fef3c7', trend: null },
    { label: 'On Leave', value: data.onLeave, Icon: Plane, color: '#8b5cf6', bg: '#ede9fe', trend: null },
    { label: 'Pending Leaves', value: data.pendingLeaves, Icon: FileText, color: '#f97316', bg: '#ffedd5', trend: data.pendingLeaves > 5 ? 'URGENT' : null },
  ]

  const quickActions = [
    { label: 'Leave Request', Icon: CalendarCheck, href: '/leave-requests', color: '#4f46e5', bg: '#eef2ff' },
    { label: 'View Reports', Icon: BarChart2, href: '/admin/analytics', color: '#10b981', bg: '#d1fae5' },
    { label: 'Manage Team', Icon: Users, href: '/team-directory', color: '#0891b2', bg: '#cffafe' },
    { label: 'Settings', Icon: Settings, href: '/admin/settings', color: '#8b5cf6', bg: '#ede9fe' },
  ]

  return (
    <div className="page anim-fade-up">
      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em' }}>
              {greeting()}, <span className="gradient-text">{firstName}</span> 👋
            </h1>
            <p style={{ color: 'var(--text-3)', fontSize: 13, marginTop: 4 }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              &nbsp;·&nbsp;{user.tenant?.name}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: 1 }}>
              {timeStr}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
              {data.attendanceRate}% attendance today
            </div>
          </div>
        </div>
      </div>

      {/* ── Clock-In Hero ── */}
      <div style={{
        background: clockedIn && !clockedOut
          ? 'linear-gradient(135deg,#1e3a5f,#1e1b4b)'
          : clockedOut
            ? 'linear-gradient(135deg,#064e3b,#065f46)'
            : 'linear-gradient(135deg,#0a0f1e,#1e1b4b)',
        borderRadius: 'var(--radius-xl)',
        padding: '24px 28px',
        marginBottom: 24,
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -40, top: -40, width: 180, height: 180, background: 'rgba(255,255,255,0.03)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', right: 60, bottom: -60, width: 140, height: 140, background: 'rgba(255,255,255,0.02)', borderRadius: '50%' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
          <div>
            <div style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
              {!clockedIn ? 'Start your workday' : clockedOut ? '✓ Shift complete' : `On duty · ${fmtDur(elapsed)} elapsed`}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
              {clockedOut
                ? `Clocked out at ${fmtTime(myLog?.punch_out_at)} · Total ${fmtDur(myLog?.net_duration_minutes)}`
                : clockedIn
                  ? `Clocked in at ${fmtTime(myLog?.punch_in_at)}${myLog?.is_late ? ' · ⚠ Marked late' : ' · ✓ On time'}`
                  : 'Click to start tracking your work hours'
              }
            </div>
          </div>
          {!clockedOut && (
            <button
              onClick={() => clockAction(clockedIn ? 'clock_out' : 'clock_in')}
              disabled={acting}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '12px 24px', borderRadius: 12, border: 'none', cursor: acting ? 'not-allowed' : 'pointer',
                background: clockedIn ? 'rgba(239,68,68,0.85)' : 'rgba(16,185,129,0.85)',
                backdropFilter: 'blur(10px)',
                color: '#fff', fontSize: 14, fontWeight: 700,
                boxShadow: clockedIn ? '0 4px 16px rgba(239,68,68,0.4)' : '0 4px 16px rgba(16,185,129,0.4)',
                opacity: acting ? 0.7 : 1, transition: 'all 0.2s', flexShrink: 0,
              }}
            >
              {acting
                ? <span className="spinner spinner-sm" />
                : clockedIn ? <><LogOut size={16} strokeWidth={2.5} />Clock Out</> : <><LogIn size={16} strokeWidth={2.5} />Clock In</>
              }
            </button>
          )}
        </div>

        {clockedIn && (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16,
            marginTop: 20, paddingTop: 20,
            borderTop: '1px solid rgba(255,255,255,0.08)',
          }}>
            {[
              { label: 'CLOCK IN', value: fmtTime(myLog?.punch_in_at) },
              { label: 'CLOCK OUT', value: fmtTime(myLog?.punch_out_at) },
              { label: 'DURATION', value: fmtDur(myLog?.net_duration_minutes) || fmtDur(elapsed) || '--' },
            ].map(({ label, value }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 1.5, fontWeight: 700 }}>{label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9', marginTop: 4, fontFamily: 'monospace' }}>{value}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── KPI Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px,1fr))', gap: 14, marginBottom: 24 }}>
        {kpis.map((k, i) => (
          <div key={k.label} className={`kpi-card anim-fade-up delay-${i + 1}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div className="kpi-card-icon" style={{ background: k.bg }}>
                <k.Icon size={20} strokeWidth={1.8} color={k.color} />
              </div>
              {k.trend && (
                <span style={{
                  padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700,
                  background: k.trend === 'URGENT' ? '#fee2e2' : '#d1fae5',
                  color: k.trend === 'URGENT' ? '#991b1b' : '#065f46',
                }}>
                  {k.trend === 'URGENT' ? '⚠ Urgent' : k.trend}
                </span>
              )}
            </div>
            <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.04em', lineHeight: 1 }}>
              {k.value}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6, fontWeight: 500 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* ── Charts row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, marginBottom: 24 }}>

        {/* Attendance chart */}
        <div className="chart-card anim-fade-up delay-3">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div className="chart-title" style={{ marginBottom: 0 }}>
              <TrendingUp size={16} color="var(--brand-500)" strokeWidth={2} />
              Attendance — Last 30 Days
            </div>
            <div style={{ display: 'flex', gap: 14, fontSize: 11 }}>
              {[
                { color: '#4f46e5', label: 'Present' },
                { color: '#f59e0b', label: 'Late' },
                { color: '#ef4444', label: 'Absent' },
              ].map(({ color, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-3)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
                  {label}
                </div>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data.chartData} margin={{ top: 2, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="gPresent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gLate" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickFormatter={d => new Date(d).getDate().toString()} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="present" stroke="#4f46e5" strokeWidth={2.5} fill="url(#gPresent)" name="Present" dot={false} />
              <Area type="monotone" dataKey="late" stroke="#f59e0b" strokeWidth={2} fill="url(#gLate)" name="Late" dot={false} />
              <Area type="monotone" dataKey="absent" stroke="#ef4444" strokeWidth={1.5} fill="none" name="Absent" dot={false} strokeDasharray="4 3" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Attendance rate + quick actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Rate card */}
          <div className="kpi-card" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Today&apos;s Rate</span>
              <span style={{
                fontSize: 28, fontWeight: 900, letterSpacing: '-0.04em',
                color: data.attendanceRate >= 80 ? '#10b981' : data.attendanceRate >= 60 ? '#f59e0b' : '#ef4444',
              }}>{data.attendanceRate}%</span>
            </div>
            <div className="progress-bar" style={{ marginBottom: 12 }}>
              <div className="progress-fill" style={{ width: `${data.attendanceRate}%`, background: data.attendanceRate >= 80 ? 'linear-gradient(90deg,#10b981,#059669)' : data.attendanceRate >= 60 ? 'linear-gradient(90deg,#f59e0b,#d97706)' : 'linear-gradient(90deg,#ef4444,#dc2626)' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: 'Present', val: data.present, color: '#10b981' },
                { label: 'Absent', val: data.absent, color: '#ef4444' },
                { label: 'Late', val: data.late, color: '#f59e0b' },
                { label: 'On Leave', val: data.onLeave, color: '#8b5cf6' },
              ].map(({ label, val, color }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: 'var(--text-2)' }}>{label}: <strong style={{ color: 'var(--text)' }}>{val}</strong></span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="card" style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>Quick Actions</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {quickActions.map(({ label, Icon, href, color, bg }) => (
                <a key={label} href={href} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 6, padding: '12px 8px', borderRadius: 10, textDecoration: 'none',
                  background: bg, border: '1px solid transparent',
                  transition: 'all 0.15s', cursor: 'pointer',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLAnchorElement).style.boxShadow = 'var(--shadow-md)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'none'; (e.currentTarget as HTMLAnchorElement).style.boxShadow = 'none' }}
                >
                  <Icon size={20} strokeWidth={1.8} color={color} />
                  <span style={{ fontSize: 11, fontWeight: 600, color, textAlign: 'center', lineHeight: 1.3 }}>{label}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Recent leave requests ── */}
      {data.recentLeaves.length > 0 && (
        <div className="card anim-fade-up delay-5" style={{ overflow: 'hidden' }}>
          <div className="section-header" style={{ padding: '16px 20px', marginBottom: 0, borderBottom: '1px solid var(--border)' }}>
            <div className="section-title">
              <FileText size={16} color="var(--brand-500)" strokeWidth={2} />
              Recent Leave Requests
            </div>
            <a href="/leave-requests" style={{ fontSize: 12, color: 'var(--brand-500)', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              View all <ArrowUpRight size={12} strokeWidth={2} />
            </a>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Type</th>
                <th>Dates</th>
                <th>Days</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.recentLeaves.map((req: any) => (
                <tr key={req.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--brand-50)', color: 'var(--brand-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 11 }}>
                        {req.user?.full_name?.[0] || '?'}
                      </div>
                      <span style={{ fontWeight: 500, color: 'var(--text)' }}>{req.user?.full_name || 'Unknown'}</span>
                    </div>
                  </td>
                  <td>
                    <span className="badge" style={{ background: `${LEAVE_COLOR[req.leave_type] || '#64748b'}15`, color: LEAVE_COLOR[req.leave_type] || '#64748b', border: `1px solid ${LEAVE_COLOR[req.leave_type] || '#64748b'}30` }}>
                      {req.leave_type}
                    </span>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {new Date(req.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} → {new Date(req.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </td>
                  <td>{req.days_count}d</td>
                  <td>
                    <span className={`badge ${LEAVE_STATUS_CLASS[req.status] || ''}`}>{req.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
