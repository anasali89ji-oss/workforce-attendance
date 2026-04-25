import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { User } from '@/types'

interface UseEmployeesOptions {
  search?: string
  departmentId?: string
  status?: 'active' | 'inactive'
  enabled?: boolean
}

/**
 * Hook for fetching employees list
 */
export function useEmployees(options: UseEmployeesOptions = {}) {
  const { search, departmentId, status, enabled = true } = options

  return useQuery({
    queryKey: ['employees', { search, departmentId, status }],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (departmentId) params.set('departmentId', departmentId)
      if (status) params.set('status', status)

      const response = await fetch(`/api/employees?${params}`)
      if (!response.ok) throw new Error('Failed to fetch employees')
      
      const data = await response.json()
      return data.data as User[]
    },
    enabled,
    staleTime: 1000 * 60 * 5,
  })
}

/**
 * Hook for fetching a single employee by ID
 */
export function useEmployee(employeeId?: string) {
  return useQuery({
    queryKey: ['employee', employeeId],
    queryFn: async () => {
      if (!employeeId) return null
      
      const response = await fetch(`/api/employees/${employeeId}`)
      if (!response.ok) throw new Error('Failed to fetch employee')
      
      const data = await response.json()
      return data.data as User
    },
    enabled: !!employeeId,
    staleTime: 1000 * 60 * 5,
  })
}

/**
 * Hook for creating a new employee
 */
export function useCreateEmployee() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Partial<User>) => {
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to create employee')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
    },
  })
}

/**
 * Hook for updating an employee
 */
export function useUpdateEmployee() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<User>) => {
      const response = await fetch(`/api/employees/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to update employee')
      return response.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      queryClient.invalidateQueries({ queryKey: ['employee', variables.id] })
    },
  })
}

/**
 * Hook for deleting an employee
 */
export function useDeleteEmployee() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/employees/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete employee')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
    },
  })
}

/**
 * Hook for bulk importing employees
 */
export function useBulkImportEmployees() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (employees: Partial<User>[]) => {
      const response = await fetch('/api/employees/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employees }),
      })
      if (!response.ok) throw new Error('Failed to import employees')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
    },
  })
}

/**
 * Hook for activating/deactivating an employee
 */
export function useToggleEmployeeStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await fetch(`/api/employees/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      })
      if (!response.ok) throw new Error('Failed to update status')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
    },
  })
}
