import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['owner', 'admin', 'hr'].includes(user.role?.slug || '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { email, role_id } = await req.json()
  const expires = new Date()
  expires.setDate(expires.getDate() + 7)

  const { data, error } = await supabaseAdmin
    .from('team_invitations')
    .insert({
      tenant_id: user.tenant_id,
      email: email.toLowerCase().trim(),
      role_id,
      invited_by: user.id,
      expires_at: expires.toISOString(),
      status: 'pending',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('team_invitations')
    .select('*, inviter:users!invited_by(first_name, last_name)')
    .eq('tenant_id', user.tenant_id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
