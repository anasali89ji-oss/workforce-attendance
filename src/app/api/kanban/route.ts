export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth.server'
import { hasPermission } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleApiError, AuthError, ForbiddenError } from '@/lib/errors'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) throw new AuthError()

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
  } catch (error) {
    const { message, status, code } = handleApiError(error)
    return NextResponse.json({ error: message, code }, { status })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) throw new AuthError()
    if (!hasPermission(user, 'kanban:write')) throw new ForbiddenError()

    const body = await req.json()

    // Fix 4.2: Support both `type` (API-native) and `action` (legacy frontend) fields
    const resourceType = body.type || (body.action?.replace('create_', '') === 'board' ? 'board'
      : body.action?.replace('create_', '') === 'card' ? 'card'
      : body.action?.replace('create_', '') === 'column' ? 'column'
      : null)

    if (resourceType === 'board') {
      const { name, description } = body
      const board = await prisma.kanbanBoard.create({
        data: { tenant_id: user.tenant_id, name, description, created_by: user.id },
      })
      return NextResponse.json({ data: board }, { status: 201 })
    }

    if (resourceType === 'column') {
      const { board_id, name, color, position } = body
      // Fix 4.1: Verify board belongs to user's tenant before creating column
      const board = await prisma.kanbanBoard.findFirst({ where: { id: board_id, tenant_id: user.tenant_id } })
      if (!board) throw new ForbiddenError()

      const col = await prisma.kanbanColumn.create({
        data: { board_id, name, color: color || '#6366f1', position: position ?? 0 },
      })
      return NextResponse.json({ data: col }, { status: 201 })
    }

    if (resourceType === 'card') {
      const { column_id, title, description, priority, due_date, labels, position, assignee_ids } = body

      // Fix 4.1: Verify column belongs to user's tenant
      const column = await prisma.kanbanColumn.findFirst({
        where: { id: column_id },
        include: { board: { select: { tenant_id: true } } },
      })
      if (!column || column.board.tenant_id !== user.tenant_id) throw new ForbiddenError()

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
  } catch (error) {
    const { message, status, code } = handleApiError(error)
    return NextResponse.json({ error: message, code }, { status })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) throw new AuthError()
    if (!hasPermission(user, 'kanban:write')) throw new ForbiddenError()

    const { type, id, ...updates } = await req.json()

    if (type === 'card') {
      // Fix 4.1: Verify card belongs to tenant through column → board chain
      const existingCard = await prisma.kanbanCard.findFirst({
        where: { id },
        include: { column: { include: { board: { select: { tenant_id: true } } } } },
      })
      if (!existingCard || existingCard.column.board.tenant_id !== user.tenant_id) throw new ForbiddenError()

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
      // Fix 4.1: Verify column belongs to tenant
      const existingCol = await prisma.kanbanColumn.findFirst({
        where: { id },
        include: { board: { select: { tenant_id: true } } },
      })
      if (!existingCol || existingCol.board.tenant_id !== user.tenant_id) throw new ForbiddenError()

      const data = await prisma.kanbanColumn.update({ where: { id }, data: updates })
      return NextResponse.json({ data })
    }

    if (type === 'board') {
      const data = await prisma.kanbanBoard.update({
        where: { id, tenant_id: user.tenant_id },
        data: updates,
      })
      return NextResponse.json({ data })
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  } catch (error) {
    const { message, status, code } = handleApiError(error)
    return NextResponse.json({ error: message, code }, { status })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) throw new AuthError()
    if (!hasPermission(user, 'kanban:write')) throw new ForbiddenError()

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    if (type === 'card') {
      // Fix 4.1: Verify card belongs to tenant before deleting
      const card = await prisma.kanbanCard.findFirst({
        where: { id },
        include: { column: { include: { board: { select: { tenant_id: true } } } } },
      })
      if (!card || card.column.board.tenant_id !== user.tenant_id) throw new ForbiddenError()
      await prisma.kanbanCard.delete({ where: { id } })
    } else if (type === 'column') {
      // Fix 4.1: Verify column belongs to tenant
      const col = await prisma.kanbanColumn.findFirst({
        where: { id },
        include: { board: { select: { tenant_id: true } } },
      })
      if (!col || col.board.tenant_id !== user.tenant_id) throw new ForbiddenError()
      await prisma.kanbanColumn.delete({ where: { id } })
    } else if (type === 'board') {
      await prisma.kanbanBoard.delete({ where: { id, tenant_id: user.tenant_id } })
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const { message, status, code } = handleApiError(error)
    return NextResponse.json({ error: message, code }, { status })
  }
}
