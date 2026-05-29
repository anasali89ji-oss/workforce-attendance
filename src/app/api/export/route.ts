export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth.server'
import { hasPermission } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleApiError, AuthError, ForbiddenError } from '@/lib/errors'

const ALLOWED_TABLES = ['attendance_logs', 'leave_requests', 'payroll_records', 'overtime_requests'] as const
type AllowedTable = (typeof ALLOWED_TABLES)[number]

async function fetchTableData(table: AllowedTable, tenantId: string, filters: { dateFrom?: string; dateTo?: string }) {
  const dateFilter = (filters?.dateFrom || filters?.dateTo)
    ? {
        created_at: {
          ...(filters.dateFrom && { gte: new Date(filters.dateFrom) }),
          ...(filters.dateTo && { lte: new Date(filters.dateTo) }),
        },
      }
    : {}

  switch (table) {
    case 'attendance_logs':
      return prisma.attendanceLog.findMany({ where: { tenant_id: tenantId, ...dateFilter }, take: 10000 })
    case 'leave_requests':
      return prisma.leaveRequest.findMany({ where: { tenant_id: tenantId, ...dateFilter }, take: 10000 })
    case 'payroll_records':
      return prisma.payrollRecord.findMany({ where: { tenant_id: tenantId, ...dateFilter }, take: 10000 })
    case 'overtime_requests':
      return prisma.overtimeRequest.findMany({ where: { tenant_id: tenantId, ...dateFilter }, take: 10000 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) throw new AuthError()

    const { table, format, filters } = await req.json()
    if (!ALLOWED_TABLES.includes(table)) throw new ForbiddenError()
    if (!hasPermission(user, `${table.replace('_logs', '')}:read`)) throw new ForbiddenError()

    const data = await fetchTableData(table as AllowedTable, user.tenant_id, filters)

    if (format === 'csv') {
      const headers = data && data.length > 0 ? Object.keys(data[0]) : []
      const csv = [
        headers.join(','),
        ...(data || []).map(row =>
          headers.map(h => JSON.stringify((row as Record<string, unknown>)[h] ?? '')).join(',')
        ),
      ].join('\n')

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${table}_export.csv"`,
        },
      })
    }

    return NextResponse.json({ data })
  } catch (error) {
    const { message, status, code } = handleApiError(error)
    return NextResponse.json({ error: message, code }, { status })
  }
}
