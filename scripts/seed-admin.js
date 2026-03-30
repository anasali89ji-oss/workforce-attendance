#!/usr/bin/env node
/**
 * Run: node scripts/seed-admin.js
 * Creates the default tenant + admin account in Supabase directly
 */

const { createClient } = require('@supabase/supabase-js')
const bcrypt = require('bcryptjs')
const { randomUUID } = require('crypto')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ftgmhxonpalytrnficfp.supabase.co'
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0Z21oeG9ucGFseXRybmZpY2ZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc2MzYxNCwiZXhwIjoyMDkwMzM5NjE0fQ.B71EIHIpRkspwa1FBbOvv9jmH8Ik7CXtLYva2qiWM9Q'

const db = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const ADMIN_EMAIL = 'admin@aiscern.com'
const ADMIN_PASSWORD = 'Admin@123456'
const COMPANY_NAME = 'Aiscern'

async function seed() {
  console.log('🌱 Seeding admin account...')

  // Check if already seeded
  const { data: existing } = await db.from('users').select('id').eq('email', ADMIN_EMAIL).single()
  if (existing) {
    console.log('✅ Admin already exists. Login:', ADMIN_EMAIL, '/', ADMIN_PASSWORD)
    return
  }

  // Create tenant
  const tenantId = randomUUID()
  const { error: tenantErr } = await db.from('tenants').insert({
    id: tenantId,
    name: COMPANY_NAME,
    slug: 'aiscern',
    timezone: 'Asia/Karachi',
    working_hours_start: '09:00',
    working_hours_end: '18:00',
    working_days: ['MON','TUE','WED','THU','FRI'],
    late_threshold: 15,
  })
  if (tenantErr) { console.error('Tenant error:', tenantErr.message); return }

  // Seed permissions
  const permissions = [
    { module: 'attendance', name: 'View Attendance', slug: 'attendance.view' },
    { module: 'attendance', name: 'Manage Attendance', slug: 'attendance.manage' },
    { module: 'attendance', name: 'Clock In/Out', slug: 'attendance.clock' },
    { module: 'employees', name: 'View Employees', slug: 'employees.view' },
    { module: 'employees', name: 'Create Employees', slug: 'employees.create' },
    { module: 'employees', name: 'Edit Employees', slug: 'employees.edit' },
    { module: 'employees', name: 'Delete Employees', slug: 'employees.delete' },
    { module: 'leave', name: 'View Leaves', slug: 'leave.view' },
    { module: 'leave', name: 'Apply Leave', slug: 'leave.apply' },
    { module: 'leave', name: 'Approve Leave', slug: 'leave.approve' },
    { module: 'leave', name: 'Manage Leave Types', slug: 'leave.manage_types' },
    { module: 'roles', name: 'View Roles', slug: 'roles.view' },
    { module: 'roles', name: 'Create Roles', slug: 'roles.create' },
    { module: 'roles', name: 'Edit Roles', slug: 'roles.edit' },
    { module: 'roles', name: 'Delete Roles', slug: 'roles.delete' },
    { module: 'analytics', name: 'View Analytics', slug: 'analytics.view' },
    { module: 'analytics', name: 'Export Reports', slug: 'analytics.export' },
    { module: 'kanban', name: 'View Kanban', slug: 'kanban.view' },
    { module: 'kanban', name: 'Manage Kanban', slug: 'kanban.manage' },
    { module: 'settings', name: 'View Settings', slug: 'settings.view' },
    { module: 'settings', name: 'Manage Settings', slug: 'settings.manage' },
    { module: 'payroll', name: 'View Payroll', slug: 'payroll.view' },
    { module: 'payroll', name: 'Manage Payroll', slug: 'payroll.manage' },
  ]
  await db.from('permissions').upsert(permissions, { onConflict: 'slug' })
  const { data: perms } = await db.from('permissions').select('id, slug')
  const permMap = Object.fromEntries((perms || []).map(p => [p.slug, p.id]))

  // Create owner role
  const roleId = randomUUID()
  await db.from('roles').insert({
    id: roleId, tenant_id: tenantId, name: 'Owner', slug: 'owner',
    description: 'Full system access', color: '#7c3aed', is_system: true,
  })
  // All permissions for owner
  const rolePerms = Object.values(permMap).map(pid => ({ role_id: roleId, permission_id: pid }))
  await db.from('role_permissions').insert(rolePerms)

  // Create other system roles
  const otherRoles = [
    { name: 'Admin', slug: 'admin', color: '#2563eb', perms: Object.keys(permMap).filter(p => !['settings.manage'].includes(p)) },
    { name: 'HR Manager', slug: 'hr', color: '#059669', perms: ['attendance.view','attendance.manage','employees.view','employees.create','employees.edit','leave.view','leave.approve','leave.manage_types','analytics.view'] },
    { name: 'Manager', slug: 'manager', color: '#d97706', perms: ['attendance.view','attendance.clock','employees.view','leave.view','leave.approve','kanban.view','kanban.manage','analytics.view'] },
    { name: 'Employee', slug: 'employee', color: '#0891b2', perms: ['attendance.clock','leave.view','leave.apply','kanban.view'] },
  ]
  for (const r of otherRoles) {
    const rid = randomUUID()
    await db.from('roles').insert({ id: rid, tenant_id: tenantId, name: r.name, slug: r.slug, color: r.color, is_system: true })
    const rp = r.perms.filter(p => permMap[p]).map(p => ({ role_id: rid, permission_id: permMap[p] }))
    if (rp.length) await db.from('role_permissions').insert(rp)
  }

  // Default leave types
  await db.from('leave_types').insert([
    { tenant_id: tenantId, name: 'Annual Leave', code: 'AL', color: '#3b82f6', days_per_year: 21 },
    { tenant_id: tenantId, name: 'Sick Leave', code: 'SL', color: '#ef4444', days_per_year: 10 },
    { tenant_id: tenantId, name: 'Casual Leave', code: 'CL', color: '#f59e0b', days_per_year: 7 },
    { tenant_id: tenantId, name: 'Unpaid Leave', code: 'UL', color: '#6b7280', days_per_year: 0 },
  ])

  // Default shift
  await db.from('shifts').insert({
    tenant_id: tenantId, name: 'General Shift', start_time: '09:00', end_time: '18:00', color: '#3b82f6'
  })

  // Default kanban board
  const boardId = randomUUID()
  await db.from('kanban_boards').insert({ id: boardId, tenant_id: tenantId, name: 'Team Tasks', created_by: tenantId })
  await db.from('kanban_columns').insert([
    { board_id: boardId, name: 'To Do', color: '#6b7280', position: 0 },
    { board_id: boardId, name: 'In Progress', color: '#3b82f6', position: 1 },
    { board_id: boardId, name: 'Review', color: '#f59e0b', position: 2 },
    { board_id: boardId, name: 'Done', color: '#10b981', position: 3 },
  ])

  // Setup wizard state
  await db.from('setup_wizard_state').insert({
    tenant_id: tenantId, step: 5, is_complete: true, data: {}
  })

  // Create admin user
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 12)
  const { error: userErr } = await db.from('users').insert({
    tenant_id: tenantId,
    email: ADMIN_EMAIL,
    password_hash: hash,
    first_name: 'Super',
    last_name: 'Admin',
    role_id: roleId,
    employee_id: 'EMP-001',
    is_active: true,
  })
  if (userErr) { console.error('User error:', userErr.message); return }

  console.log('✅ Seed complete!')
  console.log('📧 Email:', ADMIN_EMAIL)
  console.log('🔑 Password:', ADMIN_PASSWORD)
  console.log('🌐 Login at /login')
}

seed().catch(console.error)
