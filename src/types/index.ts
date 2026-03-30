export type UserRole = 'owner' | 'admin' | 'manager' | 'worker'

export interface Tenant {
  id: string
  subdomain: string
  name: string
  logo_url?: string
  timezone: string
  work_start_time: string
  work_end_time: string
  work_days: string
  late_threshold: number
  created_at: string
  updated_at: string
}

export interface CurrentUser {
  id: string
  tenant_id: string
  email: string
  full_name: string
  first_name?: string
  last_name?: string
  avatar_url?: string
  role: UserRole
  phone?: string
  employee_id?: string
  department?: string
  position?: string
  is_active: boolean
  joining_date?: string
  created_at: string
  updated_at: string
  tenant: Tenant
}

export interface AttendanceLog {
  id: string
  tenant_id: string
  user_id: string
  attendance_date: string
  punch_in_at?: string
  punch_out_at?: string
  status: string
  is_late: boolean
  is_overtime: boolean
  overtime_minutes: number
  net_duration_minutes: number
  timesheet_note?: string
  user?: { full_name: string; email: string; employee_id?: string; avatar_url?: string }
}

export interface LeaveRequest {
  id: string
  tenant_id: string
  user_id: string
  leave_type: string
  start_date: string
  end_date: string
  days_count: number
  reason: string
  status: string
  approved_by?: string
  approved_at?: string
  rejection_reason?: string
  created_at: string
  user?: { full_name: string; email: string; avatar_url?: string }
  approver?: { full_name: string }
}

export interface LeaveType {
  id: string
  tenant_id: string
  name: string
  code: string
  color: string
  days_per_year: number
}

export interface Shift {
  id: string
  tenant_id: string
  name: string
  start_time: string
  end_time: string
  color: string
  is_night_shift: boolean
}

export interface KanbanBoard {
  id: string
  tenant_id: string
  name: string
  description?: string
  columns?: KanbanColumn[]
}

export interface KanbanColumn {
  id: string
  board_id: string
  name: string
  color: string
  position: number
  cards?: KanbanCard[]
}

export interface KanbanCard {
  id: string
  column_id: string
  title: string
  description?: string
  priority: string
  due_date?: string
  position: number
  labels: string[]
  assignments?: { user?: { id: string; full_name: string; avatar_url?: string } }[]
}

export interface CustomRole {
  id: string
  tenant_id: string
  name: string
  slug: string
  description?: string
  color: string
  permissions: string[]
  is_system: boolean
  user_count?: number
}

export interface AnalyticsSummary {
  total_employees: number
  present_today: number
  absent_today: number
  late_today: number
  on_leave_today: number
  attendance_rate: number
  pending_leaves: number
}
