export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CURRENT_USER_COOKIE, generateCsrfToken } from '@/lib/auth.server'
import { signSession } from '@/lib/session'
import { loginSchema } from '@/lib/validators'
import { handleApiError, AuthError, ValidationError } from '@/lib/errors'
import { loginRateLimit, accountLockoutLimit } from '@/lib/rate-limit'
import { logAudit } from '@/lib/audit'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'

    // IP-level rate limit (soft — no-op if Redis not configured)
    const { success: rateOk } = await loginRateLimit.limit(ip)
    if (!rateOk) {
      return NextResponse.json(
        { error: 'Too many login attempts. Try again in a minute.', code: 'RATE_LIMITED' },
        { status: 429, headers: { 'Retry-After': '60' } }
      )
    }

    const body = await req.json()
    const result = loginSchema.safeParse(body)
    if (!result.success) {
      throw new ValidationError('Invalid input', result.error.flatten().fieldErrors)
    }

    const { email, password } = result.data
    const normalizedEmail = email.toLowerCase().trim()

    // Fetch profile — raw query to cast enum role to text
    const rows = await prisma.$queryRaw<Array<{
      id: string; email: string; password_hash: string; full_name: string | null
      first_name: string | null; last_name: string | null; role: string
      tenant_id: string; is_active: boolean
    }>>`
      SELECT id, email, password_hash, full_name, first_name, last_name,
             role::text AS role, tenant_id, is_active
      FROM profiles
      WHERE email = ${normalizedEmail} AND is_active = true
      LIMIT 1
    `

    const profile = rows[0]

    if (!profile || !profile.password_hash) {
      // Constant-time fake compare to prevent timing attacks
      await bcrypt.compare(password, '$2a$12$placeholder.hash.to.prevent.timing.attack.x')
      throw new AuthError('Invalid credentials')
    }

    // Per-account lockout (soft — no-op if Redis not configured)
    const { success: accountOk } = await accountLockoutLimit.limit(`account:${profile.id}`)
    if (!accountOk) {
      return NextResponse.json(
        { error: 'Account temporarily locked. Try again in 15 minutes.', code: 'ACCOUNT_LOCKED' },
        { status: 429 }
      )
    }

    // Verify password
    const valid = await bcrypt.compare(password, profile.password_hash)
    if (!valid) {
      await logAudit(profile.tenant_id, 'LOGIN_FAILED', 'user', profile.id, { ipAddress: ip })
      throw new AuthError('Invalid credentials')
    }

    // Sign our own JWT — no Supabase auth required
    const sessionJwt = await signSession({
      sub: profile.id,
      tenant_id: profile.tenant_id,
      role: profile.role,
      email: profile.email,
    })

    const csrfToken = await generateCsrfToken()
    await logAudit(profile.tenant_id, 'LOGIN_SUCCESS', 'user', profile.id, { ipAddress: ip })

    const displayName = (profile.full_name
      ?? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim())
      || profile.email

    const response = NextResponse.json({
      success: true,
      user: {
        id: profile.id,
        email: profile.email,
        full_name: displayName,
        role: profile.role,
      },
      csrfToken,
    })

    response.cookies.set(CURRENT_USER_COOKIE, sessionJwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,    // 24 hours
      path: '/',
    })

    return response
  } catch (error) {
    const { message, status, code } = handleApiError(error)
    return NextResponse.json({ error: message, code }, { status })
  }
}
