import * as React from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Calendar, Clock, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import type { LeaveType, LeaveBalance } from '@/types'
import { formatDate } from '@/lib/utils'

const leaveRequestSchema = z.object({
  leaveTypeId: z.string().min(1, 'Leave type is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  reason: z.string().min(10, 'Reason must be at least 10 characters').optional(),
}).refine((data) => {
  const start = new Date(data.startDate)
  const end = new Date(data.endDate)
  return end >= start
}, {
  message: 'End date must be after start date',
  path: ['endDate'],
})

type LeaveRequestFormData = z.infer<typeof leaveRequestSchema>

interface LeaveRequestFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: LeaveRequestFormData) => Promise<void>
  leaveTypes?: LeaveType[]
  leaveBalances?: LeaveBalance[]
  isLoading?: boolean
}

/**
 * LeaveRequestForm component for submitting leave requests
 * Features:
 * - React Hook Form with Zod validation
 * - Leave balance display
 * - Date range validation
 * - Auto-calculation of days count
 */
export function LeaveRequestForm({
  isOpen,
  onClose,
  onSubmit,
  leaveTypes = [],
  leaveBalances = [],
  isLoading = false,
}: LeaveRequestFormProps) {
  const [daysCount, setDaysCount] = React.useState<number>(0)

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
    reset,
  } = useForm<LeaveRequestFormData>({
    resolver: zodResolver(leaveRequestSchema),
    defaultValues: {
      leaveTypeId: '',
      startDate: '',
      endDate: '',
      reason: '',
    },
  })

  const selectedLeaveTypeId = watch('leaveTypeId')
  const startDate = watch('startDate')
  const endDate = watch('endDate')

  // Calculate days count when dates change
  React.useEffect(() => {
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      const diffTime = Math.abs(end.getTime() - start.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
      setDaysCount(diffDays)
    } else {
      setDaysCount(0)
    }
  }, [startDate, endDate])

  // Get available balance for selected leave type
  const selectedLeaveBalance = leaveBalances.find(
    (b) => b.leaveTypeId === selectedLeaveTypeId
  )

  const hasInsufficientBalance = selectedLeaveBalance 
    ? daysCount > (selectedLeaveBalance.availableDays ?? 0)
    : false

  const handleFormSubmit = async (data: LeaveRequestFormData) => {
    try {
      await onSubmit(data)
      reset()
      setDaysCount(0)
      onClose()
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" title="Request Time Off">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Leave Type Selection */}
        <div className="form-group">
          <label htmlFor="leaveTypeId" className="form-label">
            Leave Type <span className="text-red-500">*</span>
          </label>
          <Controller
            name="leaveTypeId"
            control={control}
            render={({ field }) => (
              <select {...field} className={`input ${errors.leaveTypeId ? 'input-error' : ''}`}>
                <option value="">Select Leave Type</option>
                {leaveTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name} ({type.daysPerYear} days/year)
                  </option>
                ))}
              </select>
            )}
          />
          {errors.leaveTypeId && (
            <p className="form-error">{errors.leaveTypeId.message}</p>
          )}
        </div>

        {/* Leave Balance Display */}
        {selectedLeaveBalance && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-md"
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Available Balance:
              </span>
            </div>
            <span className={`font-semibold ${
              (selectedLeaveBalance.availableDays ?? 0) < daysCount 
                ? 'text-red-600' 
                : 'text-emerald-600'
            }`}>
              {selectedLeaveBalance.availableDays ?? 0} days
            </span>
          </motion.div>
        )}

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-4">
          <div className="form-group">
            <label htmlFor="startDate" className="form-label">
              Start Date <span className="text-red-500">*</span>
            </label>
            <input
              id="startDate"
              type="date"
              min={new Date().toISOString().split('T')[0]}
              {...register('startDate')}
              className={`input ${errors.startDate ? 'input-error' : ''}`}
            />
            {errors.startDate && (
              <p className="form-error">{errors.startDate.message}</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="endDate" className="form-label">
              End Date <span className="text-red-500">*</span>
            </label>
            <input
              id="endDate"
              type="date"
              min={startDate || new Date().toISOString().split('T')[0]}
              {...register('endDate')}
              className={`input ${errors.endDate ? 'input-error' : ''}`}
            />
            {errors.endDate && (
              <p className="form-error">{errors.endDate.message}</p>
            )}
          </div>
        </div>

        {/* Days Count Display */}
        {daysCount > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`flex items-center gap-2 p-3 rounded-md ${
              hasInsufficientBalance 
                ? 'bg-red-50 dark:bg-red-950/30' 
                : 'bg-blue-50 dark:bg-blue-950/30'
            }`}
          >
            <Clock className={`w-4 h-4 ${
              hasInsufficientBalance ? 'text-red-500' : 'text-blue-500'
            }`} />
            <span className={`text-sm ${
              hasInsufficientBalance ? 'text-red-700' : 'text-blue-700'
            }`}>
              Total Duration: <strong>{daysCount}</strong> day{daysCount > 1 ? 's' : ''}
              {hasInsufficientBalance && ' (Insufficient balance)'}
            </span>
          </motion.div>
        )}

        {/* Insufficient Balance Warning */}
        {hasInsufficientBalance && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-md"
          >
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700">
              You don&apos;t have enough leave balance for this request. 
              Please select different dates or contact HR.
            </p>
          </motion.div>
        )}

        {/* Reason */}
        <div className="form-group">
          <label htmlFor="reason" className="form-label">
            Reason <span className="text-gray-400">(Optional)</span>
          </label>
          <textarea
            id="reason"
            {...register('reason')}
            rows={4}
            className={`input resize-none ${errors.reason ? 'input-error' : ''}`}
            placeholder="Please provide a reason for your leave request..."
          />
          {errors.reason && (
            <p className="form-error">{errors.reason.message}</p>
          )}
          <p className="form-hint">Minimum 10 characters</p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isLoading || hasInsufficientBalance}
          >
            {isLoading ? 'Submitting...' : 'Submit Request'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
