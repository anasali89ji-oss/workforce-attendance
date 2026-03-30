import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const userId = searchParams.get('user_id')

  let query = supabaseAdmin
    .from('leave_requests')
    .select('*, employee:users!employee_id(id,first_name,last_name,email,avatar_url), approver:users!approver_id(id,first_name,last_name), leave_type:leave_types(*)')
    .eq('tenant_id', user.tenant_id)
    .order('created_at', { ascending: false })

  const isPrivileged = ['owner', 'admin', 'hr', 'manager'].includes(user.role?.slug || '')

  if (!isPrivileged) {
    query = query.eq('employee_id', user.id)
  } else if (userId) {
    query = query.eq('employee_id', userId)
  }

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { leave_type_id, start_date, end_date, reason } = body

  // Calculate working days
  const start = new Date(start_date)
  const end = new Date(end_date)
  let days = 0
  const current = new Date(start)
  while (current <= end) {
    const dow = current.getDay()
    if (dow !== 0 && dow !== 6) days++
    current.setDate(current.getDate() + 1)
  }

  const { data, error } = await supabaseAdmin
    .from('leave_requests')
    .insert({
      tenant_id: user.tenant_id,
      employee_id: user.id,
      leave_type_id,
      start_date,
      end_date,
      days_count: days,
      reason,
      status: 'pending',
    })
    .select('*, leave_type:leave_types(*)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Update leave balance pending days (best effort)
  try {
    await supabaseAdmin.rpc('increment_leave_pending', {
      p_user_id: user.id,
      p_leave_type_id: leave_type_id,
      p_year: currentYear,
      p_days: days,
    })
  } catch { /* ignore */ }

  return NextResponse.json({ data })
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isPrivileged = ['owner', 'admin', 'hr', 'manager'].includes(user.role?.slug || '')

  const body = await req.json()
  const { id, action, rejection_reason } = body

  const { data: leaveReq } = await supabaseAdmin
    .from('leave_requests')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', user.tenant_id)
    .single()

  if (!leaveReq) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Cancel — employee can cancel their own
  if (action === 'cancel' && leaveReq.employee_id === user.id) {
    const { data, error } = await supabaseAdmin
      .from('leave_requests')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }

  if (!isPrivileged) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (action === 'approve') {
    const { data, error } = await supabaseAdmin
      .from('leave_requests')
      .update({ status: 'approved', approver_id: user.id, approved_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Update balance
    const year = new Date(leaveReq.start_date).getFullYear()
    await supabaseAdmin
      .from('leave_balances')
      .upsert({
        tenant_id: user.tenant_id,
        user_id: leaveReq.employee_id,
        leave_type_id: leaveReq.leave_type_id,
        year,
        used_days: leaveReq.days_count,
      }, { onConflict: 'user_id,leave_type_id,year' })

    return NextResponse.json({ data })
  }

  if (action === 'reject') {
    const { data, error } = await supabaseAdmin
      .from('leave_requests')
      .update({
        status: 'rejected',
        approver_id: user.id,
        rejected_at: new Date().toISOString(),
        rejection_reason,
      })
      .eq('id', id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
