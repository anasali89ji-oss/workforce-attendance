import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const { data: tenants } = await supabaseAdmin.from('tenants').select('id').limit(1)
    if (!tenants || tenants.length === 0) return NextResponse.json({ needs_setup: true, tenant_exists: false })

    const { data: state } = await supabaseAdmin
      .from('setup_wizard_state').select('*').eq('tenant_id', tenants[0].id).single()

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
    console.error(e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

async function setupTenant(data: { name: string; timezone: string }) {
  const subdomain = data.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')

  // Check if subdomain taken
  const { data: exists } = await supabaseAdmin.from('tenants').select('id').eq('subdomain', subdomain).single()
  const finalSubdomain = exists ? subdomain + '-' + Date.now().toString().slice(-4) : subdomain

  const { data: tenant, error } = await supabaseAdmin
    .from('tenants')
    .insert({ name: data.name, subdomain: finalSubdomain, timezone: data.timezone || 'Asia/Karachi' })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabaseAdmin.from('setup_wizard_state').insert({ tenant_id: tenant.id, step: 2, data: {} })

  // Seed default leave types
  await supabaseAdmin.from('leave_types').insert([
    { tenant_id: tenant.id, name: 'Annual Leave', code: 'AL', color: '#3b82f6', days_per_year: 21 },
    { tenant_id: tenant.id, name: 'Sick Leave', code: 'SL', color: '#ef4444', days_per_year: 10 },
    { tenant_id: tenant.id, name: 'Casual Leave', code: 'CL', color: '#f59e0b', days_per_year: 7 },
    { tenant_id: tenant.id, name: 'Unpaid Leave', code: 'UL', color: '#6b7280', days_per_year: 0 },
  ])

  // Seed custom roles
  await supabaseAdmin.from('custom_roles').insert([
    { tenant_id: tenant.id, name: 'Owner', slug: 'owner', color: '#7c3aed', is_system: true, permissions: ['*'] },
    { tenant_id: tenant.id, name: 'Admin', slug: 'admin', color: '#2563eb', is_system: true, permissions: ['attendance.manage','employees.manage','leave.approve','roles.manage','analytics.view','kanban.manage','settings.manage'] },
    { tenant_id: tenant.id, name: 'Manager', slug: 'manager', color: '#d97706', is_system: true, permissions: ['attendance.view','attendance.clock','employees.view','leave.approve','kanban.manage','analytics.view'] },
    { tenant_id: tenant.id, name: 'Employee', slug: 'worker', color: '#0891b2', is_system: true, permissions: ['attendance.clock','leave.apply','kanban.view'] },
  ])

  return NextResponse.json({ success: true, tenant_id: tenant.id })
}

async function setupOwner(data: { tenant_id: string; first_name: string; last_name: string; email: string; password: string }) {
  const bcrypt = await import('bcryptjs')
  const hash = await bcrypt.hash(data.password, 12)
  const fullName = `${data.first_name} ${data.last_name}`.trim()

  const { data: profile, error } = await supabaseAdmin.from('profiles').insert({
    tenant_id: data.tenant_id,
    email: data.email.toLowerCase().trim(),
    password_hash: hash,
    full_name: fullName,
    first_name: data.first_name,
    last_name: data.last_name,
    role: 'owner',
    employee_id: 'EMP-001',
  }).select().single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await supabaseAdmin.from('setup_wizard_state').update({ step: 3 }).eq('tenant_id', data.tenant_id)
  return NextResponse.json({ success: true, user_id: profile.id })
}

async function setupWorkHours(data: { tenant_id: string; working_hours_start: string; working_hours_end: string; working_days: string[]; late_threshold: number }) {
  // Convert day names to numbers (MON=1..SUN=7)
  const dayMap: Record<string, string> = { MON:'1',TUE:'2',WED:'3',THU:'4',FRI:'5',SAT:'6',SUN:'7' }
  const workDays = (data.working_days || ['MON','TUE','WED','THU','FRI']).map(d => dayMap[d] || d).join(',')

  await supabaseAdmin.from('tenants').update({
    work_start_time: data.working_hours_start,
    work_end_time: data.working_hours_end,
    work_days: workDays,
    late_threshold: data.late_threshold,
    updated_at: new Date().toISOString(),
  }).eq('id', data.tenant_id)

  await supabaseAdmin.from('setup_wizard_state').update({ step: 4 }).eq('tenant_id', data.tenant_id)
  return NextResponse.json({ success: true })
}

async function setupShifts(data: { tenant_id: string; shifts: { name: string; start_time: string; end_time: string; color: string }[] }) {
  const shiftsToInsert = (data.shifts && data.shifts.length > 0 ? data.shifts : [{ name: 'General Shift', start_time: '09:00', end_time: '18:00', color: '#3b82f6' }])
    .map(s => ({ ...s, tenant_id: data.tenant_id }))

  await supabaseAdmin.from('shifts').insert(shiftsToInsert)
  await supabaseAdmin.from('setup_wizard_state').update({ step: 5 }).eq('tenant_id', data.tenant_id)
  return NextResponse.json({ success: true })
}

async function completeSetup(data: { tenant_id: string }) {
  const boardId = crypto.randomUUID()
  await supabaseAdmin.from('kanban_boards').insert({ id: boardId, tenant_id: data.tenant_id, name: 'Team Tasks', created_by: data.tenant_id })
  await supabaseAdmin.from('kanban_columns').insert([
    { board_id: boardId, name: 'To Do', color: '#6b7280', position: 0 },
    { board_id: boardId, name: 'In Progress', color: '#3b82f6', position: 1 },
    { board_id: boardId, name: 'Review', color: '#f59e0b', position: 2 },
    { board_id: boardId, name: 'Done', color: '#10b981', position: 3 },
  ])

  await supabaseAdmin.from('setup_wizard_state').update({ step: 5, is_complete: true }).eq('tenant_id', data.tenant_id)
  return NextResponse.json({ success: true })
}
