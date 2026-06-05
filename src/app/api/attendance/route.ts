export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth.server'
import { hasPermission } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { clockInSchema } from '@/lib/validators'
import { handleApiError, AuthError, ValidationError, ForbiddenError } from '@/lib/errors'
import { logAudit } from '@/lib/audit'

const OFFICE_LAT = parseFloat(process.env.OFFICE_LAT || '0')
const OFFICE_LNG = parseFloat(process.env.OFFICE_LNG || '0')
const GEOFENCE_RADIUS = parseInt(process.env.GEOFENCE_RADIUS_METERS || '500')

function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function isWithinGeofence(lat?: number, lng?: number): boolean {
  if (!lat || !lng || !OFFICE_LAT || !OFFICE_LNG) return true
  return getDistance(lat, lng, OFFICE_LAT, OFFICE_LNG) <= GEOFENCE_RADIUS
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) throw new AuthError()

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('user_id')
    const month = searchParams.get('month')
    // Fix 5.6: Support specific date query param for dashboard clock widget
    const date = searchParams.get('date')
    const limit = Math.min(parseInt(searchParams.get('limit') || '30'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: Record<string, unknown> = { tenant_id: user.tenant_id }

    // Fix CRITICAL-6: attendance:read check is correct — non-privileged users see only their own records
    if (!hasPermission(user, 'attendance:read')) {
      where.user_id = user.id
    } else if (userId) {
      where.user_id = userId
    }

    if (date) {
      // Exact date filter (YYYY-MM-DD) — used by dashboard clock widget
      const dateObj = new Date(`${date}T00:00:00`)
      const nextDay = new Date(dateObj)
      nextDay.setDate(nextDay.getDate() + 1)
      where.attendance_date = { gte: dateObj, lt: nextDay }
    } else if (month) {
      const start = new Date(`${month}-01`)
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 0)
      where.attendance_date = { gte: start, lte: end }
    }

    const [logs, total] = await Promise.all([
      prisma.attendanceLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, full_name: true, email: true, avatar_url: true, employee_id: true },
          },
        },
        orderBy: { attendance_date: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.attendanceLog.count({ where }),
    ])

    return NextResponse.json({ data: logs, total, offset, limit })
  } catch (error) {
    const { message, status, code } = handleApiError(error)
    return NextResponse.json({ error: message, code }, { status })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) throw new AuthError()
    if (!hasPermission(user, 'attendance:clock')) throw new ForbiddenError()

    const body = await req.json()
    const result = clockInSchema.safeParse(body)
    if (!result.success) {
      throw new ValidationError('Invalid input', result.error.flatten().fieldErrors)
    }

    const { action, notes, location } = result.data
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const now = new Date()
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'

    if (action === 'clock_in' && !isWithinGeofence(location?.lat, location?.lng)) {
      return NextResponse.json(
        { error: 'You are outside the allowed clock-in zone', code: 'GEOFENCE_VIOLATION' },
        { status: 403 }
      )
    }

    const existing = await prisma.attendanceLog.findFirst({
      where: { user_id: user.id, attendance_date: today },
    })

    if (action === 'clock_in') {
      if (existing?.punch_in_at) {
        return NextResponse.json({ error: 'Already clocked in today', code: 'ALREADY_CLOCKED_IN' }, { status: 409 })
      }

      const startTime = user.tenant?.working_hours_start ?? '09:00'
      const lateThreshold = user.tenant?.late_threshold ?? 15
      const workStart = new Date(`${now.toISOString().split('T')[0]}T${startTime}:00`)
      workStart.setMinutes(workStart.getMinutes() + lateThreshold)

      // Fix 4.6/HIGH-17: Only mark late on actual working days
      const DAY_CODES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
      const dayOfWeek = DAY_CODES[now.getDay()]
      const workingDays: string[] = (user.tenant?.working_days as string[]) || ['MON', 'TUE', 'WED', 'THU', 'FRI']
      const isWorkDay = workingDays.includes(dayOfWeek)
      const isLate = isWorkDay && now > workStart

      const insertData = {
        tenant_id: user.tenant_id,
        user_id: user.id,
        attendance_date: today,
        punch_in_at: now,
        status: 'punched_in',
        is_late: isLate,
        timesheet_note: notes,
        ip_address: ip,
        location_lat: location?.lat,
        location_lng: location?.lng,
      }

      const log = existing
        ? await prisma.attendanceLog.update({ where: { id: existing.id }, data: insertData })
        : await prisma.attendanceLog.create({ data: insertData })

      await logAudit(user.tenant_id, 'CLOCK_IN', 'attendance', log.id, { user, ipAddress: ip })
      return NextResponse.json({ data: log, isLate })
    }

    if (action === 'clock_out') {
      if (!existing?.punch_in_at) {
        return NextResponse.json({ error: 'Not clocked in', code: 'NOT_CLOCKED_IN' }, { status: 400 })
      }
      if (existing?.punch_out_at) {
        return NextResponse.json({ error: 'Already clocked out', code: 'ALREADY_CLOCKED_OUT' }, { status: 409 })
      }

      const punchIn = new Date(existing.punch_in_at)

      // Fix 4.6/HIGH-16: Calculate break time and deduct from net duration
      const breaks = await prisma.breakLog.findMany({
        where: { attendance_id: existing.id, break_end: { not: null } },
        select: { duration_minutes: true },
      })
      const totalBreakMinutes = breaks.reduce((sum, b) => sum + (b.duration_minutes ?? 0), 0)
      const grossMinutes = Math.floor((now.getTime() - punchIn.getTime()) / 60000)
      const netMinutes = Math.max(0, grossMinutes - totalBreakMinutes)

      const endTime = user.tenant?.working_hours_end ?? '18:00'
      const workEnd = new Date(`${now.toISOString().split('T')[0]}T${endTime}:00`)
      // Overtime = time after shift end, but only if net (worked) time exceeds shift end
      const overtimeMinutes = now > workEnd ? Math.floor((now.getTime() - workEnd.getTime()) / 60000) : 0

      const log = await prisma.attendanceLog.update({
        where: { id: existing.id },
        data: {
          punch_out_at: now,
          status: 'punched_out',
          net_duration_minutes: netMinutes,
          overtime_minutes: overtimeMinutes,
          is_overtime: overtimeMinutes > 0,
        },
      })

      await logAudit(user.tenant_id, 'CLOCK_OUT', 'attendance', log.id, { user, ipAddress: ip })
      return NextResponse.json({ data: log, netMinutes, overtimeMinutes })
    }

    if (action === 'start_break') {
      if (!existing?.punch_in_at || existing?.punch_out_at) {
        return NextResponse.json({ error: 'Cannot start break', code: 'INVALID_BREAK_STATE' }, { status: 400 })
      }

      const breakLog = await prisma.breakLog.create({
        data: { attendance_id: existing.id, user_id: user.id, break_start: now, break_type: 'regular' },
      })
      await prisma.attendanceLog.update({ where: { id: existing.id }, data: { status: 'on_break' } })
      return NextResponse.json({ breakLog })
    }

    if (action === 'end_break') {
      const activeBreak = await prisma.breakLog.findFirst({
        where: { attendance_id: existing?.id, break_end: null },
      })

      if (!activeBreak) {
        return NextResponse.json({ error: 'No active break', code: 'NO_ACTIVE_BREAK' }, { status: 400 })
      }

      const durationMinutes = Math.floor((now.getTime() - activeBreak.break_start.getTime()) / 60000)
      const breakLog = await prisma.breakLog.update({
        where: { id: activeBreak.id },
        data: { break_end: now, duration_minutes: durationMinutes },
      })

      await prisma.attendanceLog.update({ where: { id: existing!.id }, data: { status: 'punched_in' } })
      return NextResponse.json({ breakLog, durationMinutes })
    }

    return NextResponse.json({ error: 'Invalid action', code: 'INVALID_ACTION' }, { status: 400 })
  } catch (error) {
    const { message, status, code } = handleApiError(error)
    return NextResponse.json({ error: message, code }, { status })
  }
}
