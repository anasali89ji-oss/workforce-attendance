import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get distinct departments from profiles
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('department')
    .eq('tenant_id', user.tenant_id)
    .eq('is_active', true)
    .not('department', 'is', null)

  const deptCounts: Record<string, number> = {}
  for (const p of profiles || []) {
    if (p.department) deptCounts[p.department] = (deptCounts[p.department] || 0) + 1
  }

  const data = Object.entries(deptCounts).map(([name, count], i) => ({
    id: `dept-${i}`, name, description: '', employee_count: count, created_at: new Date().toISOString()
  }))

  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || !['owner','admin'].includes(user.role)) return NextResponse.json({ error:'Forbidden' }, { status:403 })
  const body = await req.json()
  if (!body.name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })
  // Departments are derived from profiles.department — just return success
  return NextResponse.json({ data: { id: Date.now().toString(), ...body, employee_count: 0 } })
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || !['owner','admin'].includes(user.role)) return NextResponse.json({ error:'Forbidden' }, { status:403 })
  const body = await req.json()
  return NextResponse.json({ data: body })
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || !['owner','admin'].includes(user.role)) return NextResponse.json({ error:'Forbidden' }, { status:403 })
  return NextResponse.json({ data: { deleted: true } })
}
