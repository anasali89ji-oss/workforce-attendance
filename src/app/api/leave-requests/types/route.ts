import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data } = await supabaseAdmin.from('leave_types').select('*').eq('tenant_id', user.tenant_id).order('name')
  // Fallback to enum values if no custom leave types
  if (!data || data.length === 0) {
    return NextResponse.json({ data: [
      { id: 'annual', name: 'Annual Leave', code: 'AL', color: '#3b82f6', days_per_year: 21 },
      { id: 'sick', name: 'Sick Leave', code: 'SL', color: '#ef4444', days_per_year: 10 },
      { id: 'emergency', name: 'Emergency Leave', code: 'EL', color: '#f59e0b', days_per_year: 3 },
      { id: 'unpaid', name: 'Unpaid Leave', code: 'UL', color: '#6b7280', days_per_year: 0 },
    ]})
  }
  return NextResponse.json({ data })
}
