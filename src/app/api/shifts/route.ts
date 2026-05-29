export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth.server'
import { prisma } from '@/lib/prisma'
import { shiftSchema } from '@/lib/validators'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const data = await prisma.shift.findMany({
    where: { tenant_id: user.tenant_id },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['owner', 'admin', 'manager'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const result = shiftSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: 'Validation failed', details: result.error.flatten() }, { status: 422 })

  const { name, start_time, end_time, color, is_night } = result.data
  const data = await prisma.shift.create({
    data: { tenant_id: user.tenant_id, name, start_time, end_time, color, is_night },
  })
  return NextResponse.json({ data }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['owner', 'admin', 'manager'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, ...updates } = await req.json()
  if (!id) return NextResponse.json({ error: 'Shift ID required' }, { status: 400 })

  const data = await prisma.shift.update({ where: { id, tenant_id: user.tenant_id }, data: updates })
  return NextResponse.json({ data })
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['owner', 'admin'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Shift ID required' }, { status: 400 })

  // Conflict check
  const inUse = await prisma.attendanceLog.count({ where: { shift_id: id } })
  if (inUse > 0) return NextResponse.json({ error: 'Shift is in use and cannot be deleted' }, { status: 409 })

  await prisma.shift.delete({ where: { id, tenant_id: user.tenant_id } })
  return NextResponse.json({ success: true })
}
