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

  // Fix 4.7: Check leave balance before creating the request
  const currentYear = new Date().getFullYear()
  const balance = await prisma.leaveBalance.findFirst({
    where: {
      user_id: user.id,
      tenant_id: user.tenant_id,
      leave_type,
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

  // Create the request in a transaction — also increment pending_days atomically
  const data = await prisma.$transaction(async tx => {
    const request = await tx.leaveRequest.create({
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

  const req_ = await prisma.leaveRequest.findFirst({
    where: { id, tenant_id: user.tenant_id },
  })
  if (!req_) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (action === 'cancel' && req_.user_id === user.id) {
    const data = await prisma.$transaction(async tx => {
      const updated = await tx.leaveRequest.update({ where: { id }, data: { status: 'cancelled' } })
      // Fix 4.7: On cancel, decrement pending_days
      if (req_.status === 'pending') {
        await tx.leaveBalance.updateMany({
          where: { user_id: req_.user_id, tenant_id: user.tenant_id, leave_type: req_.leave_type, year: new Date().getFullYear() },
          data: { pending_days: { decrement: req_.days_count } },
        })
      }
      return updated
    })
    return NextResponse.json({ data })
  }

  if (!isPrivileged) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (action === 'approve') {
    const data = await prisma.$transaction(async tx => {
      const updated = await tx.leaveRequest.update({
        where: { id },
        data: { status: 'approved', approved_by: user.id, approved_at: new Date() },
      })
      // Fix 4.7: Move days from pending to used on approve
      await tx.leaveBalance.updateMany({
        where: { user_id: req_.user_id, tenant_id: user.tenant_id, leave_type: req_.leave_type, year: new Date().getFullYear() },
        data: {
          pending_days: { decrement: req_.days_count },
          used_days: { increment: req_.days_count },
        },
      })
      return updated
    })
    await logAudit(user.tenant_id, 'LEAVE_APPROVED', 'leave_request', id, { user })
    return NextResponse.json({ data })
  }

  if (action === 'reject') {
    const data = await prisma.$transaction(async tx => {
      const updated = await tx.leaveRequest.update({
        where: { id },
        data: { status: 'rejected', rejected_at: new Date(), rejection_reason },
      })
      // Fix 4.7: On reject, decrement pending_days
      await tx.leaveBalance.updateMany({
        where: { user_id: req_.user_id, tenant_id: user.tenant_id, leave_type: req_.leave_type, year: new Date().getFullYear() },
        data: { pending_days: { decrement: req_.days_count } },
      })
      return updated
    })
    await logAudit(user.tenant_id, 'LEAVE_REJECTED', 'leave_request', id, { user })
    return NextResponse.json({ data })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
