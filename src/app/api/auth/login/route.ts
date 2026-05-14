import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { CURRENT_USER_COOKIE, generateCsrfToken } from '@/lib/auth.server'
import { loginSchema } from '@/lib/validators'
import { handleApiError, AuthError, ValidationError } from '@/lib/errors'
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

    // Fetch user with tenant
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*, tenant:tenants(*)')
      .eq('email', email.toLowerCase().trim())
      .eq('is_active', true)
      .single()

    if (profileError || !profile || !profile.password_hash) {
      throw new AuthError('Invalid credentials')
    }

    const valid = await bcrypt.compare(password, profile.password_hash)
    if (!valid) {
      await logAudit(profile.tenant_id, 'LOGIN_FAILED', 'user', profile.id, { ipAddress: ip })
      throw new AuthError('Invalid credentials')
    }

    // Create Supabase session
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    })

    if (sessionError || !sessionData.session) {
      throw new AuthError('Session creation failed')
    }

    // Audit log
    await logAudit(profile.tenant_id, 'LOGIN_SUCCESS', 'user', profile.id, { ipAddress: ip })

    // Generate CSRF token
    const csrfToken = await generateCsrfToken()

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

    // Set secure session cookie
    response.cookies.set(CURRENT_USER_COOKIE, sessionData.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    return response
  } catch (error) {
    const { message, status, code } = handleApiError(error)
    return NextResponse.json({ error: message, code }, { status })
  }
}
