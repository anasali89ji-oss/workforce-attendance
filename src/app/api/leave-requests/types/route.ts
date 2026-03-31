import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

// These match the leave_type enum exactly in the DB
const LEAVE_TYPES = [
  { id: 'annual',       name: 'Annual Leave',       code: 'AL', color: '#3B82F6', days_per_year: 21 },
  { id: 'sick',         name: 'Sick Leave',          code: 'SL', color: '#EF4444', days_per_year: 10 },
  { id: 'emergency',    name: 'Emergency Leave',     code: 'EL', color: '#F59E0B', days_per_year: 3  },
  { id: 'casual',       name: 'Casual Leave',        code: 'CL', color: '#10B981', days_per_year: 7  },
  { id: 'unpaid',       name: 'Unpaid Leave',        code: 'UL', color: '#6B7280', days_per_year: 0  },
  { id: 'maternity',    name: 'Maternity Leave',     code: 'ML', color: '#8B5CF6', days_per_year: 90 },
  { id: 'paternity',    name: 'Paternity Leave',     code: 'PL', color: '#0891B2', days_per_year: 14 },
  { id: 'bereavement',  name: 'Bereavement Leave',   code: 'BL', color: '#475569', days_per_year: 5  },
  { id: 'training',     name: 'Training Leave',      code: 'TL', color: '#7C3AED', days_per_year: 10 },
  { id: 'compassionate',name: 'Compassionate Leave', code: 'CML',color: '#BE185D', days_per_year: 3  },
]

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ data: LEAVE_TYPES })
}
