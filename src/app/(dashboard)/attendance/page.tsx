'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Clock, LogIn, LogOut, Calendar, Filter, Download,
  CheckCircle2, AlertTriangle, XCircle, Coffee, RefreshCw,
  ChevronLeft, ChevronRight, TrendingUp, Timer, Zap
} from 'lucide-react'

interface AttLog {
  id: string; attendance_date: string
  punch_in_at?: string | null; punch_out_at?: string | null
  status: string; is_late: boolean; is_overtime: boolean
  net_duration_minutes: number; overtime_minutes: number
}

type ViewMode = 'table' | 'calendar'
type FilterStatus = 'all' | 'punched_in' | 'punched_out' | 'missed' | 'late'

const STATUS_CFG: Record<string, { label: string; cls: string; Icon: React.FC<{size?:number;strokeWidth?:number;color?:string}> }> = {
  punched_in:   { label: 'Active',    cls: 'status-present',  Icon: CheckCircle2 },
  on_break:     { label: 'On Break',  cls: 'status-pending',  Icon: Coffee },
  punched_out:  { label: 'Complete',  cls: 'status-approved', Icon: CheckCircle2 },
  missed:       { label: 'Missed',    cls: 'status-absent',   Icon: XCircle },
  on_leave:     { label: 'On Leave',  cls: 'status-on-leave', Icon: Calendar },
}

function fmtTime(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}
function fmtDur(mins: number) {
  if (!mins) return '—'
  const h = Math.floor(mins / 60), m = mins % 60
  return h > 0 ? `${h}h ${m > 0 ? m + 'm' : ''}` : `${m}m`
}
function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

const DAY_COLORS: Record<string, string> = {
  punched_out: '#d1fae5', punched_in: '#bfdbfe', missed: '#fee2e2',
  on_leave: '#ede9fe', on_break: '#fef3c7',
}

export default function AttendancePage() {
  const [logs, setLogs] = useState<AttLog[]>([])
  const [todayLog, setTodayLog] = useState<AttLog | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [view, setView] = useState<ViewMode>('table')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [mounted, setMounted] = useState(false)
  const [timeStr, setTimeStr] = useState('--:--:--')
  const [elapsed, setElapsed] = useState(0)
  const [calMonth, setCalMonth] = useState(new Date())

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    setMounted(true)
    const tick = () => setTimeStr(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }))
    tick(); const t = setInterval(tick, 1000); return () => clearInterval(t)
  }, [])

  const loadLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/attendance?limit=90')
      if (!res.ok) { toast.error('Failed to load attendance'); return }
      const json = await res.json()
      if (json.data) {
        setLogs(json.data)
        setTodayLog((json.data as AttLog[]).find(l => l.attendance_date === today) || null)
      }
    } catch { toast.error('Network error') }
    finally { setLoading(false) }
  }, [today])

  useEffect(() => { loadLogs() }, [loadLogs])

  useEffect(() => {
    if (!todayLog?.punch_in_at || todayLog.punch_out_at) { setElapsed(0); return }
    const calc = () => setElapsed(Math.max(0, Math.floor((Date.now() - new Date(todayLog.punch_in_at!).getTime()) / 60000)))
    calc(); const t = setInterval(calc, 30000); return () => clearInterval(t)
  }, [todayLog])

  const clockAction = async (action: 'clock_in' | 'clock_out') => {
    setActing(true)
    try {
      const res = await fetch('/api/attendance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error); return }
      setTodayLog(json.data)
      setLogs(prev => { const i = prev.findIndex(l => l.attendance_date === today); return i >= 0 ? prev.map((l,idx) => idx===i ? json.data : l) : [json.data, ...prev] })
      toast.success(action === 'clock_in' ? 'Clocked in — great start!' : 'Clocked out — nice work today!')
    } finally { setActing(false) }
  }

  const clockedIn = !!todayLog?.punch_in_at
  const clockedOut = !!todayLog?.punch_out_at

  // Month stats
  const monthStr = today.slice(0, 7)
  const monthLogs = logs.filter(l => l.attendance_date.startsWith(monthStr))
  const stats = {
    present: monthLogs.filter(l => ['punched_in','punched_out','on_break'].includes(l.status)).length,
    late: monthLogs.filter(l => l.is_late).length,
    absent: monthLogs.filter(l => l.status === 'missed').length,
    totalHours: Math.floor(monthLogs.reduce((a, l) => a + (l.net_duration_minutes || 0), 0) / 60),
    overtime: Math.floor(monthLogs.reduce((a, l) => a + (l.overtime_minutes || 0), 0) / 60),
  }

  // Ring progress
  const RING_R = 54, RING_C = 2 * Math.PI * RING_R
  const ringFill = Math.min(1, elapsed / 480) * RING_C

  const filtered = filterStatus === 'all' ? logs
    : filterStatus === 'late' ? logs.filter(l => l.is_late)
    : logs.filter(l => l.status === filterStatus)

  // Calendar
  const calDays = () => {
    const year = calMonth.getFullYear(), month = calMonth.getMonth()
    const first = new Date(year, month, 1).getDay()
    const last = new Date(year, month + 1, 0).getDate()
    const days = []
    for (let i = 0; i < first; i++) days.push(null)
    for (let d = 1; d <= last; d++) days.push(d)
    return days
  }
  const logByDate = (d: number) => {
    const key = `${calMonth.getFullYear()}-${String(calMonth.getMonth()+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
    return logs.find(l => l.attendance_date === key)
  }

  const exportCSV = () => {
    const rows = [['Date','Status','Clock In','Clock Out','Duration','Late','Overtime']]
    logs.forEach(l => rows.push([l.attendance_date, l.status, fmtTime(l.punch_in_at), fmtTime(l.punch_out_at), fmtDur(l.net_duration_minutes), l.is_late?'Yes':'No', fmtDur(l.overtime_minutes)]))
    const blob = new Blob([rows.map(r=>r.join(',')).join('\n')], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'attendance.csv'; a.click()
    toast.success('CSV exported')
  }

  return (
    <div className="page anim-fade-up">

      {/* ── Top: Clock widget + month stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 16, marginBottom: 24 }}>

        {/* Clock widget */}
        <div style={{
          background: 'linear-gradient(145deg,#0a0f1e,#1e1b4b)',
          borderRadius: 20, padding: '28px 24px',
          border: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, background: 'rgba(99,102,241,0.08)', borderRadius: '50%' }} />

          {/* SVG ring */}
          <div style={{ position: 'relative', width: 136, height: 136, marginBottom: 16 }}>
            <svg width="136" height="136" style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}>
              <circle cx="68" cy="68" r={RING_R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
              {clockedIn && !clockedOut && mounted && (
                <circle cx="68" cy="68" r={RING_R} fill="none" stroke="url(#rGrad)" strokeWidth="7" strokeLinecap="round"
                  strokeDasharray={`${ringFill} ${RING_C}`} style={{ transition: 'stroke-dasharray 1s ease' }} />
              )}
              {clockedOut && <circle cx="68" cy="68" r={RING_R} fill="none" stroke="#10b981" strokeWidth="7" />}
              <defs>
                <linearGradient id="rGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#4f46e5" /><stop offset="100%" stopColor="#7c3aed" />
                </linearGradient>
              </defs>
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontFamily: 'monospace', fontSize: mounted ? 18 : 17, fontWeight: 700, color: '#f1f5f9', letterSpacing: 1 }}>
                {mounted ? timeStr : '--:--:--'}
              </div>
              {clockedIn && !clockedOut && (
                <div style={{ fontSize: 10, color: '#818cf8', marginTop: 3, fontWeight: 600 }}>
                  {fmtDur(elapsed)} elapsed
                </div>
              )}
            </div>
          </div>

          {/* Status */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7, marginBottom: 16,
            padding: '4px 14px', borderRadius: 99,
            background: clockedOut ? 'rgba(16,185,129,0.15)' : clockedIn ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${clockedOut ? 'rgba(16,185,129,0.3)' : clockedIn ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.1)'}`,
          }}>
            {clockedOut
              ? <CheckCircle2 size={12} color="#6ee7b7" strokeWidth={2.5} />
              : clockedIn
                ? <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#818cf8', position: 'relative', display: 'inline-block' }}><span style={{ position: 'absolute', inset: -3, borderRadius: '50%', background: 'rgba(129,140,248,0.3)', animation: 'ping 1.5s infinite' }} /></span>
                : <Timer size={12} color="#475569" strokeWidth={1.8} />
            }
            <span style={{ fontSize: 12, fontWeight: 600, color: clockedOut ? '#6ee7b7' : clockedIn ? '#c4b5fd' : '#475569' }}>
              {clockedOut ? 'Shift Complete' : clockedIn ? 'On Duty' : 'Not Clocked In'}
            </span>
          </div>

          {/* In/Out times */}
          {clockedIn && (
            <div style={{ display: 'flex', gap: 24, marginBottom: 18 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>IN</div>
                <div style={{ fontSize: 17, fontWeight: 800, color: '#86efac', fontFamily: 'monospace', marginTop: 3 }}>{fmtTime(todayLog?.punch_in_at)}</div>
                {todayLog?.is_late && <div style={{ fontSize: 10, color: '#fbbf24', marginTop: 1 }}>⚠ Late</div>}
              </div>
              <div style={{ width: 1, background: 'rgba(255,255,255,0.07)', alignSelf: 'stretch' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>OUT</div>
                <div style={{ fontSize: 17, fontWeight: 800, color: clockedOut ? '#93c5fd' : '#334155', fontFamily: 'monospace', marginTop: 3 }}>{fmtTime(todayLog?.punch_out_at)}</div>
                {clockedOut && todayLog?.net_duration_minutes && <div style={{ fontSize: 10, color: '#6ee7b7', marginTop: 1 }}>{fmtDur(todayLog.net_duration_minutes)}</div>}
              </div>
            </div>
          )}

          {/* Action button */}
          {!clockedOut ? (
            <button
              onClick={() => clockAction(clockedIn ? 'clock_out' : 'clock_in')}
              disabled={acting}
              style={{
                width: '100%', height: 46, borderRadius: 12, border: 'none',
                cursor: acting ? 'not-allowed' : 'pointer',
                background: clockedIn ? 'linear-gradient(135deg,#dc2626,#b91c1c)' : 'linear-gradient(135deg,#16a34a,#15803d)',
                color: '#fff', fontSize: 13, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                boxShadow: clockedIn ? '0 4px 16px rgba(220,38,38,0.35)' : '0 4px 16px rgba(22,163,74,0.35)',
                opacity: acting ? 0.7 : 1, transition: 'all 0.15s',
              }}
            >
              {acting ? <span className="spinner spinner-sm" /> : clockedIn ? <><LogOut size={15} strokeWidth={2.5} />Clock Out</> : <><LogIn size={15} strokeWidth={2.5} />Clock In</>}
            </button>
          ) : (
            <div style={{ width: '100%', height: 46, borderRadius: 12, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
              <CheckCircle2 size={15} color="#4ade80" strokeWidth={2} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#4ade80' }}>
                {todayLog?.net_duration_minutes ? fmtDur(todayLog.net_duration_minutes) + ' logged today' : 'Great work today!'}
              </span>
            </div>
          )}
        </div>

        {/* Month stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gridTemplateRows: '1fr 1fr', gap: 12 }}>
          {[
            { label: 'Days Present', val: stats.present, Icon: CheckCircle2, color: '#10b981', bg: '#d1fae5' },
            { label: 'Total Hours', val: stats.totalHours + 'h', Icon: Clock, color: '#4f46e5', bg: '#eef2ff' },
            { label: 'Overtime', val: stats.overtime + 'h', Icon: Zap, color: '#8b5cf6', bg: '#ede9fe' },
            { label: 'Late Arrivals', val: stats.late, Icon: AlertTriangle, color: stats.late > 0 ? '#f59e0b' : '#10b981', bg: stats.late > 0 ? '#fef3c7' : '#d1fae5' },
            { label: 'Missed Days', val: stats.absent, Icon: XCircle, color: stats.absent > 0 ? '#ef4444' : '#10b981', bg: stats.absent > 0 ? '#fee2e2' : '#d1fae5' },
            { label: 'Attendance Rate', val: monthLogs.length > 0 ? Math.round((stats.present / monthLogs.length) * 100) + '%' : '—', Icon: TrendingUp, color: '#0891b2', bg: '#f0f9ff' },
          ].map(({ label, val, Icon, color, bg }) => (
            <div key={label} className="kpi-card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={18} color={color} strokeWidth={1.8} />
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.03em' }}>{val}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500, marginTop: 1 }}>{label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="card" style={{ padding: '14px 18px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['all','punched_out','missed','late'] as FilterStatus[]).map(f => (
            <button key={f} onClick={() => setFilterStatus(f)} style={{
              padding: '5px 12px', borderRadius: 7, border: '1px solid', cursor: 'pointer',
              fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
              background: filterStatus === f ? 'var(--brand-600)' : 'var(--surface-2)',
              color: filterStatus === f ? '#fff' : 'var(--text-2)',
              borderColor: filterStatus === f ? 'var(--brand-600)' : 'var(--border-strong)',
            }}>
              {f === 'all' ? 'All' : f === 'punched_out' ? 'Complete' : f === 'missed' ? 'Missed' : 'Late'}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {/* View toggle */}
          <div style={{ display: 'flex', background: 'var(--surface-3)', borderRadius: 9, padding: 3, border: '1px solid var(--border)' }}>
            {(['table','calendar'] as ViewMode[]).map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                padding: '5px 12px', borderRadius: 7, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
                background: view === v ? 'var(--surface)' : 'transparent',
                color: view === v ? 'var(--text)' : 'var(--text-3)',
                boxShadow: view === v ? 'var(--shadow-xs)' : 'none',
              }}>
                {v === 'table' ? <><Filter size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />Table</> : <><Calendar size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />Calendar</>}
              </button>
            ))}
          </div>

          <button onClick={loadLogs} className="btn btn-ghost btn-sm" style={{ gap: 5 }}>
            <RefreshCw size={13} strokeWidth={2} />Refresh
          </button>
          <button onClick={exportCSV} className="btn btn-secondary btn-sm" style={{ gap: 5 }}>
            <Download size={13} strokeWidth={2} />Export CSV
          </button>
        </div>
      </div>

      {/* ── Table or Calendar ── */}
      {view === 'table' ? (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Attendance History</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{filtered.length} records</div>
          </div>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}><span className="spinner spinner-md" style={{ borderTopColor: 'var(--brand-500)' }} /></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <Clock size={40} strokeWidth={1.2} /><h3>No records found</h3>
              <p>Clock in to start tracking your attendance history</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th><th>Status</th><th>Clock In</th>
                    <th>Clock Out</th><th>Duration</th><th>Overtime</th><th>Flags</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((log, idx) => {
                    const cfg = STATUS_CFG[log.status] || STATUS_CFG.punched_out
                    const isToday = log.attendance_date === today
                    return (
                      <tr key={log.id} style={{ background: isToday ? 'var(--brand-50)' : idx % 2 === 0 ? 'transparent' : 'var(--surface-2)' }}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {isToday && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--brand-500)', flexShrink: 0 }} />}
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13 }}>{isToday ? 'Today' : fmtDate(log.attendance_date)}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{log.attendance_date}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${cfg.cls}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <cfg.Icon size={10} strokeWidth={2.5} />{cfg.label}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: log.punch_in_at ? '#10b981' : 'var(--text-3)' }}>
                          {fmtTime(log.punch_in_at)}
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: log.punch_out_at ? '#3b82f6' : 'var(--text-3)' }}>
                          {fmtTime(log.punch_out_at)}
                        </td>
                        <td style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-2)' }}>{fmtDur(log.net_duration_minutes)}</td>
                        <td>
                          {log.overtime_minutes > 0
                            ? <span style={{ color: '#8b5cf6', fontWeight: 600, fontSize: 12 }}>+{fmtDur(log.overtime_minutes)}</span>
                            : <span style={{ color: 'var(--text-3)' }}>—</span>
                          }
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                            {log.is_late && <span className="badge badge-warning" style={{ gap: 3, fontSize: 10 }}><AlertTriangle size={9} strokeWidth={2.5} />Late</span>}
                            {log.is_overtime && <span className="badge badge-purple" style={{ gap: 3, fontSize: 10 }}><Zap size={9} strokeWidth={2.5} />OT</span>}
                            {!log.is_late && !log.is_overtime && log.punch_in_at && <span style={{ color: '#10b981', fontSize: 12 }}>✓</span>}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Calendar view */
        <div className="card" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <button onClick={() => setCalMonth(m => { const n = new Date(m); n.setMonth(n.getMonth()-1); return n })} className="btn btn-ghost btn-sm">
              <ChevronLeft size={14} strokeWidth={2} />
            </button>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
              {calMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </div>
            <button onClick={() => setCalMonth(m => { const n = new Date(m); n.setMonth(n.getMonth()+1); return n })} className="btn btn-ghost btn-sm">
              <ChevronRight size={14} strokeWidth={2} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-3)', padding: '6px 0', textTransform: 'uppercase', letterSpacing: 0.5 }}>{d}</div>
            ))}
            {calDays().map((day, i) => {
              if (!day) return <div key={i} />
              const log = logByDate(day)
              const isToday = day === new Date().getDate() && calMonth.getMonth() === new Date().getMonth() && calMonth.getFullYear() === new Date().getFullYear()
              const isWeekend = [0,6].includes(new Date(calMonth.getFullYear(), calMonth.getMonth(), day).getDay())
              const bg = log ? DAY_COLORS[log.status] || 'var(--surface-3)' : isWeekend ? 'transparent' : 'var(--surface-2)'
              return (
                <div key={day} title={log ? `${log.status} · In: ${fmtTime(log.punch_in_at)} Out: ${fmtTime(log.punch_out_at)}` : undefined} style={{
                  aspectRatio: '1', borderRadius: 10, background: bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: isToday ? 800 : 500,
                  color: isWeekend && !log ? 'var(--text-3)' : 'var(--text)',
                  border: isToday ? '2px solid var(--brand-500)' : '1px solid transparent',
                  cursor: log ? 'pointer' : 'default',
                  transition: 'transform 0.15s',
                }} onMouseEnter={e => { if (log) (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.08)' }} onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)'}>
                  {day}
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
            {Object.entries({ punched_out: 'Complete', punched_in: 'Active', missed: 'Missed', on_leave: 'On Leave' }).map(([k, label]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-2)' }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: DAY_COLORS[k], border: '1px solid rgba(0,0,0,0.1)', display: 'inline-block' }} />
                {label}
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`@keyframes ping { 75%,100% { transform:scale(2);opacity:0; } }`}</style>
    </div>
  )
}
