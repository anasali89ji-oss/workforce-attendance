import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { AttendanceLog, AttendanceStatus } from '@/types'

interface UseAttendanceOptions {
  userId?: string
  date?: string
  enabled?: boolean
}

/**
 * Hook for fetching attendance records
 * @param options - Query options including userId and date filters
 */
export function useAttendance(options: UseAttendanceOptions = {}) {
  const { userId, date, enabled = true } = options

  return useQuery({
    queryKey: ['attendance', { userId, date }],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (userId) params.set('userId', userId)
      if (date) params.set('date', date)

      const response = await fetch(`/api/attendance?${params}`)
      if (!response.ok) throw new Error('Failed to fetch attendance')
      
      const data = await response.json()
      return data.data as AttendanceLog[]
    },
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook for checking in
 */
export function useCheckIn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { 
      userId: string
      locationLat?: number
      locationLng?: number
      ipAddress?: string
    }) => {
      const response = await fetch('/api/attendance/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Check-in failed')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

/**
 * Hook for checking out
 */
export function useCheckOut() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { 
      attendanceId: string
      locationLat?: number
      locationLng?: number
    }) => {
      const response = await fetch('/api/attendance/check-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Check-out failed')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

/**
 * Hook for updating attendance record
 */
export function useUpdateAttendance() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      id: string
      status?: AttendanceStatus
      notes?: string
      lateMinutes?: number
    }) => {
      const response = await fetch(`/api/attendance/${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Update failed')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] })
    },
  })
}

/**
 * Hook for deleting attendance record
 */
export function useDeleteAttendance() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/attendance/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Delete failed')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] })
    },
  })
}

interface AttendanceStats {
  present: number
  absent: number
  late: number
  onLeave: number
  total: number
}

/**
 * Hook for fetching attendance statistics
 */
export function useAttendanceStats(date?: string) {
  return useQuery({
    queryKey: ['attendance', 'stats', { date }],
    queryFn: async () => {
      const params = date ? `?date=${date}` : ''
      const response = await fetch(`/api/attendance/stats${params}`)
      if (!response.ok) throw new Error('Failed to fetch stats')
      
      const data = await response.json()
      return data.data as AttendanceStats
    },
    staleTime: 1000 * 60 * 5,
  })
}
