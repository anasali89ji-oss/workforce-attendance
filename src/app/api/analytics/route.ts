export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth.server'
import { hasPermission } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleApiError, AuthError, ForbiddenError } from '@/lib/errors'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) throw new AuthError()
    if (!hasPermission(user, 'analytics:read')) throw new ForbiddenError()

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'summary'
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (type === 'summary') {
      const [
        totalEmployees,
        todayLogs,
        pendingLeaves,
        pendingOvertime,
      ] = await Promise.all([
        prisma.profile.count({ where: { tenant_id: user.tenant_id, is_active: true } }),
        prisma.attendanceLog.findMany({
          where: { tenant_id: user.tenant_id, attendance_date: { gte: today, lt: tomorrow } },
          select: { status: true, is_late: true, net_duration_minutes: true },
        }),
        prisma.leaveRequest.count({ where: { tenant_id: user.tenant_id, status: 'pending' } }),
        prisma.overtimeRequest.count({ where: { tenant_id: user.tenant_id, status: 'pending' } }),
      ])

      const present = todayLogs.filter(l => ['punched_in', 'punched_out', 'on_break'].includes(l.status)).length
      const late = todayLogs.filter(l => l.is_late).length
      const onLeave = todayLogs.filter(l => l.status === 'on_leave').length
      const absent = Math.max(0, totalEmployees - present - onLeave)
      const totalMins = todayLogs.reduce((s, l) => s + (l.net_duration_minutes ?? 0), 0)
      const avgHoursToday = todayLogs.length ? Math.round((totalMins / todayLogs.length / 60) * 10) / 10 : 0

      return NextResponse.json({
        data: {
          total_employees: totalEmployees,
          present_today: present,
          absent_today: absent,
          late_today: late,
          on_leave_today: onLeave,
          attendance_rate: totalEmployees > 0 ? Math.round((present / totalEmployees) * 100) : 0,
          pending_leaves: pendingLeaves,
          pending_overtime: pendingOvertime,
          avg_hours_today: avgHoursToday,
        },
      })
    }

    if (type === 'monthly') {
      const [y, m] = month.split('-').map(Number)
      const start = new Date(y, m - 1, 1)
      const end = new Date(y, m, 0, 23, 59, 59)

      const logs = await prisma.attendanceLog.findMany({
        where: { tenant_id: user.tenant_id, attendance_date: { gte: start, lte: end } },
        select: { attendance_date: true, status: true, is_late: true, net_duration_minutes: true },
      })

      // Group by date
      const byDate = new Map<string, typeof logs>()
      for (const l of logs) {
        const key = l.attendance_date.toISOString().split('T')[0]
        if (!byDate.has(key)) byDate.set(key, [])
        byDate.get(key)!.push(l)
      }

      const trend = Array.from(byDate.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, dayLogs]) => ({
          date,
          present: dayLogs.filter(l => l.status !== 'on_leave').length,
          late: dayLogs.filter(l => l.is_late).length,
          on_leave: dayLogs.filter(l => l.status === 'on_leave').length,
        }))

      return NextResponse.json({ data: { trend } })
    }

    // BUG-2.6 FIX: attendance_trend is an alias for monthly — DashboardClient calls this type
    if (type === 'attendance_trend') {
      const [y, m] = month.split('-').map(Number)
      const start = new Date(y, m - 1, 1)
      const end = new Date(y, m, 0, 23, 59, 59)
      const logs = await prisma.attendanceLog.findMany({
        where: { tenant_id: user.tenant_id, attendance_date: { gte: start, lte: end } },
        select: { attendance_date: true, status: true, is_late: true, net_duration_minutes: true },
      })
      const byDate = new Map<string, typeof logs>()
      for (const l of logs) {
        const key = l.attendance_date.toISOString().split('T')[0]
        if (!byDate.has(key)) byDate.set(key, [])
        byDate.get(key)!.push(l)
      }
      const trend = Array.from(byDate.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, dayLogs]) => ({
          date,
          present: dayLogs.filter(l => l.status !== 'on_leave').length,
          late: dayLogs.filter(l => l.is_late).length,
          on_leave: dayLogs.filter(l => l.status === 'on_leave').length,
        }))
      return NextResponse.json({ data: trend })
    }

    return NextResponse.json({ error: 'Unknown analytics type' }, { status: 400 })
  } catch (error) {
    const { message, status, code } = handleApiError(error)
    return NextResponse.json({ error: message, code }, { status })
  }
}
