/**
 * Application configuration
 */

export const config = {
  app: {
    name: 'WorkForce Pro',
    description: 'Enterprise workforce attendance management system',
    version: '1.0.0',
  },
  
  // API settings
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || '/api',
    timeout: 30000,
    retries: 3,
  },
  
  // Auth settings
  auth: {
    cookieName: 'workforce_user_id',
    tokenExpiry: '7d',
    refreshThreshold: '1d',
  },
  
  // Pagination defaults
  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
    options: [10, 20, 50, 100],
  },
  
  // Date/time settings
  dateTime: {
    defaultTimezone: 'UTC',
    dateFormat: 'MMM d, yyyy',
    timeFormat: 'hh:mm a',
    dateTimeFormat: 'MMM d, yyyy hh:mm a',
  },
  
  // Attendance settings
  attendance: {
    lateThresholdMinutes: 15,
    earlyCheckoutThresholdMinutes: 30,
    minWorkHours: 8,
    breakDurationMinutes: 60,
  },
  
  // Leave settings
  leave: {
    maxAdvanceDays: 90,
    minNoticeDays: 1,
    autoApproveDays: 3,
  },
  
  // File upload settings
  upload: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedDocumentTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  },
  
  // Feature flags
  features: {
    enableKanban: true,
    enablePayroll: true,
    enableLiveLocation: false,
    enableBiometric: false,
    enableGeoFencing: false,
  },
} as const

export type Config = typeof config
