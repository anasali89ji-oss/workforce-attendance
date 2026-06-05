export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { CURRENT_USER_COOKIE, CSRF_COOKIE, getCurrentUser } from '@/lib/auth.server'
import { supabaseAdmin } from '@/lib/supabase'
import { logAudit } from '@/lib/audit'

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'

    if (user) {
      await logAudit(user.tenant_id, 'LOGOUT', 'user', user.id, { ipAddress: ip, user })
      // Fix 1.4: Invalidate Supabase server-side session so the token can't be reused
      try {
        await supabaseAdmin.auth.admin.signOut(user.id)
      } catch {
        // Non-fatal: cookie deletion below will prevent local re-use
      }
    } else {
      // Even without a valid user, try to revoke the raw token
      try {
        const cookieStore = await cookies()
        const token = cookieStore.get(CURRENT_USER_COOKIE)?.value
        if (token) {
          await supabaseAdmin.auth.admin.signOut(token)
        }
      } catch {
        // Non-fatal
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
