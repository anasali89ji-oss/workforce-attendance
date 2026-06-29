import { NextRequest, NextResponse } from 'next/server'

const SESSION_COOKIE = 'workforce_session_token'

const PUBLIC_PATHS = [
  '/login', '/setup', '/_next', '/favicon',
  '/api/auth/login', '/api/auth/logout',
  '/api/setup', '/api/seed', '/api/health',
]

const PROTECTED_PREFIXES = [
  '/dashboard', '/attendance', '/leave-requests',
  '/team-directory', '/kanban', '/admin', '/profile',
  '/shifts', '/overtime', '/payroll', '/reports', '/live-map',
]

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const res = NextResponse.next()

  // Security headers
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)')
  if (process.env.NODE_ENV === 'production') {
    res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  }

  // Public paths always allowed
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) return res

  // Static assets
  if (pathname.match(/\.(svg|png|jpg|jpeg|gif|ico|css|js|woff|woff2)$/)) return res

  // API routes: add CORS headers but let route handlers manage auth
  if (pathname.startsWith('/api/')) {
    res.headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL || '*')
    res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token')
    return res
  }

  // Root — handled by page.tsx
  if (pathname === '/') return res

  // Protect dashboard routes
  if (PROTECTED_PREFIXES.some(p => pathname.startsWith(p))) {
    const sessionToken = req.cookies.get(SESSION_COOKIE)?.value
    if (!sessionToken) {
      const url = new URL('/login', req.url)
      url.searchParams.set('next', pathname)
      return NextResponse.redirect(url)
    }
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$|.*\\.ico$).*)'],
}
