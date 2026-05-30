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
      case 1: return setupTenant(data)
      case 2: return setupOwner(data)
      case 3: return setupWorkHours(data)
      case 4: return setupShifts(data)
      case 5: return completeSetup(data)
      default: return NextResponse.json({ error: 'Invalid step' }, { status: 400 })
    }
  } catch (e) {
    console.error('[setup]', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

async function setupTenant(data: { name: string; timezone: string; logo_url?: string }) {
  const slug = data.name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  // Ensure unique slug/subdomain
  const existing = await prisma.tenant.findFirst({ where: { slug } })
  const finalSlug = existing ? `${slug}-${Date.now().toString().slice(-4)}` : slug

  const result = await prisma.$transaction(async tx => {
    const tenant = await tx.tenant.create({
      data: {
        name: data.name,
        slug: finalSlug,
        subdomain: finalSlug,
        timezone: data.timezone || 'Asia/Karachi',
        logo_url: data.logo_url,
      },
    })

    await tx.setupWizardState.create({ data: { tenant_id: tenant.id, step: 2, data: {} } })

    // Seed default leave types
    await tx.leaveType.createMany({
      data: [
        { tenant_id: tenant.id, name: 'Annual Leave', code: 'AL', color: '#3b82f6', days_per_year: 21 },
        { tenant_id: tenant.id, name: 'Sick Leave', code: 'SL', color: '#ef4444', days_per_year: 10 },
        { tenant_id: tenant.id, name: 'Casual Leave', code: 'CL', color: '#f59e0b', days_per_year: 7 },
        { tenant_id: tenant.id, name: 'Unpaid Leave', code: 'UL', color: '#6b7280', days_per_year: 0 },
      ],
    })

    // Seed custom roles
    await tx.customRole.createMany({
      data: [
        { tenant_id: tenant.id, name: 'Owner', slug: 'owner', color: '#7c3aed', is_system: true, permissions: ['*'] },
        { tenant_id: tenant.id, name: 'Admin', slug: 'admin', color: '#2563eb', is_system: true, permissions: ['attendance.manage', 'employees.manage', 'leave.approve', 'roles.manage', 'analytics.view', 'kanban.manage', 'settings.manage'] },
        { tenant_id: tenant.id, name: 'Manager', slug: 'manager', color: '#d97706', is_system: true, permissions: ['attendance.view', 'attendance.clock', 'employees.view', 'leave.approve', 'kanban.manage', 'analytics.view'] },
        { tenant_id: tenant.id, name: 'Employee', slug: 'worker', color: '#0891b2', is_system: true, permissions: ['attendance.clock', 'leave.apply', 'kanban.view'] },
      ],
    })

    return tenant
  })

  return NextResponse.json({ success: true, tenant_id: result.id })
}

async function setupOwner(data: {
  tenant_id: string
  first_name: string
  last_name: string
  email: string
  password: string
}) {
  const hash = await bcrypt.hash(data.password, 12)
  const fullName = `${data.first_name} ${data.last_name}`.trim()

  const profile = await prisma.profile.create({
    data: {
      tenant_id: data.tenant_id,
      email: data.email.toLowerCase().trim(),
      password_hash: hash,
      full_name: fullName,
      first_name: data.first_name,
      last_name: data.last_name,
      role: 'owner',
      employee_id: 'EMP-001',
    },
  })

  // Create Supabase auth user for session management
  try {
    await supabaseAdmin.auth.admin.createUser({
      email: data.email.toLowerCase().trim(),
      password: data.password,
      user_metadata: { tenant_id: data.tenant_id, role: 'owner' },
      email_confirm: true,
    })
  } catch {
    // Non-fatal: Supabase auth user creation is best-effort
  }

  await prisma.setupWizardState.update({
    where: { tenant_id: data.tenant_id },
    data: { step: 3 },
  })

  return NextResponse.json({ success: true, profile_id: profile.id })
}

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
      working_hours_end: data.working_hours_end || '18:00',
      working_days: data.working_days || ['MON', 'TUE', 'WED', 'THU', 'FRI'],
      late_threshold: data.late_threshold ?? 15,
    },
  })

  await prisma.setupWizardState.update({ where: { tenant_id: data.tenant_id }, data: { step: 4 } })
  return NextResponse.json({ success: true })
}

async function setupShifts(data: {
  tenant_id: string
  shifts: Array<{ name: string; start_time: string; end_time: string; color?: string; is_night?: boolean }>
}) {
  await prisma.shift.createMany({
    data: data.shifts.map(s => ({
      tenant_id: data.tenant_id,
      name: s.name,
      start_time: s.start_time,
      end_time: s.end_time,
      color: s.color || '#3b82f6',
      is_night: s.is_night ?? false,
    })),
  })

  await prisma.setupWizardState.update({ where: { tenant_id: data.tenant_id }, data: { step: 5 } })
  return NextResponse.json({ success: true })
}

async function completeSetup(data: { tenant_id: string }) {
  await prisma.setupWizardState.update({
    where: { tenant_id: data.tenant_id },
    data: { step: 5, is_complete: true },
  })
  return NextResponse.json({ success: true })
}
