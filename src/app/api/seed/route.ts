import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url)
  if (searchParams.get('secret') !== 'workforce-seed-2024') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const ADMIN_EMAIL = 'admin@aiscern.com'
  const ADMIN_PASSWORD = 'Admin@123456'

  const { data: existing } = await supabaseAdmin.from('profiles').select('id').eq('email', ADMIN_EMAIL).single()
  if (existing) return NextResponse.json({ message: 'Already seeded', email: ADMIN_EMAIL, password: ADMIN_PASSWORD })

  const { data: tenant, error: tErr } = await supabaseAdmin.from('tenants')
    .insert({ name: 'Aiscern', subdomain: 'aiscern', timezone: 'Asia/Karachi', work_start_time: '09:00', work_end_time: '18:00', work_days: '1,2,3,4,5', late_threshold: 15 })
    .select().single()
  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 })

  await supabaseAdmin.from('setup_wizard_state').insert({ tenant_id: tenant.id, step: 5, is_complete: true, data: {} })

  await supabaseAdmin.from('leave_types').insert([
    { tenant_id: tenant.id, name: 'Annual Leave', code: 'AL', color: '#3b82f6', days_per_year: 21 },
    { tenant_id: tenant.id, name: 'Sick Leave', code: 'SL', color: '#ef4444', days_per_year: 10 },
    { tenant_id: tenant.id, name: 'Casual Leave', code: 'CL', color: '#f59e0b', days_per_year: 7 },
    { tenant_id: tenant.id, name: 'Unpaid Leave', code: 'UL', color: '#6b7280', days_per_year: 0 },
  ])

  await supabaseAdmin.from('shifts').insert({ tenant_id: tenant.id, name: 'General Shift', start_time: '09:00', end_time: '18:00', color: '#3b82f6', days_of_week: '1,2,3,4,5' })

  const boardId = crypto.randomUUID()
  await supabaseAdmin.from('kanban_boards').insert({ id: boardId, tenant_id: tenant.id, name: 'Team Tasks', created_by: tenant.id })
  await supabaseAdmin.from('kanban_columns').insert([
    { board_id: boardId, name: 'To Do', color: '#6b7280', position: 0 },
    { board_id: boardId, name: 'In Progress', color: '#3b82f6', position: 1 },
    { board_id: boardId, name: 'Review', color: '#f59e0b', position: 2 },
    { board_id: boardId, name: 'Done', color: '#10b981', position: 3 },
  ])

  await supabaseAdmin.from('custom_roles').insert([
    { tenant_id: tenant.id, name: 'Owner', slug: 'owner', color: '#7c3aed', is_system: true, permissions: ['*'] },
    { tenant_id: tenant.id, name: 'Admin', slug: 'admin', color: '#2563eb', is_system: true, permissions: ['attendance.manage','employees.manage','leave.approve','roles.manage','analytics.view','kanban.manage','settings.manage'] },
    { tenant_id: tenant.id, name: 'Manager', slug: 'manager', color: '#d97706', is_system: true, permissions: ['attendance.view','attendance.clock','employees.view','leave.approve','kanban.manage','analytics.view'] },
    { tenant_id: tenant.id, name: 'Worker', slug: 'worker', color: '#0891b2', is_system: true, permissions: ['attendance.clock','leave.apply','kanban.view'] },
  ])

  const hash = await bcrypt.hash(ADMIN_PASSWORD, 12)
  const { error: uErr } = await supabaseAdmin.from('profiles').insert({
    tenant_id: tenant.id, email: ADMIN_EMAIL, password_hash: hash,
    full_name: 'Super Admin', first_name: 'Super', last_name: 'Admin',
    role: 'owner', employee_id: 'EMP-001', is_active: true,
  })
  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 })

  return NextResponse.json({ success: true, email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
}
