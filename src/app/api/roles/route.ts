import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: roles, error } = await supabaseAdmin
    .from('roles')
    .select('*, permissions:role_permissions(permission:permissions(*))')
    .eq('tenant_id', user.tenant_id)
    .order('is_system', { ascending: false })
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Get user count per role
  const { data: userCounts } = await supabaseAdmin
    .from('users')
    .select('role_id')
    .eq('tenant_id', user.tenant_id)
    .eq('is_active', true)

  const countMap: Record<string, number> = {}
  ;(userCounts || []).forEach(u => {
    if (u.role_id) countMap[u.role_id] = (countMap[u.role_id] || 0) + 1
  })

  const rolesWithCounts = (roles || []).map(r => ({
    ...r,
    user_count: countMap[r.id] || 0,
    permissions: r.permissions?.map((rp: { permission: unknown }) => rp.permission).filter(Boolean),
  }))

  return NextResponse.json({ data: rolesWithCounts })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!['owner', 'admin'].includes(user.role?.slug || '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { name, description, color, permission_ids } = body

  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '_')

  const { data: role, error } = await supabaseAdmin
    .from('roles')
    .insert({
      tenant_id: user.tenant_id,
      name,
      slug,
      description,
      color: color || '#6366f1',
      is_system: false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (permission_ids && permission_ids.length > 0) {
    await supabaseAdmin.from('role_permissions').insert(
      permission_ids.map((pid: string) => ({ role_id: role.id, permission_id: pid }))
    )
  }

  return NextResponse.json({ data: role })
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!['owner', 'admin'].includes(user.role?.slug || '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { id, name, description, color, permission_ids } = body

  const { data: existing } = await supabaseAdmin
    .from('roles')
    .select('is_system')
    .eq('id', id)
    .eq('tenant_id', user.tenant_id)
    .single()

  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (name) updates.name = name
  if (description !== undefined) updates.description = description
  if (color) updates.color = color

  const { data: role, error } = await supabaseAdmin
    .from('roles')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (permission_ids !== undefined) {
    await supabaseAdmin.from('role_permissions').delete().eq('role_id', id)
    if (permission_ids.length > 0) {
      await supabaseAdmin.from('role_permissions').insert(
        permission_ids.map((pid: string) => ({ role_id: id, permission_id: pid }))
      )
    }
  }

  return NextResponse.json({ data: role })
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (user.role?.slug !== 'owner') {
    return NextResponse.json({ error: 'Only owners can delete roles' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Role ID required' }, { status: 400 })

  const { data: role } = await supabaseAdmin
    .from('roles')
    .select('is_system')
    .eq('id', id)
    .eq('tenant_id', user.tenant_id)
    .single()

  if (!role) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (role.is_system) return NextResponse.json({ error: 'Cannot delete system roles' }, { status: 400 })

  const { error } = await supabaseAdmin.from('roles').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
