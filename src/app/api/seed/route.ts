export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

export async function POST(req: Request) {
  const secret = process.env.SEED_SECRET
  if (!secret) return NextResponse.json({ error: 'Seed endpoint disabled' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  if (searchParams.get('secret') !== secret) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const adminEmail = process.env.SEED_ADMIN_EMAIL
  const adminPassword = process.env.SEED_ADMIN_PASSWORD
  if (!adminEmail || !adminPassword) return NextResponse.json({ error: 'SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD not set' }, { status: 500 })

  const existing = await prisma.profile.findFirst({ where: { email: adminEmail } })
  if (existing) return NextResponse.json({ message: 'Already seeded', email: adminEmail })

  const result = await prisma.$transaction(async tx => {
    const slug = `aiscern-${Date.now().toString().slice(-4)}`
    const tenant = await tx.tenant.create({
      data: {
        name: 'Aiscern',
        slug,
        subdomain: slug,
        timezone: 'Asia/Karachi',
        working_hours_start: '09:00',
        working_hours_end: '18:00',
        late_threshold: 15,
      },
    })

    await tx.setupWizardState.create({ data: { tenant_id: tenant.id, step: 5, is_complete: true, data: {} } })

    await tx.leaveType.createMany({
      data: [
        { tenant_id: tenant.id, name: 'Annual Leave', code: 'AL', color: '#3b82f6', days_per_year: 21 },
        { tenant_id: tenant.id, name: 'Sick Leave', code: 'SL', color: '#ef4444', days_per_year: 10 },
        { tenant_id: tenant.id, name: 'Casual Leave', code: 'CL', color: '#f59e0b', days_per_year: 7 },
        { tenant_id: tenant.id, name: 'Unpaid Leave', code: 'UL', color: '#6b7280', days_per_year: 0 },
      ],
    })

    await tx.shift.create({
      data: { tenant_id: tenant.id, name: 'General Shift', start_time: '09:00', end_time: '18:00', color: '#3b82f6' },
    })

    await tx.customRole.createMany({
      data: [
        { tenant_id: tenant.id, name: 'Owner', slug: 'owner', color: '#7c3aed', is_system: true, permissions: ['*'] },
        { tenant_id: tenant.id, name: 'Admin', slug: 'admin', color: '#2563eb', is_system: true, permissions: ['attendance.manage', 'employees.manage', 'leave.approve'] },
      ],
    })

    const hash = await bcrypt.hash(adminPassword, 12)
    const profile = await tx.profile.create({
      data: {
        tenant_id: tenant.id,
        email: adminEmail.toLowerCase(),
        password_hash: hash,
        full_name: 'Admin',
        first_name: 'Admin',
        last_name: '',
        role: 'owner',
        employee_id: 'EMP-001',
      },
    })

    return { tenant, profile }
  })

  // Supabase auth user (best-effort)
  try {
    await supabaseAdmin.auth.admin.createUser({
      email: adminEmail.toLowerCase(),
      password: adminPassword,
      user_metadata: { tenant_id: result.tenant.id, role: 'owner' },
      email_confirm: true,
    })
  } catch { /* non-fatal */ }

  return NextResponse.json({ message: 'Seeded successfully', email: adminEmail })
}
