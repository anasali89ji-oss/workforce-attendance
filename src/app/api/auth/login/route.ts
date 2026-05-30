export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { prisma } from '@/lib/prisma'
import { CURRENT_USER_COOKIE, generateCsrfToken } from '@/lib/auth.server'
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

    const { email, password } = result.data

    // Fetch profile via Prisma
    const profile = await prisma.profile.findFirst({
      where: { email: email.toLowerCase().trim(), is_active: true },
      include: { tenant: true },
    })

    if (!profile || !profile.password_hash) {
      throw new AuthError('Invalid credentials')
    }

    // Per-account lockout check
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

    // Supabase session for auth token
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    })

    if (sessionError || !sessionData.session) {
      // Session creation can fail if Supabase auth user doesn't exist yet;
      // generate a fallback opaque token using profile id
      const fallbackToken = Buffer.from(`${profile.id}:${Date.now()}`).toString('base64')
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

      response.cookies.set(CURRENT_USER_COOKIE, fallbackToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24,
        path: '/',
      })

      await logAudit(profile.tenant_id, 'LOGIN_SUCCESS', 'user', profile.id, { ipAddress: ip })
      return response
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
