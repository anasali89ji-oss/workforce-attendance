import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import {
  Users, UserCheck, UserX, AlertTriangle, Plane, FileText,
  Clock, LogIn, LogOut, Activity
} from 'lucide-react'

async function getData(tenantId: string, userId: string) {
  const today = new Date().toISOString().split('T')[0]
  const [{ count: total }, { data: logs }, { count: pending }, myResult] = await Promise.all([
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('is_active', true),
    supabaseAdmin.from('attendance_logs').select('status,is_late,user_id').eq('tenant_id', tenantId).eq('attendance_date', today),
    supabaseAdmin.from('leave_requests').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'pending'),
    supabaseAdmin.from('attendance_logs').select('punch_in_at,punch_out_at,status,is_late,net_duration_minutes').eq('user_id', userId).eq('attendance_date', today).maybeSingle(),
  ])
  const present = logs?.filter(l => ['punched_in','punched_out','on_break'].includes(l.status)).length || 0
  const late    = logs?.filter(l => l.is_late).length || 0
  const onLeave = logs?.filter(l => l.status === 'on_leave').length || 0
  return {
    total: total || 0, present, late, onLeave,
    absent: Math.max(0, (total || 0) - present - onLeave),
    pendingLeaves: pending || 0,
    attendanceRate: total ? Math.round((present / (total || 1)) * 100) : 0,
    myLog: myResult.data,
  }
}

function fmtTime(iso?: string | null) {
  if (!iso) return '--:--'
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}
function fmtDur(mins?: number | null) {
  if (!mins || mins <= 0) return ''
  const h = Math.floor(mins / 60), m = mins % 60
  return h > 0 ? `${h}h ${m > 0 ? m + 'm' : ''}` : `${m}m`
}
function getGreeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

const KPI = [
  { label: 'Total Employees', key: 'total',         Icon: Users,         color: '#2563EB', bg: '#EFF6FF' },
  { label: 'Present Today',   key: 'present',        Icon: UserCheck,     color: '#16A34A', bg: '#F0FDF4' },
  { label: 'Absent',          key: 'absent',         Icon: UserX,         color: '#DC2626', bg: '#FEF2F2' },
  { label: 'Late Arrivals',   key: 'late',           Icon: AlertTriangle, color: '#D97706', bg: '#FFFBEB' },
  { label: 'On Leave',        key: 'onLeave',        Icon: Plane,         color: '#7C3AED', bg: '#F5F3FF' },
  { label: 'Pending Leaves',  key: 'pendingLeaves',  Icon: FileText,      color: '#0891B2', bg: '#F0F9FF' },
]

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user) return null
  const d = await getData(user.tenant_id, user.id)
  const firstName = (user.first_name || user.full_name.split(' ')[0]).trim()
  const myLog = d.myLog as { punch_in_at?: string; punch_out_at?: string; is_late?: boolean; net_duration_minutes?: number } | null
  const clockedIn = !!myLog?.punch_in_at
  const clockedOut = !!myLog?.punch_out_at

  return (
    <div style={{ maxWidth: 1140, animation: 'fadeUp 0.35s ease' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em' }}>
          {getGreeting()}, {firstName}
        </h1>
        <p style={{ color: '#64748B', fontSize: 13, marginTop: 3 }}>
          Here&apos;s what&apos;s happening at {user.tenant?.name} today.
        </p>
      </div>

      {/* Clock-In Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #1E40AF 0%, #312E81 60%, #1E1B4B 100%)',
        borderRadius: 16, padding: '22px 28px', marginBottom: 20,
        boxShadow: '0 8px 32px rgba(30,64,175,0.25)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -30, top: -30, width: 160, height: 160, background: 'rgba(255,255,255,0.04)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', right: 60, bottom: -50, width: 120, height: 120, background: 'rgba(255,255,255,0.03)', borderRadius: '50%' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, background: 'rgba(255,255,255,0.12)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={20} color="#fff" strokeWidth={2} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>
                {!clockedIn
                  ? 'Ready to start your shift?'
                  : clockedOut
                    ? 'Shift complete for today'
                    : `On duty — clocked in at ${fmtTime(myLog?.punch_in_at)}`
                }
              </div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 3 }}>
                {clockedOut
                  ? `Clocked out at ${fmtTime(myLog?.punch_out_at)}${myLog?.net_duration_minutes ? ' · ' + fmtDur(myLog.net_duration_minutes) + ' total' : ''}`
                  : clockedIn
                    ? myLog?.is_late ? '⚠ Marked as late arrival' : '✓ On time'
                    : 'Click to open the Attendance page and clock in'
                }
              </div>
            </div>
          </div>

          {!clockedOut && (
            <a href="/attendance" style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff', padding: '10px 20px', borderRadius: 10,
              textDecoration: 'none', fontSize: 13, fontWeight: 600,
              backdropFilter: 'blur(8px)', whiteSpace: 'nowrap',
            }}>
              {clockedIn
                ? <><LogOut size={14} strokeWidth={2.5} /> Clock Out</>
                : <><LogIn size={14} strokeWidth={2.5} /> Clock In</>
              }
            </a>
          )}
        </div>

        {clockedIn && (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16,
            marginTop: 18, paddingTop: 18,
            borderTop: '1px solid rgba(255,255,255,0.1)',
          }}>
            {[
              { label: 'CLOCK IN',  value: fmtTime(myLog?.punch_in_at) },
              { label: 'CLOCK OUT', value: fmtTime(myLog?.punch_out_at) },
              { label: 'STATUS',    value: myLog?.is_late ? 'Late' : 'On Time' },
            ].map(({ label, value }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', letterSpacing: 1.5, fontWeight: 600 }}>{label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginTop: 4, fontFamily: 'monospace' }}>{value}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px,1fr))', gap: 12, marginBottom: 20 }}>
        {KPI.map(({ label, key, Icon, color, bg }) => {
          const val = d[key as keyof typeof d] as number
          return (
            <div key={label} style={{
              background: '#fff', borderRadius: 12, padding: '16px 18px',
              border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
              transition: 'all 0.2s',
            }}>
              <div style={{ width: 36, height: 36, background: bg, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                <Icon size={18} strokeWidth={1.8} color={color} />
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.04em' }}>{val}</div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 2, fontWeight: 500 }}>{label}</div>
            </div>
          )
        })}
      </div>

      {/* Attendance Rate */}
      <div style={{ background: '#fff', borderRadius: 14, padding: '18px 22px', border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <div style={{ fontWeight: 700, color: '#0F172A', fontSize: 14 }}>Today&apos;s Attendance Rate</div>
            <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
              {d.present} present · {d.absent} absent · {d.onLeave} on leave
            </div>
          </div>
          <div style={{
            fontSize: 30, fontWeight: 800, letterSpacing: '-0.04em',
            color: d.attendanceRate >= 80 ? '#16A34A' : d.attendanceRate >= 60 ? '#D97706' : '#DC2626',
          }}>{d.attendanceRate}%</div>
        </div>
        <div style={{ height: 8, background: '#F1F5F9', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{
            height: 8, borderRadius: 99,
            width: `${d.attendanceRate}%`,
            background: d.attendanceRate >= 80
              ? 'linear-gradient(90deg,#16A34A,#15803D)'
              : d.attendanceRate >= 60
                ? 'linear-gradient(90deg,#D97706,#B45309)'
                : 'linear-gradient(90deg,#DC2626,#B91C1C)',
            transition: 'width 0.8s ease',
          }} />
        </div>
        <div style={{ display: 'flex', gap: 20, marginTop: 10, flexWrap: 'wrap' }}>
          {[
            { label: 'Present',  val: d.present,  color: '#16A34A' },
            { label: 'Absent',   val: d.absent,   color: '#DC2626' },
            { label: 'Late',     val: d.late,     color: '#D97706' },
            { label: 'On Leave', val: d.onLeave,  color: '#7C3AED' },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#64748B' }}>{label}: <strong style={{ color: '#0F172A' }}>{val}</strong></span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
