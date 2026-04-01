export const dynamic = 'force-dynamic'

import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import DashboardClient from './DashboardClient'

async function getDashboardData(tenantId: string, userId: string) {
  const today = new Date().toISOString().split('T')[0]

  const [
    { count: totalEmployees },
    { data: todayLogs },
    { count: pendingLeaves },
    { data: recentLeaves },
    { data: myLog },
    { data: last30Attendance },
  ] = await Promise.all([
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('is_active', true),
    supabaseAdmin.from('attendance_logs').select('status,is_late,user_id').eq('tenant_id', tenantId).eq('attendance_date', today),
    supabaseAdmin.from('leave_requests').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'pending'),
    supabaseAdmin.from('leave_requests').select('*, user:profiles!user_id(full_name,avatar_url)').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(5),
    supabaseAdmin.from('attendance_logs').select('punch_in_at,punch_out_at,status,is_late,net_duration_minutes').eq('user_id', userId).eq('attendance_date', today).maybeSingle(),
    supabaseAdmin.from('attendance_logs').select('attendance_date,status,is_late').eq('tenant_id', tenantId).gte('attendance_date', new Date(Date.now() - 30 * 864e5).toISOString().split('T')[0]).order('attendance_date'),
  ])

  const total = totalEmployees || 0
  const present = todayLogs?.filter(l => ['punched_in','punched_out','on_break'].includes(l.status)).length || 0
  const late    = todayLogs?.filter(l => l.is_late).length || 0
  const onLeave = todayLogs?.filter(l => l.status === 'on_leave').length || 0
  const absent  = Math.max(0, total - present - onLeave)

  // Build 30-day chart data
  const chartMap: Record<string, { present: number; late: number; absent: number }> = {}
  const now = new Date()
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]
    chartMap[key] = { present: 0, late: 0, absent: 0 }
  }
  ;(last30Attendance || []).forEach(l => {
    if (!chartMap[l.attendance_date]) return
    if (['punched_in','punched_out','on_break'].includes(l.status)) chartMap[l.attendance_date].present++
    if (l.is_late) chartMap[l.attendance_date].late++
    if (l.status === 'missed') chartMap[l.attendance_date].absent++
  })
  const chartData = Object.entries(chartMap).map(([date, v]) => ({ date, ...v }))

  return {
    total, present, late, onLeave, absent,
    pendingLeaves: pendingLeaves || 0,
    attendanceRate: total ? Math.round((present / total) * 100) : 0,
    myLog: myLog,
    recentLeaves: recentLeaves || [],
    chartData,
  }
}

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user) return null
  const data = await getDashboardData(user.tenant_id, user.id)
  return <DashboardClient user={user} data={data} />
}
