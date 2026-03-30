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
    .select('*, user:profiles!user_id(id,full_name,email,avatar_url), approver:profiles!approved_by(id,full_name)')
    .eq('tenant_id', user.tenant_id)
    .order('created_at', { ascending: false })

  const isPrivileged = ['owner','admin','manager'].includes(user.role)
  if (!isPrivileged) query = query.eq('user_id', user.id)
  else if (userId) query = query.eq('user_id', userId)
  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leave_type, start_date, end_date, reason } = await req.json()

  // Calculate working days
  const start = new Date(start_date); const end = new Date(end_date)
  let days = 0; const cur = new Date(start)
  while (cur <= end) { const d = cur.getDay(); if (d !== 0 && d !== 6) days++; cur.setDate(cur.getDate() + 1) }

  const { data, error } = await supabaseAdmin.from('leave_requests').insert({
    tenant_id: user.tenant_id, user_id: user.id,
    leave_type, start_date, end_date, days_count: days, reason, status: 'pending',
  }).select('*, user:profiles!user_id(full_name)').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, action, rejection_reason } = await req.json()
  const isPrivileged = ['owner','admin','manager'].includes(user.role)

  const { data: req_ } = await supabaseAdmin.from('leave_requests').select('*').eq('id', id).eq('tenant_id', user.tenant_id).single()
  if (!req_) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (action === 'cancel' && req_.user_id === user.id) {
    const { data } = await supabaseAdmin.from('leave_requests').update({ status: 'cancelled' }).eq('id', id).select().single()
    return NextResponse.json({ data })
  }
  if (!isPrivileged) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (action === 'approve') {
    const { data, error } = await supabaseAdmin.from('leave_requests')
      .update({ status: 'approved', approved_by: user.id, approved_at: new Date().toISOString() })
      .eq('id', id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }
  if (action === 'reject') {
    const { data, error } = await supabaseAdmin.from('leave_requests')
      .update({ status: 'rejected', approved_by: user.id, rejection_reason })
      .eq('id', id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }
  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
