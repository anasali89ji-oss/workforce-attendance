export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth.server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isPriv = ['owner', 'admin', 'manager'].includes(user.role)

  const [pendingLeaves, unreadNotif] = await Promise.all([
    prisma.leaveRequest.count({
      where: isPriv
        ? { tenant_id: user.tenant_id, status: 'pending' }
        : { user_id: user.id, status: 'pending' },
    }),
    prisma.notification.count({ where: { user_id: user.id, is_read: false } }),
  ])

  return NextResponse.json({ data: { pending_leaves: pendingLeaves, unread_notifications: unreadNotif } })
}
