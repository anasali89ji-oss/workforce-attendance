import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period') || new Date().toISOString().slice(0, 7)

  const [y, m] = period.split('-').map(Number)
  const start = `${period}-01`
  const end = new Date(y, m, 0).toISOString().split('T')[0]

  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, employee_id, department, email')
    .eq('tenant_id', user.tenant_id)
    .eq('is_active', true)

  const { data: attLogs } = await supabaseAdmin
    .from('attendance_logs')
    .select('user_id, net_duration_minutes, overtime_minutes, is_overtime, attendance_date')
    .eq('tenant_id', user.tenant_id)
    .gte('attendance_date', start)
    .lte('attendance_date', end)

  const records = (profiles || []).map(p => {
    const logs = (attLogs || []).filter(l => l.user_id === p.id)
    const totalMins = logs.reduce((a, l) => a + (l.net_duration_minutes || 0), 0)
    const otMins = logs.reduce((a, l) => a + (l.overtime_minutes || 0), 0)
    const baseSalary = 50000 // default; in real app from profiles
    const otRate = baseSalary / (22 * 8 * 60) * 1.5
    const otPay = Math.round(otMins * otRate)
    const deductions = Math.round(baseSalary * 0.1) // 10% tax placeholder
    return {
      id: p.id,
      user_id: p.id,
      user: { full_name: p.full_name, employee_id: p.employee_id, department: p.department, email: p.email },
      period_start: start,
      period_end: end,
      base_salary: baseSalary,
      overtime_pay: otPay,
      deductions,
      net_pay: baseSalary + otPay - deductions,
      status: 'draft',
      total_hours: Math.floor(totalMins / 60),
      overtime_hours: Math.floor(otMins / 60),
      days_worked: logs.length,
    }
  })

  return NextResponse.json({ data: records })
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || !['owner','admin'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json()
  return NextResponse.json({ data: { ...body, status: 'processed' } })
}
