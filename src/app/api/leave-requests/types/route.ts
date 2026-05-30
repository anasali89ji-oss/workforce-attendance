export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth.server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const types = await prisma.leaveType.findMany({
    where: { tenant_id: user.tenant_id },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json({ data: types })
}
