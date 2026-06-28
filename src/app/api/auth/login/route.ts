export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'
import { prisma } from '@/lib/prisma'
import { CURRENT_USER_COOKIE, generateCsrfToken, validateCsrfToken } from '@/lib/auth.server'
import { loginSchema } from '@/lib/validators'
import { handleApiError, AuthError, ValidationError } from '@/lib/errors'
import { loginRateLimit, accountLockoutLimit } from '@/lib/rate-limit'
import { logAudit } from '@/lib/audit'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'

    // IP-based rate limit
    const { success: rateOk } = await loginRateLimit.limit(ip)
    if (!rateOk) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.', code: 'RATE_LIMITED' },
        { status: 429, headers: { 'Retry-After': '60' } }
      )
    }

    const body = await req.json()
    const result = loginSchema.safeParse(body)
    if (!result.success) {
      throw new ValidationError('Invalid input', result.error.flatten().fieldErrors)
    }

    // Fix 1.3: Validate CSRF token if provided
    if (body.csrfToken) {
      const csrfValid = await validateCsrfToken(body.csrfToken)
      if (!csrfValid) {
        return NextResponse.json({ error: 'Invalid CSRF token', code: 'CSRF_INVALID' }, { status: 403 })
      }
    }

    const { email, password } = result.data

    // Fix 1.2: Null check BEFORE accountKey — fetch profile first
    const profile = await prisma.profile.findFirst({
      where: { email: email.toLowerCase().trim(), is_active: true },
      include: { tenant: true },
    })

    if (!profile || !profile.password_hash) {
      throw new AuthError('Invalid credentials')
    }

    // Per-account lockout check (safe now that profile is confirmed non-null)
    const accountKey = `account:${profile.id}`
    const { success: accountOk } = await accountLockoutLimit.limit(accountKey)
    if (!accountOk) {
      return NextResponse.json(
        { error: 'Account temporarily locked due to repeated failures. Try again in 15 minutes.', code: 'ACCOUNT_LOCKED' },
        { status: 429 }
      )
    }

    const valid = await bcrypt.compare(password, profile.password_hash)
    if (!valid) {
      await logAudit(profile.tenant_id, 'LOGIN_FAILED', 'user', profile.id, { ipAddress: ip })
      throw new AuthError('Invalid credentials')
    }

    // Fix 6.3: Reset lockout counter on successful login
    try {
      // Upstash Ratelimit doesn't expose reset(); delete the key via Redis directly if available
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rl = accountLockoutLimit as any
      if (rl.redis) {
        await rl.redis.del(`@upstash/ratelimit:${accountKey}`)
      }
    } catch {
      // Non-fatal: lockout will expire on its own
    }

    // Use the regular client (anon key) for user-facing sign-in — NOT supabaseAdmin.
    // Admin client has persistSession:false and is not designed for user auth flows.
    const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    })

    if (sessionError || !sessionData.session) {
      // No fallback — if Supabase auth is broken the user cannot log in safely
      return NextResponse.json(
        { error: 'Auth system unavailable. Please contact support.', code: 'AUTH_CONFIG_ERROR' },
        { status: 503 }
      )
    }

    await logAudit(profile.tenant_id, 'LOGIN_SUCCESS', 'user', profile.id, { ipAddress: ip })
    const csrfToken = await generateCsrfToken()

    const response = NextResponse.json({
      success: true,
      user: {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name ?? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim(),
        role: profile.role,
      },
      csrfToken,
    })

    response.cookies.set(CURRENT_USER_COOKIE, sessionData.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24,
      path: '/',
    })

    return response
  } catch (error) {
    const { message, status, code } = handleApiError(error)
    return NextResponse.json({ error: message, code }, { status })
  }
}
