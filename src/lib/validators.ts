import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Invalid email address').min(1, 'Email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100),
  csrfToken: z.string().optional(),
})

export const clockInSchema = z.object({
  action: z.enum(['clock_in', 'clock_out', 'start_break', 'end_break']),
  notes: z.string().max(500).optional(),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }).optional(),
})

export const leaveRequestSchema = z.object({
  leave_type_id: z.string().uuid(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  days_count: z.number().positive().max(365),
  reason: z.string().min(5, 'Reason must be at least 5 characters').max(1000),
  attachment_url: z.string().url().optional(),
})

export const employeeSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email(),
  phone: z.string().max(20).optional(),
  employee_id: z.string().max(50).optional(),
  department: z.string().max(100).optional(),
  position: z.string().max(100).optional(),
  role: z.enum(['owner', 'admin', 'manager', 'worker']),
  is_active: z.boolean().default(true),
  joining_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export const shiftSchema = z.object({
  name: z.string().min(1).max(100),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM format'),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM format'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#3b82f6'),
  is_night: z.boolean().default(false),
})

export const overtimeSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hours: z.number().positive().max(24),
  reason: z.string().min(5).max(1000),
})

export const tenantSettingsSchema = z.object({
  name: z.string().min(1).max(100),
  timezone: z.string().max(50).default('UTC'),
  working_hours_start: z.string().regex(/^\d{2}:\d{2}$/).default('09:00'),
  working_hours_end: z.string().regex(/^\d{2}:\d{2}$/).default('18:00'),
  working_days: z.array(z.enum(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'])).default(['MON', 'TUE', 'WED', 'THU', 'FRI']),
  late_threshold: z.number().int().min(0).max(120).default(15),
})

export const payrollSchema = z.object({
  user_id: z.string().uuid(),
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  base_salary: z.number().positive(),
  overtime_pay: z.number().min(0).default(0),
  deductions: z.number().min(0).default(0),
  bonuses: z.number().min(0).default(0),
})

export const bulkActionSchema = z.object({
  action: z.enum(['clock_in', 'clock_out', 'approve_leave', 'reject_leave', 'delete', 'activate', 'deactivate']),
  ids: z.array(z.string().uuid()).min(1).max(100),
  reason: z.string().max(500).optional(),
})

export type LoginInput = z.infer<typeof loginSchema>
export type ClockInInput = z.infer<typeof clockInSchema>
export type LeaveRequestInput = z.infer<typeof leaveRequestSchema>
export type EmployeeInput = z.infer<typeof employeeSchema>
export type ShiftInput = z.infer<typeof shiftSchema>
export type OvertimeInput = z.infer<typeof overtimeSchema>
export type TenantSettingsInput = z.infer<typeof tenantSettingsSchema>
export type PayrollInput = z.infer<typeof payrollSchema>
export type BulkActionInput = z.infer<typeof bulkActionSchema>
