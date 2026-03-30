import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search')
  const departmentId = searchParams.get('department_id')
  const roleId = searchParams.get('role_id')
  const isActive = searchParams.get('is_active')

  let query = supabaseAdmin
    .from('users')
    .select('*, role:roles(*), department:departments(*), position:positions(*)')
    .eq('tenant_id', user.tenant_id)
    .order('created_at', { ascending: false })

  if (isActive !== null) query = query.eq('is_active', isActive !== 'false')
  if (departmentId) query = query.eq('department_id', departmentId)
  if (roleId) query = query.eq('role_id', roleId)
  if (search) {
    query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,employee_id.ilike.%${search}%`)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Strip password hashes
  const safeData = (data || []).map(({ password_hash: _, ...u }) => u)
  return NextResponse.json({ data: safeData })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isPrivileged = ['owner', 'admin', 'hr'].includes(user.role?.slug || '')
  if (!isPrivileged) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { email, password, first_name, last_name, phone, role_id, department_id, position_id, employee_id } = body

  const hash = await bcrypt.hash(password || 'Welcome@123', 12)

  // Auto-generate employee ID if not provided
  let empId = employee_id
  if (!empId) {
    const { count } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', user.tenant_id)
    empId = `EMP-${String((count || 0) + 1).padStart(3, '0')}`
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .insert({
      tenant_id: user.tenant_id,
      email: email.toLowerCase().trim(),
      password_hash: hash,
      first_name,
      last_name,
      phone,
      role_id,
      department_id,
      position_id,
      employee_id: empId,
    })
    .select('*, role:roles(*), department:departments(*)')
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Email already exists' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { password_hash: _, ...safeUser } = data
  return NextResponse.json({ data: safeUser })
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, ...updates } = body

  // Users can update their own profile (limited fields)
  const isSelf = id === user.id
  const isPrivileged = ['owner', 'admin', 'hr'].includes(user.role?.slug || '')

  if (!isSelf && !isPrivileged) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Remove sensitive fields from non-privileged users
  if (!isPrivileged) {
    delete updates.role_id
    delete updates.department_id
    delete updates.is_active
    delete updates.employee_id
  }

  if (updates.password) {
    updates.password_hash = await bcrypt.hash(updates.password, 12)
    delete updates.password
  }

  delete updates.tenant_id
  delete updates.password_hash // if passed directly

  const { data, error } = await supabaseAdmin
    .from('users')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', user.tenant_id)
    .select('*, role:roles(*), department:departments(*)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const { password_hash: _, ...safeUser } = data
  return NextResponse.json({ data: safeUser })
}
