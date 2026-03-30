import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') || 'summary'
  const month = searchParams.get('month') || new Date().toISOString().slice(0, 7)
  const today = new Date().toISOString().split('T')[0]

  if (type === 'summary') {
    const [{ count: total }, { data: todayLogs }, { count: pending }] = await Promise.all([
      supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('tenant_id', user.tenant_id).eq('is_active', true),
      supabaseAdmin.from('attendance_logs').select('status,is_late').eq('tenant_id', user.tenant_id).eq('attendance_date', today),
      supabaseAdmin.from('leave_requests').select('*', { count: 'exact', head: true }).eq('tenant_id', user.tenant_id).eq('status', 'pending'),
    ])
    const present = todayLogs?.filter(l => ['punched_in','punched_out','on_break'].includes(l.status)).length || 0
    const late = todayLogs?.filter(l => l.is_late).length || 0
    const onLeave = todayLogs?.filter(l => l.status === 'on_leave').length || 0
    const absent = Math.max(0, (total || 0) - present - onLeave)
    return NextResponse.json({ data: { total_employees: total || 0, present_today: present, absent_today: absent, late_today: late, on_leave_today: onLeave, attendance_rate: total ? Math.round((present / (total || 1)) * 100) : 0, pending_leaves: pending || 0 } })
  }

  if (type === 'monthly_attendance') {
    const { data: logs } = await supabaseAdmin.from('attendance_logs').select('attendance_date,status,is_late').eq('tenant_id', user.tenant_id).gte('attendance_date', `${month}-01`).lte('attendance_date', `${month}-31`).order('attendance_date')
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
    const { data: deptGroups } = await supabaseAdmin.from('profiles').select('department').eq('tenant_id', user.tenant_id).eq('is_active', true).not('department', 'is', null)
    const depts = [...new Set((deptGroups || []).map(p => p.department).filter(Boolean))]
    const stats = []
    for (const dept of depts) {
      const { data: deptUsers } = await supabaseAdmin.from('profiles').select('id').eq('tenant_id', user.tenant_id).eq('department', dept).eq('is_active', true)
      const ids = (deptUsers || []).map(u => u.id)
      let present = 0
      if (ids.length > 0) {
        const { count } = await supabaseAdmin.from('attendance_logs').select('*', { count: 'exact', head: true }).in('user_id', ids).eq('attendance_date', today).in('status', ['punched_in','punched_out','on_break'])
        present = count || 0
      }
      stats.push({ department: dept, total: ids.length, present, attendance_rate: ids.length ? Math.round((present / ids.length) * 100) : 0 })
    }
    return NextResponse.json({ data: stats })
  }

  if (type === 'leave_summary') {
    const { data: leaves } = await supabaseAdmin.from('leave_requests').select('leave_type,days_count,status').eq('tenant_id', user.tenant_id).gte('created_at', `${month}-01`)
    const COLORS: Record<string,string> = { annual: '#3b82f6', sick: '#ef4444', emergency: '#f59e0b', unpaid: '#6b7280', maternity: '#a855f7', paternity: '#06b6d4', bereavement: '#64748b', other: '#10b981' }
    const byType: Record<string, { name: string; color: string; count: number; days: number }> = {}
    ;(leaves || []).forEach((l: { leave_type: string; days_count: number }) => {
      const n = l.leave_type
      if (!byType[n]) byType[n] = { name: n.charAt(0).toUpperCase() + n.slice(1), color: COLORS[n] || '#6366f1', count: 0, days: 0 }
      byType[n].count++; byType[n].days += l.days_count
    })
    return NextResponse.json({ data: Object.values(byType) })
  }

  return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
}
