export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth.server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['owner', 'admin', 'manager'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period') || new Date().toISOString().slice(0, 7)
  const [y, m] = period.split('-').map(Number)
  const start = new Date(y, m - 1, 1)
  const end = new Date(y, m, 0, 23, 59, 59)

  const [profiles, attLogs] = await Promise.all([
    prisma.profile.findMany({
      where: { tenant_id: user.tenant_id, is_active: true },
      select: { id: true, full_name: true, employee_id: true, department: true, email: true },
    }),
    prisma.attendanceLog.findMany({
      where: { tenant_id: user.tenant_id, attendance_date: { gte: start, lte: end } },
      select: { user_id: true, net_duration_minutes: true, overtime_minutes: true, is_overtime: true, attendance_date: true },
    }),
  ])

  const records = profiles.map(p => {
    const logs = attLogs.filter(l => l.user_id === p.id)
    const totalMins = logs.reduce((a, l) => a + (l.net_duration_minutes ?? 0), 0)
    const otMins = logs.reduce((a, l) => a + (l.overtime_minutes ?? 0), 0)
    const baseSalary = 50000
    const otRate = (baseSalary / (22 * 8 * 60)) * 1.5
    const otPay = Math.round(otMins * otRate)
    const deductions = Math.round(baseSalary * 0.1)
    const netPay = baseSalary + otPay - deductions

    return {
      id: p.id,
      user_id: p.id,
      user: { full_name: p.full_name, employee_id: p.employee_id, department: p.department, email: p.email },
      period_start: start.toISOString().split('T')[0],
      period_end: end.toISOString().split('T')[0],
      base_salary: baseSalary,
      overtime_pay: otPay,
      deductions,
      bonuses: 0,
      net_pay: netPay,
      total_hours: Math.round((totalMins / 60) * 10) / 10,
      overtime_hours: Math.round((otMins / 60) * 10) / 10,
      working_days: logs.length,
      status: 'draft',
    }
  })

  return NextResponse.json({ data: records, period })
}
