'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Clock, LogIn, LogOut, Calendar, Download, CheckCircle2,
  AlertTriangle, XCircle, Coffee, RefreshCw, ChevronLeft,
  ChevronRight, TrendingUp, Timer, Zap, X, MessageSquare,
  Play, BarChart3, AlignLeft
} from 'lucide-react'

interface AttLog {
  id: string; attendance_date: string
  punch_in_at?: string | null; punch_out_at?: string | null
  status: string; is_late: boolean; is_overtime: boolean
  net_duration_minutes: number; overtime_minutes: number
  timesheet_note?: string | null
}
type ViewMode = 'table' | 'calendar'
type FilterStatus = 'all' | 'punched_out' | 'missed' | 'late'
type ModalType = 'late_reason' | 'clockout_reason' | 'break_reason' | null

function fmtTime(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}
function fmtDur(mins: number) {
  if (!mins || mins <= 0) return '—'
  const h = Math.floor(mins / 60), m = mins % 60
  return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ''}` : `${m}m`
}
function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}
function getLateMinutes(): number {
  const now = new Date()
  const workStart = new Date(); workStart.setHours(9, 15, 0, 0)
  return Math.max(0, Math.floor((now.getTime() - workStart.getTime()) / 60000))
}

const STATUS_CFG: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  punched_in:  { label: 'Active',    dot: '#10b981', text: '#065f46', bg: '#d1fae5' },
  on_break:    { label: 'On Break',  dot: '#f59e0b', text: '#92400e', bg: '#fef3c7' },
  punched_out: { label: 'Complete',  dot: '#3b82f6', text: '#1e40af', bg: '#dbeafe' },
  missed:      { label: 'Missed',    dot: '#ef4444', text: '#991b1b', bg: '#fee2e2' },
  on_leave:    { label: 'On Leave',  dot: '#8b5cf6', text: '#5b21b6', bg: '#ede9fe' },
}
const CAL_BG: Record<string, string> = {
  punched_out: '#d1fae5', punched_in: '#dbeafe', missed: '#fee2e2', on_leave: '#ede9fe', on_break: '#fef3c7',
}

// ── Reason Modal ──────────────────────────────────────────────
function ReasonModal({ type, lateMinutes = 0, onSubmit, onCancel, loading }: {
  type: ModalType; lateMinutes?: number
  onSubmit: (r: string) => void; onCancel: () => void; loading?: boolean
}) {
  const [reason, setReason] = useState('')
  const cfg = {
    late_reason:     { emoji: '⏰', title: `You're ${lateMinutes}min late`, subtitle: 'Add a note so your manager knows why. You can skip this.', placeholder: 'e.g. Traffic, doctor, family emergency…', btn: 'Clock In Anyway', btnColor: '#f59e0b', accent: '#fef3c7', border: '#fde68a' },
    clockout_reason: { emoji: '🏁', title: 'Confirm clock out', subtitle: 'Add an end-of-day note (optional) before you go.', placeholder: 'e.g. Completed sprint tasks, 2 meetings…', btn: 'Clock Out', btnColor: '#ef4444', accent: '#fef2f2', border: '#fecaca' },
    break_reason:    { emoji: '☕', title: 'Starting a break', subtitle: 'Your timer pauses. Click End Break to resume.', placeholder: 'e.g. Lunch, prayer, quick walk…', btn: 'Start Break', btnColor: '#f59e0b', accent: '#fffbeb', border: '#fde68a' },
  }[type!]!

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="modal-panel modal-sm">
        <div style={{ padding: '20px 22px 14px', background: cfg.accent, borderBottom: `1px solid ${cfg.border}`, flexShrink: 0, position: 'relative' }}>
          <button onClick={onCancel} style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.07)', border: 'none', cursor: 'pointer', width: 26, height: 26, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}><X size={13} strokeWidth={2.5} /></button>
          <div style={{ fontSize: 26, marginBottom: 8 }}>{cfg.emoji}</div>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', marginBottom: 5, letterSpacing: '-0.02em' }}>{cfg.title}</h2>
          <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>{cfg.subtitle}</p>
        </div>
        <div style={{ padding: '16px 22px', background: 'var(--surface)' }}>
          <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 7 }}>Note (optional)</label>
          <textarea autoFocus rows={3} value={reason} onChange={e => setReason(e.target.value)}
            placeholder={cfg.placeholder}
            onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') onSubmit(reason); if (e.key === 'Escape') onCancel() }}
            style={{ width: '100%', padding: '9px 11px', borderRadius: 9, border: '1.5px solid var(--border-strong)', background: 'var(--surface-2)', fontSize: 13, color: 'var(--text)', resize: 'none', outline: 'none', fontFamily: 'inherit', lineHeight: 1.5 }}
          />
          <p style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 5 }}>Ctrl+Enter to confirm</p>
        </div>
        <div style={{ padding: '12px 22px 18px', background: 'var(--surface)', borderTop: '1px solid var(--border)', display: 'flex', gap: 7, justifyContent: 'flex-end', flexShrink: 0 }}>
          <button onClick={() => onSubmit('')} style={{ padding: '7px 13px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', fontSize: 12, fontWeight: 600, color: 'var(--text-3)', cursor: 'pointer' }}>Skip</button>
          <button onClick={onCancel} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', fontSize: 12, fontWeight: 600, color: 'var(--text-2)', cursor: 'pointer' }}>Cancel</button>
          <button onClick={() => onSubmit(reason)} disabled={loading}
            style={{ padding: '7px 18px', borderRadius: 8, border: 'none', background: `linear-gradient(135deg, ${cfg.btnColor}, ${cfg.btnColor}cc)`, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, boxShadow: `0 3px 10px ${cfg.btnColor}40`, opacity: loading ? 0.7 : 1 }}>
            {loading ? <span className="spinner spinner-sm" style={{ borderTopColor: 'white' }} /> : <CheckCircle2 size={13} strokeWidth={2.5} />}
            {loading ? 'Saving…' : cfg.btn}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AttendancePage() {
  const [logs, setLogs]             = useState<AttLog[]>([])
  const [todayLog, setTodayLog]     = useState<AttLog | null>(null)
  const [loading, setLoading]       = useState(true)
  const [acting, setActing]         = useState(false)
  const [view, setView]             = useState<ViewMode>('table')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [mounted, setMounted]       = useState(false)
  const [timeStr, setTimeStr]       = useState('--:--:--')
  const [elapsed, setElapsed]       = useState(0)
  const [calMonth, setCalMonth]     = useState(new Date())
  const [modal, setModal]           = useState<ModalType>(null)
  const [pendingAction, setPendingAction] = useState<'clock_in' | 'clock_out' | 'break_start' | null>(null)

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    setMounted(true)
    const tick = () => setTimeStr(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }))
    tick(); const t = setInterval(tick, 1000); return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!todayLog?.punch_in_at || todayLog.punch_out_at) { setElapsed(0); return }
    const calc = () => setElapsed(Math.max(0, Math.floor((Date.now() - new Date(todayLog.punch_in_at!).getTime()) / 60000)))
    calc(); const t = setInterval(calc, 30000); return () => clearInterval(t)
  }, [todayLog])

  const loadLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/attendance?limit=90')
      if (!res.ok) { toast.error('Failed to load attendance'); return }
      const json = await res.json()
      if (json.data) { setLogs(json.data); setTodayLog((json.data as AttLog[]).find(l => l.attendance_date === today) || null) }
    } catch { toast.error('Network error') } finally { setLoading(false) }
  }, [today])

  useEffect(() => { loadLogs() }, [loadLogs])

  const initiateAction = (action: 'clock_in' | 'clock_out' | 'break_start') => {
    if (action === 'clock_in' && getLateMinutes() > 0) { setPendingAction('clock_in'); setModal('late_reason'); return }
    if (action === 'clock_out') { setPendingAction('clock_out'); setModal('clockout_reason'); return }
    if (action === 'break_start') { setPendingAction('break_start'); setModal('break_reason'); return }
    executeAction(action, '')
  }

  const executeAction = async (action: string, notes: string) => {
    setActing(true); setModal(null)
    try {
      const apiAction = action === 'break_end' ? 'clock_out' : action === 'break_start' ? 'clock_in' : action
      const res = await fetch('/api/attendance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: apiAction, notes: notes.trim() || undefined }) })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error || 'Action failed'); return }
      setTodayLog(json.data)
      setLogs(prev => { const i = prev.findIndex(l => l.attendance_date === today); return i >= 0 ? prev.map((l, idx) => idx === i ? json.data : l) : [json.data, ...prev] })
      const msgs: Record<string, string> = { clock_in: '✅ Clocked in!', clock_out: '🏁 Clocked out!', break_start: '☕ Break started!', break_end: '▶ Welcome back!' }
      toast.success(msgs[action] || 'Done')
    } finally { setActing(false); setPendingAction(null) }
  }

  const clockedIn  = !!todayLog?.punch_in_at
  const clockedOut = !!todayLog?.punch_out_at
  const onBreak    = todayLog?.status === 'on_break'

  const monthStr  = today.slice(0, 7)
  const monthLogs = logs.filter(l => l.attendance_date.startsWith(monthStr))
  const stats = {
    present:  monthLogs.filter(l => ['punched_in','punched_out','on_break'].includes(l.status)).length,
    late:     monthLogs.filter(l => l.is_late).length,
    absent:   monthLogs.filter(l => l.status === 'missed').length,
    totalH:   Math.floor(monthLogs.reduce((a,l) => a + (l.net_duration_minutes||0),0) / 60),
    overtimeH: Math.floor(monthLogs.reduce((a,l) => a + (l.overtime_minutes||0),0) / 60),
  }

  const RING_R = 52, RING_C = 2 * Math.PI * RING_R
  const ringFill = Math.min(1, elapsed / 480) * RING_C

  const filtered = logs.filter(l => filterStatus === 'all' ? true : filterStatus === 'late' ? l.is_late : l.status === filterStatus)

  function calDays() {
    const y = calMonth.getFullYear(), m = calMonth.getMonth()
    const cells: (number|null)[] = []
    for (let i = 0; i < new Date(y,m,1).getDay(); i++) cells.push(null)
    for (let d = 1; d <= new Date(y,m+1,0).getDate(); d++) cells.push(d)
    return cells
  }
  function logByDate(d: number) {
    const key = `${calMonth.getFullYear()}-${String(calMonth.getMonth()+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
    return logs.find(l => l.attendance_date === key)
  }
  function exportCSV() {
    const rows = [['Date','Status','Clock In','Clock Out','Duration','Late','OT','Note']]
    logs.forEach(l => rows.push([l.attendance_date, l.status, fmtTime(l.punch_in_at), fmtTime(l.punch_out_at), fmtDur(l.net_duration_minutes), l.is_late?'Yes':'No', fmtDur(l.overtime_minutes), l.timesheet_note||'']))
    const blob = new Blob([rows.map(r=>r.map(v=>`"${v}"`).join(',')).join('\n')],{type:'text/csv'})
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `attendance-${monthStr}.csv`; a.click()
    toast.success('CSV exported')
  }

  return (
    <div style={{ padding: '24px 28px', fontFamily: '"Inter",-apple-system,sans-serif' }}>

      {modal && (
        <ReasonModal type={modal} lateMinutes={getLateMinutes()} loading={acting}
          onCancel={() => { setModal(null); setPendingAction(null) }}
          onSubmit={reason => { if (pendingAction) executeAction(pendingAction, reason) }}
        />
      )}

      {/* Header */}
      <div style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.025em', marginBottom: 2 }}>Attendance</h1>
          <p style={{ fontSize: 12, color: 'var(--text-3)' }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div style={{ display: 'flex', gap: 7 }}>
          <button onClick={loadLogs} className="btn btn-ghost btn-sm" style={{ gap: 5 }}><RefreshCw size={12} strokeWidth={2} />Refresh</button>
          <button onClick={exportCSV} className="btn btn-secondary btn-sm" style={{ gap: 5 }}><Download size={12} strokeWidth={2} />Export</button>
        </div>
      </div>

      {/* Clock + Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 14, marginBottom: 14 }}>

        {/* Clock card */}
        <div style={{ background: 'linear-gradient(150deg,#0a0f1e,#1a1040,#0d1f3c)', borderRadius: 20, padding: '22px 20px', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 12px 40px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -50, right: -50, width: 160, height: 160, background: 'radial-gradient(circle,rgba(99,102,241,0.12),transparent 70%)', pointerEvents: 'none' }} />

          {/* Ring */}
          <div style={{ position: 'relative', width: 120, height: 120, marginBottom: 12 }}>
            <svg width="120" height="120" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
              <defs><linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#6366f1"/><stop offset="100%" stopColor="#a78bfa"/></linearGradient></defs>
              <circle cx="60" cy="60" r={RING_R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6"/>
              {clockedIn && !clockedOut && mounted && <circle cx="60" cy="60" r={RING_R} fill="none" stroke="url(#rg)" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${ringFill} ${RING_C}`} style={{transition:'stroke-dasharray 1s ease'}}/>}
              {clockedOut && <circle cx="60" cy="60" r={RING_R} fill="none" stroke="#10b981" strokeWidth="6"/>}
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 700, color: '#f1f5f9', letterSpacing: 1 }}>{mounted ? timeStr : '--:--:--'}</div>
              {clockedIn && !clockedOut && <div style={{ fontSize: 10, color: '#818cf8', marginTop: 2, fontWeight: 600 }}>{fmtDur(elapsed)} elapsed</div>}
            </div>
          </div>

          {/* Status pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, padding: '4px 12px', borderRadius: 99, background: clockedOut ? 'rgba(16,185,129,0.12)' : clockedIn ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${clockedOut ? 'rgba(16,185,129,0.25)' : clockedIn ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.07)'}` }}>
            {clockedOut ? <CheckCircle2 size={10} color="#4ade80" strokeWidth={2.5}/> : clockedIn ? <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#818cf8', boxShadow: '0 0 5px #818cf8', display: 'inline-block' }}/> : <Timer size={10} color="#475569" strokeWidth={2}/>}
            <span style={{ fontSize: 10, fontWeight: 700, color: clockedOut ? '#4ade80' : clockedIn ? '#c4b5fd' : '#475569', letterSpacing: 0.3 }}>{clockedOut ? 'Shift Complete' : clockedIn ? (onBreak ? 'On Break' : 'On Duty') : 'Not Clocked In'}</span>
          </div>

          {/* In/Out times */}
          {clockedIn && (
            <div style={{ display: 'flex', gap: 18, marginBottom: 14, justifyContent: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: '#475569', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2 }}>In</div>
                <div style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 800, color: '#86efac' }}>{fmtTime(todayLog?.punch_in_at)}</div>
                {todayLog?.is_late && <div style={{ fontSize: 9, color: '#fbbf24', fontWeight: 700 }}>⚠ Late</div>}
              </div>
              <div style={{ width: 1, background: 'rgba(255,255,255,0.06)', alignSelf: 'stretch' }}/>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: '#475569', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2 }}>Out</div>
                <div style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 800, color: clockedOut ? '#93c5fd' : '#1e293b' }}>{fmtTime(todayLog?.punch_out_at)}</div>
                {clockedOut && todayLog?.net_duration_minutes ? <div style={{ fontSize: 9, color: '#6ee7b7', fontWeight: 700 }}>{fmtDur(todayLog.net_duration_minutes)}</div> : null}
              </div>
            </div>
          )}

          {/* Note preview */}
          {todayLog?.timesheet_note && (
            <div style={{ width: '100%', padding: '7px 9px', borderRadius: 7, marginBottom: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'flex-start', gap: 5 }}>
              <AlignLeft size={10} color="#475569" strokeWidth={2} style={{ marginTop: 1, flexShrink: 0 }}/>
              <span style={{ fontSize: 10, color: '#94a3b8', lineHeight: 1.4, fontStyle: 'italic', wordBreak: 'break-word' }}>{todayLog.timesheet_note.length > 55 ? todayLog.timesheet_note.slice(0,55)+'…' : todayLog.timesheet_note}</span>
            </div>
          )}

          {/* Action buttons */}
          {clockedOut ? (
            <div style={{ width: '100%', height: 40, borderRadius: 10, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <CheckCircle2 size={13} color="#4ade80" strokeWidth={2}/>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#4ade80' }}>{todayLog?.net_duration_minutes ? fmtDur(todayLog.net_duration_minutes)+' logged' : 'Great work!'}</span>
            </div>
          ) : clockedIn ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
              {!onBreak ? (
                <button onClick={() => initiateAction('break_start')} disabled={acting} style={{ width: '100%', height: 36, borderRadius: 9, border: '1px solid rgba(245,158,11,0.3)', cursor: 'pointer', background: 'rgba(245,158,11,0.1)', color: '#fbbf24', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, transition: 'all 0.15s' }}>
                  <Coffee size={12} strokeWidth={2.5}/>Start Break
                </button>
              ) : (
                <button onClick={() => executeAction('break_end','')} disabled={acting} style={{ width: '100%', height: 36, borderRadius: 9, border: '1px solid rgba(16,185,129,0.3)', cursor: 'pointer', background: 'rgba(16,185,129,0.1)', color: '#4ade80', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                  <Play size={12} strokeWidth={2.5}/>End Break
                </button>
              )}
              <button onClick={() => initiateAction('clock_out')} disabled={acting} style={{ width: '100%', height: 42, borderRadius: 10, border: 'none', cursor: acting ? 'not-allowed' : 'pointer', background: 'linear-gradient(135deg,#dc2626,#b91c1c)', color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: '0 4px 14px rgba(220,38,38,0.35)', opacity: acting ? 0.7 : 1, transition: 'all 0.15s' }}>
                {acting ? <span className="spinner spinner-sm" style={{borderTopColor:'white'}}/> : <><LogOut size={13} strokeWidth={2.5}/>Clock Out</>}
              </button>
            </div>
          ) : (
            <button onClick={() => initiateAction('clock_in')} disabled={acting} style={{ width: '100%', height: 44, borderRadius: 11, border: 'none', cursor: acting ? 'not-allowed' : 'pointer', background: 'linear-gradient(135deg,#16a34a,#15803d)', color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, boxShadow: '0 4px 18px rgba(22,163,74,0.4)', opacity: acting ? 0.7 : 1, transition: 'all 0.15s' }}>
              {acting ? <span className="spinner spinner-sm" style={{borderTopColor:'white'}}/> : <><LogIn size={14} strokeWidth={2.5}/>Clock In</>}
            </button>
          )}
        </div>

        {/* KPI grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gridTemplateRows: 'repeat(2,1fr)', gap: 10 }}>
          {[
            { label: 'Days Present',   value: stats.present,                               Icon: CheckCircle2, color:'#10b981', bg:'#d1fae5' },
            { label: 'Total Hours',    value: stats.totalH+'h',                            Icon: Clock,        color:'#4f46e5', bg:'#eef2ff' },
            { label: 'Overtime',       value: stats.overtimeH+'h',                         Icon: Zap,          color:'#8b5cf6', bg:'#f5f3ff' },
            { label: 'Late Arrivals',  value: stats.late,                                  Icon: AlertTriangle,color: stats.late > 0 ? '#f59e0b':'#10b981', bg: stats.late > 0 ? '#fef3c7':'#d1fae5' },
            { label: 'Missed Days',    value: stats.absent,                                Icon: XCircle,      color: stats.absent > 0 ? '#ef4444':'#10b981', bg: stats.absent > 0 ? '#fee2e2':'#d1fae5' },
            { label: 'Attendance Rate',value: monthLogs.length ? Math.round(stats.present/monthLogs.length*100)+'%':'—', Icon: BarChart3, color:'#0891b2', bg:'#e0f2fe' },
          ].map(({ label, value, Icon, color, bg }) => (
            <div key={label} style={{ background:'var(--surface)', borderRadius:13, border:'1px solid var(--border)', padding:'13px 14px', display:'flex', alignItems:'center', gap:11, boxShadow:'var(--shadow-xs)', transition:'all 0.2s', cursor:'default' }}
              onMouseEnter={e=>{ const el=e.currentTarget; el.style.boxShadow='var(--shadow-md)'; el.style.transform='translateY(-1px)' }}
              onMouseLeave={e=>{ const el=e.currentTarget; el.style.boxShadow='var(--shadow-xs)'; el.style.transform='none' }}>
              <div style={{ width:36, height:36, borderRadius:9, background:bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Icon size={16} color={color} strokeWidth={1.8}/>
              </div>
              <div>
                <div style={{ fontSize:21, fontWeight:900, color:'var(--text)', letterSpacing:'-0.03em', lineHeight:1 }}>{value}</div>
                <div style={{ fontSize:10, color:'var(--text-3)', fontWeight:600, marginTop:2 }}>{label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:11, padding:'11px 14px', marginBottom:12, display:'flex', justifyContent:'space-between', alignItems:'center', gap:10, flexWrap:'wrap' }}>
        <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
          {([{id:'all',label:'All'},{id:'punched_out',label:'Complete'},{id:'missed',label:'Missed'},{id:'late',label:'Late'}] as {id:FilterStatus,label:string}[]).map(f=>(
            <button key={f.id} onClick={()=>setFilterStatus(f.id)} style={{ padding:'5px 11px', borderRadius:7, border:`1px solid ${filterStatus===f.id?'var(--brand-600)':'var(--border-strong)'}`, background:filterStatus===f.id?'var(--brand-600)':'var(--surface-2)', color:filterStatus===f.id?'#fff':'var(--text-2)', fontSize:12, fontWeight:600, cursor:'pointer', transition:'all 0.15s' }}>{f.label}</button>
          ))}
        </div>
        <div style={{ display:'flex', gap:7, alignItems:'center' }}>
          <div style={{ display:'flex', background:'var(--surface-2)', borderRadius:7, padding:3, border:'1px solid var(--border)' }}>
            {(['table','calendar'] as ViewMode[]).map(v=>(
              <button key={v} onClick={()=>setView(v)} style={{ padding:'4px 11px', borderRadius:5, border:'none', background:view===v?'var(--surface)':'transparent', color:view===v?'var(--text)':'var(--text-3)', fontSize:12, fontWeight:600, cursor:'pointer', boxShadow:view===v?'var(--shadow-xs)':'none', transition:'all 0.15s', display:'flex', alignItems:'center', gap:4 }}>
                {v==='table' ? <><AlignLeft size={11} strokeWidth={2}/>Table</> : <><Calendar size={11} strokeWidth={2}/>Calendar</>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table view */}
      {view === 'table' ? (
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:13, overflow:'hidden', boxShadow:'var(--shadow-xs)' }}>
          <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--text)', display:'flex', alignItems:'center', gap:6 }}><Clock size={13} color="var(--brand-500)" strokeWidth={2}/>Attendance History</div>
            <div style={{ fontSize:11, color:'var(--text-3)', background:'var(--surface-2)', padding:'3px 8px', borderRadius:5, fontWeight:600 }}>{filtered.length} records</div>
          </div>
          {loading ? (
            <div style={{ padding:48, display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
              <span className="spinner spinner-lg" style={{borderTopColor:'var(--brand-500)'}}/>
              <p style={{ fontSize:13, color:'var(--text-3)' }}>Loading…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding:56, textAlign:'center', color:'var(--text-3)' }}>
              <Clock size={36} strokeWidth={1} style={{opacity:0.18, margin:'0 auto 10px'}}/>
              <p style={{ fontSize:13, fontWeight:600, color:'var(--text-2)', marginBottom:5 }}>No records found</p>
              <p style={{ fontSize:12, maxWidth:240, margin:'0 auto', lineHeight:1.6 }}>Clock in to start tracking your daily attendance.</p>
            </div>
          ) : (
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead>
                  <tr>{['Date','Status','Clock In','Clock Out','Duration','OT','Flags','Note'].map(h=>(
                    <th key={h} style={{textAlign:'left',padding:'9px 14px',fontSize:10,fontWeight:800,color:'var(--text-3)',textTransform:'uppercase',letterSpacing:'0.07em',background:'var(--surface-2)',borderBottom:'1px solid var(--border)',whiteSpace:'nowrap'}}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {filtered.map((log) => {
                    const cfg = STATUS_CFG[log.status]
                    const isToday = log.attendance_date === today
                    return (
                      <tr key={log.id} style={{background: isToday ? 'rgba(99,102,241,0.03)' : 'transparent', borderLeft: isToday ? '3px solid var(--brand-500)' : '3px solid transparent', transition:'background 0.1s'}}
                        onMouseEnter={e=>{if(!isToday) e.currentTarget.style.background='var(--surface-2)'}}
                        onMouseLeave={e=>{if(!isToday) e.currentTarget.style.background='transparent'}}>
                        <td style={{padding:'10px 14px',borderBottom:'1px solid var(--border)'}}>
                          <div style={{fontSize:12,fontWeight:700,color:'var(--text)'}}>{isToday ? '📅 Today' : fmtDate(log.attendance_date)}</div>
                          <div style={{fontSize:10,color:'var(--text-3)',marginTop:1}}>{log.attendance_date}</div>
                        </td>
                        <td style={{padding:'10px 14px',borderBottom:'1px solid var(--border)'}}>
                          {cfg ? (
                            <span style={{display:'inline-flex',alignItems:'center',gap:5,padding:'2px 8px',borderRadius:99,fontSize:11,fontWeight:700,background:cfg.bg,color:cfg.text}}>
                              <span style={{width:5,height:5,borderRadius:'50%',background:cfg.dot,flexShrink:0}}/>
                              {cfg.label}
                            </span>
                          ) : <span style={{color:'var(--text-3)',fontSize:12}}>—</span>}
                        </td>
                        <td style={{padding:'10px 14px',borderBottom:'1px solid var(--border)',fontFamily:'monospace',fontSize:13,fontWeight:700,color:log.punch_in_at?'#059669':'var(--text-3)'}}>{fmtTime(log.punch_in_at)}</td>
                        <td style={{padding:'10px 14px',borderBottom:'1px solid var(--border)',fontFamily:'monospace',fontSize:13,fontWeight:700,color:log.punch_out_at?'#2563eb':'var(--text-3)'}}>{fmtTime(log.punch_out_at)}</td>
                        <td style={{padding:'10px 14px',borderBottom:'1px solid var(--border)',fontSize:13,fontWeight:600,color:'var(--text-2)'}}>{fmtDur(log.net_duration_minutes)}</td>
                        <td style={{padding:'10px 14px',borderBottom:'1px solid var(--border)'}}>
                          {log.overtime_minutes > 0 ? <span style={{color:'#7c3aed',fontSize:11,fontWeight:700}}>+{fmtDur(log.overtime_minutes)}</span> : <span style={{color:'var(--text-3)'}}>—</span>}
                        </td>
                        <td style={{padding:'10px 14px',borderBottom:'1px solid var(--border)'}}>
                          <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                            {log.is_late && <span style={{display:'inline-flex',alignItems:'center',gap:3,padding:'2px 6px',borderRadius:99,fontSize:10,fontWeight:700,background:'#fef3c7',color:'#92400e'}}><AlertTriangle size={8} strokeWidth={2.5}/>Late</span>}
                            {log.is_overtime && <span style={{display:'inline-flex',alignItems:'center',gap:3,padding:'2px 6px',borderRadius:99,fontSize:10,fontWeight:700,background:'#f5f3ff',color:'#5b21b6'}}><Zap size={8} strokeWidth={2.5}/>OT</span>}
                            {!log.is_late && !log.is_overtime && log.punch_in_at && <span style={{color:'#10b981',fontSize:13,fontWeight:700}}>✓</span>}
                          </div>
                        </td>
                        <td style={{padding:'10px 14px',borderBottom:'1px solid var(--border)',maxWidth:160}}>
                          {log.timesheet_note ? (
                            <span style={{fontSize:11,color:'var(--text-3)',fontStyle:'italic',display:'flex',alignItems:'center',gap:4}}>
                              <MessageSquare size={10} strokeWidth={1.8} style={{flexShrink:0}}/>
                              <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{log.timesheet_note}</span>
                            </span>
                          ) : <span style={{color:'var(--text-3)',fontSize:12}}>—</span>}
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
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:13, padding:'18px 20px', boxShadow:'var(--shadow-xs)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <button onClick={()=>setCalMonth(m=>{const n=new Date(m);n.setMonth(n.getMonth()-1);return n})} style={{width:30,height:30,borderRadius:7,border:'1px solid var(--border)',background:'var(--surface-2)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text-2)'}}><ChevronLeft size={13} strokeWidth={2}/></button>
            <div style={{fontSize:14,fontWeight:800,color:'var(--text)',letterSpacing:'-0.01em'}}>{calMonth.toLocaleDateString('en-US',{month:'long',year:'numeric'})}</div>
            <button onClick={()=>setCalMonth(m=>{const n=new Date(m);n.setMonth(n.getMonth()+1);return n})} style={{width:30,height:30,borderRadius:7,border:'1px solid var(--border)',background:'var(--surface-2)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text-2)'}}><ChevronRight size={13} strokeWidth={2}/></button>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:4}}>
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=><div key={d} style={{textAlign:'center',fontSize:9,fontWeight:800,color:'var(--text-3)',padding:'5px 0',textTransform:'uppercase',letterSpacing:0.8}}>{d}</div>)}
            {calDays().map((day,i)=>{
              if(!day) return <div key={i}/>
              const log = logByDate(day)
              const isToday = day===new Date().getDate() && calMonth.getMonth()===new Date().getMonth() && calMonth.getFullYear()===new Date().getFullYear()
              const isWeekend = [0,6].includes(new Date(calMonth.getFullYear(),calMonth.getMonth(),day).getDay())
              const bg = log ? CAL_BG[log.status]||'var(--surface-3)' : isWeekend ? 'transparent' : 'var(--surface-2)'
              return (
                <div key={day} title={log ? `${STATUS_CFG[log.status]?.label} · In: ${fmtTime(log.punch_in_at)} · Out: ${fmtTime(log.punch_out_at)}` : undefined}
                  style={{ aspectRatio:'1', borderRadius:9, background:bg, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:isToday?900:500, color:isWeekend&&!log?'var(--text-3)':'var(--text)', border:isToday?'2px solid var(--brand-500)':'1px solid transparent', cursor:log?'pointer':'default', transition:'transform 0.15s', position:'relative' }}
                  onMouseEnter={e=>{if(log)(e.currentTarget as HTMLDivElement).style.transform='scale(1.1)'}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.transform='scale(1)'}}>
                  {day}
                  {log?.is_late && <div style={{position:'absolute',top:2,right:2,width:5,height:5,borderRadius:'50%',background:'#f59e0b'}}/>}
                </div>
              )
            })}
          </div>
          <div style={{display:'flex',gap:12,marginTop:14,flexWrap:'wrap',paddingTop:12,borderTop:'1px solid var(--border)'}}>
            {[{key:'punched_out',label:'Complete'},{key:'punched_in',label:'Active'},{key:'missed',label:'Missed'},{key:'on_leave',label:'On Leave'}].map(({key,label})=>(
              <div key={key} style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:'var(--text-2)',fontWeight:500}}>
                <span style={{width:10,height:10,borderRadius:3,background:CAL_BG[key],border:'1px solid rgba(0,0,0,0.08)',display:'inline-block'}}/>
                {label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
