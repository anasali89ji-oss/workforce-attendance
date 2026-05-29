export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth.server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [roles, profileCounts] = await Promise.all([
    prisma.customRole.findMany({
      where: { tenant_id: user.tenant_id },
      orderBy: [{ is_system: 'desc' }, { name: 'asc' }],
    }),
    prisma.profile.groupBy({
      by: ['role'],
      where: { tenant_id: user.tenant_id, is_active: true },
      _count: { role: true },
    }),
  ])

  const countMap: Record<string, number> = {}
  for (const r of profileCounts) countMap[r.role] = r._count.role

  const rolesWithCounts = roles.map(r => ({ ...r, user_count: countMap[r.slug] ?? 0 }))
  return NextResponse.json({ data: rolesWithCounts })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['owner', 'admin'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, description, color, permissions } = await req.json()
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '_')

  const data = await prisma.customRole.create({
    data: {
      tenant_id: user.tenant_id,
      name,
      slug,
      description,
      color: color || '#6366f1',
      permissions: permissions || [],
      is_system: false,
    },
  })
  return NextResponse.json({ data }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['owner', 'admin'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, name, description, color, permissions } = await req.json()

  const data = await prisma.customRole.update({
    where: { id, tenant_id: user.tenant_id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(color !== undefined && { color }),
      ...(permissions !== undefined && { permissions }),
    },
  })
  return NextResponse.json({ data })
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'owner') return NextResponse.json({ error: 'Only owners can delete roles' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Role ID required' }, { status: 400 })

  const role = await prisma.customRole.findFirst({ where: { id, tenant_id: user.tenant_id } })
  if (!role) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (role.is_system) return NextResponse.json({ error: 'Cannot delete system roles' }, { status: 400 })

  await prisma.customRole.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
