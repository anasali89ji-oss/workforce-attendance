'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Clock, LogIn, LogOut, CheckCircle2, XCircle, AlertTriangle,
  Timer, Zap, Calendar, TrendingUp, Filter, ChevronDown,
  RefreshCw, Moon, Sun, Coffee
} from 'lucide-react'

interface AttLog {
  id: string
  attendance_date: string
  punch_in_at?: string | null
  punch_out_at?: string | null
  status: string
  is_late: boolean
  is_overtime: boolean
  net_duration_minutes: number
  overtime_minutes: number
}

type FilterType = 'all' | 'late' | 'overtime'

// ── Format helpers ──────────────────────────────────────────────
function fmtTime(iso?: string | null): string {
  if (!iso) return '--:--'
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}
function fmtDur(mins: number): string {
  if (!mins || mins <= 0) return '0m'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}m`
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}
function fmtDate(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric'
  })
}

// ── Status config ──────────────────────────────────────────────
const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  punched_in:  { label: 'Active',    color: '#16A34A', bg: '#F0FDF4', border: '#86EFAC' },
  on_break:    { label: 'On Break',  color: '#D97706', bg: '#FFFBEB', border: '#FCD34D' },
  punched_out: { label: 'Complete',  color: '#2563EB', bg: '#EFF6FF', border: '#93C5FD' },
  missed:      { label: 'Missed',    color: '#DC2626', bg: '#FEF2F2', border: '#FCA5A5' },
  on_leave:    { label: 'On Leave',  color: '#7C3AED', bg: '#F5F3FF', border: '#C4B5FD' },
  approved_edit:{ label: 'Edited',   color: '#0891B2', bg: '#F0F9FF', border: '#7DD3FC' },
}

// ── Stat Card ──────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color, bg }: {
  icon: React.FC<{ size?: number; strokeWidth?: number; color?: string }>
  label: string; value: string | number; sub: string; color: string; bg: string
}) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: '16px 20px',
      border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{
        width: 44, height: 44, background: bg, borderRadius: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={20} strokeWidth={1.8} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>{value}</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginTop: 1 }}>{label}</div>
        <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>{sub}</div>
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────
export default function AttendancePage() {
  const [logs, setLogs] = useState<AttLog[]>([])
  const [todayLog, setTodayLog] = useState<AttLog | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [filter, setFilter] = useState<FilterType>('all')
  const [mounted, setMounted] = useState(false)
  const [timeStr, setTimeStr] = useState('--:--:--')
  const [elapsed, setElapsed] = useState(0)

  // Fix hydration: only show clock after mount
  useEffect(() => {
    setMounted(true)
    const tick = () => {
      setTimeStr(new Date().toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
      }))
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [])

  const today = new Date().toISOString().split('T')[0]

  const loadLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/attendance?limit=31')
      if (!res.ok) {
        if (res.status === 401) {
          toast.error('Session expired — please log in again')
          return
        }
        toast.error('Failed to load attendance data')
        return
      }
      const json = await res.json()
      if (json.data) {
        setLogs(json.data)
        const t = (json.data as AttLog[]).find(l => l.attendance_date === today) || null
        setTodayLog(t)
      }
    } catch {
      toast.error('Network error loading attendance')
    } finally {
      setLoading(false)
    }
  }, [today])

  useEffect(() => { loadLogs() }, [loadLogs])

  // Elapsed timer
  useEffect(() => {
    if (!todayLog?.punch_in_at || todayLog.punch_out_at) { setElapsed(0); return }
    const calc = () => {
      const start = new Date(todayLog.punch_in_at!).getTime()
      setElapsed(Math.max(0, Math.floor((Date.now() - start) / 60000)))
    }
    calc()
    const t = setInterval(calc, 30000)
    return () => clearInterval(t)
  }, [todayLog])

  const clockAction = async (action: 'clock_in' | 'clock_out') => {
    setActing(true)
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error || 'Action failed'); return }
      toast.success(action === 'clock_in' ? 'Successfully clocked in!' : 'Clocked out — great work today!')
      await loadLogs()
    } catch {
      toast.error('Network error')
    } finally {
      setActing(false)
    }
  }

  const clockedIn = !!todayLog?.punch_in_at
  const clockedOut = !!todayLog?.punch_out_at
  const isLate = todayLog?.is_late ?? false

  // Month stats
  const monthStr = today.slice(0, 7)
  const monthLogs = logs.filter(l => l.attendance_date.startsWith(monthStr))
  const totalDays = monthLogs.length
  const lateDays = monthLogs.filter(l => l.is_late).length
  const totalHours = Math.floor(monthLogs.reduce((a, l) => a + (l.net_duration_minutes || 0), 0) / 60)
  const avgHoursPerDay = totalDays > 0 ? (monthLogs.reduce((a, l) => a + (l.net_duration_minutes || 0), 0) / totalDays / 60).toFixed(1) : '0'

  const filteredLogs = filter === 'all' ? logs
    : filter === 'late' ? logs.filter(l => l.is_late)
    : logs.filter(l => l.is_overtime)

  // Ring progress (8h shift = 480 min)
  const ringPct = Math.min(1, elapsed / 480)
  const RING_R = 58
  const RING_C = 2 * Math.PI * RING_R
  const ringFill = ringPct * RING_C

  return (
    <div style={{ maxWidth: 1140, animation: 'fadeUp 0.35s ease' }}>
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={20} color="#2563EB" strokeWidth={2} />
            Attendance
          </h1>
          <p style={{ color: '#64748B', fontSize: 13, marginTop: 3 }}>Track your working hours and shift history</p>
        </div>
        <button onClick={loadLogs} style={{
          display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 14px',
          background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8,
          fontSize: 12, fontWeight: 600, color: '#64748B', cursor: 'pointer',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#2563EB'; (e.currentTarget as HTMLButtonElement).style.color = '#2563EB' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#E2E8F0'; (e.currentTarget as HTMLButtonElement).style.color = '#64748B' }}
        >
          <RefreshCw size={13} strokeWidth={2} />
          Refresh
        </button>
      </div>

      {/* Top Row: Clock Widget + Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16, marginBottom: 20 }}>

        {/* ── Clock Widget ── */}
        <div style={{
          background: 'linear-gradient(145deg, #0F172A 0%, #1E293B 100%)',
          borderRadius: 16, padding: '28px 24px',
          border: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Ambient glow */}
          <div style={{ position: 'absolute', top: -40, right: -40, width: 120, height: 120, background: 'rgba(37,99,235,0.08)', borderRadius: '50%' }} />

          {/* SVG Ring */}
          <div style={{ position: 'relative', width: 140, height: 140, marginBottom: 16 }}>
            <svg width="140" height="140" style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}>
              {/* Track */}
              <circle cx="70" cy="70" r={RING_R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
              {/* Progress */}
              {clockedIn && !clockedOut && mounted && (
                <circle
                  cx="70" cy="70" r={RING_R}
                  fill="none"
                  stroke="url(#ringGrad)"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={`${ringFill} ${RING_C}`}
                  style={{ transition: 'stroke-dasharray 1s ease' }}
                />
              )}
              {clockedOut && (
                <circle cx="70" cy="70" r={RING_R} fill="none" stroke="#16A34A" strokeWidth="7" />
              )}
              <defs>
                <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#2563EB" />
                  <stop offset="100%" stopColor="#7C3AED" />
                </linearGradient>
              </defs>
            </svg>

            {/* Digital clock */}
            <div style={{
              position: 'absolute', inset: 0, display: 'flex',
              flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                fontFamily: "'SF Mono', 'Consolas', monospace",
                fontSize: mounted ? 19 : 18, fontWeight: 700,
                color: '#F1F5F9', letterSpacing: 1,
              }}>
                {mounted ? timeStr : '--:--:--'}
              </div>
              {clockedIn && !clockedOut && (
                <div style={{ fontSize: 10, color: '#818CF8', marginTop: 3, fontWeight: 600 }}>
                  {fmtDur(elapsed)} elapsed
                </div>
              )}
            </div>
          </div>

          {/* Status badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7, marginBottom: 18,
            padding: '5px 14px', borderRadius: 99,
            background: clockedOut
              ? 'rgba(22,163,74,0.15)'
              : clockedIn
                ? 'rgba(37,99,235,0.18)'
                : 'rgba(255,255,255,0.05)',
            border: `1px solid ${clockedOut ? 'rgba(22,163,74,0.3)' : clockedIn ? 'rgba(37,99,235,0.35)' : 'rgba(255,255,255,0.08)'}`,
          }}>
            {clockedOut
              ? <CheckCircle2 size={13} color="#4ADE80" strokeWidth={2} />
              : clockedIn
                ? <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#60A5FA', position: 'relative' }}>
                    <div style={{ position: 'absolute', inset: -3, borderRadius: '50%', background: 'rgba(96,165,250,0.3)', animation: 'ringPulse 2s infinite' }} />
                  </div>
                : <Moon size={13} color="#475569" strokeWidth={1.8} />
            }
            <span style={{ fontSize: 12, fontWeight: 600, color: clockedOut ? '#4ADE80' : clockedIn ? '#93C5FD' : '#64748B' }}>
              {clockedOut ? 'Shift Complete' : clockedIn ? 'On Duty' : 'Not Checked In'}
            </span>
          </div>

          {/* In/Out times */}
          {clockedIn && (
            <div style={{ display: 'flex', gap: 24, marginBottom: 18, width: '100%', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: '#64748B', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>IN</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#86EFAC', marginTop: 3, fontFamily: 'monospace' }}>
                  {fmtTime(todayLog?.punch_in_at)}
                </div>
                {isLate && <div style={{ fontSize: 10, color: '#FBBF24', marginTop: 1 }}>Late</div>}
              </div>
              <div style={{ width: 1, background: 'rgba(255,255,255,0.06)', alignSelf: 'stretch' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: '#64748B', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>OUT</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: clockedOut ? '#93C5FD' : '#334155', marginTop: 3, fontFamily: 'monospace' }}>
                  {fmtTime(todayLog?.punch_out_at)}
                </div>
                {clockedOut && todayLog?.net_duration_minutes && (
                  <div style={{ fontSize: 10, color: '#4ADE80', marginTop: 1 }}>{fmtDur(todayLog.net_duration_minutes)}</div>
                )}
              </div>
            </div>
          )}

          {/* Action button */}
          {!clockedOut ? (
            <button
              onClick={() => clockAction(clockedIn ? 'clock_out' : 'clock_in')}
              disabled={acting}
              style={{
                width: '100%', height: 46, borderRadius: 11, border: 'none',
                cursor: acting ? 'not-allowed' : 'pointer',
                background: clockedIn
                  ? 'linear-gradient(135deg, #DC2626, #B91C1C)'
                  : 'linear-gradient(135deg, #16A34A, #15803D)',
                color: '#fff', fontSize: 13, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: clockedIn
                  ? '0 4px 14px rgba(220,38,38,0.35)'
                  : '0 4px 14px rgba(22,163,74,0.35)',
                opacity: acting ? 0.7 : 1,
                transition: 'all 0.15s',
              }}
            >
              {acting ? (
                <><div className="spinner" style={{ width: 14, height: 14 }} /> Processing...</>
              ) : clockedIn ? (
                <><LogOut size={15} strokeWidth={2.5} /> Clock Out</>
              ) : (
                <><LogIn size={15} strokeWidth={2.5} /> Clock In</>
              )}
            </button>
          ) : (
            <div style={{
              width: '100%', height: 46, borderRadius: 11,
              background: 'rgba(22,163,74,0.1)',
              border: '1px solid rgba(22,163,74,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <CheckCircle2 size={16} color="#4ADE80" strokeWidth={2} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#4ADE80' }}>
                Great work today! {todayLog?.net_duration_minutes ? fmtDur(todayLog.net_duration_minutes) + ' logged' : ''}
              </span>
            </div>
          )}
        </div>

        {/* ── Stat Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 12 }}>
          <StatCard
            icon={Calendar}
            label="Days This Month"
            value={totalDays}
            sub="attendance records"
            color="#2563EB" bg="#EFF6FF"
          />
          <StatCard
            icon={TrendingUp}
            label="Hours Worked"
            value={totalHours + 'h'}
            sub={`avg ${avgHoursPerDay}h/day`}
            color="#0891B2" bg="#F0F9FF"
          />
          <StatCard
            icon={AlertTriangle}
            label="Late Arrivals"
            value={lateDays}
            sub={lateDays === 0 ? 'Perfect punctuality!' : 'this month'}
            color={lateDays > 0 ? '#D97706' : '#16A34A'}
            bg={lateDays > 0 ? '#FFFBEB' : '#F0FDF4'}
          />
          <StatCard
            icon={Zap}
            label="Overtime Days"
            value={logs.filter(l => l.is_overtime && l.attendance_date.startsWith(monthStr)).length}
            sub="beyond end time"
            color="#7C3AED" bg="#F5F3FF"
          />
        </div>
      </div>

      {/* ── History Table ── */}
      <div style={{
        background: '#fff', borderRadius: 14,
        border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        overflow: 'hidden',
      }}>
        {/* Table header bar */}
        <div style={{
          padding: '14px 20px',
          borderBottom: '1px solid #F1F5F9',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#0F172A' }}>Attendance History</div>
            <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>Last 30 records</div>
          </div>

          {/* Filter tabs */}
          <div style={{
            display: 'flex', gap: 4, background: '#F8FAFC',
            border: '1px solid #E2E8F0', borderRadius: 8, padding: 3,
          }}>
            {(['all', 'late', 'overtime'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                height: 28, padding: '0 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 600, textTransform: 'capitalize', transition: 'all 0.15s',
                background: filter === f ? '#fff' : 'transparent',
                color: filter === f ? '#2563EB' : '#64748B',
                boxShadow: filter === f ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}>{f}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: '#94A3B8' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <div className="spinner-blue" style={{ width: 24, height: 24, borderRadius: '50%' }} />
            </div>
            <p style={{ fontSize: 13 }}>Loading records...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ padding: '56px 0', textAlign: 'center' }}>
            <Clock size={36} color="#E2E8F0" strokeWidth={1.2} style={{ marginBottom: 12, display: 'block', margin: '0 auto 12px' }} />
            <p style={{ fontWeight: 600, color: '#374151', fontSize: 14 }}>
              {filter === 'all' ? 'No attendance records yet' : `No ${filter} records found`}
            </p>
            <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>
              {filter === 'all' ? 'Clock in above to start tracking your attendance.' : 'Try changing the filter above.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  {[
                    ['Date', '180px'],
                    ['Status', '130px'],
                    ['Clock In', '120px'],
                    ['Clock Out', '120px'],
                    ['Duration', '110px'],
                    ['Overtime', '100px'],
                    ['Flags', '120px'],
                  ].map(([h, w]) => (
                    <th key={h} style={{
                      padding: '10px 16px', textAlign: 'left', width: w,
                      fontSize: 11, fontWeight: 700, color: '#64748B',
                      textTransform: 'uppercase', letterSpacing: 0.7,
                      borderBottom: '1px solid #E2E8F0', whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log, idx) => {
                  const cfg = STATUS_CFG[log.status] || { label: log.status, color: '#64748B', bg: '#F8FAFC', border: '#E2E8F0' }
                  const isToday = log.attendance_date === today
                  return (
                    <tr key={log.id}
                      style={{
                        borderBottom: '1px solid #F8FAFC',
                        background: isToday ? '#FAFBFF' : idx % 2 === 0 ? '#fff' : '#FAFAFA',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = '#F1F5FF'}
                      onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = isToday ? '#FAFBFF' : idx % 2 === 0 ? '#fff' : '#FAFAFA'}
                    >
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {isToday && (
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#2563EB', flexShrink: 0 }} />
                          )}
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13, color: '#0F172A' }}>
                              {isToday ? 'Today' : fmtDate(log.attendance_date)}
                            </div>
                            <div style={{ fontSize: 11, color: '#94A3B8' }}>{log.attendance_date}</div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '3px 9px', borderRadius: 5, fontSize: 11, fontWeight: 700,
                          background: cfg.bg, color: cfg.color,
                          border: `1px solid ${cfg.border}`,
                        }}>{cfg.label}</span>
                      </td>

                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: log.punch_in_at ? '#16A34A' : '#CBD5E1' }}>
                        {fmtTime(log.punch_in_at)}
                      </td>

                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: log.punch_out_at ? '#2563EB' : '#CBD5E1' }}>
                        {fmtTime(log.punch_out_at)}
                      </td>

                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#374151', fontWeight: 500 }}>
                        {log.net_duration_minutes > 0 ? fmtDur(log.net_duration_minutes) : <span style={{ color: '#CBD5E1' }}>—</span>}
                      </td>

                      <td style={{ padding: '12px 16px', fontSize: 13 }}>
                        {log.overtime_minutes > 0
                          ? <span style={{ color: '#7C3AED', fontWeight: 600 }}>+{fmtDur(log.overtime_minutes)}</span>
                          : <span style={{ color: '#CBD5E1' }}>—</span>
                        }
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 5 }}>
                          {log.is_late && (
                            <span style={{
                              display: 'flex', alignItems: 'center', gap: 3,
                              padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                              background: '#FFFBEB', color: '#D97706',
                              border: '1px solid #FCD34D',
                            }}>
                              <AlertTriangle size={9} strokeWidth={2.5} />
                              LATE
                            </span>
                          )}
                          {log.is_overtime && (
                            <span style={{
                              display: 'flex', alignItems: 'center', gap: 3,
                              padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                              background: '#F5F3FF', color: '#7C3AED',
                              border: '1px solid #C4B5FD',
                            }}>
                              <Timer size={9} strokeWidth={2.5} />
                              OT
                            </span>
                          )}
                          {!log.is_late && !log.is_overtime && log.punch_in_at && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#16A34A', fontWeight: 600 }}>
                              <CheckCircle2 size={12} strokeWidth={2} />
                              On Time
                            </span>
                          )}
                          {!log.punch_in_at && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#94A3B8' }}>
                              <XCircle size={12} strokeWidth={1.8} />
                              No record
                            </span>
                          )}
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

      <style>{`
        @keyframes ringPulse {
          0%   { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
