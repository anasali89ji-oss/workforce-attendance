export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth.server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const targetUserId = searchParams.get('user_id') || user.id
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))

  const balances = await prisma.leaveBalance.findMany({
    where: { user_id: targetUserId, year },
    include: {
      leave_type: { select: { name: true, code: true, color: true } },
    },
  })

  return NextResponse.json({ data: balances })
}
