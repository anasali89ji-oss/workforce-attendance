import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

const LEAVE_TYPES = [
  { id:'annual', name:'Annual Leave', color:'#3b82f6', total_days:21, used_days:3, pending_days:0 },
  { id:'sick', name:'Sick Leave', color:'#ef4444', total_days:10, used_days:1, pending_days:0 },
  { id:'emergency', name:'Emergency Leave', color:'#f59e0b', total_days:3, used_days:0, pending_days:0 },
  { id:'unpaid', name:'Unpaid Leave', color:'#6b7280', total_days:0, used_days:0, pending_days:0 },
  { id:'maternity', name:'Maternity Leave', color:'#8b5cf6', total_days:90, used_days:0, pending_days:0 },
]

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const data = LEAVE_TYPES.map(t => ({ ...t, remaining_days: Math.max(0, t.total_days - t.used_days - t.pending_days) }))
  return NextResponse.json({ data })
}
