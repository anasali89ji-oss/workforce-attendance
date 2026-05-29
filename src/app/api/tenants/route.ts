export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth.server'
import { prisma } from '@/lib/prisma'
import { tenantSettingsSchema } from '@/lib/validators'
import { logAudit } from '@/lib/audit'

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['owner', 'admin'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const allowed = ['name', 'timezone', 'working_hours_start', 'working_hours_end', 'working_days', 'late_threshold', 'logo_url']
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key]
  }

  const data = await prisma.tenant.update({ where: { id: user.tenant_id }, data: updates })
  await logAudit(user.tenant_id, 'SETTINGS_UPDATED', 'tenant', user.tenant_id, { user, newValues: updates })
  return NextResponse.json({ data })
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const data = await prisma.tenant.findUnique({ where: { id: user.tenant_id } })
  return NextResponse.json({ data })
}
