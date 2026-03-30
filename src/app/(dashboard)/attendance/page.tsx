'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'

interface AttLog {
  id: string
  attendance_date: string
  punch_in_at?: string
  punch_out_at?: string
  status: string
  is_late: boolean
  is_overtime: boolean
  net_duration_minutes: number
  overtime_minutes: number
}

function fmtTime(iso?: string | null) {
  if (!iso) return '--:--'
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}
function fmtDur(mins: number) {
  if (!mins) return '--'
  const h = Math.floor(mins / 60), m = mins % 60
  return h > 0 ? `${h}h ${m > 0 ? m + 'm' : ''}` : `${m}m`
}
function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  punched_in:   { label: 'Active', color: '#10b981', bg: '#f0fdf4' },
  on_break:     { label: 'On Break', color: '#f59e0b', bg: '#fffbeb' },
  punched_out:  { label: 'Complete', color: '#3b82f6', bg: '#eff6ff' },
  missed:       { label: 'Missed', color: '#ef4444', bg: '#fef2f2' },
  on_leave:     { label: 'On Leave', color: '#8b5cf6', bg: '#f5f3ff' },
}

export default function AttendancePage() {
  const [logs, setLogs] = useState<AttLog[]>([])
  const [todayLog, setTodayLog] = useState<AttLog | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [now, setNow] = useState(new Date())
  const [elapsed, setElapsed] = useState(0)
  const [filter, setFilter] = useState<'all' | 'late' | 'overtime'>('all')

  const today = new Date().toISOString().split('T')[0]

  const loadLogs = useCallback(async () => {
    const res = await fetch('/api/attendance?limit=30')
    const json = await res.json()
    if (json.data) {
      setLogs(json.data)
      const t = (json.data as AttLog[]).find(l => l.attendance_date === today) || null
      setTodayLog(t)
    }
    setLoading(false)
  }, [today])

  useEffect(() => { loadLogs() }, [loadLogs])

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Elapsed time counter
  useEffect(() => {
    if (!todayLog?.punch_in_at || todayLog.punch_out_at) return
    const calc = () => {
      const start = new Date(todayLog.punch_in_at!).getTime()
      setElapsed(Math.floor((Date.now() - start) / 60000))
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
      if (!res.ok) { toast.error(json.error); return }
      toast.success(action === 'clock_in' ? '✅ Clocked in successfully!' : '👋 Clocked out. Great work today!')
      await loadLogs()
    } finally { setActing(false) }
  }

  const clockedIn = !!todayLog?.punch_in_at
  const clockedOut = !!todayLog?.punch_out_at

  // Stats
  const thisMonth = logs.filter(l => l.attendance_date.startsWith(today.slice(0, 7)))
  const totalDays = thisMonth.length
  const lateDays = thisMonth.filter(l => l.is_late).length
  const totalHours = Math.floor(thisMonth.reduce((a, l) => a + (l.net_duration_minutes || 0), 0) / 60)
  const overtimeDays = thisMonth.filter(l => l.is_overtime).length

  const filteredLogs = filter === 'all' ? logs
    : filter === 'late' ? logs.filter(l => l.is_late)
    : logs.filter(l => l.is_overtime)

  // Degrees for clock ring
  const clockRingDeg = clockedIn && !clockedOut
    ? Math.min((elapsed / 480) * 360, 360)
    : 0

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' }}>Attendance</h1>
        <p style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>Track your work hours and attendance history</p>
      </div>

      {/* Top row: Clock widget + Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 16, marginBottom: 20 }}>

        {/* CLOCK WIDGET */}
        <div style={{
          background: 'linear-gradient(145deg, #0f172a, #1e1b4b)',
          borderRadius: 20, padding: 28,
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          border: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, background: 'rgba(79,70,229,0.1)', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', bottom: -20, left: -20, width: 80, height: 80, background: 'rgba(124,58,237,0.08)', borderRadius: '50%' }} />

          {/* Analog clock ring */}
          <div style={{ position: 'relative', width: 130, height: 130, marginBottom: 16 }}>
            <svg width="130" height="130" style={{ position: 'absolute', top: 0, left: 0 }}>
              {/* Background ring */}
              <circle cx="65" cy="65" r="56" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
              {/* Progress ring */}
              {clockedIn && !clockedOut && (
                <circle
                  cx="65" cy="65" r="56"
                  fill="none"
                  stroke="url(#clockGrad)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${(elapsed / 480) * 351.9} 351.9`}
                  transform="rotate(-90 65 65)"
                  style={{ transition: 'stroke-dasharray 0.5s ease' }}
                />
              )}
              {clockedOut && (
                <circle cx="65" cy="65" r="56" fill="none" stroke="#10b981" strokeWidth="6" />
              )}
              <defs>
                <linearGradient id="clockGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#4f46e5" />
                  <stop offset="100%" stopColor="#7c3aed" />
                </linearGradient>
              </defs>
            </svg>

            {/* Digital clock */}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 700, color: '#f1f5f9', letterSpacing: 1 }}>
                {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
              </div>
              {clockedIn && !clockedOut && (
                <div style={{ fontSize: 11, color: '#818cf8', marginTop: 2, fontWeight: 600 }}>
                  {fmtDur(elapsed)} elapsed
                </div>
              )}
            </div>
          </div>

          {/* Status badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 12px', borderRadius: 99, marginBottom: 16,
            background: clockedOut ? 'rgba(16,185,129,0.15)' : clockedIn ? 'rgba(79,70,229,0.2)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${clockedOut ? 'rgba(16,185,129,0.3)' : clockedIn ? 'rgba(79,70,229,0.4)' : 'rgba(255,255,255,0.1)'}`,
          }}>
            {!clockedOut && clockedIn && (
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4f46e5', position: 'relative', display: 'inline-block' }}>
                <span style={{ position: 'absolute', inset: -3, borderRadius: '50%', background: 'rgba(79,70,229,0.3)', animation: 'pulseRing 1.5s ease-out infinite' }} />
              </span>
            )}
            <span style={{ fontSize: 12, fontWeight: 600, color: clockedOut ? '#6ee7b7' : clockedIn ? '#c4b5fd' : '#64748b' }}>
              {clockedOut ? 'Shift Complete' : clockedIn ? 'On Duty' : 'Not Clocked In'}
            </span>
          </div>

          {/* Punch times */}
          {(clockedIn || clockedOut) && (
            <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: '#475569', fontWeight: 600, letterSpacing: 1 }}>IN</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: clockedIn ? '#a5b4fc' : '#334155', marginTop: 2 }}>{fmtTime(todayLog?.punch_in_at)}</div>
              </div>
              <div style={{ width: 1, background: 'rgba(255,255,255,0.08)' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: '#475569', fontWeight: 600, letterSpacing: 1 }}>OUT</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: clockedOut ? '#6ee7b7' : '#334155', marginTop: 2 }}>{fmtTime(todayLog?.punch_out_at)}</div>
              </div>
            </div>
          )}

          {/* Action button */}
          {!clockedOut && (
            <button
              onClick={() => clockAction(clockedIn ? 'clock_out' : 'clock_in')}
              disabled={acting}
              style={{
                width: '100%', height: 46, borderRadius: 12, border: 'none', cursor: acting ? 'not-allowed' : 'pointer',
                background: clockedIn
                  ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                  : 'linear-gradient(135deg, #10b981, #059669)',
                color: '#fff', fontSize: 14, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: clockedIn
                  ? '0 4px 16px rgba(239,68,68,0.4)'
                  : '0 4px 16px rgba(16,185,129,0.4)',
                transition: 'all 0.2s',
                opacity: acting ? 0.7 : 1,
              }}
            >
              {acting
                ? <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} /> Processing...</>
                : clockedIn
                  ? '🔴 Clock Out'
                  : '🟢 Clock In'
              }
            </button>
          )}
          {clockedOut && (
            <div style={{ width: '100%', height: 46, borderRadius: 12, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <span style={{ fontSize: 18 }}>✅</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#6ee7b7' }}>Great work today!</span>
            </div>
          )}
        </div>

        {/* Month stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 12 }}>
          {[
            { label: 'Days This Month', val: totalDays, icon: '📅', color: '#4f46e5', bg: '#eef2ff', sub: 'attendance records' },
            { label: 'Hours Worked', val: totalHours + 'h', icon: '⏱', color: '#0891b2', bg: '#f0f9ff', sub: 'net this month' },
            { label: 'Late Arrivals', val: lateDays, icon: '⚠', color: '#f59e0b', bg: '#fffbeb', sub: 'past threshold' },
            { label: 'Overtime Days', val: overtimeDays, icon: '🔥', color: '#ef4444', bg: '#fef2f2', sub: 'beyond end time' },
          ].map(s => (
            <div key={s.label} style={{
              background: '#fff', borderRadius: 14, padding: '18px 20px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9',
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{ width: 48, height: 48, background: s.bg, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em' }}>{s.val}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{s.label}</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>{s.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Attendance history */}
      <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Attendance History</h2>
            <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Last 30 records</p>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['all','late','overtime'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                background: filter === f ? '#4f46e5' : '#f8fafc',
                color: filter === f ? '#fff' : '#64748b',
                transition: 'all 0.2s', textTransform: 'capitalize',
              }}>{f}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ fontSize: 24, marginBottom: 8, animation: 'spin 1s linear infinite', display: 'inline-block' }}>⚙</div>
            <p>Loading attendance records...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
            <p style={{ fontWeight: 600, color: '#374151' }}>No records found</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>Clock in to start tracking your attendance</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Date','Status','Clock In','Clock Out','Duration','Flags'].map(h => (
                    <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, whiteSpace: 'nowrap', borderBottom: '1px solid #f1f5f9' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log, idx) => {
                  const meta = STATUS_META[log.status] || { label: log.status, color: '#64748b', bg: '#f8fafc' }
                  const isToday = log.attendance_date === today
                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid #f8fafc', background: isToday ? '#fafbff' : idx % 2 === 0 ? '#fff' : '#fafafa', transition: 'background 0.1s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = '#f1f5f9'}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = isToday ? '#fafbff' : idx % 2 === 0 ? '#fff' : '#fafafa'}
                    >
                      <td style={{ padding: '12px 20px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>
                          {isToday ? '📍 Today' : fmtDate(log.attendance_date)}
                        </div>
                      </td>
                      <td style={{ padding: '12px 20px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: meta.bg, color: meta.color }}>
                          {meta.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 20px', fontFamily: 'monospace', fontSize: 13, color: log.punch_in_at ? '#10b981' : '#cbd5e1', fontWeight: 600 }}>
                        {fmtTime(log.punch_in_at)}
                      </td>
                      <td style={{ padding: '12px 20px', fontFamily: 'monospace', fontSize: 13, color: log.punch_out_at ? '#3b82f6' : '#cbd5e1', fontWeight: 600 }}>
                        {fmtTime(log.punch_out_at)}
                      </td>
                      <td style={{ padding: '12px 20px', fontSize: 13, color: '#374151', fontWeight: 500 }}>
                        {log.net_duration_minutes > 0 ? fmtDur(log.net_duration_minutes) : '—'}
                      </td>
                      <td style={{ padding: '12px 20px' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {log.is_late && <span style={{ padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: '#fffbeb', color: '#d97706' }}>LATE</span>}
                          {log.is_overtime && <span style={{ padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: '#fef2f2', color: '#dc2626' }}>OT {fmtDur(log.overtime_minutes)}</span>}
                          {!log.is_late && !log.is_overtime && log.punch_in_at && <span style={{ fontSize: 12, color: '#10b981' }}>✓</span>}
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
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulseRing { 0% { transform: scale(0.8); opacity: 1; } 100% { transform: scale(2); opacity: 0; } }
      `}</style>
    </div>
  )
}
