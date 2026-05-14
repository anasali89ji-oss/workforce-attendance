import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth.server'
import { supabaseAdmin } from '@/lib/supabase'
import { z } from 'zod'

const payrollSchema = z.object({
  user_id: z.string().uuid(),
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  base_salary: z.number().min(0),
  overtime_pay: z.number().min(0).default(0),
  deductions: z.number().min(0).default(0),
  bonuses: z.number().min(0).default(0),
})

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period')
  const userId = searchParams.get('user_id')
  const isPrivileged = ['owner', 'admin'].includes(user.role)

  let query = supabaseAdmin
    .from('payroll_records')
    .select('*, user:profiles!user_id(id,full_name,email,department,employee_id)')
    .eq('tenant_id', user.tenant_id)
    .order('period_start', { ascending: false })

  if (!isPrivileged) query = query.eq('user_id', user.id)
  else if (userId) query = query.eq('user_id', userId)
  if (period && /^\d{4}-\d{2}$/.test(period)) {
    query = query.gte('period_start', `${period}-01`).lte('period_end', `${period}-31`)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || !['owner', 'admin'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const result = payrollSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid input', details: result.error.flatten().fieldErrors }, { status: 400 })
  }

  const { base_salary, overtime_pay = 0, deductions = 0, bonuses = 0 } = result.data
  const net_pay = base_salary + overtime_pay + bonuses - deductions

  const { data, error } = await supabaseAdmin
    .from('payroll_records')
    .insert({
      tenant_id: user.tenant_id,
      ...result.data,
      net_pay,
      status: 'draft',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || !['owner', 'admin'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id, status } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  if (!['draft', 'processed', 'paid'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const updates: Record<string, unknown> = { status }
  if (status === 'processed') updates.processed_at = new Date().toISOString()

  const { data, error } = await supabaseAdmin
    .from('payroll_records')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', user.tenant_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
