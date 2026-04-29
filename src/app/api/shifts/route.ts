import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('shifts')
    .select('*')
    .eq('tenant_id', user.tenant_id)
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // FIX: user.role is a plain string like "owner", NOT an object with .slug
  if (!['owner', 'admin', 'manager'].includes(user.role || '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { name, start_time, end_time, color, is_night } = body

  if (!name?.trim() || !start_time || !end_time) {
    return NextResponse.json({ error: 'name, start_time and end_time are required' }, { status: 422 })
  }

  const { data, error } = await supabaseAdmin
    .from('shifts')
    .insert({
      name: name.trim(),
      start_time,
      end_time,
      color: color || '#3b82f6',
      is_night: is_night || false,
      tenant_id: user.tenant_id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['owner', 'admin', 'manager'].includes(user.role || '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id, ...updates } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 422 })

  const { data, error } = await supabaseAdmin
    .from('shifts')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', user.tenant_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['owner', 'admin'].includes(user.role || '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 422 })

  const { error } = await supabaseAdmin
    .from('shifts')
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.tenant_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
