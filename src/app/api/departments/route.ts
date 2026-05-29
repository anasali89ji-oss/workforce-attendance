export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth.server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Departments from dedicated table + string fallback from profiles
  const [deptRows, profileDepts] = await Promise.all([
    prisma.department.findMany({ where: { tenant_id: user.tenant_id }, orderBy: { name: 'asc' } }),
    prisma.profile.findMany({
      where: { tenant_id: user.tenant_id, department: { not: null } },
      select: { department: true },
      distinct: ['department'],
    }),
  ])

  // Merge: prefer dedicated dept rows; add string-only depts
  const existing = new Set(deptRows.map(d => d.name.toLowerCase()))
  const stringDepts = profileDepts
    .map(p => p.department!)
    .filter(Boolean)
    .filter(d => !existing.has(d.toLowerCase()))
    .map(name => ({ id: name, name, description: null, head_id: null, tenant_id: user.tenant_id, created_at: new Date(), updated_at: new Date() }))

  return NextResponse.json({ data: [...deptRows, ...stringDepts] })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['owner', 'admin'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, description, head_id } = await req.json()
  const data = await prisma.department.create({
    data: { tenant_id: user.tenant_id, name, description, head_id },
  })
  return NextResponse.json({ data }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['owner', 'admin'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  await prisma.department.delete({ where: { id, tenant_id: user.tenant_id } })
  return NextResponse.json({ success: true })
}
