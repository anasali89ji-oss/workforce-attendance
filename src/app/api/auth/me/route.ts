export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth.server'
import { handleApiError } from '@/lib/errors'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    }

    // Strip sensitive data
    const safeUser = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      first_name: user.first_name,
      last_name: user.last_name,
      avatar_url: user.avatar_url,
      role: user.role,
      phone: user.phone,
      employee_id: user.employee_id,
      department: user.department,
      position: user.position,
      is_active: user.is_active,
      joining_date: user.joining_date,
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
        slug: user.tenant.slug,
        logo_url: user.tenant.logo_url,
        timezone: user.tenant.timezone,
        working_hours_start: user.tenant.working_hours_start,
        working_hours_end: user.tenant.working_hours_end,
        working_days: user.tenant.working_days,
        late_threshold: user.tenant.late_threshold,
      }
    }

    return NextResponse.json({ user: safeUser })
  } catch (error) {
    const { message, status, code } = handleApiError(error)
    return NextResponse.json({ error: message, code }, { status })
  }
}
