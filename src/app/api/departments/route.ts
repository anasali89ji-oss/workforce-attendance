import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth.server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // Departments are stored as strings on profiles - extract unique values
  const { data } = await supabaseAdmin.from('profiles').select('department').eq('tenant_id', user.tenant_id).not('department', 'is', null)
  const departments = Array.from(new Set((data || []).map(p => p.department).filter(Boolean))).map((name, i) => ({ id: name, name }))
  return NextResponse.json({ data: departments })
}
