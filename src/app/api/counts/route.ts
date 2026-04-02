import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isPriv = ['owner','admin','manager'].includes(user.role)

  const [{ count: pendingLeaves }, { count: unreadNotif }] = await Promise.all([
    isPriv
      ? supabaseAdmin.from('leave_requests').select('*',{count:'exact',head:true}).eq('tenant_id',user.tenant_id).eq('status','pending')
      : supabaseAdmin.from('leave_requests').select('*',{count:'exact',head:true}).eq('user_id',user.id).eq('status','pending'),
    supabaseAdmin.from('notifications').select('*',{count:'exact',head:true}).eq('user_id',user.id).eq('is_read',false),
  ])

  return NextResponse.json({ data: { pending_leaves: pendingLeaves || 0, unread_notifications: unreadNotif || 0 } })
}
