import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth.server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['owner', 'admin', 'manager'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') || 'attendance'
  const start = searchParams.get('start')
  const end = searchParams.get('end')

  if (!start || !end) {
    return NextResponse.json({ error: 'start and end date required' }, { status: 400 })
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    return NextResponse.json({ error: 'Invalid date format (YYYY-MM-DD)' }, { status: 400 })
  }

  switch (type) {
    case 'attendance': {
      const { data, error } = await supabaseAdmin
        .from('attendance_logs')
        .select('*, user:profiles!user_id(id,full_name,email,department,employee_id)')
        .eq('tenant_id', user.tenant_id)
        .gte('attendance_date', start)
        .lte('attendance_date', end)
        .order('attendance_date', { ascending: false })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ data, type, start, end })
    }
    case 'leave': {
      const { data, error } = await supabaseAdmin
        .from('leave_requests')
        .select('*, user:profiles!user_id(id,full_name,email,department,employee_id)')
        .eq('tenant_id', user.tenant_id)
        .gte('start_date', start)
        .lte('end_date', end)
        .order('created_at', { ascending: false })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ data, type, start, end })
    }
    case 'overtime': {
      const { data, error } = await supabaseAdmin
        .from('overtime_requests')
        .select('*, user:profiles!user_id(id,full_name,email,department,employee_id)')
        .eq('tenant_id', user.tenant_id)
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: false })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ data, type, start, end })
    }
    default:
      return NextResponse.json({ error: `Unknown report type: ${type}` }, { status: 400 })
  }
}
