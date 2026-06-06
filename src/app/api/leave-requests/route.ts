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
  if (!leave_type_id) return NextResponse.json({ error: 'leave_type_id is required' }, { status: 400 })

  const start = new Date(start_date)
  const end = new Date(end_date)
  let days = 0
  const cur = new Date(start)
  while (cur <= end) {
    const d = cur.getDay()
    if (d !== 0 && d !== 6) days++
    cur.setDate(cur.getDate() + 1)
  }

  // Check leave balance — LeaveBalance uses leave_type_id (FK), not leave_type (string)
  const currentYear = new Date().getFullYear()
  const balance = await prisma.leaveBalance.findFirst({
    where: {
      user_id: user.id,
      tenant_id: user.tenant_id,
      leave_type_id,        // ← FK field
      year: currentYear,
    },
  })

  if (balance) {
    const available = balance.total_days - balance.used_days - balance.pending_days
    if (days > available) {
      return NextResponse.json(
        {
          error: `Insufficient leave balance. You have ${available} day(s) available but requested ${days}.`,
          code: 'INSUFFICIENT_BALANCE',
          available,
          requested: days,
        },
        { status: 400 }
      )
    }
  }

  const data = await prisma.$transaction(async tx => {
    const request = await tx.leaveRequest.create({
      data: {
        tenant_id: user.tenant_id,
        user_id: user.id,
        leave_type_id,          // FK relation
        leave_type: leave_type_id, // legacy string column (kept for backward compat)
        start_date: new Date(start_date),
        end_date: new Date(end_date),
        days_count: days,
        reason,
        status: 'pending',
      },
    })

    if (balance) {
      await tx.leaveBalance.update({
        where: { id: balance.id },
        data: { pending_days: { increment: days } },
      })
    }

    return request
  })

  await logAudit(user.tenant_id, 'LEAVE_REQUESTED', 'leave_request', data.id, { user })
  return NextResponse.json({ data })
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, action, rejection_reason } = await req.json()
  const isPrivileged = ['owner', 'admin', 'manager'].includes(user.role)

  const leaveReq = await prisma.leaveRequest.findFirst({
    where: { id, tenant_id: user.tenant_id },
  })
  if (!leaveReq) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Helper: updateMany uses leave_type_id (FK), not leave_type
  const balanceWhere = {
    user_id: leaveReq.user_id,
    tenant_id: user.tenant_id,
    leave_type_id: leaveReq.leave_type_id ?? undefined, // FK field on LeaveBalance
    year: new Date().getFullYear(),
  }

  if (action === 'cancel' && leaveReq.user_id === user.id) {
    const updated = await prisma.$transaction(async tx => {
      const r = await tx.leaveRequest.update({ where: { id }, data: { status: 'cancelled' } })
      if (leaveReq.status === 'pending' && leaveReq.leave_type_id) {
        await tx.leaveBalance.updateMany({
          where: balanceWhere,
          data: { pending_days: { decrement: leaveReq.days_count } },
        })
      }
      return r
    })
    return NextResponse.json({ data: updated })
  }

  if (!isPrivileged) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (action === 'approve') {
    const updated = await prisma.$transaction(async tx => {
      const r = await tx.leaveRequest.update({
        where: { id },
        data: { status: 'approved', approved_by: user.id, approved_at: new Date() },
      })
      if (leaveReq.leave_type_id) {
        await tx.leaveBalance.updateMany({
          where: balanceWhere,
          data: {
            pending_days: { decrement: leaveReq.days_count },
            used_days:    { increment: leaveReq.days_count },
          },
        })
      }
      return r
    })
    await logAudit(user.tenant_id, 'LEAVE_APPROVED', 'leave_request', id, { user })
    return NextResponse.json({ data: updated })
  }

  if (action === 'reject') {
    const updated = await prisma.$transaction(async tx => {
      const r = await tx.leaveRequest.update({
        where: { id },
        data: { status: 'rejected', rejected_at: new Date(), rejection_reason },
      })
      if (leaveReq.leave_type_id) {
        await tx.leaveBalance.updateMany({
          where: balanceWhere,
          data: { pending_days: { decrement: leaveReq.days_count } },
        })
      }
      return r
    })
    await logAudit(user.tenant_id, 'LEAVE_REJECTED', 'leave_request', id, { user })
    return NextResponse.json({ data: updated })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
