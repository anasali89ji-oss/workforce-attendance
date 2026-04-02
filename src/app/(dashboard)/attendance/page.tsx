'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import {
  Clock, LogIn, LogOut, Calendar, Filter, Download,
  CheckCircle2, AlertTriangle, XCircle, Coffee, RefreshCw,
  ChevronLeft, ChevronRight, TrendingUp, Timer, Zap,
  MessageSquare, AlertCircle, Play
} from 'lucide-react'

interface AttLog {
  id: string; attendance_date: string
  punch_in_at?: string | null; punch_out_at?: string | null
  status: string; is_late: boolean; is_overtime: boolean
  net_duration_minutes: number; overtime_minutes: number
  punch_in_note?: string | null; punch_out_note?: string | null; notes?: string | null
}

type ViewMode = 'table' | 'calendar'
type FilterStatus = 'all' | 'punched_in' | 'punched_out' | 'missed' | 'late'

// ──────────────────────────────────────────
// Reason / Confirm Popup
// ──────────────────────────────────────────
interface ReasonModalProps {
  open: boolean
  title: string
  subtitle: string
  iconBg: string
  iconColor: string
  IconComp: React.FC<{size?:number;strokeWidth?:number;color?:string}>
  confirmLabel: string
  confirmBg: string
  onConfirm: (reason: string) => void
  onCancel: () => void
  reasonRequired?: boolean
  loading?: boolean
}

function ReasonModal({ open, title, subtitle, iconBg, iconColor, IconComp, confirmLabel, confirmBg, onConfirm, onCancel, reasonRequired, loading }: ReasonModalProps) {
  const [reason, setReason] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) { setReason(''); setTimeout(() => ref.current?.focus(), 100) }
  }, [open])

  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [open, onCancel])

  if (!open) return null
  const canSubmit = !loading && (!reasonRequired || reason.trim().length > 0)

  return (
    <div
      style={{ position:'fixed', inset:0, zIndex:400, background:'rgba(2,6,23,0.7)', backdropFilter:'blur(10px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div style={{ background:'var(--surface)', borderRadius:22, border:'1px solid var(--border)', boxShadow:'0 32px 80px rgba(0,0,0,0.35)', width:'100%', maxWidth:420, overflow:'hidden', isolation:'isolate' }}>
        {/* Header */}
        <div style={{ padding:'28px 28px 0', display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', gap:12 }}>
          <div style={{ width:58, height:58, borderRadius:16, background:iconBg, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <IconComp size={26} color={iconColor} strokeWidth={1.8} />
          </div>
          <div>
            <div style={{ fontSize:17, fontWeight:800, color:'var(--text)', letterSpacing:'-0.025em', marginBottom:6 }}>{title}</div>
            <div style={{ fontSize:13, color:'var(--text-3)', lineHeight:1.6, maxWidth:340 }}>{subtitle}</div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding:'20px 28px 24px' }}>
          <label style={{ display:'block', fontSize:11, fontWeight:700, color:'var(--text-3)', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.08em' }}>
            {reasonRequired ? 'Reason *' : 'Add a note (optional)'}
          </label>
          <textarea
            ref={ref}
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder={reasonRequired ? 'Please explain the reason…' : 'Any notes about this session…'}
            rows={3}
            style={{ width:'100%', padding:'12px 14px', borderRadius:12, border:'1.5px solid var(--border-strong)', background:'var(--surface-2)', color:'var(--text)', fontSize:13, resize:'none', outline:'none', fontFamily:'inherit', lineHeight:1.5, boxSizing:'border-box', transition:'border-color 0.15s' }}
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--brand-500)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
          />
          <div style={{ display:'flex', gap:10, marginTop:14 }}>
            <button
              onClick={onCancel}
              disabled={loading}
              style={{ flex:1, height:44, borderRadius:12, border:'1px solid var(--border-strong)', background:'var(--surface-2)', color:'var(--text-2)', fontSize:13, fontWeight:600, cursor:'pointer' }}
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(reason.trim())}
              disabled={!canSubmit}
              style={{ flex:1, height:44, borderRadius:12, border:'none', background:confirmBg, color:'#fff', fontSize:13, fontWeight:700, cursor:canSubmit?'pointer':'not-allowed', opacity:canSubmit?1:0.55, display:'flex', alignItems:'center', justifyContent:'center', gap:6, transition:'opacity 0.15s' }}
            >
              {loading
                ? <><span style={{ width:13, height:13, border:'2px solid rgba(255,255,255,0.35)', borderTopColor:'#fff', borderRadius:'50%', animation:'att-spin 0.7s linear infinite', display:'inline-block' }} />Working…</>
                : confirmLabel
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────
const STATUS_CFG: Record<string, { label:string; cls:string; Icon:React.FC<{size?:number;strokeWidth?:number;color?:string}> }> = {
  punched_in:  { label:'Active',   cls:'status-present',  Icon:CheckCircle2 },
  on_break:    { label:'On Break', cls:'status-pending',  Icon:Coffee },
  punched_out: { label:'Complete', cls:'status-approved', Icon:CheckCircle2 },
  missed:      { label:'Missed',   cls:'status-absent',   Icon:XCircle },
  on_leave:    { label:'On Leave', cls:'status-on-leave', Icon:Calendar },
}

function fmtTime(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' })
}
function fmtDur(mins: number) {
  if (!mins) return '—'
  const h = Math.floor(mins/60), m = mins%60
  return h > 0 ? `${h}h${m>0?' '+m+'m':''}` : `${m}m`
}
function fmtDate(d: string) {
  return new Date(d+'T00:00:00').toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' })
}

const DAY_COLORS: Record<string, string> = {
  punched_out:'#d1fae5', punched_in:'#bfdbfe', missed:'#fee2e2',
  on_leave:'#ede9fe', on_break:'#fef3c7',
}

// ──────────────────────────────────────────
// Page
// ──────────────────────────────────────────
export default function AttendancePage() {
  const [logs, setLogs]           = useState<AttLog[]>([])
  const [todayLog, setTodayLog]   = useState<AttLog | null>(null)
  const [loading, setLoading]     = useState(true)
  const [acting, setActing]       = useState(false)
  const [view, setView]           = useState<ViewMode>('table')
  const [filter, setFilter]       = useState<FilterStatus>('all')
  const [mounted, setMounted]     = useState(false)
  const [timeStr, setTimeStr]     = useState('--:--:--')
  const [elapsed, setElapsed]     = useState(0)
  const [calMonth, setCalMonth]   = useState(new Date())
  const [onBreak, setOnBreak]     = useState(false)

  // Popups
  const [showOutModal, setShowOutModal]   = useState(false)
  const [showLateModal, setShowLateModal] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    setMounted(true)
    const tick = () => setTimeStr(new Date().toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false }))
    tick(); const t = setInterval(tick, 1000); return () => clearInterval(t)
  }, [])

  const loadLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/attendance?limit=90')
      if (!res.ok) { toast.error('Failed to load attendance'); return }
      const json = await res.json()
      if (json.data) {
        setLogs(json.data)
        const tLog = (json.data as AttLog[]).find(l => l.attendance_date === today) || null
        setTodayLog(tLog)
        setOnBreak(tLog?.status === 'on_break')
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

  const isLateNow = () => {
    const now = new Date()
    const cutoff = new Date(); cutoff.setHours(9, 15, 0, 0)
    return now > cutoff
  }

  const handlePrimaryClick = () => {
    if (clockedIn) { setShowOutModal(true) }
    else { isLateNow() ? setShowLateModal(true) : doAction('clock_in', '') }
  }

  const doAction = async (action: string, note: string) => {
    setActing(true)
    try {
      const res = await fetch('/api/attendance', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ action, note: note || undefined }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error || 'Error'); return }
      setTodayLog(json.data)
      setLogs(prev => { const i = prev.findIndex(l => l.attendance_date === today); return i>=0 ? prev.map((l,idx)=>idx===i?json.data:l) : [json.data,...prev] })
      if (action==='clock_in')   toast.success('Clocked in — have a great shift! 🎯')
      if (action==='clock_out')  toast.success('Clocked out — well done today! ✅')
      if (action==='start_break') { setOnBreak(true); toast.success('Break started ☕') }
      if (action==='end_break')   { setOnBreak(false); toast.success('Break ended — back to it! 💪') }
    } finally {
      setActing(false); setShowOutModal(false); setShowLateModal(false)
    }
  }

  const handleBreak = async () => {
    setActing(true)
    const action = onBreak ? 'end_break' : 'start_break'
    try {
      const res = await fetch('/api/attendance', {
        method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ action }),
      })
      if (!res.ok) {
        // Optimistic fallback if break endpoint not wired
        setOnBreak(v => !v)
        toast.success(onBreak ? 'Break ended — back to it! 💪' : 'Break started ☕')
        return
      }
      const json = await res.json()
      if (json.data) { setTodayLog(json.data); setOnBreak(json.data.status === 'on_break') }
      toast.success(onBreak ? 'Break ended 💪' : 'Break started ☕')
    } finally { setActing(false) }
  }

  const clockedIn  = !!todayLog?.punch_in_at
  const clockedOut = !!todayLog?.punch_out_at

  // ── Stats
  const monthStr  = today.slice(0,7)
  const monthLogs = logs.filter(l => l.attendance_date.startsWith(monthStr))
  const stats = {
    present:    monthLogs.filter(l => ['punched_in','punched_out','on_break'].includes(l.status)).length,
    late:       monthLogs.filter(l => l.is_late).length,
    absent:     monthLogs.filter(l => l.status==='missed').length,
    totalHours: Math.floor(monthLogs.reduce((a,l)=>a+(l.net_duration_minutes||0),0)/60),
    overtime:   Math.floor(monthLogs.reduce((a,l)=>a+(l.overtime_minutes||0),0)/60),
  }

  const RING_R = 54, RING_C = 2*Math.PI*RING_R
  const ringFill = Math.min(1, elapsed/480) * RING_C

  const filtered = filter==='all' ? logs : filter==='late' ? logs.filter(l=>l.is_late) : logs.filter(l=>l.status===filter)

  // Calendar
  const calDays = () => {
    const y=calMonth.getFullYear(), m=calMonth.getMonth()
    const first=new Date(y,m,1).getDay(), last=new Date(y,m+1,0).getDate()
    const days=[]
    for(let i=0;i<first;i++) days.push(null)
    for(let d=1;d<=last;d++) days.push(d)
    return days
  }
  const logByDate = (d:number) => {
    const key=`${calMonth.getFullYear()}-${String(calMonth.getMonth()+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
    return logs.find(l=>l.attendance_date===key)
  }

  const exportCSV = () => {
    const rows=[['Date','Status','Clock In','Clock Out','Duration','Late','Overtime','Note']]
    logs.forEach(l=>rows.push([l.attendance_date,l.status,fmtTime(l.punch_in_at),fmtTime(l.punch_out_at),fmtDur(l.net_duration_minutes),l.is_late?'Yes':'No',fmtDur(l.overtime_minutes),(l.notes||'')])) 
    const blob=new Blob([rows.map(r=>r.join(',')).join('\n')],{type:'text/csv'})
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='attendance.csv';a.click()
    toast.success('Exported to CSV')
  }

  // Derived display values
  const statusLabel  = clockedOut?'Shift Complete':onBreak?'On Break':clockedIn?'On Duty':'Not Clocked In'
  const statusColor  = clockedOut?'#6ee7b7':onBreak?'#fcd34d':clockedIn?'#c4b5fd':'#475569'
  const statusBg     = clockedOut?'rgba(16,185,129,0.15)':onBreak?'rgba(245,158,11,0.15)':clockedIn?'rgba(99,102,241,0.18)':'rgba(255,255,255,0.06)'
  const statusBorder = clockedOut?'rgba(16,185,129,0.3)':onBreak?'rgba(245,158,11,0.3)':clockedIn?'rgba(99,102,241,0.3)':'rgba(255,255,255,0.1)'

  return (
    <div className="page anim-fade-up">

      {/* ── Hero row: clock + stats ── */}
      <div style={{ display:'grid', gridTemplateColumns:'300px 1fr', gap:16, marginBottom:22 }}>

        {/* Clock Widget */}
        <div style={{
          background:'linear-gradient(160deg,#0d1235 0%,#18103c 55%,#0a0f1e 100%)',
          borderRadius:22, padding:'24px 18px 20px',
          border:'1px solid rgba(255,255,255,0.07)',
          boxShadow:'0 16px 48px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
          display:'flex', flexDirection:'column', alignItems:'center',
          position:'relative', overflow:'hidden',
        }}>
          <div style={{ position:'absolute', top:-60, right:-60, width:200, height:200, background:'radial-gradient(circle,rgba(99,102,241,0.14) 0%,transparent 70%)', pointerEvents:'none' }} />
          <div style={{ position:'absolute', bottom:-40, left:-40, width:160, height:160, background:'radial-gradient(circle,rgba(124,58,237,0.09) 0%,transparent 70%)', pointerEvents:'none' }} />

          {/* Ring */}
          <div style={{ position:'relative', width:128, height:128, marginBottom:12 }}>
            <svg width="128" height="128" style={{ position:'absolute', top:0, left:0, transform:'rotate(-90deg)' }}>
              <circle cx="64" cy="64" r={RING_R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
              {onBreak && !clockedOut && <circle cx="64" cy="64" r={RING_R} fill="none" stroke="#f59e0b" strokeWidth="6" strokeDasharray={`${RING_C*0.55} ${RING_C}`} strokeLinecap="round" style={{opacity:0.75}} />}
              {clockedIn && !clockedOut && !onBreak && mounted && (
                <circle cx="64" cy="64" r={RING_R} fill="none" stroke="url(#attGrad)" strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={`${ringFill} ${RING_C}`} style={{transition:'stroke-dasharray 1s ease'}} />
              )}
              {clockedOut && <circle cx="64" cy="64" r={RING_R} fill="none" stroke="#10b981" strokeWidth="6" />}
              <defs>
                <linearGradient id="attGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#4f46e5"/><stop offset="100%" stopColor="#7c3aed"/>
                </linearGradient>
              </defs>
            </svg>
            <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
              <div style={{ fontFamily:'"SF Mono","Fira Code",monospace', fontSize:mounted?15:14, fontWeight:700, color:'#f1f5f9', letterSpacing:1.5 }}>
                {mounted ? timeStr : '--:--:--'}
              </div>
              {clockedIn && !clockedOut && (
                <div style={{ fontSize:10, color:onBreak?'#fcd34d':'#818cf8', marginTop:3, fontWeight:600 }}>
                  {onBreak ? '☕ on break' : fmtDur(elapsed)+' elapsed'}
                </div>
              )}
            </div>
          </div>

          {/* Status pill */}
          <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:12, padding:'4px 14px', borderRadius:99, background:statusBg, border:`1px solid ${statusBorder}` }}>
            {clockedOut
              ? <CheckCircle2 size={11} color="#6ee7b7" strokeWidth={2.5}/>
              : onBreak
                ? <Coffee size={11} color="#fcd34d" strokeWidth={2.5}/>
                : clockedIn
                  ? <span style={{width:7,height:7,borderRadius:'50%',background:'#818cf8',display:'inline-block',position:'relative'}}><span style={{position:'absolute',inset:-3,borderRadius:'50%',background:'rgba(129,140,248,0.3)',animation:'att-ping 1.5s infinite'}}/></span>
                  : <Timer size={11} color="#475569" strokeWidth={1.8}/>
            }
            <span style={{ fontSize:11, fontWeight:700, color:statusColor, letterSpacing:'0.03em' }}>{statusLabel}</span>
          </div>

          {/* In/out times */}
          {clockedIn && (
            <div style={{ display:'flex', gap:18, marginBottom:14, justifyContent:'center' }}>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:9, color:'#4b5563', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:3 }}>IN</div>
                <div style={{ fontFamily:'"SF Mono",monospace', fontSize:16, fontWeight:800, color:'#86efac' }}>{fmtTime(todayLog?.punch_in_at)}</div>
                {todayLog?.is_late && <div style={{fontSize:10,color:'#fbbf24',marginTop:2,fontWeight:600}}>⚠ Late</div>}
              </div>
              {clockedOut && <>
                <div style={{width:1,background:'rgba(255,255,255,0.07)',alignSelf:'stretch'}}/>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:9, color:'#4b5563', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:3 }}>OUT</div>
                  <div style={{ fontFamily:'"SF Mono",monospace', fontSize:16, fontWeight:800, color:'#93c5fd' }}>{fmtTime(todayLog?.punch_out_at)}</div>
                  {todayLog?.net_duration_minutes ? <div style={{fontSize:10,color:'#6ee7b7',marginTop:2}}>{fmtDur(todayLog.net_duration_minutes)}</div>:null}
                </div>
              </>}
            </div>
          )}

          {/* Action buttons */}
          {!clockedOut ? (
            <div style={{ width:'100%', display:'flex', flexDirection:'column', gap:8 }}>
              <button
                onClick={handlePrimaryClick}
                disabled={acting}
                style={{
                  width:'100%', height:45, borderRadius:13, border:'none',
                  cursor:acting?'not-allowed':'pointer',
                  background:clockedIn?'linear-gradient(135deg,#dc2626,#b91c1c)':'linear-gradient(135deg,#059669,#047857)',
                  color:'#fff', fontSize:13, fontWeight:700,
                  display:'flex', alignItems:'center', justifyContent:'center', gap:7,
                  boxShadow:clockedIn?'0 4px 18px rgba(220,38,38,0.4)':'0 4px 18px rgba(5,150,105,0.4)',
                  opacity:acting?0.7:1, transition:'all 0.15s',
                }}
              >
                {acting&&!showOutModal&&!showLateModal
                  ? <span style={{width:14,height:14,border:'2px solid rgba(255,255,255,0.35)',borderTopColor:'#fff',borderRadius:'50%',animation:'att-spin 0.7s linear infinite',display:'inline-block'}}/>
                  : clockedIn
                    ? <><LogOut size={14} strokeWidth={2.5}/>Clock Out</>
                    : <><LogIn size={14} strokeWidth={2.5}/>Clock In</>
                }
              </button>

              {clockedIn && (
                <button
                  onClick={handleBreak}
                  disabled={acting}
                  style={{
                    width:'100%', height:38, borderRadius:11,
                    border:`1.5px solid ${onBreak?'rgba(245,158,11,0.45)':'rgba(255,255,255,0.1)'}`,
                    cursor:acting?'not-allowed':'pointer',
                    background:onBreak?'rgba(245,158,11,0.1)':'rgba(255,255,255,0.04)',
                    color:onBreak?'#fcd34d':'rgba(255,255,255,0.45)', fontSize:12, fontWeight:600,
                    display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                    opacity:acting?0.6:1, transition:'all 0.15s',
                  }}
                >
                  {onBreak ? <><Play size={11} strokeWidth={2.5}/>End Break</> : <><Coffee size={11} strokeWidth={2}/>Start Break</>}
                </button>
              )}
            </div>
          ) : (
            <div style={{ width:'100%', height:44, borderRadius:12, background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.2)', display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
              <CheckCircle2 size={14} color="#4ade80" strokeWidth={2}/>
              <span style={{ fontSize:12, fontWeight:600, color:'#4ade80' }}>
                {todayLog?.net_duration_minutes ? fmtDur(todayLog.net_duration_minutes)+' logged today' : 'Great work today!'}
              </span>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gridTemplateRows:'1fr 1fr', gap:12 }}>
          {[
            { label:'Days Present',   val:stats.present,        Icon:CheckCircle2, color:'#10b981', bg:'#d1fae5' },
            { label:'Total Hours',    val:stats.totalHours+'h', Icon:Clock,         color:'#4f46e5', bg:'#eef2ff' },
            { label:'Overtime',       val:stats.overtime+'h',   Icon:Zap,           color:'#8b5cf6', bg:'#ede9fe' },
            { label:'Late Arrivals',  val:stats.late,           Icon:AlertTriangle, color:stats.late>0?'#f59e0b':'#10b981',  bg:stats.late>0?'#fef3c7':'#d1fae5' },
            { label:'Missed Days',    val:stats.absent,         Icon:XCircle,       color:stats.absent>0?'#ef4444':'#10b981', bg:stats.absent>0?'#fee2e2':'#d1fae5' },
            { label:'Attendance Rate',val:monthLogs.length>0?Math.round((stats.present/monthLogs.length)*100)+'%':'—', Icon:TrendingUp, color:'#0891b2', bg:'#f0f9ff' },
          ].map(({ label, val, Icon, color, bg }) => (
            <div key={label} className="kpi-card" style={{ padding:'14px 16px', display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:38, height:38, borderRadius:10, background:bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Icon size={17} color={color} strokeWidth={1.8}/>
              </div>
              <div>
                <div style={{ fontSize:22, fontWeight:900, color:'var(--text)', letterSpacing:'-0.04em', lineHeight:1 }}>{val}</div>
                <div style={{ fontSize:11, color:'var(--text-3)', fontWeight:500, marginTop:3 }}>{label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="card" style={{ padding:'11px 16px', marginBottom:14, display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap' }}>
        <div style={{ display:'flex', gap:6 }}>
          {(['all','punched_out','missed','late'] as FilterStatus[]).map(f => (
            <button key={f} onClick={()=>setFilter(f)} style={{
              padding:'5px 12px', borderRadius:7, border:'1px solid', cursor:'pointer',
              fontSize:12, fontWeight:600, transition:'all 0.15s',
              background:filter===f?'var(--brand-600)':'var(--surface-2)',
              color:filter===f?'#fff':'var(--text-2)',
              borderColor:filter===f?'var(--brand-600)':'var(--border-strong)',
            }}>
              {f==='all'?'All':f==='punched_out'?'Complete':f==='missed'?'Missed':'Late'}
            </button>
          ))}
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <div style={{ display:'flex', background:'var(--surface-3)', borderRadius:9, padding:3, border:'1px solid var(--border)' }}>
            {(['table','calendar'] as ViewMode[]).map(v => (
              <button key={v} onClick={()=>setView(v)} style={{
                padding:'5px 11px', borderRadius:7, border:'none', cursor:'pointer',
                fontSize:12, fontWeight:600, transition:'all 0.15s',
                background:view===v?'var(--surface)':'transparent',
                color:view===v?'var(--text)':'var(--text-3)',
                boxShadow:view===v?'var(--shadow-xs)':'none', display:'flex', alignItems:'center', gap:5,
              }}>
                {v==='table'?<><Filter size={11}/>Table</>:<><Calendar size={11}/>Calendar</>}
              </button>
            ))}
          </div>
          <button onClick={loadLogs} className="btn btn-ghost btn-sm" style={{gap:5}}>
            <RefreshCw size={12} strokeWidth={2}/>Refresh
          </button>
          <button onClick={exportCSV} className="btn btn-secondary btn-sm" style={{gap:5}}>
            <Download size={12} strokeWidth={2}/>Export
          </button>
        </div>
      </div>

      {/* ── Table / Calendar ── */}
      {view==='table' ? (
        <div className="card" style={{overflow:'hidden'}}>
          <div style={{ padding:'13px 18px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>Attendance History</div>
            <div style={{ fontSize:12, color:'var(--text-3)', fontWeight:500 }}>{filtered.length} records</div>
          </div>
          {loading ? (
            <div style={{padding:48,textAlign:'center'}}><span className="spinner spinner-md" style={{borderTopColor:'var(--brand-500)'}}/></div>
          ) : filtered.length===0 ? (
            <div className="empty-state"><Clock size={38} strokeWidth={1.2}/><h3>No records</h3><p>Clock in to start tracking your attendance</p></div>
          ) : (
            <div style={{overflowX:'auto'}}>
              <table className="data-table">
                <thead>
                  <tr><th>Date</th><th>Status</th><th>In</th><th>Out</th><th>Duration</th><th>OT</th><th>Notes</th><th>Flags</th></tr>
                </thead>
                <tbody>
                  {filtered.map((log, idx) => {
                    const cfg = STATUS_CFG[log.status] || STATUS_CFG.punched_out
                    const isToday = log.attendance_date === today
                    return (
                      <tr key={log.id} style={{ background:isToday?'var(--brand-50)':idx%2===0?'transparent':'var(--surface-2)' }}>
                        <td>
                          <div style={{display:'flex',alignItems:'center',gap:8}}>
                            {isToday && <span style={{width:6,height:6,borderRadius:'50%',background:'var(--brand-500)',flexShrink:0}}/>}
                            <div>
                              <div style={{fontWeight:600,color:'var(--text)',fontSize:13}}>{isToday?'Today':fmtDate(log.attendance_date)}</div>
                              <div style={{fontSize:11,color:'var(--text-3)'}}>{log.attendance_date}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${cfg.cls}`} style={{display:'inline-flex',alignItems:'center',gap:4}}>
                            <cfg.Icon size={9} strokeWidth={2.5}/>{cfg.label}
                          </span>
                        </td>
                        <td style={{fontFamily:'"SF Mono",monospace',fontSize:13,fontWeight:600,color:log.punch_in_at?'#10b981':'var(--text-3)'}}>{fmtTime(log.punch_in_at)}</td>
                        <td style={{fontFamily:'"SF Mono",monospace',fontSize:13,fontWeight:600,color:log.punch_out_at?'#3b82f6':'var(--text-3)'}}>{fmtTime(log.punch_out_at)}</td>
                        <td style={{fontSize:13,fontWeight:500,color:'var(--text-2)'}}>{fmtDur(log.net_duration_minutes)}</td>
                        <td>
                          {log.overtime_minutes>0
                            ? <span style={{color:'#8b5cf6',fontWeight:600,fontSize:12}}>+{fmtDur(log.overtime_minutes)}</span>
                            : <span style={{color:'var(--text-3)'}}>—</span>}
                        </td>
                        <td>
                          {log.notes ? (
                            <span title={log.notes} style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:11,color:'var(--text-3)',cursor:'help'}}>
                              <MessageSquare size={11} strokeWidth={2}/>
                              <span style={{maxWidth:110,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                                {log.notes}
                              </span>
                            </span>
                          ) : <span style={{color:'var(--text-3)'}}>—</span>}
                        </td>
                        <td>
                          <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                            {log.is_late && <span className="badge badge-warning" style={{gap:3,fontSize:10}}><AlertTriangle size={9} strokeWidth={2.5}/>Late</span>}
                            {log.is_overtime && <span className="badge badge-purple" style={{gap:3,fontSize:10}}><Zap size={9} strokeWidth={2.5}/>OT</span>}
                            {!log.is_late&&!log.is_overtime&&log.punch_in_at && <span style={{color:'#10b981',fontSize:12}}>✓</span>}
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
        <div className="card" style={{padding:'20px 24px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
            <button onClick={()=>setCalMonth(m=>{const n=new Date(m);n.setMonth(n.getMonth()-1);return n})} className="btn btn-ghost btn-sm"><ChevronLeft size={14} strokeWidth={2}/></button>
            <div style={{fontSize:15,fontWeight:700,color:'var(--text)'}}>{calMonth.toLocaleDateString('en-US',{month:'long',year:'numeric'})}</div>
            <button onClick={()=>setCalMonth(m=>{const n=new Date(m);n.setMonth(n.getMonth()+1);return n})} className="btn btn-ghost btn-sm"><ChevronRight size={14} strokeWidth={2}/></button>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:4}}>
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>(
              <div key={d} style={{textAlign:'center',fontSize:10,fontWeight:700,color:'var(--text-3)',padding:'6px 0',textTransform:'uppercase',letterSpacing:0.5}}>{d}</div>
            ))}
            {calDays().map((day,i)=>{
              if(!day) return <div key={i}/>
              const log=logByDate(day)
              const isToday=day===new Date().getDate()&&calMonth.getMonth()===new Date().getMonth()&&calMonth.getFullYear()===new Date().getFullYear()
              const isWe=[0,6].includes(new Date(calMonth.getFullYear(),calMonth.getMonth(),day).getDay())
              return (
                <div key={day} title={log?`${log.status} · In:${fmtTime(log.punch_in_at)} Out:${fmtTime(log.punch_out_at)}`:undefined} style={{
                  aspectRatio:'1',borderRadius:10,background:log?DAY_COLORS[log.status]||'var(--surface-3)':isWe?'transparent':'var(--surface-2)',
                  display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,
                  fontWeight:isToday?800:500,color:isWe&&!log?'var(--text-3)':'var(--text)',
                  border:isToday?'2px solid var(--brand-500)':'1px solid transparent',
                  cursor:log?'pointer':'default',transition:'transform 0.15s',
                }} onMouseEnter={e=>{if(log)(e.currentTarget as HTMLDivElement).style.transform='scale(1.08)'}} onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.transform='scale(1)'}>{day}</div>
              )
            })}
          </div>
          <div style={{display:'flex',gap:14,marginTop:14,flexWrap:'wrap'}}>
            {Object.entries({punched_out:'Complete',punched_in:'Active',missed:'Missed',on_leave:'Leave',on_break:'Break'}).map(([k,label])=>(
              <div key={k} style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'var(--text-2)'}}>
                <span style={{width:12,height:12,borderRadius:3,background:DAY_COLORS[k],border:'1px solid rgba(0,0,0,0.1)',display:'inline-block'}}/>
                {label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Clock-out reason modal ── */}
      <ReasonModal
        open={showOutModal}
        title="Confirm Clock Out"
        subtitle="Add an optional note about your session. This will be saved with your attendance record."
        IconComp={LogOut}
        iconColor="#ef4444"
        iconBg="rgba(239,68,68,0.12)"
        confirmLabel="Clock Out"
        confirmBg="linear-gradient(135deg,#dc2626,#b91c1c)"
        onConfirm={note => doAction('clock_out', note)}
        onCancel={() => setShowOutModal(false)}
        loading={acting}
      />

      {/* ── Late arrival modal ── */}
      <ReasonModal
        open={showLateModal}
        title="Late Arrival Notice"
        subtitle="You're clocking in more than 15 minutes after your scheduled start time. A reason is required and will be recorded."
        IconComp={AlertCircle}
        iconColor="#f59e0b"
        iconBg="rgba(245,158,11,0.12)"
        confirmLabel="Clock In Anyway"
        confirmBg="linear-gradient(135deg,#059669,#047857)"
        onConfirm={note => doAction('clock_in', note)}
        onCancel={() => setShowLateModal(false)}
        reasonRequired
        loading={acting}
      />

      <style>{`
        @keyframes att-ping { 75%,100%{transform:scale(2.2);opacity:0} }
        @keyframes att-spin  { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  )
}
