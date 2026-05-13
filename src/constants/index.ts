/**
 * Application constants
 */

// Role permissions
export const ROLE_PERMISSIONS = {
  owner: ['all'],
  admin: ['manage_employees', 'manage_attendance', 'manage_leaves', 'manage_shifts', 'view_reports', 'manage_settings'],
  manager: ['manage_attendance', 'approve_leaves', 'view_team_reports'],
  employee: ['view_own_attendance', 'request_leave', 'view_own_reports'],
} as const

// Attendance status colors
export const ATTENDANCE_STATUS_COLORS = {
  present: '#10b981',
  absent: '#ef4444',
  late: '#f59e0b',
  half_day: '#3b82f6',
  on_leave: '#8b5cf6',
  holiday: '#6b7280',
  weekend: '#9ca3af',
} as const

// Leave status colors
export const LEAVE_STATUS_COLORS = {
  pending: '#f59e0b',
  approved: '#10b981',
  rejected: '#ef4444',
  cancelled: '#6b7280',
  withdrawn: '#9ca3af',
} as const

// Notification types
export const NOTIFICATION_TYPES = {
  info: { color: '#3b82f6', icon: 'Info' },
  success: { color: '#10b981', icon: 'CheckCircle' },
  warning: { color: '#f59e0b', icon: 'AlertTriangle' },
  error: { color: '#ef4444', icon: 'XCircle' },
} as const

// Days of week
export const DAYS_OF_WEEK = [
  { value: 'MON', label: 'Monday' },
  { value: 'TUE', label: 'Tuesday' },
  { value: 'WED', label: 'Wednesday' },
  { value: 'THU', label: 'Thursday' },
  { value: 'FRI', label: 'Friday' },
  { value: 'SAT', label: 'Saturday' },
  { value: 'SUN', label: 'Sunday' },
] as const

// Months
export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const

// Date formats
export const DATE_FORMATS = {
  display: 'MMM d, yyyy',
  input: 'yyyy-MM-dd',
  time: 'HH:mm',
  dateTime: 'MMM d, yyyy HH:mm',
  relative: 'PPpp',
} as const

// API endpoints
export const API_ENDPOINTS = {
  auth: {
    login: '/auth/login',
    logout: '/auth/logout',
    me: '/auth/me',
    register: '/auth/register',
  },
  employees: '/employees',
  attendance: '/attendance',
  leaves: '/leaves',
  shifts: '/shifts',
  departments: '/departments',
  roles: '/roles',
  notifications: '/notifications',
  analytics: '/analytics',
  reports: '/reports',
} as const

// Local storage keys
export const STORAGE_KEYS = {
  theme: 'workforce_theme',
  sidebar: 'workforce_sidebar_collapsed',
  token: 'workforce_token',
  user: 'workforce_user',
  preferences: 'workforce_preferences',
} as const

// Error messages
export const ERROR_MESSAGES = {
  unauthorized: 'Please sign in to continue',
  forbidden: 'You do not have permission to perform this action',
  notFound: 'The requested resource was not found',
  serverError: 'Something went wrong. Please try again later.',
  networkError: 'Network error. Please check your connection.',
  validationError: 'Please check your input and try again.',
} as const

// Success messages
export const SUCCESS_MESSAGES = {
  created: 'Successfully created',
  updated: 'Successfully updated',
  deleted: 'Successfully deleted',
  saved: 'Successfully saved',
  submitted: 'Successfully submitted',
  approved: 'Successfully approved',
  rejected: 'Successfully rejected',
} as const

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
  MAX_PAGE_SIZE: 100,
} as const

// File types
export const FILE_TYPES = {
  images: {
    'image/jpeg': '.jpg,.jpeg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/svg+xml': '.svg',
  },
  documents: {
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  },
} as const

// Keyboard shortcuts
export const KEYBOARD_SHORTCUTS = {
  search: ['meta+k', 'ctrl+k'],
  save: ['meta+s', 'ctrl+s'],
  new: ['meta+n', 'ctrl+n'],
  cancel: 'escape',
  confirm: 'enter',
} as const
