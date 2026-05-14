import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth.server'
import { supabaseAdmin } from '@/lib/supabase'
import { z } from 'zod'

const settingsSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  logo_url: z.string().url().optional().nullable(),
  timezone: z.string().max(50).optional(),
  working_hours_start: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  working_hours_end: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  working_days: z.array(z.enum(['MON','TUE','WED','THU','FRI','SAT','SUN'])).optional(),
  late_threshold: z.number().int().min(0).max(120).optional(),
})

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('tenants')
    .select('*')
    .eq('id', user.tenant_id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['owner', 'admin'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const result = settingsSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid input', details: result.error.flatten().fieldErrors }, { status: 400 })
  }

  // Strip immutable fields
  const { id: _id, created_at: _ca, slug: _slug, ...updates } = result.data as Record<string, unknown>

  const { data, error } = await supabaseAdmin
    .from('tenants')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', user.tenant_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
