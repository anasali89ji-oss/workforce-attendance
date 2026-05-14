import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth.server'
import { hasPermission } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { handleApiError, AuthError, ForbiddenError } from '@/lib/errors'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) throw new AuthError()
    if (!hasPermission(user, 'analytics:read')) throw new ForbiddenError()

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'summary'
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7)
    const today = new Date().toISOString().split('T')[0]

    if (type === 'summary') {
      const [
        { count: total, error: totalErr },
        { data: todayLogs, error: logsErr },
        { count: pendingLeaves, error: leavesErr },
        { count: pendingOvertime, error: otErr },
        { data: avgHours }
      ] = await Promise.all([
        supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('tenant_id', user.tenant_id).eq('is_active', true),
        supabaseAdmin.from('attendance_logs').select('status,is_late,net_duration_minutes').eq('tenant_id', user.tenant_id).eq('attendance_date', today),
        supabaseAdmin.from('leave_requests').select('*', { count: 'exact', head: true }).eq('tenant_id', user.tenant_id).eq('status', 'pending'),
        supabaseAdmin.from('overtime_requests').select('*', { count: 'exact', head: true }).eq('tenant_id', user.tenant_id).eq('status', 'pending'),
        supabaseAdmin.from('attendance_logs').select('net_duration_minutes').eq('tenant_id', user.tenant_id).eq('attendance_date', today).not('net_duration_minutes', 'is', null),
      ])

      if (totalErr || logsErr || leavesErr || otErr) throw new Error('Database query failed')

      const present = todayLogs?.filter(l => ['punched_in','punched_out','on_break'].includes(l.status)).length || 0
      const late = todayLogs?.filter(l => l.is_late).length || 0
      const onLeave = todayLogs?.filter(l => l.status === 'on_leave').length || 0
      const absent = Math.max(0, (total || 0) - present - onLeave)
      const avgHoursToday = avgHours?.length
        ? Math.round((avgHours.reduce((sum, l) => sum + (l.net_duration_minutes || 0), 0) / avgHours.length / 60) * 10) / 10
        : 0

      return NextResponse.json({
        data: {
          total_employees: total || 0,
          present_today: present,
          absent_today: absent,
          late_today: late,
          on_leave_today: onLeave,
          attendance_rate: total ? Math.round((present / (total || 1)) * 100) : 0,
          pending_leaves: pendingLeaves || 0,
          pending_overtime: pendingOvertime || 0,
          avg_hours_today: avgHoursToday,
        }
      })
    }

    if (type === 'monthly_attendance') {
      const { data: logs, error } = await supabaseAdmin
        .from('attendance_logs')
        .select('attendance_date,status,is_late')
        .eq('tenant_id', user.tenant_id)
        .gte('attendance_date', `${month}-01`)
        .lte('attendance_date', `${month}-31`)
        .order('attendance_date')

      if (error) throw new Error(error.message)

      const byDate: Record<string, { present: number; late: number; absent: number }> = {}
      ;(logs || []).forEach(l => {
        if (!byDate[l.attendance_date]) byDate[l.attendance_date] = { present: 0, late: 0, absent: 0 }
        if (['punched_in','punched_out','on_break'].includes(l.status)) byDate[l.attendance_date].present++
        if (l.is_late) byDate[l.attendance_date].late++
        if (l.status === 'missed') byDate[l.attendance_date].absent++
      })

      return NextResponse.json({ data: Object.entries(byDate).map(([date, v]) => ({ date, ...v })) })
    }

    if (type === 'department_stats') {
      const { data: deptGroups, error } = await supabaseAdmin
        .from('profiles')
        .select('department')
        .eq('tenant_id', user.tenant_id)
        .eq('is_active', true)
        .not('department', 'is', null)

      if (error) throw new Error(error.message)

      const depts = Array.from(new Set((deptGroups || []).map(p => p.department).filter(Boolean)))
      const stats = await Promise.all(
        depts.map(async (dept) => {
          const { data: deptUsers } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('tenant_id', user.tenant_id)
            .eq('department', dept)
            .eq('is_active', true)
          const ids = (deptUsers || []).map(u => u.id)
          let present = 0
          if (ids.length > 0) {
            const { count } = await supabaseAdmin
              .from('attendance_logs')
              .select('*', { count: 'exact', head: true })
              .in('user_id', ids)
              .eq('attendance_date', today)
              .in('status', ['punched_in','punched_out','on_break'])
            present = count || 0
          }
          return { department: dept, total: ids.length, present, attendance_rate: ids.length ? Math.round((present / ids.length) * 100) : 0 }
        })
      )
      return NextResponse.json({ data: stats })
    }

    if (type === 'leave_summary') {
      const { data: leaves, error } = await supabaseAdmin
        .from('leave_requests')
        .select('leave_type,days_count,status')
        .eq('tenant_id', user.tenant_id)
        .gte('created_at', `${month}-01`)

      if (error) throw new Error(error.message)

      const COLORS: Record<string, string> = {
        annual: '#3b82f6', sick: '#ef4444', emergency: '#f59e0b',
        unpaid: '#6b7280', maternity: '#a855f7', paternity: '#06b6d4',
        bereavement: '#64748b', other: '#10b981'
      }
      const byType: Record<string, { name: string; color: string; count: number; days: number; approved: number; pending: number }> = {}
      ;(leaves || []).forEach(l => {
        const n = l.leave_type
        if (!byType[n]) byType[n] = { name: n.charAt(0).toUpperCase() + n.slice(1), color: COLORS[n] || '#6366f1', count: 0, days: 0, approved: 0, pending: 0 }
        byType[n].count++
        byType[n].days += l.days_count
        if (l.status === 'approved') byType[n].approved++
        if (l.status === 'pending') byType[n].pending++
      })
      return NextResponse.json({ data: Object.values(byType) })
    }

    if (type === 'attendance_trend') {
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date()
        d.setDate(d.getDate() - i)
        return d.toISOString().split('T')[0]
      }).reverse()

      const trend = await Promise.all(
        last7Days.map(async (date) => {
          const { data } = await supabaseAdmin
            .from('attendance_logs')
            .select('status,is_late')
            .eq('tenant_id', user.tenant_id)
            .eq('attendance_date', date)
          const present = data?.filter(l => ['punched_in','punched_out','on_break'].includes(l.status)).length || 0
          const late = data?.filter(l => l.is_late).length || 0
          return { date, present, late, total: data?.length || 0 }
        })
      )
      return NextResponse.json({ data: trend })
    }

    return NextResponse.json({ error: 'Unknown analytics type', code: 'UNKNOWN_TYPE' }, { status: 400 })
  } catch (error) {
    const { message, status, code } = handleApiError(error)
    return NextResponse.json({ error: message, code }, { status })
  }
}
