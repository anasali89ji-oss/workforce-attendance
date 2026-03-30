import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

async function getData(tenantId: string, userId: string) {
  const today = new Date().toISOString().split('T')[0]
  const [{ count: total }, { data: logs }, { count: pending }, myLogResult] = await Promise.all([
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('is_active', true),
    supabaseAdmin.from('attendance_logs').select('status,is_late').eq('tenant_id', tenantId).eq('attendance_date', today),
    supabaseAdmin.from('leave_requests').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'pending'),
    supabaseAdmin.from('attendance_logs').select('punch_in_at,punch_out_at,status,is_late,net_duration_minutes').eq('user_id', userId).eq('attendance_date', today).maybeSingle(),
  ])
  const myLog = myLogResult.data
  const present = logs?.filter(l => ['punched_in','punched_out','on_break'].includes(l.status)).length || 0
  const late = logs?.filter(l => l.is_late).length || 0
  const onLeave = logs?.filter(l => l.status === 'on_leave').length || 0
  return {
    total: total || 0, present, late, onLeave,
    absent: Math.max(0, (total || 0) - present - onLeave),
    pendingLeaves: pending || 0,
    attendanceRate: total ? Math.round((present / (total || 1)) * 100) : 0,
    myLog,
  }
}

function fmtTime(iso?: string | null) {
  if (!iso) return '--:--'
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'
}

function fmtDuration(minutes?: number | null) {
  if (!minutes) return '--'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user) return null
  const d = await getData(user.tenant_id, user.id)
  const firstName = user.first_name || user.full_name.split(' ')[0]
  const myLog = d.myLog as { punch_in_at?: string; punch_out_at?: string; is_late?: boolean; net_duration_minutes?: number } | null
  const clockedIn = !!myLog?.punch_in_at
  const clockedOut = !!myLog?.punch_out_at

  const stats = [
    { label: 'Total Employees', val: d.total, color: '#3b82f6', bg: '#eff6ff', icon: '👥', sub: 'active' },
    { label: 'Present Today', val: d.present, color: '#10b981', bg: '#f0fdf4', icon: '✅', sub: 'on site' },
    { label: 'Absent', val: d.absent, color: '#ef4444', bg: '#fef2f2', icon: '⊘', sub: 'not checked in' },
    { label: 'Late Arrivals', val: d.late, color: '#f59e0b', bg: '#fffbeb', icon: '⏱', sub: 'past threshold' },
    { label: 'On Leave', val: d.onLeave, color: '#8b5cf6', bg: '#f5f3ff', icon: '✈', sub: 'approved' },
    { label: 'Pending Leaves', val: d.pendingLeaves, color: '#f97316', bg: '#fff7ed', icon: '📋', sub: 'awaiting review' },
  ]

  return (
    <div style={{ maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' }}>
          Good {greeting()}, {firstName}! 👋
        </h1>
        <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          {' · '}{user.tenant?.name}
        </p>
      </div>

      {/* Clock-in hero */}
      <div style={{
        background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #6d28d9 100%)',
        borderRadius: 20, padding: '24px 28px', marginBottom: 24,
        boxShadow: '0 8px 32px rgba(79,70,229,0.3)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -40, top: -40, width: 200, height: 200, background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', right: 40, bottom: -60, width: 160, height: 160, background: 'rgba(255,255,255,0.04)', borderRadius: '50%' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
              {!clockedIn ? "Ready to start your day?" : clockedOut ? '✓ Shift complete for today' : `On duty — clocked in at ${fmtTime(myLog?.punch_in_at)}`}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>
              {clockedOut
                ? `Clocked out at ${fmtTime(myLog?.punch_out_at)} · Total: ${fmtDuration(myLog?.net_duration_minutes)}`
                : clockedIn
                  ? myLog?.is_late ? '⚠ Marked as late arrival' : '✓ On time'
                  : 'Click the button to clock in and start tracking'
              }
            </div>
          </div>
          {!clockedOut && (
            <a href="/attendance" style={{
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.25)',
              color: '#fff', padding: '12px 24px', borderRadius: 12,
              textDecoration: 'none', fontSize: 14, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 8,
              transition: 'all 0.2s', whiteSpace: 'nowrap',
            }}>
              {clockedIn ? '🔴 Clock Out' : '🟢 Clock In'}
            </a>
          )}
        </div>

        {clockedIn && (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1,
            marginTop: 20, paddingTop: 20,
            borderTop: '1px solid rgba(255,255,255,0.12)',
          }}>
            {[
              { label: 'CLOCK IN', value: fmtTime(myLog?.punch_in_at) },
              { label: 'CLOCK OUT', value: fmtTime(myLog?.punch_out_at) },
              { label: 'DURATION', value: fmtDuration(myLog?.net_duration_minutes) },
            ].map(item => (
              <div key={item.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: 1.5, fontWeight: 600 }}>{item.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginTop: 4 }}>{item.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(168px,1fr))', gap: 14, marginBottom: 24 }}>
        {stats.map(s => (
          <div key={s.label} style={{
            background: '#fff', borderRadius: 14, padding: '16px 18px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9',
            transition: 'all 0.2s', cursor: 'default',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)' }}
          >
            <div style={{ width: 38, height: 38, background: s.bg, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 12 }}>
              {s.icon}
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em' }}>{s.val}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginTop: 2 }}>{s.label}</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Attendance rate */}
      <div style={{ background: '#fff', borderRadius: 16, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 15 }}>Today&apos;s Attendance Rate</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{d.present} present out of {d.total} employees</div>
          </div>
          <div style={{
            fontSize: 32, fontWeight: 800, color: d.attendanceRate >= 80 ? '#10b981' : d.attendanceRate >= 60 ? '#f59e0b' : '#ef4444',
            letterSpacing: '-0.03em',
          }}>{d.attendanceRate}%</div>
        </div>
        <div style={{ height: 10, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{
            height: 10, borderRadius: 99, transition: 'width 0.8s ease',
            width: `${d.attendanceRate}%`,
            background: d.attendanceRate >= 80
              ? 'linear-gradient(90deg, #10b981, #059669)'
              : d.attendanceRate >= 60
                ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                : 'linear-gradient(90deg, #ef4444, #dc2626)',
          }} />
        </div>
        <div style={{ display: 'flex', gap: 20, marginTop: 12, flexWrap: 'wrap' }}>
          {[
            { label: 'Present', val: d.present, color: '#10b981' },
            { label: 'Absent', val: d.absent, color: '#ef4444' },
            { label: 'Late', val: d.late, color: '#f59e0b' },
            { label: 'On Leave', val: d.onLeave, color: '#8b5cf6' },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} />
              <span style={{ fontSize: 12, color: '#64748b' }}>{item.label}: <strong style={{ color: '#0f172a' }}>{item.val}</strong></span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
