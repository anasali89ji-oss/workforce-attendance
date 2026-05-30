export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { CURRENT_USER_COOKIE, CSRF_COOKIE, getCurrentUser } from '@/lib/auth.server'
import { logAudit } from '@/lib/audit'

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'

    if (user) {
      await logAudit(user.tenant_id, 'LOGOUT', 'user', user.id, { ipAddress: ip })
    }
  } catch {
    // Non-fatal
  }

  const response = NextResponse.json({ success: true })
  response.cookies.set(CURRENT_USER_COOKIE, '', { maxAge: 0, path: '/' })
  response.cookies.set(CSRF_COOKIE, '', { maxAge: 0, path: '/' })
  return response
}
