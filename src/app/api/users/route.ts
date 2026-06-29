export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth.server'
import { prisma } from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase'
import { logAudit } from '@/lib/audit'
import bcrypt from 'bcryptjs'

function safeProfile(p: {
  id: string; email: string; full_name: string | null; first_name: string | null
  last_name: string | null; role: string; phone: string | null; employee_id: string | null
  department: string | null; position: string | null; is_active: boolean
  joining_date: Date | null; created_at: Date; avatar_url: string | null
  base_salary?: number | null
}) {
  return {
    id: p.id,
    email: p.email,
    full_name: p.full_name ?? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim(),
    first_name: p.first_name,
    last_name: p.last_name,
    role: p.role,
    phone: p.phone,
    employee_id: p.employee_id,
    department: p.department,
    position: p.position,
    is_active: p.is_active,
    joining_date: p.joining_date?.toISOString().split('T')[0] ?? null,
    created_at: p.created_at.toISOString(),
    avatar_url: p.avatar_url,
    base_salary: p.base_salary ?? null,
  }
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search')
  const dept = searchParams.get('department')
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
  const skip = (page - 1) * limit

  const where = {
    tenant_id: user.tenant_id,
    ...(dept ? { department: dept } : {}),
    ...(search ? {
      OR: [
        { full_name: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
        { employee_id: { contains: search, mode: 'insensitive' as const } },
      ],
    } : {}),
  }

  const [profiles, total] = await Promise.all([
    prisma.profile.findMany({
      where,
      select: {
        id: true, email: true, full_name: true, first_name: true, last_name: true,
        role: true, phone: true, employee_id: true, department: true, position: true,
        is_active: true, joining_date: true, created_at: true, avatar_url: true,
        base_salary: true, // BUG-4.2 FIX: expose salary field for payroll calculations
      },
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
    }),
    prisma.profile.count({ where }),
  ])

  return NextResponse.json({ data: profiles.map(safeProfile), total, page, limit })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['owner', 'admin'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { email, password, full_name, first_name, last_name, phone, role, department, position } = body

  // Check email uniqueness
  const existing = await prisma.profile.findFirst({
    where: { tenant_id: user.tenant_id, email: email.toLowerCase().trim() },
  })
  if (existing) return NextResponse.json({ error: 'Email already exists' }, { status: 409 })

  const hash = await bcrypt.hash(password || 'Welcome@123', 12)
  const count = await prisma.profile.count({ where: { tenant_id: user.tenant_id } })
  const empId = `EMP-${String(count + 1).padStart(3, '0')}`
  const displayName = full_name || `${first_name ?? ''} ${last_name ?? ''}`.trim() || email
  const rawPassword = password || 'Welcome@123'

  // CRITICAL FIX: Create Supabase auth user FIRST to get canonical UUID.
  // Profile id must match Supabase id or this employee can never log in.
  const { data: authData, error: authCreateError } = await supabaseAdmin.auth.admin.createUser({
    email: email.toLowerCase().trim(),
    password: rawPassword,
    user_metadata: { tenant_id: user.tenant_id, role: role || 'worker' },
    email_confirm: true,
  })

  if (authCreateError || !authData?.user) {
    console.error('[users POST] Supabase user creation failed:', authCreateError)
    return NextResponse.json(
      { error: 'Failed to create authentication account for this employee.' },
      { status: 500 }
    )
  }

  const supabaseUserId = authData.user.id
  let profile
  try {
    profile = await prisma.profile.create({
      data: {
        id: supabaseUserId, // Must match Supabase auth id
        tenant_id: user.tenant_id,
        email: email.toLowerCase().trim(),
        password_hash: hash,
        full_name: displayName,
        first_name,
        last_name,
        phone,
        role: role || 'worker',
        department,
        position,
        employee_id: empId,
      },
      select: {
        id: true, email: true, full_name: true, role: true,
        department: true, employee_id: true, is_active: true,
        first_name: true, last_name: true, phone: true,
        joining_date: true, created_at: true, avatar_url: true, position: true,
        base_salary: true,
      },
    })
  } catch (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(supabaseUserId).catch(() => {})
    console.error('[users POST] Profile creation failed:', profileError)
    return NextResponse.json({ error: 'Failed to create employee profile.' }, { status: 500 })
  }

  await logAudit(user.tenant_id, 'USER_CREATED', 'user', profile.id, { user, newValues: { email } })
  return NextResponse.json({ data: safeProfile(profile) }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, password, current_password, ...updates } = body

  const isSelf = id === user.id
  const isPrivileged = ['owner', 'admin'].includes(user.role)
  if (!isSelf && !isPrivileged) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // If changing own password, verify current password first
  if (password && isSelf && !isPrivileged) {
    if (!current_password) {
      return NextResponse.json({ error: 'Current password is required', code: 'CURRENT_PASSWORD_REQUIRED' }, { status: 400 })
    }
    const currentProfile = await prisma.profile.findUnique({ where: { id }, select: { password_hash: true } })
    if (!currentProfile?.password_hash) {
      return NextResponse.json({ error: 'Cannot verify current password', code: 'NO_PASSWORD_HASH' }, { status: 400 })
    }
    const valid = await bcrypt.compare(current_password, currentProfile.password_hash)
    if (!valid) {
      return NextResponse.json({ error: 'Current password is incorrect', code: 'WRONG_CURRENT_PASSWORD' }, { status: 400 })
    }
  }

  // Strip fields non-privileged users cannot touch
  if (!isPrivileged) {
    delete updates.role
    delete updates.is_active
    delete updates.employee_id
    delete updates.tenant_id
  }
  delete updates.tenant_id
  delete updates.password_hash

  const updateData: Record<string, unknown> = { ...updates }
  if (password) {
    updateData.password_hash = await bcrypt.hash(password, 12)
    // Sync password to Supabase auth so login continues to work
    await supabaseAdmin.auth.admin.updateUserById(id, { password }).catch(console.error)
  }

  // Sync is_active → Supabase ban so deactivated users can't log in
  if (typeof updates.is_active === 'boolean') {
    await supabaseAdmin.auth.admin.updateUserById(id, {
      ban_duration: updates.is_active ? 'none' : '876600h', // ~100 years = effectively banned
    }).catch(console.error)
  }

  const profile = await prisma.profile.update({
    where: { id, tenant_id: user.tenant_id },
    data: updateData,
    select: {
      id: true, email: true, full_name: true, role: true,
      department: true, employee_id: true, is_active: true,
      first_name: true, last_name: true, phone: true,
      joining_date: true, created_at: true, avatar_url: true, position: true,
    },
  })

  await logAudit(user.tenant_id, 'USER_UPDATED', 'user', id, { user })
  return NextResponse.json({ data: safeProfile(profile) })
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['owner', 'admin'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'User ID required' }, { status: 400 })
  if (id === user.id) return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })

  // Soft delete
  await prisma.profile.update({
    where: { id, tenant_id: user.tenant_id },
    data: { is_active: false },
  })

  await logAudit(user.tenant_id, 'USER_DEACTIVATED', 'user', id, { user })
  return NextResponse.json({ success: true })
}
