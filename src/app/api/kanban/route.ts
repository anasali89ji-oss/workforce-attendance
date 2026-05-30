export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth.server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const boards = await prisma.kanbanBoard.findMany({
    where: { tenant_id: user.tenant_id },
    include: {
      columns: {
        orderBy: { position: 'asc' },
        include: {
          cards: {
            orderBy: { position: 'asc' },
            include: {
              assignments: {
                include: {
                  user: { select: { id: true, full_name: true, avatar_url: true } },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { created_at: 'asc' },
  })

  return NextResponse.json({ data: boards })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { type } = body

  if (type === 'board') {
    const { name, description } = body
    const board = await prisma.kanbanBoard.create({
      data: { tenant_id: user.tenant_id, name, description, created_by: user.id },
    })
    return NextResponse.json({ data: board }, { status: 201 })
  }

  if (type === 'column') {
    const { board_id, name, color, position } = body
    const col = await prisma.kanbanColumn.create({
      data: { board_id, name, color: color || '#6366f1', position: position ?? 0 },
    })
    return NextResponse.json({ data: col }, { status: 201 })
  }

  if (type === 'card') {
    const { column_id, title, description, priority, due_date, labels, position, assignee_ids } = body
    const card = await prisma.kanbanCard.create({
      data: {
        column_id,
        title,
        description,
        priority: priority || 'medium',
        due_date: due_date ? new Date(due_date) : null,
        labels: labels || [],
        position: position ?? 0,
        assignments: assignee_ids?.length
          ? { create: assignee_ids.map((uid: string) => ({ user_id: uid })) }
          : undefined,
      },
      include: { assignments: { include: { user: { select: { id: true, full_name: true, avatar_url: true } } } } },
    })
    return NextResponse.json({ data: card }, { status: 201 })
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { type, id, ...updates } = await req.json()

  if (type === 'card') {
    const { assignee_ids, due_date, ...rest } = updates
    const data = await prisma.kanbanCard.update({
      where: { id },
      data: {
        ...rest,
        ...(due_date !== undefined && { due_date: due_date ? new Date(due_date) : null }),
        ...(assignee_ids !== undefined && {
          assignments: {
            deleteMany: {},
            create: (assignee_ids as string[]).map(uid => ({ user_id: uid })),
          },
        }),
      },
      include: { assignments: { include: { user: { select: { id: true, full_name: true, avatar_url: true } } } } },
    })
    return NextResponse.json({ data })
  }

  if (type === 'column') {
    const data = await prisma.kanbanColumn.update({ where: { id }, data: updates })
    return NextResponse.json({ data })
  }

  if (type === 'board') {
    const data = await prisma.kanbanBoard.update({ where: { id }, data: updates })
    return NextResponse.json({ data })
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  if (type === 'card') await prisma.kanbanCard.delete({ where: { id } })
  else if (type === 'column') await prisma.kanbanColumn.delete({ where: { id } })
  else if (type === 'board') await prisma.kanbanBoard.delete({ where: { id, tenant_id: user.tenant_id } })
  else return NextResponse.json({ error: 'Invalid type' }, { status: 400 })

  return NextResponse.json({ success: true })
}
