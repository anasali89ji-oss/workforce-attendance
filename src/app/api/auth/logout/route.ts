export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { CURRENT_USER_COOKIE, CSRF_COOKIE, getCurrentUser } from '@/lib/auth.server'
import { supabaseAdmin } from '@/lib/supabase'
import { logAudit } from '@/lib/audit'

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'

    if (user) {
      await logAudit(user.tenant_id, 'LOGOUT', 'user', user.id, { ipAddress: ip, user })
      // Invalidate ALL sessions for this user in Supabase Auth
      try {
        await supabaseAdmin.auth.admin.signOut(user.id, 'global')
      } catch {
        // Non-fatal — cookie deletion is the primary logout mechanism
      }
    }

    const response = NextResponse.json({ success: true })
    response.cookies.delete(CURRENT_USER_COOKIE)
    response.cookies.delete(CSRF_COOKIE)
    return response
  } catch {
    const response = NextResponse.json({ success: true })
    response.cookies.delete(CURRENT_USER_COOKIE)
    response.cookies.delete(CSRF_COOKIE)
    return response
  }
}
