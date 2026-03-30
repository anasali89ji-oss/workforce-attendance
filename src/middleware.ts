import { NextRequest, NextResponse } from 'next/server'

const COOKIE = 'workforce_user_id'
const PUBLIC = ['/login', '/setup', '/api/auth/login', '/api/auth/logout', '/api/setup']

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow public routes
  if (PUBLIC.some(p => pathname.startsWith(p))) return NextResponse.next()
  // Allow static files
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) return NextResponse.next()
  // Allow API setup
  if (pathname === '/api/setup') return NextResponse.next()

  // Protected routes need cookie
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/attendance') ||
      pathname.startsWith('/leave') || pathname.startsWith('/team') ||
      pathname.startsWith('/kanban') || pathname.startsWith('/admin')) {
    const userId = req.cookies.get(COOKIE)?.value
    if (!userId) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
