import { NextResponse } from 'next/server'
import { getCurrentUser } from './auth'
import type { CurrentUser } from '@/types'

export function ok(data: unknown, status = 200) {
  return NextResponse.json({ data, success: true }, { status })
}

export function err(message: string, status = 400) {
  return NextResponse.json({ error: message, success: false }, { status })
}

export async function withAuth(
  fn: (user: CurrentUser, req: Request) => Promise<Response>,
  req: Request
): Promise<Response> {
  const user = await getCurrentUser()
  if (!user) return err('Unauthorized', 401)
  return fn(user, req)
}

export function paginate<T>(items: T[], page: number, limit: number) {
  const start = (page - 1) * limit
  return {
    items: items.slice(start, start + limit),
    total: items.length,
    page,
    limit,
    pages: Math.ceil(items.length / limit),
  }
}
