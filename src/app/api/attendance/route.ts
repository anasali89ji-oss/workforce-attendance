import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  const userId = searchParams.get('user_id')
  const month = searchParams.get('month') // YYYY-MM
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')

  let query = supabaseAdmin
    .from('attendance_logs')
    .select('*, user:users(id,first_name,last_name,email,avatar_url,employee_id), shift:shifts(*)', { count: 'exact' })
    .eq('tenant_id', user.tenant_id)

  // Non-owners can only see their own
  if (!['owner', 'admin', 'hr', 'manager'].includes(user.role?.slug || '')) {
    query = query.eq('user_id', user.id)
  } else if (userId) {
    query = query.eq('user_id', userId)
  }

  if (date) {
    query = query.eq('date', date)
  } else if (month) {
    query = query.gte('date', `${month}-01`).lte('date', `${month}-31`)
  }

  query = query.order('date', { ascending: false }).range((page - 1) * limit, page * limit - 1)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data, total: count, page, limit })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { action, user_id, notes, location_lat, location_lng } = body
  const targetUserId = user_id || user.id
  const today = new Date().toISOString().split('T')[0]
  const now = new Date().toISOString()

  // Check existing log for today
  const { data: existing } = await supabaseAdmin
    .from('attendance_logs')
    .select('*')
    .eq('user_id', targetUserId)
    .eq('date', today)
    .single()

  if (action === 'clock_in') {
    if (existing?.clock_in) {
      return NextResponse.json({ error: 'Already clocked in today' }, { status: 409 })
    }

    // Calculate if late
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('working_hours_start, late_threshold')
      .eq('id', user.tenant_id)
      .single()

    let lateMinutes = 0
    if (tenant) {
      const [h, m] = tenant.working_hours_start.split(':').map(Number)
      const workStart = new Date(today)
      workStart.setHours(h, m + (tenant.late_threshold || 15), 0)
      const clockInTime = new Date(now)
      if (clockInTime > workStart) {
        lateMinutes = Math.floor((clockInTime.getTime() - workStart.getTime()) / 60000)
      }
    }

    const status = lateMinutes > 0 ? 'late' : 'present'

    if (existing) {
      const { data, error } = await supabaseAdmin
        .from('attendance_logs')
        .update({ clock_in: now, status, late_minutes: lateMinutes, notes, location_lat, location_lng })
        .eq('id', existing.id)
        .select()
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ data })
    } else {
      const { data, error } = await supabaseAdmin
        .from('attendance_logs')
        .insert({
          tenant_id: user.tenant_id,
          user_id: targetUserId,
          date: today,
          clock_in: now,
          status,
          late_minutes: lateMinutes,
          notes,
          location_lat,
          location_lng,
        })
        .select()
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ data })
    }
  }

  if (action === 'clock_out') {
    if (!existing?.clock_in) {
      return NextResponse.json({ error: 'Not clocked in' }, { status: 400 })
    }
    if (existing?.clock_out) {
      return NextResponse.json({ error: 'Already clocked out' }, { status: 409 })
    }

    // Calculate overtime
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('working_hours_end')
      .eq('id', user.tenant_id)
      .single()

    let overtimeMinutes = 0
    if (tenant) {
      const [h, m] = tenant.working_hours_end.split(':').map(Number)
      const workEnd = new Date(today)
      workEnd.setHours(h, m, 0)
      const clockOutTime = new Date(now)
      if (clockOutTime > workEnd) {
        overtimeMinutes = Math.floor((clockOutTime.getTime() - workEnd.getTime()) / 60000)
      }
    }

    const { data, error } = await supabaseAdmin
      .from('attendance_logs')
      .update({ clock_out: now, overtime_minutes: overtimeMinutes, notes })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
