export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth.server'
import { hasPermission } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleApiError, AuthError, ForbiddenError } from '@/lib/errors'

// Fix 4.3: Default fallback salary — real value comes from profile.base_salary or tenant config
const DEFAULT_BASE_SALARY = 0

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) throw new AuthError()
    if (!hasPermission(user, 'payroll:read')) throw new ForbiddenError()

    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') || new Date().toISOString().slice(0, 7)
    const [y, m] = period.split('-').map(Number)
    const start = new Date(y, m - 1, 1)
    const end = new Date(y, m, 0, 23, 59, 59)

    const [profiles, attLogs] = await Promise.all([
      prisma.profile.findMany({
        where: { tenant_id: user.tenant_id, is_active: true },
        // Fix 4.3: Select base_salary from profile if available
        select: { id: true, full_name: true, employee_id: true, department: true, email: true, base_salary: true },
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

      // Fix 4.3: Use profile base_salary, fall back to DEFAULT only as placeholder
      const baseSalary: number = (p as { base_salary?: number | null }).base_salary ?? DEFAULT_BASE_SALARY
      const otRate = baseSalary > 0 ? (baseSalary / (22 * 8 * 60)) * 1.5 : 0
      const otPay = Math.round(otMins * otRate)
      // Deductions: 10% of base as placeholder (tax/social security would be configurable per tenant)
      const deductions = baseSalary > 0 ? Math.round(baseSalary * 0.1) : 0
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
        note: baseSalary === 0 ? 'No salary configured for this employee' : undefined,
      }
    })

    return NextResponse.json({ data: records, period })
  } catch (error) {
    const { message, status, code } = handleApiError(error)
    return NextResponse.json({ error: message, code }, { status })
  }
}

// Fix 4.3: Add POST endpoint to save/finalize payroll records
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) throw new AuthError()
    if (!hasPermission(user, 'payroll:write')) throw new ForbiddenError()

    const { records, period } = await req.json()
    if (!Array.isArray(records) || !period) {
      return NextResponse.json({ error: 'records array and period required' }, { status: 400 })
    }

    const upserted = await Promise.all(
      records.map((r: {
        user_id: string
        base_salary: number
        overtime_pay: number
        deductions: number
        bonuses: number
        net_pay: number
        total_hours: number
        overtime_hours: number
        working_days: number
        status: string
        period_start: string
        period_end: string
      }) =>
        prisma.payrollRecord.upsert({
          where: {
            tenant_id_user_id_period_start: {
              tenant_id: user.tenant_id,
              user_id: r.user_id,
              period_start: new Date(r.period_start),
            },
          },
          update: {
            base_salary: r.base_salary,
            overtime_pay: r.overtime_pay,
            deductions: r.deductions,
            bonuses: r.bonuses,
            net_pay: r.net_pay,
            total_hours: r.total_hours,
            overtime_hours: r.overtime_hours,
            working_days: r.working_days,
            status: r.status,
          },
          create: {
            tenant_id: user.tenant_id,
            user_id: r.user_id,
            period_start: new Date(r.period_start),
            period_end: new Date(r.period_end),
            base_salary: r.base_salary,
            overtime_pay: r.overtime_pay,
            deductions: r.deductions,
            bonuses: r.bonuses,
            net_pay: r.net_pay,
            total_hours: r.total_hours,
            overtime_hours: r.overtime_hours,
            working_days: r.working_days,
            status: r.status,
          },
        })
      )
    )

    return NextResponse.json({ data: upserted, count: upserted.length })
  } catch (error) {
    const { message, status, code } = handleApiError(error)
    return NextResponse.json({ error: message, code }, { status })
  }
}
