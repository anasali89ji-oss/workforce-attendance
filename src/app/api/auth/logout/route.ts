import { NextResponse } from 'next/server'
import { CURRENT_USER_COOKIE } from '@/lib/auth'

export async function POST() {
  const response = NextResponse.json({ success: true })
  response.cookies.delete(CURRENT_USER_COOKIE)
  return response
}
