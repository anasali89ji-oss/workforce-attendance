export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

export async function GET() {
  try {
    const tenant = await prisma.tenant.findFirst({ select: { id: true } })
    if (!tenant) return NextResponse.json({ needs_setup: true, tenant_exists: false })

    const state = await prisma.setupWizardState.findUnique({ where: { tenant_id: tenant.id } })
    return NextResponse.json({ needs_setup: !state?.is_complete, tenant_exists: true, setup_state: state })
  } catch {
    return NextResponse.json({ needs_setup: true, tenant_exists: false })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { step, data } = await req.json()
    switch (step) {
      case 1: return await setupTenant(data)
      case 2: return await setupOwner(data)
      case 3: return await setupWorkHours(data)
      case 4: return await setupShifts(data)
      case 5: return await completeSetup(data)
      default: return NextResponse.json({ error: 'Invalid step' }, { status: 400 })
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[setup] Unhandled error:', msg)
    return NextResponse.json({ error: `Setup failed: ${msg}` }, { status: 500 })
  }
}

// ─── STEP 1: Create tenant ────────────────────────────────────────────────────
async function setupTenant(data: { name: string; timezone: string; logo_url?: string }) {
  if (!data.name?.trim()) {
    return NextResponse.json({ error: 'Company name is required' }, { status: 400 })
  }

  const slug = data.name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    || 'company'

  // If a tenant already exists from a previous attempt, reuse it
  const existingTenant = await prisma.tenant.findFirst({ select: { id: true, name: true } })
  if (existingTenant) {
    // Update the existing tenant with new details
    await prisma.tenant.update({
      where: { id: existingTenant.id },
      data: {
        name: data.name,
        timezone: data.timezone || 'Asia/Karachi',
        logo_url: data.logo_url ?? undefined,
      },
    })
    return NextResponse.json({ success: true, tenant_id: existingTenant.id })
  }

  // Fresh install: create everything in one transaction
  const finalSlug = `${slug}-${Date.now().toString().slice(-6)}`

  const tenant = await prisma.$transaction(async tx => {
    const t = await tx.tenant.create({
      data: {
        name: data.name,
        slug: finalSlug,
        subdomain: finalSlug,
        timezone: data.timezone || 'Asia/Karachi',
        logo_url: data.logo_url,
      },
    })

    await tx.setupWizardState.create({ data: { tenant_id: t.id, step: 2, data: {} } })

    await tx.leaveType.createMany({
      data: [
        { tenant_id: t.id, name: 'Annual Leave',  code: 'AL', color: '#3b82f6', days_per_year: 21 },
        { tenant_id: t.id, name: 'Sick Leave',    code: 'SL', color: '#ef4444', days_per_year: 10 },
        { tenant_id: t.id, name: 'Casual Leave',  code: 'CL', color: '#f59e0b', days_per_year: 7  },
        { tenant_id: t.id, name: 'Unpaid Leave',  code: 'UL', color: '#6b7280', days_per_year: 0  },
      ],
    })

    await tx.customRole.createMany({
      data: [
        { tenant_id: t.id, name: 'Owner',    slug: 'owner',   color: '#7c3aed', is_system: true, permissions: ['*'] },
        { tenant_id: t.id, name: 'Admin',    slug: 'admin',   color: '#2563eb', is_system: true, permissions: ['attendance:read','attendance:manage','employees:read','employees:write','employees:delete','leave:approve','overtime:approve','roles:read','roles:write','analytics:read','reports:read','kanban:read','kanban:write','settings:read','settings:write','payroll:read','payroll:write','audit:read'] },
        { tenant_id: t.id, name: 'Manager',  slug: 'manager', color: '#d97706', is_system: true, permissions: ['attendance:read','attendance:clock','employees:read','departments:read','leave:approve','overtime:approve','kanban:read','kanban:write','analytics:read','reports:read','team:read'] },
        { tenant_id: t.id, name: 'Employee', slug: 'worker',  color: '#0891b2', is_system: true, permissions: ['profile:read','profile:write','attendance:clock','leave:request','overtime:request','kanban:read'] },
      ],
    })

    return t
  })

  return NextResponse.json({ success: true, tenant_id: tenant.id })
}

// ─── STEP 2: Create owner account ─────────────────────────────────────────────
async function setupOwner(data: {
  tenant_id: string
  first_name: string
  last_name: string
  email: string
  password: string
}) {
  if (!data.tenant_id || !data.email || !data.password) {
    return NextResponse.json({ error: 'tenant_id, email and password are required' }, { status: 400 })
  }

  const normalizedEmail = data.email.toLowerCase().trim()
  const fullName = `${data.first_name ?? ''} ${data.last_name ?? ''}`.trim() || normalizedEmail
  const hash = await bcrypt.hash(data.password, 12)

  // Check if profile already exists for this tenant (retry scenario)
  const existingProfile = await prisma.profile.findFirst({
    where: { tenant_id: data.tenant_id, role: 'owner' },
    select: { id: true, email: true },
  })

  if (existingProfile) {
    // Owner already created — update password in case it changed, advance step
    await prisma.profile.update({
      where: { id: existingProfile.id },
      data: { password_hash: hash, email: normalizedEmail, full_name: fullName },
    })
    // Sync password to Supabase too
    await supabaseAdmin.auth.admin.updateUserById(existingProfile.id, { password: data.password }).catch(() => {})
    await prisma.setupWizardState.update({ where: { tenant_id: data.tenant_id }, data: { step: 3 } })
    return NextResponse.json({ success: true, profile_id: existingProfile.id })
  }

  // CRITICAL: Create Supabase auth user FIRST to get the canonical UUID.
  // Profile.id must equal Supabase auth user id or getCurrentUser() always returns null.
  let supabaseUserId: string

  // Check if Supabase user already exists (from a previous failed attempt)
  const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
  const existingSupaUsers = (listData?.users ?? []) as Array<{ id: string; email?: string }>
  const existingSupaUser = existingSupaUsers.find(u => u.email === normalizedEmail)

  if (existingSupaUser) {
    // Reuse existing Supabase user — update password to match what user just entered
    await supabaseAdmin.auth.admin.updateUserById(existingSupaUser.id, {
      password: data.password,
      user_metadata: { tenant_id: data.tenant_id, role: 'owner' },
    })
    supabaseUserId = existingSupaUser.id
  } else {
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password: data.password,
      user_metadata: { tenant_id: data.tenant_id, role: 'owner' },
      email_confirm: true,
    })

    if (authError || !authData?.user) {
      console.error('[setup] Supabase createUser failed:', authError?.message)
      return NextResponse.json(
        { error: `Supabase auth error: ${authError?.message ?? 'Unknown error'}. Check SUPABASE_SERVICE_ROLE_KEY.` },
        { status: 500 }
      )
    }
    supabaseUserId = authData.user.id
  }

  // Create Prisma profile with Supabase UUID as id
  try {
    await prisma.profile.create({
      data: {
        id: supabaseUserId,
        tenant_id: data.tenant_id,
        email: normalizedEmail,
        password_hash: hash,
        full_name: fullName,
        first_name: data.first_name,
        last_name: data.last_name,
        role: 'owner',
        employee_id: 'EMP-001',
      },
    })
  } catch (err) {
    // If profile create fails, clean up Supabase user (only if we just created it)
    if (!existingSupaUser) {
      await supabaseAdmin.auth.admin.deleteUser(supabaseUserId).catch(() => {})
    }
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[setup] Profile create failed:', msg)
    return NextResponse.json({ error: `Profile creation failed: ${msg}` }, { status: 500 })
  }

  await prisma.setupWizardState.update({ where: { tenant_id: data.tenant_id }, data: { step: 3 } })
  return NextResponse.json({ success: true, profile_id: supabaseUserId })
}

// ─── STEP 3: Work hours ────────────────────────────────────────────────────────
async function setupWorkHours(data: {
  tenant_id: string
  working_hours_start: string
  working_hours_end: string
  working_days: string[]
  late_threshold: number
}) {
  await prisma.tenant.update({
    where: { id: data.tenant_id },
    data: {
      working_hours_start: data.working_hours_start || '09:00',
      working_hours_end:   data.working_hours_end   || '18:00',
      working_days:        data.working_days         || ['MON','TUE','WED','THU','FRI'],
      late_threshold:      data.late_threshold       ?? 15,
    },
  })
  await prisma.setupWizardState.update({ where: { tenant_id: data.tenant_id }, data: { step: 4 } })
  return NextResponse.json({ success: true })
}

// ─── STEP 4: Shifts ────────────────────────────────────────────────────────────
async function setupShifts(data: {
  tenant_id: string
  shifts: Array<{ name: string; start_time: string; end_time: string; color?: string; is_night?: boolean }>
}) {
  // Delete any shifts from a previous attempt before re-creating
  await prisma.shift.deleteMany({ where: { tenant_id: data.tenant_id } })

  if (data.shifts?.length) {
    await prisma.shift.createMany({
      data: data.shifts.map(s => ({
        tenant_id: data.tenant_id,
        name:       s.name || 'General Shift',
        start_time: s.start_time,
        end_time:   s.end_time,
        color:      s.color || '#3b82f6',
        is_night:   s.is_night ?? false,
      })),
    })
  } else {
    // Default shift if user skipped
    await prisma.shift.create({
      data: { tenant_id: data.tenant_id, name: 'General Shift', start_time: '09:00', end_time: '18:00', color: '#3b82f6' },
    })
  }

  await prisma.setupWizardState.update({ where: { tenant_id: data.tenant_id }, data: { step: 5 } })
  return NextResponse.json({ success: true })
}

// ─── STEP 5: Complete ──────────────────────────────────────────────────────────
async function completeSetup(data: { tenant_id: string }) {
  await prisma.setupWizardState.update({
    where: { tenant_id: data.tenant_id },
    data: { step: 5, is_complete: true },
  })
  return NextResponse.json({ success: true })
}
