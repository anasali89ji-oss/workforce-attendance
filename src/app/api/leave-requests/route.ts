export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth.server'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const isPrivileged = ['owner', 'admin', 'manager'].includes(user.role)

  const where: Record<string, unknown> = { tenant_id: user.tenant_id }
  if (!isPrivileged) where.user_id = user.id
  if (status) where.status = status

  const requests = await prisma.leaveRequest.findMany({
    where,
    include: {
      user: { select: { id: true, full_name: true, email: true, avatar_url: true } },
      approver: { select: { id: true, full_name: true } },
    },
    orderBy: { created_at: 'desc' },
  })

  return NextResponse.json({ data: requests })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leave_type_id, start_date, end_date, reason } = await req.json()
  const leave_type = leave_type_id

  const start = new Date(start_date)
  const end = new Date(end_date)
  let days = 0
  const cur = new Date(start)
  while (cur <= end) {
    const d = cur.getDay()
    if (d !== 0 && d !== 6) days++
    cur.setDate(cur.getDate() + 1)
  }

  const data = await prisma.leaveRequest.create({
    data: {
      tenant_id: user.tenant_id,
      user_id: user.id,
      leave_type,
      start_date: new Date(start_date),
      end_date: new Date(end_date),
      days_count: days,
      reason,
      status: 'pending',
    },
  })

  await logAudit(user.tenant_id, 'LEAVE_REQUESTED', 'leave_request', data.id, { user })
  return NextResponse.json({ data })
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, action, rejection_reason } = await req.json()
  const isPrivileged = ['owner', 'admin', 'manager'].includes(user.role)

  const req_ = await prisma.leaveRequest.findFirst({
    where: { id, tenant_id: user.tenant_id },
  })
  if (!req_) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (action === 'cancel' && req_.user_id === user.id) {
    const data = await prisma.leaveRequest.update({ where: { id }, data: { status: 'cancelled' } })
    return NextResponse.json({ data })
  }
  if (!isPrivileged) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (action === 'approve') {
    const data = await prisma.leaveRequest.update({
      where: { id },
      data: { status: 'approved', approved_by: user.id, approved_at: new Date() },
    })
    await logAudit(user.tenant_id, 'LEAVE_APPROVED', 'leave_request', id, { user })
    return NextResponse.json({ data })
  }

  if (action === 'reject') {
    const data = await prisma.leaveRequest.update({
      where: { id },
      data: { status: 'rejected', rejected_at: new Date(), rejection_reason },
    })
    await logAudit(user.tenant_id, 'LEAVE_REJECTED', 'leave_request', id, { user })
    return NextResponse.json({ data })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
