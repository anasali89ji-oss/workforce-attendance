import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { CURRENT_USER_COOKIE, createSessionToken, generateCsrfToken } from '@/lib/auth.server'
import { loginSchema } from '@/lib/validators'
import { handleApiError, ValidationError } from '@/lib/errors'
import { loginRateLimit } from '@/lib/rate-limit'
import { logAudit } from '@/lib/audit'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    // Rate limiting by IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
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

    // Fetch profile with password_hash
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, role, password_hash, tenant_id, is_active')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (error || !profile) {
      await logAudit('unknown', 'LOGIN_FAILED', 'user', undefined, { ipAddress: ip })
      return NextResponse.json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' }, { status: 401 })
    }

    if (!profile.is_active) {
      return NextResponse.json({ error: 'Account deactivated', code: 'ACCOUNT_DEACTIVATED' }, { status: 403 })
    }

    if (!profile.password_hash) {
      return NextResponse.json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, profile.password_hash)
    if (!valid) {
      await logAudit(profile.tenant_id, 'LOGIN_FAILED', 'user', profile.id, { ipAddress: ip })
      return NextResponse.json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' }, { status: 401 })
    }

    // Create JWT session token — FIX-004/005
    const token = await createSessionToken(profile.id)
    const csrfToken = await generateCsrfToken()

    await logAudit(profile.tenant_id, 'LOGIN_SUCCESS', 'user', profile.id, { ipAddress: ip })

    const response = NextResponse.json({
      success: true,
      user: {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        role: profile.role,
      },
      csrfToken,
    })

    response.cookies.set(CURRENT_USER_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    return response
  } catch (err) {
    return handleApiError(err)
  }
}
