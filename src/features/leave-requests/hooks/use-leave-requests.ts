import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { LeaveRequest, LeaveStatus } from '@/types'

interface UseLeaveRequestsOptions {
  userId?: string
  status?: LeaveStatus
  enabled?: boolean
}

/**
 * Hook for fetching leave requests
 */
export function useLeaveRequests(options: UseLeaveRequestsOptions = {}) {
  const { userId, status, enabled = true } = options

  return useQuery({
    queryKey: ['leaveRequests', { userId, status }],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (userId) params.set('userId', userId)
      if (status) params.set('status', status)

      const response = await fetch(`/api/leave-requests?${params}`)
      if (!response.ok) throw new Error('Failed to fetch leave requests')
      
      const data = await response.json()
      return data.data as LeaveRequest[]
    },
    enabled,
    staleTime: 1000 * 60 * 5,
  })
}

/**
 * Hook for fetching a single leave request by ID
 */
export function useLeaveRequest(requestId?: string) {
  return useQuery({
    queryKey: ['leaveRequest', requestId],
    queryFn: async () => {
      if (!requestId) return null
      
      const response = await fetch(`/api/leave-requests/${requestId}`)
      if (!response.ok) throw new Error('Failed to fetch leave request')
      
      const data = await response.json()
      return data.data as LeaveRequest
    },
    enabled: !!requestId,
    staleTime: 1000 * 60 * 5,
  })
}

/**
 * Hook for creating a leave request
 */
export function useCreateLeaveRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Partial<LeaveRequest>) => {
      const response = await fetch('/api/leave-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to create leave request')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaveRequests'] })
      queryClient.invalidateQueries({ queryKey: ['leaveBalances'] })
    },
  })
}

/**
 * Hook for approving a leave request
 */
export function useApproveLeaveRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, rejectionReason }: { id: string; rejectionReason?: string }) => {
      const response = await fetch(`/api/leave-requests/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejectionReason }),
      })
      if (!response.ok) throw new Error('Failed to approve leave request')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaveRequests'] })
    },
  })
}

/**
 * Hook for rejecting a leave request
 */
export function useRejectLeaveRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const response = await fetch(`/api/leave-requests/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      if (!response.ok) throw new Error('Failed to reject leave request')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaveRequests'] })
    },
  })
}

/**
 * Hook for cancelling a leave request
 */
export function useCancelLeaveRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/leave-requests/${id}/cancel`, {
        method: 'POST',
      })
      if (!response.ok) throw new Error('Failed to cancel leave request')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaveRequests'] })
    },
  })
}

/**
 * Hook for fetching leave balances
 */
export function useLeaveBalances(userId?: string) {
  return useQuery({
    queryKey: ['leaveBalances', { userId }],
    queryFn: async () => {
      const params = userId ? `?userId=${userId}` : ''
      const response = await fetch(`/api/leave-requests/balances${params}`)
      if (!response.ok) throw new Error('Failed to fetch leave balances')
      
      const data = await response.json()
      return data.data as Array<{
        id: string
        leaveTypeId: string
        year: number
        totalDays: number
        usedDays: number
        pendingDays: number
        availableDays: number
        leaveType: { name: string; color: string }
      }>
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 10,
  })
}

/**
 * Hook for fetching leave types
 */
export function useLeaveTypes() {
  return useQuery({
    queryKey: ['leaveTypes'],
    queryFn: async () => {
      const response = await fetch('/api/leave-requests/types')
      if (!response.ok) throw new Error('Failed to fetch leave types')
      
      const data = await response.json()
      return data.data as Array<{
        id: string
        name: string
        code: string
        color: string
        daysPerYear: number
        requiresApproval: boolean
      }>
    },
    staleTime: 1000 * 60 * 30,
  })
}
