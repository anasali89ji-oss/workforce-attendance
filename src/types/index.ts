/**
 * WorkForce Pro - Enterprise Attendance Management System
 * Type Definitions
 */

export type UserRole = 'owner' | 'admin' | 'manager' | 'employee'
export type UserStatus = 'active' | 'inactive' | 'suspended' | 'terminated'
export type WorkingDay = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN'

export interface Tenant {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  timezone: string
  workingHoursStart: string
  workingHoursEnd: string
  workingDays: WorkingDay[]
  lateThresholdMinutes: number
  createdAt: Date
  updatedAt: Date
}

export interface User {
  id: string
  tenantId: string
  email: string
  firstName: string
  lastName: string
  fullName: string
  phone: string | null
  avatarUrl: string | null
  roleId: string | null
  departmentId: string | null
  positionId: string | null
  employeeId: string | null
  role: UserRole
  status: UserStatus
  joinedAt: Date
  createdAt: Date
  updatedAt: Date
  tenant?: Tenant
  department?: Department
  position?: Position
  roleDetails?: Role
}

export interface Department {
  id: string
  tenantId: string
  name: string
  description: string | null
  headId: string | null
  createdAt: Date
  updatedAt: Date
  userCount?: number
}

export interface Position {
  id: string
  tenantId: string
  departmentId: string | null
  title: string
  level: string | null
  createdAt: Date
}

export interface Role {
  id: string
  tenantId: string
  name: string
  slug: string
  description: string | null
  color: string
  isSystem: boolean
  createdAt: Date
  updatedAt: Date
  permissions?: Permission[]
  userCount?: number
}

export interface Permission {
  id: string
  name: string
  slug: string
  description: string | null
  module: string
  createdAt: Date
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'half_day' | 'on_leave' | 'holiday' | 'weekend'

export interface AttendanceLog {
  id: string
  tenantId: string
  userId: string
  shiftId: string | null
  date: Date
  clockIn: Date | null
  clockOut: Date | null
  status: AttendanceStatus
  lateMinutes: number
  overtimeMinutes: number
  notes: string | null
  ipAddress: string | null
  locationLat: number | null
  locationLng: number | null
  createdAt: Date
  updatedAt: Date
  user?: User
  shift?: Shift
}

export interface Shift {
  id: string
  tenantId: string
  name: string
  startTime: string
  endTime: string
  color: string
  isNight: boolean
  createdAt: Date
  updatedAt: Date
}

export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

export interface LeaveType {
  id: string
  tenantId: string
  name: string
  code: string
  color: string
  daysPerYear: number
  carryForward: boolean
  requiresApproval: boolean
  createdAt: Date
}

export interface LeaveRequest {
  id: string
  tenantId: string
  employeeId: string
  approverId: string | null
  leaveTypeId: string
  startDate: Date
  endDate: Date
  daysCount: number
  reason: string | null
  status: LeaveStatus
  approvedAt: Date | null
  rejectedAt: Date | null
  rejectionReason: string | null
  createdAt: Date
  updatedAt: Date
  employee?: User
  approver?: User
  leaveType?: LeaveType
}

export interface LeaveBalance {
  id: string
  tenantId: string
  userId: string
  leaveTypeId: string
  year: number
  totalDays: number
  usedDays: number
  pendingDays: number
  availableDays: number
  leaveType?: LeaveType
}

export interface AnalyticsSummary {
  totalEmployees: number
  presentToday: number
  absentToday: number
  lateToday: number
  onLeaveToday: number
  attendanceRate: number
  pendingLeaves: number
}

export interface AttendanceTrend {
  date: string
  present: number
  absent: number
  late: number
  onLeave: number
}

export type NotificationType = 'info' | 'success' | 'warning' | 'error'

export interface Notification {
  id: string
  tenantId: string
  userId: string
  title: string
  message: string
  type: NotificationType
  isRead: boolean
  actionUrl: string | null
  createdAt: Date
}

export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  success: boolean
  message?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  pages: number
}

export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  search?: string
}
