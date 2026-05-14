export type UserRole = 'owner' | 'admin' | 'manager' | 'worker'

export interface Tenant {
  id: string
  slug: string
  name: string
  logo_url?: string
  timezone: string
  working_hours_start: string
  working_hours_end: string
  working_days: string[]
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
  status: 'punched_in' | 'punched_out' | 'on_break' | 'missed' | 'on_leave'
  is_late: boolean
  is_overtime: boolean
  overtime_minutes: number
  net_duration_minutes: number
  timesheet_note?: string
  ip_address?: string
  location_lat?: number
  location_lng?: number
  user?: {
    id: string
    full_name: string
    email: string
    avatar_url?: string
    employee_id?: string
  }
}

export interface BreakLog {
  id: string
  attendance_id: string
  user_id: string
  break_start: string
  break_end?: string
  duration_minutes?: number
  break_type: 'regular' | 'lunch' | 'short'
}

export interface LeaveRequest {
  id: string
  tenant_id: string
  user_id: string
  leave_type: string
  leave_type_id: string
  start_date: string
  end_date: string
  days_count: number
  reason: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  approved_by?: string
  approved_at?: string
  rejection_reason?: string
  attachment_url?: string
  created_at: string
  user?: {
    id: string
    full_name: string
    email: string
    avatar_url?: string
  }
  approver?: {
    full_name: string
  }
}

export interface LeaveBalance {
  id: string
  tenant_id: string
  user_id: string
  leave_type_id: string
  year: number
  total_days: number
  used_days: number
  pending_days: number
  leave_type?: {
    name: string
    code: string
    color: string
  }
}

export interface LeaveType {
  id: string
  tenant_id: string
  name: string
  code: string
  color: string
  days_per_year: number
  carry_forward: boolean
  requires_approval: boolean
}

export interface Shift {
  id: string
  tenant_id: string
  name: string
  start_time: string
  end_time: string
  color: string
  is_night_shift: boolean
  created_at: string
}

export interface WorkSchedule {
  id: string
  tenant_id: string
  user_id: string
  shift_id: string
  day_of_week: string
  effective_from: string
  effective_to?: string
  shift?: Shift
}

export interface Department {
  id: string
  tenant_id: string
  name: string
  description?: string
  head_id?: string
  head?: {
    full_name: string
    email: string
  }
  employee_count?: number
  created_at: string
}

export interface Position {
  id: string
  tenant_id: string
  department_id?: string
  title: string
  level?: string
  department?: Department
}

export interface Employee {
  id: string
  tenant_id: string
  email: string
  full_name: string
  first_name?: string
  last_name?: string
  phone?: string
  avatar_url?: string
  role: UserRole
  employee_id?: string
  department?: string
  position?: string
  is_active: boolean
  joining_date?: string
  created_at: string
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
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date?: string
  position: number
  labels: string[]
  assignments?: {
    user?: {
      id: string
      full_name: string
      avatar_url?: string
    }
  }[]
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

export interface Notification {
  id: string
  tenant_id: string
  user_id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  is_read: boolean
  action_url?: string
  created_at: string
}

export interface AuditLog {
  id: string
  tenant_id: string
  user_id?: string
  action: string
  entity_type: string
  entity_id?: string
  old_values?: Record<string, unknown>
  new_values?: Record<string, unknown>
  ip_address?: string
  created_at: string
  user?: {
    full_name: string
    email: string
  }
}

export interface PayrollRecord {
  id: string
  tenant_id: string
  user_id: string
  period_start: string
  period_end: string
  base_salary: number
  overtime_pay: number
  deductions: number
  bonuses: number
  net_pay: number
  status: 'draft' | 'review' | 'approved' | 'paid'
  processed_at?: string
  user?: {
    full_name: string
    email: string
    employee_id?: string
  }
}

export interface OvertimeRequest {
  id: string
  tenant_id: string
  user_id: string
  date: string
  hours: number
  reason?: string
  status: 'pending' | 'approved' | 'rejected'
  approved_by?: string
  created_at: string
  user?: {
    full_name: string
    email: string
  }
}

export interface AnalyticsSummary {
  total_employees: number
  present_today: number
  absent_today: number
  late_today: number
  on_leave_today: number
  attendance_rate: number
  pending_leaves: number
  pending_overtime: number
  avg_hours_today: number
}

export interface ExportOptions {
  format: 'csv' | 'excel' | 'pdf'
  scope: 'current' | 'filtered' | 'all'
  dateRange?: { from: string; to: string }
}

export interface RealtimeEvent {
  type: 'attendance' | 'leave' | 'notification' | 'overtime'
  action: 'insert' | 'update' | 'delete'
  payload: Record<string, unknown>
}
