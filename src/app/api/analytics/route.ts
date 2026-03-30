import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') || 'summary'
  const month = searchParams.get('month') || new Date().toISOString().slice(0, 7)

  if (type === 'summary') {
    const today = new Date().toISOString().split('T')[0]

    // Total employees
    const { count: totalEmployees } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', user.tenant_id)
      .eq('is_active', true)

    // Today's attendance
    const { data: todayLogs } = await supabaseAdmin
      .from('attendance_logs')
      .select('status, user_id')
      .eq('tenant_id', user.tenant_id)
      .eq('date', today)

    const presentToday = todayLogs?.filter(l => ['present', 'late'].includes(l.status)).length || 0
    const lateToday = todayLogs?.filter(l => l.status === 'late').length || 0
    const onLeaveToday = todayLogs?.filter(l => l.status === 'on_leave').length || 0
    const absentToday = (totalEmployees || 0) - presentToday - onLeaveToday

    // Pending leaves
    const { count: pendingLeaves } = await supabaseAdmin
      .from('leave_requests')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', user.tenant_id)
      .eq('status', 'pending')

    const attendanceRate = totalEmployees
      ? Math.round((presentToday / (totalEmployees || 1)) * 100)
      : 0

    return NextResponse.json({
      data: {
        total_employees: totalEmployees || 0,
        present_today: presentToday,
        absent_today: absentToday < 0 ? 0 : absentToday,
        late_today: lateToday,
        on_leave_today: onLeaveToday,
        attendance_rate: attendanceRate,
        pending_leaves: pendingLeaves || 0,
      },
    })
  }

  if (type === 'monthly_attendance') {
    const startDate = `${month}-01`
    const endDate = `${month}-31`

    const { data: logs } = await supabaseAdmin
      .from('attendance_logs')
      .select('date, status, late_minutes, overtime_minutes')
      .eq('tenant_id', user.tenant_id)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date')

    // Group by date
    const byDate: Record<string, { present: number; absent: number; late: number; on_leave: number }> = {}
    ;(logs || []).forEach(log => {
      if (!byDate[log.date]) {
        byDate[log.date] = { present: 0, absent: 0, late: 0, on_leave: 0 }
      }
      if (log.status === 'present') byDate[log.date].present++
      else if (log.status === 'late') { byDate[log.date].present++; byDate[log.date].late++ }
      else if (log.status === 'absent') byDate[log.date].absent++
      else if (log.status === 'on_leave') byDate[log.date].on_leave++
    })

    const chartData = Object.entries(byDate).map(([date, counts]) => ({
      date,
      ...counts,
    }))

    return NextResponse.json({ data: chartData })
  }

  if (type === 'department_stats') {
    const { data: departments } = await supabaseAdmin
      .from('departments')
      .select('id, name')
      .eq('tenant_id', user.tenant_id)

    const today = new Date().toISOString().split('T')[0]
    const stats = []

    for (const dept of departments || []) {
      const { data: deptUsers } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('tenant_id', user.tenant_id)
        .eq('department_id', dept.id)
        .eq('is_active', true)

      const userIds = (deptUsers || []).map(u => u.id)
      let presentCount = 0

      if (userIds.length > 0) {
        const { count } = await supabaseAdmin
          .from('attendance_logs')
          .select('*', { count: 'exact', head: true })
          .in('user_id', userIds)
          .eq('date', today)
          .in('status', ['present', 'late'])
        presentCount = count || 0
      }

      stats.push({
        department: dept.name,
        total: userIds.length,
        present: presentCount,
        attendance_rate: userIds.length ? Math.round((presentCount / userIds.length) * 100) : 0,
      })
    }

    return NextResponse.json({ data: stats })
  }

  if (type === 'leave_summary') {
    const { data: leaves } = await supabaseAdmin
      .from('leave_requests')
      .select('status, days_count, leave_type:leave_types(name, color)')
      .eq('tenant_id', user.tenant_id)
      .gte('created_at', `${month}-01`)

    const byType: Record<string, { name: string; color: string; count: number; days: number }> = {}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(leaves || []).forEach((l: any) => {
      const name = l.leave_type?.name || 'Unknown'
      if (!byType[name]) byType[name] = { name, color: l.leave_type?.color || '#6366f1', count: 0, days: 0 }
      byType[name].count++
      byType[name].days += l.days_count
    })

    return NextResponse.json({ data: Object.values(byType) })
  }

  return NextResponse.json({ error: 'Unknown analytics type' }, { status: 400 })
}
