import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

const ALL_PERMISSIONS = [
  { module: 'attendance', slug: 'attendance.view', name: 'View Attendance' },
  { module: 'attendance', slug: 'attendance.manage', name: 'Manage Attendance' },
  { module: 'attendance', slug: 'attendance.clock', name: 'Clock In/Out' },
  { module: 'employees', slug: 'employees.view', name: 'View Employees' },
  { module: 'employees', slug: 'employees.manage', name: 'Manage Employees' },
  { module: 'leave', slug: 'leave.view', name: 'View Leaves' },
  { module: 'leave', slug: 'leave.apply', name: 'Apply Leave' },
  { module: 'leave', slug: 'leave.approve', name: 'Approve Leave' },
  { module: 'roles', slug: 'roles.manage', name: 'Manage Roles' },
  { module: 'analytics', slug: 'analytics.view', name: 'View Analytics' },
  { module: 'kanban', slug: 'kanban.view', name: 'View Kanban' },
  { module: 'kanban', slug: 'kanban.manage', name: 'Manage Kanban' },
  { module: 'settings', slug: 'settings.manage', name: 'Manage Settings' },
]

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ data: ALL_PERMISSIONS })
}
