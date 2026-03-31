import { NextRequest, NextResponse } from 'next/server'

const COOKIE = 'workforce_user_id'

// Paths that require authentication
const PROTECTED_PREFIXES = [
  '/dashboard', '/attendance', '/leave-requests',
  '/team-directory', '/kanban', '/admin',
]

// API routes and pages that are always public
const PUBLIC_PREFIXES = [
  '/login', '/setup', '/_next', '/favicon', '/api/auth/login',
  '/api/auth/logout', '/api/setup', '/api/seed',
]

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Always allow public paths
  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Allow all other /api/* routes through (they do their own auth checks)
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Root page - let it handle its own redirect logic
  if (pathname === '/') {
    return NextResponse.next()
  }

  // Protect dashboard routes
  if (PROTECTED_PREFIXES.some(p => pathname.startsWith(p))) {
    const userId = req.cookies.get(COOKIE)?.value
    if (!userId) {
      const url = new URL('/login', req.url)
      url.searchParams.set('next', pathname)
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.svg|.*\\.ico).*)'],
}
