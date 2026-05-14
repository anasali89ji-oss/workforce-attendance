import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

// FIX-002: Use env vars, never hardcode credentials
const SEED_SECRET = process.env.SEED_SECRET

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  // FIX-013: Strong env-var secret, not hardcoded string
  if (!SEED_SECRET || searchParams.get('secret') !== SEED_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Disable in production unless explicitly opted in
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED_IN_PRODUCTION !== 'true') {
    return NextResponse.json({ error: 'Seed endpoint disabled in production' }, { status: 403 })
  }

  try {
    // Create tenant
    const { data: tenant, error: tenantErr } = await supabaseAdmin
      .from('tenants')
      .insert({
        name: 'Demo Company',
        slug: `demo-${Date.now()}`,
        timezone: 'UTC',
        working_hours_start: '09:00',
        working_hours_end: '18:00',
        working_days: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
        late_threshold: 15,
      })
      .select()
      .single()

    if (tenantErr || !tenant) throw new Error(tenantErr?.message || 'Failed to create tenant')

    // FIX-011+012: Create profile with bcrypt hash (custom auth, not Supabase Auth)
    const adminEmail = process.env.SEED_ADMIN_EMAIL
    const adminPassword = process.env.SEED_ADMIN_PASSWORD

    if (!adminEmail || !adminPassword) {
      throw new Error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD env vars required')
    }

    const password_hash = await bcrypt.hash(adminPassword, 12)
    const employee_id = `EMP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`

    const { error: profileErr } = await supabaseAdmin.from('profiles').insert({
      tenant_id: tenant.id,
      email: adminEmail.toLowerCase(),
      password_hash,
      full_name: 'Admin User',
      first_name: 'Admin',
      last_name: 'User',
      role: 'owner',
      employee_id,
      is_active: true,
    })

    if (profileErr) throw new Error(profileErr.message)

    // Create default leave types
    await supabaseAdmin.from('leave_types').insert([
      { tenant_id: tenant.id, name: 'Annual Leave', code: 'annual', color: '#3b82f6', days_per_year: 20, requires_approval: true },
      { tenant_id: tenant.id, name: 'Sick Leave', code: 'sick', color: '#ef4444', days_per_year: 10, requires_approval: false },
      { tenant_id: tenant.id, name: 'Emergency', code: 'emergency', color: '#f59e0b', days_per_year: 5, requires_approval: true },
      { tenant_id: tenant.id, name: 'Unpaid Leave', code: 'unpaid', color: '#6b7280', days_per_year: 0, requires_approval: true },
    ])

    // Create default departments
    await supabaseAdmin.from('departments').insert([
      { tenant_id: tenant.id, name: 'Engineering' },
      { tenant_id: tenant.id, name: 'HR' },
      { tenant_id: tenant.id, name: 'Operations' },
    ])

    // FIX-014: No password in response
    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully',
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
      admin: { email: adminEmail },
    })
  } catch (err) {
    console.error('[Seed Error]', err)
    return NextResponse.json({ error: 'Seed failed', details: (err as Error).message }, { status: 500 })
  }
}
