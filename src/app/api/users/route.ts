import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search')
  const dept = searchParams.get('department')

  let query = supabaseAdmin
    .from('profiles')
    .select('id,email,full_name,first_name,last_name,role,phone,employee_id,department,position,is_active,joining_date,created_at,avatar_url')
    .eq('tenant_id', user.tenant_id)
    .order('created_at', { ascending: false })

  if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,employee_id.ilike.%${search}%`)
  if (dept) query = query.eq('department', dept)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['owner', 'admin'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { email, password, full_name, first_name, last_name, phone, role, department, position } = body

  const hash = await bcrypt.hash(password || 'Welcome@123', 12)
  const { count } = await supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('tenant_id', user.tenant_id)
  const empId = `EMP-${String((count || 0) + 1).padStart(3, '0')}`
  const displayName = full_name || `${first_name || ''} ${last_name || ''}`.trim() || email

  const { data, error } = await supabaseAdmin.from('profiles').insert({
    tenant_id: user.tenant_id, email: email.toLowerCase().trim(),
    password_hash: hash, full_name: displayName, first_name, last_name,
    phone, role: role || 'worker', department, position, employee_id: empId,
  }).select('id,email,full_name,role,department,employee_id,is_active').single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Email already exists' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ data })
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, password, ...updates } = body

  const isSelf = id === user.id
  const isPrivileged = ['owner', 'admin'].includes(user.role)
  if (!isSelf && !isPrivileged) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (!isPrivileged) {
    delete updates.role
    delete updates.is_active
    delete updates.employee_id
    delete updates.tenant_id
  }

  if (password) updates.password_hash = await bcrypt.hash(password, 12)
  delete updates.tenant_id

  const { data, error } = await supabaseAdmin.from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id).eq('tenant_id', user.tenant_id)
    .select('id,email,full_name,role,department,employee_id,is_active').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
