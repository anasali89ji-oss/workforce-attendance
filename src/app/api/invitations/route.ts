export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth.server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['owner', 'admin'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { email, role_id } = await req.json()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 422 })
  }

  const expires = new Date()
  expires.setDate(expires.getDate() + 7)

  const data = await prisma.teamInvitation.create({
    data: {
      tenant_id: user.tenant_id,
      email: email.toLowerCase().trim(),
      role_id,
      invited_by: user.id,
      expires_at: expires,
      status: 'pending',
    },
  })

  return NextResponse.json({ data }, { status: 201 })
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['owner', 'admin'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const data = await prisma.teamInvitation.findMany({
    where: { tenant_id: user.tenant_id },
    include: {
      inviter: { select: { first_name: true, last_name: true, email: true } },
    },
    orderBy: { created_at: 'desc' },
  })

  return NextResponse.json({ data })
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['owner', 'admin'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  await prisma.teamInvitation.delete({ where: { id, tenant_id: user.tenant_id } })
  return NextResponse.json({ success: true })
}
