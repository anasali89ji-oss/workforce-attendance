export type UserRole = 'owner' | 'admin' | 'hr' | 'manager' | 'employee' | 'contractor' | 'intern' | 'viewer'

export interface Tenant {
  id: string
  name: string
  slug: string
  logo_url?: string
  timezone: string
  working_hours_start: string
  working_hours_end: string
  working_days: string[]
  late_threshold: number
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  tenant_id: string
  email: string
  first_name: string
  last_name: string
  phone?: string
  avatar_url?: string
  role_id?: string
  department_id?: string
  position_id?: string
  employee_id?: string
  is_active: boolean
  joined_at: string
  created_at: string
  updated_at: string
  // Relations
  role?: Role
  department?: Department
  position?: Position
  tenant?: Tenant
}

export interface Role {
  id: string
  tenant_id: string
  name: string
  slug: string
  description?: string
  color: string
  is_system: boolean
  created_at: string
  updated_at: string
  permissions?: Permission[]
}

export interface Permission {
  id: string
  name: string
  slug: string
  description?: string
  module: string
}

export interface RolePermission {
  id: string
  role_id: string
  permission_id: string
}

export interface Department {
  id: string
  tenant_id: string
  name: string
  description?: string
  head_id?: string
  created_at: string
  updated_at: string
}

export interface Position {
  id: string
  tenant_id: string
  department_id?: string
  title: string
  level?: string
  created_at: string
}

export interface Shift {
  id: string
  tenant_id: string
  name: string
  start_time: string
  end_time: string
  color: string
  is_night: boolean
  created_at: string
  updated_at: string
}

export interface AttendanceLog {
  id: string
  tenant_id: string
  user_id: string
  shift_id?: string
  date: string
  clock_in?: string
  clock_out?: string
  status: 'present' | 'absent' | 'late' | 'half_day' | 'on_leave' | 'holiday'
  late_minutes: number
  overtime_minutes: number
  notes?: string
  created_at: string
  updated_at: string
  user?: User
  shift?: Shift
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
  created_at: string
}

export interface LeaveRequest {
  id: string
  tenant_id: string
  employee_id: string
  approver_id?: string
  leave_type_id: string
  start_date: string
  end_date: string
  days_count: number
  reason?: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  approved_at?: string
  rejected_at?: string
  rejection_reason?: string
  created_at: string
  updated_at: string
  employee?: User
  approver?: User
  leave_type?: LeaveType
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
  leave_type?: LeaveType
}

export interface KanbanBoard {
  id: string
  tenant_id: string
  name: string
  description?: string
  created_by: string
  created_at: string
  updated_at: string
  columns?: KanbanColumn[]
}

export interface KanbanColumn {
  id: string
  board_id: string
  name: string
  color: string
  position: number
  created_at: string
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
  created_at: string
  updated_at: string
  assignments?: KanbanCardAssignment[]
}

export interface KanbanCardAssignment {
  id: string
  card_id: string
  user_id: string
  user?: User
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

export interface Announcement {
  id: string
  tenant_id: string
  title: string
  content: string
  priority: 'low' | 'normal' | 'high'
  author_id: string
  expires_at?: string
  created_at: string
}

export interface TeamInvitation {
  id: string
  tenant_id: string
  email: string
  role_id?: string
  invited_by: string
  token: string
  status: 'pending' | 'accepted' | 'expired'
  expires_at: string
  accepted_at?: string
  created_at: string
}

export interface SetupWizardState {
  id: string
  tenant_id: string
  step: number
  is_complete: boolean
  data: Record<string, unknown>
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

export interface CurrentUser extends User {
  tenant: Tenant
  role: Role
  permissions: string[]
}
