import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['owner','admin'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const allowed = ['name','timezone','work_start_time','work_end_time','work_days','late_threshold','logo_url']
  const updates: Record<string,unknown> = { updated_at: new Date().toISOString() }
  for (const key of allowed) { if (body[key] !== undefined) updates[key] = body[key] }

  const { data, error } = await supabaseAdmin.from('tenants').update(updates).eq('id', user.tenant_id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
