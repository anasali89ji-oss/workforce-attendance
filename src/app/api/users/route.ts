import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth.server'
import { supabaseAdmin } from '@/lib/supabase'
import { handleApiError, ForbiddenError } from '@/lib/errors'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const VALID_ROLES = ['owner', 'admin', 'manager', 'worker'] as const

const createUserSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password min 8 chars').max(100),
  full_name: z.string().min(2).max(100),
  first_name: z.string().max(50).optional(),
  last_name: z.string().max(50).optional(),
  phone: z.string().max(20).optional(),
  role: z.enum(VALID_ROLES).default('worker'),
  department: z.string().max(100).optional(),
  position: z.string().max(100).optional(),
})

const updateUserSchema = z.object({
  id: z.string().uuid(),
  full_name: z.string().min(2).max(100).optional(),
  first_name: z.string().max(50).optional(),
  last_name: z.string().max(50).optional(),
  phone: z.string().max(20).optional(),
  department: z.string().max(100).optional(),
  position: z.string().max(100).optional(),
  role: z.enum(VALID_ROLES).optional(),
  is_active: z.boolean().optional(),
  password: z.string().min(8).max(100).optional(),
  avatar_url: z.string().url().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')
    const department = searchParams.get('department')
    const role = searchParams.get('role')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = (page - 1) * limit

    let query = supabaseAdmin
      .from('profiles')
      .select('id,email,full_name,first_name,last_name,avatar_url,role,employee_id,department,position,phone,is_active,joining_date,created_at', { count: 'exact' })
      .eq('tenant_id', user.tenant_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,employee_id.ilike.%${search}%`)
    if (department) query = query.eq('department', department)
    if (role) query = query.eq('role', role)

    const { data, error, count } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ data, count, page, limit })
  } catch (err) {
    return handleApiError(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['owner', 'admin'].includes(user.role)) throw new ForbiddenError()

    const body = await req.json()
    // FIX-006: Zod validation
    const result = createUserSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input', details: result.error.flatten().fieldErrors }, { status: 400 })
    }

    const { email, password, full_name, first_name, last_name, phone, role, department, position } = result.data

    // Check email uniqueness in tenant
    const { data: existing } = await supabaseAdmin.from('profiles')
      .select('id').eq('tenant_id', user.tenant_id).eq('email', email.toLowerCase()).maybeSingle()
    if (existing) return NextResponse.json({ error: 'Email already exists in this organization' }, { status: 409 })

    const password_hash = await bcrypt.hash(password, 12)
    // FIX-014: UUID-based employee ID to avoid race conditions
    const employee_id = `EMP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`

    const { data: newUser, error } = await supabaseAdmin.from('profiles').insert({
      tenant_id: user.tenant_id,
      email: email.toLowerCase().trim(),
      password_hash,
      full_name,
      first_name,
      last_name,
      phone,
      role,
      department,
      position,
      employee_id,
      is_active: true,
    }).select('id,email,full_name,role,employee_id,department,is_active').single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: newUser }, { status: 201 })
  } catch (err) {
    return handleApiError(err)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    // FIX-006: Zod validation
    const result = updateUserSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input', details: result.error.flatten().fieldErrors }, { status: 400 })
    }

    const { id, password, ...updates } = result.data
    const isSelf = id === user.id
    const isPrivileged = ['owner', 'admin'].includes(user.role)

    // FIX-007: Non-privileged users CANNOT change role even on self
    if (!isPrivileged) {
      delete updates.role
      delete updates.is_active
      // Restrict self-edit to safe fields only
      if (isSelf) {
        const allowed = new Set(['full_name', 'first_name', 'last_name', 'phone', 'avatar_url'])
        for (const key of Object.keys(updates)) {
          if (!allowed.has(key)) delete (updates as Record<string, unknown>)[key]
        }
      } else {
        throw new ForbiddenError()
      }
    }

    // Double-guard: reject role escalation explicitly
    if (updates.role && !isPrivileged) {
      return NextResponse.json({ error: 'Forbidden: cannot change role' }, { status: 403 })
    }

    const finalUpdates: Record<string, unknown> = { ...updates, updated_at: new Date().toISOString() }
    if (password) finalUpdates.password_hash = await bcrypt.hash(password, 12)

    const { data, error } = await supabaseAdmin.from('profiles')
      .update(finalUpdates)
      .eq('id', id)
      .eq('tenant_id', user.tenant_id)
      .select('id,email,full_name,role,department,employee_id,is_active')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch (err) {
    return handleApiError(err)
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !['owner', 'admin'].includes(user.role)) throw new ForbiddenError()

    const { id } = await req.json()
    if (id === user.id) return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })

    const { error } = await supabaseAdmin.from('profiles')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', user.tenant_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    return handleApiError(err)
  }
}
