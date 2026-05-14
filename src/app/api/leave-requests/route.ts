import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth.server'
import { supabaseAdmin } from '@/lib/supabase'
import { z } from 'zod'

const leaveRequestSchema = z.object({
  leave_type_id: z.string().min(1, 'Leave type required'),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  reason: z.string().min(5, 'Reason must be at least 5 characters').max(1000),
})

const leaveActionSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(['approve', 'reject', 'cancel']),
  rejection_reason: z.string().max(1000).optional(),
})

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  let query = supabaseAdmin
    .from('leave_requests')
    .select('*, user:profiles!user_id(id,full_name,email,avatar_url), approver:profiles!approved_by(id,full_name)')
    .eq('tenant_id', user.tenant_id)
    .order('created_at', { ascending: false })

  const isPrivileged = ['owner', 'admin', 'manager'].includes(user.role)
  if (!isPrivileged) query = query.eq('user_id', user.id)
  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const result = leaveRequestSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid input', details: result.error.flatten().fieldErrors }, { status: 400 })
  }

  const { leave_type_id, start_date, end_date, reason } = result.data

  // Validate date range
  const start = new Date(start_date)
  const end = new Date(end_date)
  if (start > end) {
    return NextResponse.json({ error: 'End date must be after or equal to start date' }, { status: 400 })
  }

  // Calculate working days (server-authoritative)
  let days = 0
  const cur = new Date(start)
  while (cur <= end) {
    const d = cur.getDay()
    if (d !== 0 && d !== 6) days++
    cur.setDate(cur.getDate() + 1)
  }

  if (days === 0) {
    return NextResponse.json({ error: 'Selected dates fall on weekends only' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('leave_requests')
    .insert({
      tenant_id: user.tenant_id,
      user_id: user.id,
      leave_type: leave_type_id,
      start_date,
      end_date,
      days_count: days,
      reason,
      status: 'pending',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const result = leaveActionSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid input', details: result.error.flatten().fieldErrors }, { status: 400 })
  }

  const { id, action, rejection_reason } = result.data

  // FIX-009 action validation
  if (action === 'reject' && !rejection_reason?.trim()) {
    return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 })
  }

  const { data: leaveReq } = await supabaseAdmin
    .from('leave_requests').select('*').eq('id', id).eq('tenant_id', user.tenant_id).single()
  if (!leaveReq) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isPrivileged = ['owner', 'admin', 'manager'].includes(user.role)

  // Only requester can cancel their own
  if (action === 'cancel') {
    if (leaveReq.user_id !== user.id && !isPrivileged) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const { data } = await supabaseAdmin
      .from('leave_requests').update({ status: 'cancelled' }).eq('id', id).select().single()
    return NextResponse.json({ data })
  }

  // Only managers+ can approve/reject
  if (!isPrivileged) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const updateData: Record<string, unknown> = {
    status: action === 'approve' ? 'approved' : 'rejected',
    approved_by: user.id,
    approved_at: new Date().toISOString(),
  }
  if (action === 'reject') updateData.rejection_reason = rejection_reason

  const { data, error } = await supabaseAdmin.from('leave_requests')
    .update(updateData).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
