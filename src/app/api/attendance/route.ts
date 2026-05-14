import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth.server'
import { hasPermission } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { clockInSchema } from '@/lib/validators'
import { handleApiError, AuthError, ValidationError, ForbiddenError } from '@/lib/errors'
import { logAudit } from '@/lib/audit'

// Geofencing: default 500m radius around office
const OFFICE_LAT = parseFloat(process.env.OFFICE_LAT || '0')
const OFFICE_LNG = parseFloat(process.env.OFFICE_LNG || '0')
const GEOFENCE_RADIUS = parseInt(process.env.GEOFENCE_RADIUS_METERS || '500')

function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3 // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180
  const φ2 = lat2 * Math.PI / 180
  const Δφ = (lat2 - lat1) * Math.PI / 180
  const Δλ = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

function isWithinGeofence(lat?: number, lng?: number): boolean {
  if (!lat || !lng || !OFFICE_LAT || !OFFICE_LNG) return true // Skip if not configured
  return getDistance(lat, lng, OFFICE_LAT, OFFICE_LNG) <= GEOFENCE_RADIUS
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) throw new AuthError()

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('user_id')
    const month = searchParams.get('month')
    const date = searchParams.get('date')
    const limit = Math.min(parseInt(searchParams.get('limit') || '30'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabaseAdmin
      .from('attendance_logs')
      .select('*, user:profiles(id,full_name,email,avatar_url,employee_id)', { count: 'exact' })
      .eq('tenant_id', user.tenant_id)
      .order('attendance_date', { ascending: false })
      .range(offset, offset + limit - 1)

    if (!hasPermission(user, 'attendance:read')) {
      query = query.eq('user_id', user.id)
    } else if (userId) {
      query = query.eq('user_id', userId)
    }

    if (date && /^\\d{4}-\\d{2}-\\d{2}$/.test(date)) {
      query = query.eq('attendance_date', date)
    } else if (month && /^\\d{4}-\\d{2}$/.test(month)) {
      query = query.gte('attendance_date', `${month}-01`).lte('attendance_date', `${month}-31`)
    }

    const { data, error, count } = await query
    if (error) throw new Error(error.message)

    return NextResponse.json({ data, total: count, offset, limit })
  } catch (error) {
    return handleApiError(error)
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
    const today = new Date().toISOString().split('T')[0]
    const now = new Date().toISOString()
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'

    // Geofencing check
    if (action === 'clock_in' && !isWithinGeofence(location?.lat, location?.lng)) {
      return NextResponse.json(
        { error: 'You are outside the allowed clock-in zone', code: 'GEOFENCE_VIOLATION' },
        { status: 403 }
      )
    }

    const { data: existing } = await supabaseAdmin
      .from('attendance_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('attendance_date', today)
      .maybeSingle()

    if (action === 'clock_in') {
      if (existing?.punch_in_at) {
        return NextResponse.json({ error: 'Already clocked in today', code: 'ALREADY_CLOCKED_IN' }, { status: 409 })
      }

      const startTime = user.tenant?.working_hours_start || '09:00'
      const lateThreshold = user.tenant?.late_threshold || 15
      const [sh, sm] = startTime.split(':').map(Number)
      const workStart = new Date(`${today}T${startTime}:00`)
      workStart.setMinutes(workStart.getMinutes() + lateThreshold)
      const isLate = new Date(now) > workStart

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

      const { data, error } = existing
        ? await supabaseAdmin.from('attendance_logs').update({ ...insertData, updated_at: now }).eq('id', existing.id).select().single()
        : await supabaseAdmin.from('attendance_logs').insert(insertData).select().single()

      if (error) throw new Error(error.message)

      await logAudit(user.tenant_id, 'CLOCK_IN', 'attendance', data.id, { user, ipAddress: ip })
      return NextResponse.json({ data, isLate })
    }

    if (action === 'clock_out') {
      if (!existing?.punch_in_at) {
        return NextResponse.json({ error: 'Not clocked in', code: 'NOT_CLOCKED_IN' }, { status: 400 })
      }
      if (existing?.punch_out_at) {
        return NextResponse.json({ error: 'Already clocked out', code: 'ALREADY_CLOCKED_OUT' }, { status: 409 })
      }

      const punchIn = new Date(existing.punch_in_at)
      const punchOut = new Date(now)
      const netMinutes = Math.floor((punchOut.getTime() - punchIn.getTime()) / 60000)

      const endTime = user.tenant?.working_hours_end || '18:00'
      const workEnd = new Date(`${today}T${endTime}:00`)
      const overtimeMinutes = punchOut > workEnd ? Math.floor((punchOut.getTime() - workEnd.getTime()) / 60000) : 0

      const { data, error } = await supabaseAdmin.from('attendance_logs')
        .update({
          punch_out_at: now,
          status: 'punched_out',
          net_duration_minutes: netMinutes,
          overtime_minutes: overtimeMinutes,
          is_overtime: overtimeMinutes > 0,
          updated_at: now,
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) throw new Error(error.message)

      await logAudit(user.tenant_id, 'CLOCK_OUT', 'attendance', data.id, { user, ipAddress: ip })
      return NextResponse.json({ data, netMinutes, overtimeMinutes })
    }

    if (action === 'start_break') {
      if (!existing?.punch_in_at || existing?.punch_out_at) {
        return NextResponse.json({ error: 'Cannot start break', code: 'INVALID_BREAK_STATE' }, { status: 400 })
      }

      const { data: breakLog, error: breakError } = await supabaseAdmin.from('break_logs').insert({
        attendance_id: existing.id,
        user_id: user.id,
        break_start: now,
        break_type: 'regular',
      }).select().single()

      if (breakError) throw new Error(breakError.message)

      await supabaseAdmin.from('attendance_logs').update({ status: 'on_break' }).eq('id', existing.id)
      return NextResponse.json({ breakLog })
    }

    if (action === 'end_break') {
      const { data: activeBreak } = await supabaseAdmin
        .from('break_logs')
        .select('*')
        .eq('attendance_id', existing.id)
        .is('break_end', null)
        .single()

      if (!activeBreak) {
        return NextResponse.json({ error: 'No active break', code: 'NO_ACTIVE_BREAK' }, { status: 400 })
      }

      const breakStart = new Date(activeBreak.break_start)
      const breakEnd = new Date(now)
      const durationMinutes = Math.floor((breakEnd.getTime() - breakStart.getTime()) / 60000)

      const { data: breakLog } = await supabaseAdmin.from('break_logs')
        .update({ break_end: now, duration_minutes: durationMinutes })
        .eq('id', activeBreak.id)
        .select()
        .single()

      await supabaseAdmin.from('attendance_logs').update({ status: 'punched_in' }).eq('id', existing.id)
      return NextResponse.json({ breakLog, durationMinutes })
    }

    return NextResponse.json({ error: 'Invalid action', code: 'INVALID_ACTION' }, { status: 400 })
  } catch (error) {
    return handleApiError(error)
  }
}
