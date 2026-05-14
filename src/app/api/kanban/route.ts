import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth.server'
import { supabaseAdmin } from '@/lib/supabase'
import { z } from 'zod'

const cardSchema = z.object({
  column_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  due_date: z.string().optional().nullable(),
  labels: z.array(z.string()).default([]),
  assignee_ids: z.array(z.string().uuid()).default([]),
})

const moveSchema = z.object({
  id: z.string().uuid(),
  column_id: z.string().uuid(),
  position: z.number().int().min(0),
})

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const boardId = searchParams.get('board_id')

  // Fetch boards for this tenant
  const { data: boards } = await supabaseAdmin
    .from('kanban_boards')
    .select('id,name,description')
    .eq('tenant_id', user.tenant_id)
    .order('created_at')
    .limit(1)

  const targetBoard = boardId || boards?.[0]?.id
  if (!targetBoard) return NextResponse.json({ data: { boards: [], columns: [], cards: [] } })

  const [colsRes, cardsRes] = await Promise.all([
    supabaseAdmin.from('kanban_columns').select('*').eq('board_id', targetBoard).order('position'),
    supabaseAdmin.from('kanban_cards')
      .select('*, assignments:kanban_card_assignments(user:profiles!user_id(id,full_name,avatar_url))')
      .in('column_id',
        (await supabaseAdmin.from('kanban_columns').select('id').eq('board_id', targetBoard))
          .data?.map(c => c.id) || []
      )
      .order('position'),
  ])

  return NextResponse.json({
    data: {
      boards,
      board: boards?.find(b => b.id === targetBoard),
      columns: colsRes.data || [],
      cards: cardsRes.data || [],
    }
  })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  if (body.type === 'move') {
    const result = moveSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input', details: result.error.flatten().fieldErrors }, { status: 400 })
    }
    const { id, column_id, position } = result.data
    const { data, error } = await supabaseAdmin
      .from('kanban_cards')
      .update({ column_id, position, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }

  const result = cardSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid input', details: result.error.flatten().fieldErrors }, { status: 400 })
  }

  const { assignee_ids, ...cardData } = result.data

  // Get max position in column
  const { data: existing } = await supabaseAdmin
    .from('kanban_cards').select('position').eq('column_id', cardData.column_id).order('position', { ascending: false }).limit(1)
  const position = (existing?.[0]?.position ?? -1) + 1

  const { data: card, error } = await supabaseAdmin
    .from('kanban_cards')
    .insert({ ...cardData, position })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Add assignees
  if (assignee_ids.length > 0) {
    await supabaseAdmin.from('kanban_card_assignments').insert(
      assignee_ids.map(uid => ({ card_id: card.id, user_id: uid }))
    )
  }

  return NextResponse.json({ data: card }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, assignee_ids, ...updates } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('kanban_cards')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (Array.isArray(assignee_ids)) {
    await supabaseAdmin.from('kanban_card_assignments').delete().eq('card_id', id)
    if (assignee_ids.length > 0) {
      await supabaseAdmin.from('kanban_card_assignments').insert(
        assignee_ids.map((uid: string) => ({ card_id: id, user_id: uid }))
      )
    }
  }

  return NextResponse.json({ data })
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  const { error } = await supabaseAdmin.from('kanban_cards').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
