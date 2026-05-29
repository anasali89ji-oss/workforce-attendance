export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth.server'
import { prisma } from '@/lib/prisma'
import { overtimeSchema } from '@/lib/validators'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const isPrivileged = ['owner', 'admin', 'manager'].includes(user.role)

  const where: Record<string, unknown> = { tenant_id: user.tenant_id }
  if (!isPrivileged) where.user_id = user.id
  if (status) where.status = status

  const data = await prisma.overtimeRequest.findMany({
    where,
    include: { user: { select: { id: true, full_name: true, email: true } } },
    orderBy: { created_at: 'desc' },
  })

  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const result = overtimeSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: 'Validation failed', details: result.error.flatten() }, { status: 422 })

  const { date, hours, reason } = result.data
  const data = await prisma.overtimeRequest.create({
    data: { tenant_id: user.tenant_id, user_id: user.id, date: new Date(date), hours, reason, status: 'pending' },
  })

  return NextResponse.json({ data }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['owner', 'admin', 'manager'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, action } = await req.json()
  const status = action === 'approve' ? 'approved' : 'rejected'

  const data = await prisma.overtimeRequest.update({
    where: { id, tenant_id: user.tenant_id },
    data: { status, approved_by: user.id },
  })

  return NextResponse.json({ data })
}
