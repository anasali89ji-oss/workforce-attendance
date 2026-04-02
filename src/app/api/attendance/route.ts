import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('user_id')
  const month = searchParams.get('month')
  const limit = parseInt(searchParams.get('limit') || '30')

  let query = supabaseAdmin
    .from('attendance_logs')
    .select('*, user:profiles(id,full_name,email,avatar_url,employee_id)', { count: 'exact' })
    .eq('tenant_id', user.tenant_id)
    .order('attendance_date', { ascending: false })
    .limit(limit)

  if (!['admin','owner','manager'].includes(user.role)) {
    query = query.eq('user_id', user.id)
  } else if (userId) {
    query = query.eq('user_id', userId)
  }

  if (month) {
    query = query.gte('attendance_date', `${month}-01`).lte('attendance_date', `${month}-31`)
  }

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, total: count })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { action } = body
  // Accept either 'note' (new UI) or 'notes' (legacy)
  const note: string | undefined = body.note || body.notes || undefined
  const today = new Date().toISOString().split('T')[0]
  const now = new Date().toISOString()

  const { data: existing } = await supabaseAdmin
    .from('attendance_logs').select('*')
    .eq('user_id', user.id).eq('attendance_date', today).single()

  if (action === 'clock_in') {
    if (existing?.punch_in_at) return NextResponse.json({ error: 'Already clocked in today' }, { status: 409 })

    // Calculate if late
    const startTime = user.tenant?.work_start_time || '09:00'
    const lateThreshold = user.tenant?.late_threshold ?? 15
    const workStart = new Date(today + 'T' + startTime + ':00')
    workStart.setMinutes(workStart.getMinutes() + lateThreshold)
    const isLate = new Date(now) > workStart

    if (existing) {
      const { data, error } = await supabaseAdmin.from('attendance_logs')
        .update({ punch_in_at: now, status: 'punched_in', is_late: isLate, notes: note, updated_at: now })
        .eq('id', existing.id).select().single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ data })
    } else {
      const { data, error } = await supabaseAdmin.from('attendance_logs').insert({
        tenant_id: user.tenant_id, user_id: user.id, attendance_date: today,
        punch_in_at: now, status: 'punched_in', is_late: isLate, notes: note,
      }).select().single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ data })
    }
  }

  if (action === 'clock_out') {
    if (!existing?.punch_in_at) return NextResponse.json({ error: 'Not clocked in' }, { status: 400 })
    if (existing?.punch_out_at) return NextResponse.json({ error: 'Already clocked out' }, { status: 409 })

    const punchIn = new Date(existing.punch_in_at)
    const punchOut = new Date(now)
    const netMinutes = Math.floor((punchOut.getTime() - punchIn.getTime()) / 60000)

    const endTime = user.tenant?.work_end_time || '18:00'
    const workEnd = new Date(today + 'T' + endTime + ':00')
    const overtimeMinutes = punchOut > workEnd ? Math.floor((punchOut.getTime() - workEnd.getTime()) / 60000) : 0

    const { data, error } = await supabaseAdmin.from('attendance_logs')
      .update({
        punch_out_at: now, status: 'punched_out',
        net_duration_minutes: netMinutes, overtime_minutes: overtimeMinutes,
        is_overtime: overtimeMinutes > 0, notes: existing.notes ? existing.notes + (note ? ' | OUT: '+note : '') : note, updated_at: now,
      })
      .eq('id', existing.id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }

  if (action === 'start_break') {
    if (!existing?.punch_in_at) return NextResponse.json({ error: 'Not clocked in' }, { status: 400 })
    if (existing?.punch_out_at) return NextResponse.json({ error: 'Shift already ended' }, { status: 400 })
    const { data, error } = await supabaseAdmin.from('attendance_logs')
      .update({ status: 'on_break', updated_at: now })
      .eq('id', existing.id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }

  if (action === 'end_break') {
    if (!existing?.punch_in_at) return NextResponse.json({ error: 'Not clocked in' }, { status: 400 })
    if (existing?.punch_out_at) return NextResponse.json({ error: 'Shift already ended' }, { status: 400 })
    const { data, error } = await supabaseAdmin.from('attendance_logs')
      .update({ status: 'punched_in', updated_at: now })
      .eq('id', existing.id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
