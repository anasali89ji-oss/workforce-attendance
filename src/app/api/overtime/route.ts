import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth.server'
import { supabaseAdmin } from '@/lib/supabase'
import { z } from 'zod'

const overtimeSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format YYYY-MM-DD'),
  hours: z.number().min(0.5).max(12),
  reason: z.string().min(5).max(1000),
})

const overtimeActionSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(['approve', 'reject']),
})

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const isPrivileged = ['owner', 'admin', 'manager'].includes(user.role)

  let query = supabaseAdmin
    .from('overtime_requests')
    .select('*, user:profiles!user_id(id,full_name,email,avatar_url,department)')
    .eq('tenant_id', user.tenant_id)
    .order('created_at', { ascending: false })

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
  const result = overtimeSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid input', details: result.error.flatten().fieldErrors }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('overtime_requests')
    .insert({
      tenant_id: user.tenant_id,
      user_id: user.id,
      ...result.data,
      status: 'pending',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || !['owner', 'admin', 'manager'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const result = overtimeActionSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid input', details: result.error.flatten().fieldErrors }, { status: 400 })
  }

  const { id, action } = result.data

  const { data, error } = await supabaseAdmin
    .from('overtime_requests')
    .update({
      status: action === 'approve' ? 'approved' : 'rejected',
      approved_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('tenant_id', user.tenant_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
