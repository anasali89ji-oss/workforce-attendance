import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/setup - check if setup is needed
export async function GET() {
  try {
    // Check if any tenant exists
    const { data: tenants } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .limit(1)

    if (tenants && tenants.length > 0) {
      // Check setup wizard state
      const { data: state } = await supabaseAdmin
        .from('setup_wizard_state')
        .select('*')
        .eq('tenant_id', tenants[0].id)
        .single()

      return NextResponse.json({
        needs_setup: !state?.is_complete,
        tenant_exists: true,
        setup_state: state,
      })
    }

    return NextResponse.json({ needs_setup: true, tenant_exists: false })
  } catch {
    return NextResponse.json({ needs_setup: true, tenant_exists: false })
  }
}

// POST /api/setup - run a setup step
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { step, data } = body

    switch (step) {
      case 1: return await setupTenant(data)
      case 2: return await setupOwner(data)
      case 3: return await setupWorkHours(data)
      case 4: return await setupShifts(data)
      case 5: return await completeSetup(data)
      default:
        return NextResponse.json({ error: 'Invalid step' }, { status: 400 })
    }
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Setup failed' }, { status: 500 })
  }
}

async function setupTenant(data: { name: string; timezone: string; slug?: string }) {
  const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')

  const { data: tenant, error } = await supabaseAdmin
    .from('tenants')
    .insert({ name: data.name, slug, timezone: data.timezone || 'UTC' })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Company name already taken' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Create setup wizard state
  await supabaseAdmin.from('setup_wizard_state').insert({
    tenant_id: tenant.id,
    step: 2,
    data: { tenant: { name: tenant.name, id: tenant.id } },
  })

  // Seed permissions
  await seedPermissions()

  // Seed system roles
  await seedSystemRoles(tenant.id)

  // Seed default leave types
  await supabaseAdmin.from('leave_types').insert([
    { tenant_id: tenant.id, name: 'Annual Leave', code: 'AL', color: '#3b82f6', days_per_year: 21 },
    { tenant_id: tenant.id, name: 'Sick Leave', code: 'SL', color: '#ef4444', days_per_year: 10 },
    { tenant_id: tenant.id, name: 'Casual Leave', code: 'CL', color: '#f59e0b', days_per_year: 7 },
    { tenant_id: tenant.id, name: 'Unpaid Leave', code: 'UL', color: '#6b7280', days_per_year: 0 },
  ])

  return NextResponse.json({ success: true, tenant_id: tenant.id })
}

async function setupOwner(data: {
  tenant_id: string
  first_name: string
  last_name: string
  email: string
  password: string
}) {
  const bcrypt = await import('bcryptjs')
  const hash = await bcrypt.hash(data.password, 12)

  // Get owner role
  const { data: role } = await supabaseAdmin
    .from('roles')
    .select('id')
    .eq('tenant_id', data.tenant_id)
    .eq('slug', 'owner')
    .single()

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .insert({
      tenant_id: data.tenant_id,
      email: data.email.toLowerCase().trim(),
      password_hash: hash,
      first_name: data.first_name,
      last_name: data.last_name,
      role_id: role?.id,
      employee_id: 'EMP-001',
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await supabaseAdmin
    .from('setup_wizard_state')
    .update({ step: 3 })
    .eq('tenant_id', data.tenant_id)

  return NextResponse.json({ success: true, user_id: user.id })
}

async function setupWorkHours(data: {
  tenant_id: string
  working_hours_start: string
  working_hours_end: string
  working_days: string[]
  late_threshold: number
}) {
  await supabaseAdmin
    .from('tenants')
    .update({
      working_hours_start: data.working_hours_start,
      working_hours_end: data.working_hours_end,
      working_days: data.working_days,
      late_threshold: data.late_threshold,
    })
    .eq('id', data.tenant_id)

  await supabaseAdmin
    .from('setup_wizard_state')
    .update({ step: 4 })
    .eq('tenant_id', data.tenant_id)

  return NextResponse.json({ success: true })
}

async function setupShifts(data: { tenant_id: string; shifts: Array<{ name: string; start_time: string; end_time: string; color: string }> }) {
  if (data.shifts && data.shifts.length > 0) {
    await supabaseAdmin.from('shifts').insert(
      data.shifts.map(s => ({ ...s, tenant_id: data.tenant_id }))
    )
  } else {
    // Default shift
    await supabaseAdmin.from('shifts').insert({
      tenant_id: data.tenant_id,
      name: 'General Shift',
      start_time: '09:00',
      end_time: '18:00',
      color: '#3b82f6',
    })
  }

  await supabaseAdmin
    .from('setup_wizard_state')
    .update({ step: 5 })
    .eq('tenant_id', data.tenant_id)

  return NextResponse.json({ success: true })
}

async function completeSetup(data: { tenant_id: string }) {
  // Create default kanban board
  const { data: board } = await supabaseAdmin
    .from('kanban_boards')
    .insert({ tenant_id: data.tenant_id, name: 'Team Tasks', created_by: data.tenant_id })
    .select()
    .single()

  if (board) {
    await supabaseAdmin.from('kanban_columns').insert([
      { board_id: board.id, name: 'To Do', color: '#6b7280', position: 0 },
      { board_id: board.id, name: 'In Progress', color: '#3b82f6', position: 1 },
      { board_id: board.id, name: 'Review', color: '#f59e0b', position: 2 },
      { board_id: board.id, name: 'Done', color: '#10b981', position: 3 },
    ])
  }

  await supabaseAdmin
    .from('setup_wizard_state')
    .update({ step: 5, is_complete: true })
    .eq('tenant_id', data.tenant_id)

  return NextResponse.json({ success: true })
}

async function seedPermissions() {
  const permissions = [
    // Attendance
    { module: 'attendance', name: 'View Attendance', slug: 'attendance.view' },
    { module: 'attendance', name: 'Manage Attendance', slug: 'attendance.manage' },
    { module: 'attendance', name: 'Clock In/Out', slug: 'attendance.clock' },
    // Employees
    { module: 'employees', name: 'View Employees', slug: 'employees.view' },
    { module: 'employees', name: 'Create Employees', slug: 'employees.create' },
    { module: 'employees', name: 'Edit Employees', slug: 'employees.edit' },
    { module: 'employees', name: 'Delete Employees', slug: 'employees.delete' },
    // Leave
    { module: 'leave', name: 'View Leaves', slug: 'leave.view' },
    { module: 'leave', name: 'Apply Leave', slug: 'leave.apply' },
    { module: 'leave', name: 'Approve Leave', slug: 'leave.approve' },
    { module: 'leave', name: 'Manage Leave Types', slug: 'leave.manage_types' },
    // Roles
    { module: 'roles', name: 'View Roles', slug: 'roles.view' },
    { module: 'roles', name: 'Create Roles', slug: 'roles.create' },
    { module: 'roles', name: 'Edit Roles', slug: 'roles.edit' },
    { module: 'roles', name: 'Delete Roles', slug: 'roles.delete' },
    // Analytics
    { module: 'analytics', name: 'View Analytics', slug: 'analytics.view' },
    { module: 'analytics', name: 'Export Reports', slug: 'analytics.export' },
    // Kanban
    { module: 'kanban', name: 'View Kanban', slug: 'kanban.view' },
    { module: 'kanban', name: 'Manage Kanban', slug: 'kanban.manage' },
    // Settings
    { module: 'settings', name: 'View Settings', slug: 'settings.view' },
    { module: 'settings', name: 'Manage Settings', slug: 'settings.manage' },
    // Payroll
    { module: 'payroll', name: 'View Payroll', slug: 'payroll.view' },
    { module: 'payroll', name: 'Manage Payroll', slug: 'payroll.manage' },
  ]

  // Upsert permissions
  await supabaseAdmin.from('permissions').upsert(permissions, { onConflict: 'slug' })
}

async function seedSystemRoles(tenantId: string) {
  const { data: perms } = await supabaseAdmin.from('permissions').select('id, slug')
  const permMap = Object.fromEntries((perms || []).map(p => [p.slug, p.id]))

  const roles = [
    {
      name: 'Owner',
      slug: 'owner',
      description: 'Full system access',
      color: '#7c3aed',
      is_system: true,
      perms: Object.keys(permMap),
    },
    {
      name: 'Admin',
      slug: 'admin',
      description: 'Administrative access',
      color: '#2563eb',
      is_system: true,
      perms: Object.keys(permMap).filter(p => !['settings.manage', 'payroll.manage'].includes(p)),
    },
    {
      name: 'HR Manager',
      slug: 'hr',
      description: 'HR operations',
      color: '#059669',
      is_system: true,
      perms: ['attendance.view', 'attendance.manage', 'employees.view', 'employees.create', 'employees.edit', 'leave.view', 'leave.approve', 'leave.manage_types', 'analytics.view', 'analytics.export'],
    },
    {
      name: 'Manager',
      slug: 'manager',
      description: 'Team management',
      color: '#d97706',
      is_system: true,
      perms: ['attendance.view', 'attendance.clock', 'employees.view', 'leave.view', 'leave.approve', 'kanban.view', 'kanban.manage', 'analytics.view'],
    },
    {
      name: 'Employee',
      slug: 'employee',
      description: 'Standard employee',
      color: '#0891b2',
      is_system: true,
      perms: ['attendance.clock', 'leave.view', 'leave.apply', 'kanban.view'],
    },
  ]

  for (const roleData of roles) {
    const { data: role } = await supabaseAdmin
      .from('roles')
      .insert({
        tenant_id: tenantId,
        name: roleData.name,
        slug: roleData.slug,
        description: roleData.description,
        color: roleData.color,
        is_system: roleData.is_system,
      })
      .select()
      .single()

    if (role && roleData.perms.length > 0) {
      const rolePerms = roleData.perms
        .filter(p => permMap[p])
        .map(p => ({ role_id: role.id, permission_id: permMap[p] }))

      if (rolePerms.length > 0) {
        await supabaseAdmin.from('role_permissions').insert(rolePerms)
      }
    }
  }
}
