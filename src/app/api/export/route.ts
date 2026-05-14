import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth.server'
import { hasPermission } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { handleApiError, AuthError, ForbiddenError } from '@/lib/errors'

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) throw new AuthError()

    const { table, format, filters } = await req.json()

    if (!hasPermission(user, `${table}:read`)) throw new ForbiddenError()

    let query = supabaseAdmin.from(table).select('*').eq('tenant_id', user.tenant_id)
    if (filters?.dateFrom) query = query.gte('created_at', filters.dateFrom)
    if (filters?.dateTo) query = query.lte('created_at', filters.dateTo)

    const { data, error } = await query.limit(10000)
    if (error) throw new Error(error.message)

    if (format === 'csv') {
      const headers = data && data.length > 0 ? Object.keys(data[0]) : []
      const csv = [
        headers.join(','),
        ...(data || []).map(row => headers.map(h => JSON.stringify(row[h] ?? '')).join(','))
      ].join('\n')

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${table}_export.csv"`,
        }
      })
    }

    if (format === 'json') {
      return NextResponse.json({ data })
    }

    return NextResponse.json({ error: 'Unsupported format', code: 'UNSUPPORTED_FORMAT' }, { status: 400 })
  } catch (error) {
    const { message, status, code } = handleApiError(error)
    return NextResponse.json({ error: message, code }, { status })
  }
}
