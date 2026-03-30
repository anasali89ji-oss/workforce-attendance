import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('kanban_boards')
    .select(`
      *,
      columns:kanban_columns(
        *,
        cards:kanban_cards(
          *,
          assignments:kanban_card_assignments(*, user:users(id,first_name,last_name,avatar_url))
        )
      )
    `)
    .eq('tenant_id', user.tenant_id)
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Sort columns and cards by position
  const boards = (data || []).map(board => ({
    ...board,
    columns: (board.columns || [])
      .sort((a: { position: number }, b: { position: number }) => a.position - b.position)
      .map((col: { cards?: Array<{ position: number }> }) => ({
        ...col,
        cards: (col.cards || []).sort((a, b) => a.position - b.position),
      })),
  }))

  return NextResponse.json({ data: boards })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { action } = body

  if (action === 'create_board') {
    const { data, error } = await supabaseAdmin
      .from('kanban_boards')
      .insert({ tenant_id: user.tenant_id, name: body.name, description: body.description, created_by: user.id })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Default columns
    await supabaseAdmin.from('kanban_columns').insert([
      { board_id: data.id, name: 'To Do', color: '#6b7280', position: 0 },
      { board_id: data.id, name: 'In Progress', color: '#3b82f6', position: 1 },
      { board_id: data.id, name: 'Done', color: '#10b981', position: 2 },
    ])
    return NextResponse.json({ data })
  }

  if (action === 'create_card') {
    const { column_id, title, description, priority, due_date, labels } = body
    // Get max position
    const { data: existing } = await supabaseAdmin
      .from('kanban_cards')
      .select('position')
      .eq('column_id', column_id)
      .order('position', { ascending: false })
      .limit(1)

    const position = existing?.[0]?.position !== undefined ? existing[0].position + 1 : 0

    const { data, error } = await supabaseAdmin
      .from('kanban_cards')
      .insert({ column_id, title, description, priority: priority || 'medium', due_date, labels: labels || [], position })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }

  if (action === 'move_card') {
    const { card_id, column_id, position } = body
    const { data, error } = await supabaseAdmin
      .from('kanban_cards')
      .update({ column_id, position, updated_at: new Date().toISOString() })
      .eq('id', card_id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }

  if (action === 'update_card') {
    const { card_id, ...updates } = body
    delete updates.action
    const { data, error } = await supabaseAdmin
      .from('kanban_cards')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', card_id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }

  if (action === 'delete_card') {
    await supabaseAdmin.from('kanban_cards').delete().eq('id', body.card_id)
    return NextResponse.json({ success: true })
  }

  if (action === 'assign_user') {
    const { card_id, user_id, assign } = body
    if (assign) {
      await supabaseAdmin.from('kanban_card_assignments').upsert({ card_id, user_id })
    } else {
      await supabaseAdmin.from('kanban_card_assignments').delete().eq('card_id', card_id).eq('user_id', user_id)
    }
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
