import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: roles, error } = await supabaseAdmin
    .from('custom_roles').select('*').eq('tenant_id', user.tenant_id).order('is_system', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: profileCounts } = await supabaseAdmin
    .from('profiles').select('role').eq('tenant_id', user.tenant_id).eq('is_active', true)

  const countMap: Record<string, number> = {}
  ;(profileCounts || []).forEach(p => { countMap[p.role] = (countMap[p.role] || 0) + 1 })

  const rolesWithCounts = (roles || []).map(r => ({
    ...r,
    user_count: countMap[r.slug] || 0,
  }))

  return NextResponse.json({ data: rolesWithCounts })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['owner', 'admin'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, description, color, permissions } = await req.json()
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '_')

  const { data, error } = await supabaseAdmin.from('custom_roles').insert({
    tenant_id: user.tenant_id, name, slug, description, color: color || '#6366f1', permissions: permissions || [], is_system: false,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['owner', 'admin'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, name, description, color, permissions } = await req.json()
  const updates: Record<string,unknown> = { updated_at: new Date().toISOString() }
  if (name !== undefined) updates.name = name
  if (description !== undefined) updates.description = description
  if (color !== undefined) updates.color = color
  if (permissions !== undefined) updates.permissions = permissions

  const { data, error } = await supabaseAdmin.from('custom_roles')
    .update(updates).eq('id', id).eq('tenant_id', user.tenant_id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'owner') return NextResponse.json({ error: 'Only owners can delete roles' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Role ID required' }, { status: 400 })

  const { data: role } = await supabaseAdmin.from('custom_roles').select('is_system').eq('id', id).eq('tenant_id', user.tenant_id).single()
  if (!role) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (role.is_system) return NextResponse.json({ error: 'Cannot delete system roles' }, { status: 400 })

  await supabaseAdmin.from('custom_roles').delete().eq('id', id)
  return NextResponse.json({ success: true })
}
