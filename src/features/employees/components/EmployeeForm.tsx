import * as React from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Upload, User as UserIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Avatar } from '@/components/ui/Avatar'
import type { Department, Position, Role } from '@/types'

const employeeSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  employeeId: z.string().optional(),
  departmentId: z.string().optional(),
  positionId: z.string().optional(),
  roleId: z.string().optional(),
  joinedAt: z.string().optional(),
  avatarUrl: z.string().url().optional().or(z.literal('')),
})

type EmployeeFormData = z.infer<typeof employeeSchema>

interface EmployeeFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: EmployeeFormData) => Promise<void>
  departments?: Department[]
  positions?: Position[]
  roles?: Role[]
  initialData?: Partial<EmployeeFormData>
  isLoading?: boolean
}

/**
 * EmployeeForm component for creating and editing employees
 * Features:
 * - React Hook Form with Zod validation
 * - Avatar upload preview
 * - Department and position selection
 * - Loading states
 */
export function EmployeeForm({
  isOpen,
  onClose,
  onSubmit,
  departments = [],
  positions = [],
  roles = [],
  initialData,
  isLoading = false,
}: EmployeeFormProps) {
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(
    initialData?.avatarUrl ?? null
  )

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    watch,
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      firstName: initialData?.firstName ?? '',
      lastName: initialData?.lastName ?? '',
      email: initialData?.email ?? '',
      phone: initialData?.phone ?? '',
      employeeId: initialData?.employeeId ?? '',
      departmentId: initialData?.departmentId ?? '',
      positionId: initialData?.positionId ?? '',
      roleId: initialData?.roleId ?? '',
      joinedAt: initialData?.joinedAt ?? new Date().toISOString().split('T')[0],
      avatarUrl: initialData?.avatarUrl ?? '',
    },
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        setAvatarPreview(result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveAvatar = () => {
    setAvatarPreview(null)
  }

  const onFormSubmit = async (data: EmployeeFormData) => {
    try {
      await onSubmit(data)
      reset()
      setAvatarPreview(null)
      onClose()
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" title={initialData ? 'Edit Employee' : 'Add Employee'}>
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
        {/* Avatar Section */}
        <div className="flex justify-center">
          <div className="relative group">
            <AnimatePresence mode="wait">
              {avatarPreview ? (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="relative"
                >
                  <Avatar src={avatarPreview} name="" size="xl" />
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </motion.div>
              ) : (
                <motion.label
                  key="placeholder"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex flex-col items-center justify-center w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-800 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <Upload className="w-6 h-6 text-gray-400" />
                  <span className="text-xs text-gray-500 mt-1">Upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </motion.label>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Name Fields */}
        <div className="grid grid-cols-2 gap-4">
          <div className="form-group">
            <label htmlFor="firstName" className="form-label">
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              id="firstName"
              type="text"
              {...register('firstName')}
              className={`input ${errors.firstName ? 'input-error' : ''}`}
              placeholder="John"
            />
            {errors.firstName && (
              <p className="form-error">{errors.firstName.message}</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="lastName" className="form-label">
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              id="lastName"
              type="text"
              {...register('lastName')}
              className={`input ${errors.lastName ? 'input-error' : ''}`}
              placeholder="Doe"
            />
            {errors.lastName && (
              <p className="form-error">{errors.lastName.message}</p>
            )}
          </div>
        </div>

        {/* Email and Phone */}
        <div className="grid grid-cols-2 gap-4">
          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              type="email"
              {...register('email')}
              className={`input ${errors.email ? 'input-error' : ''}`}
              placeholder="john.doe@company.com"
            />
            {errors.email && (
              <p className="form-error">{errors.email.message}</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="phone" className="form-label">
              Phone
            </label>
            <input
              id="phone"
              type="tel"
              {...register('phone')}
              className="input"
              placeholder="+1 (555) 123-4567"
            />
          </div>
        </div>

        {/* Employee ID */}
        <div className="form-group">
          <label htmlFor="employeeId" className="form-label">
            Employee ID
          </label>
          <input
            id="employeeId"
            type="text"
            {...register('employeeId')}
            className="input"
            placeholder="EMP001"
          />
        </div>

        {/* Department and Position */}
        <div className="grid grid-cols-2 gap-4">
          <div className="form-group">
            <label htmlFor="departmentId" className="form-label">
              Department
            </label>
            <Controller
              name="departmentId"
              control={control}
              render={({ field }) => (
                <select {...field} className="input">
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              )}
            />
          </div>

          <div className="form-group">
            <label htmlFor="positionId" className="form-label">
              Position
            </label>
            <Controller
              name="positionId"
              control={control}
              render={({ field }) => (
                <select {...field} className="input">
                  <option value="">Select Position</option>
                  {positions.map((pos) => (
                    <option key={pos.id} value={pos.id}>
                      {pos.title}
                    </option>
                  ))}
                </select>
              )}
            />
          </div>
        </div>

        {/* Role */}
        <div className="form-group">
          <label htmlFor="roleId" className="form-label">
            Role
          </label>
          <Controller
            name="roleId"
            control={control}
            render={({ field }) => (
              <select {...field} className="input">
                <option value="">Select Role</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            )}
          />
        </div>

        {/* Join Date */}
        <div className="form-group">
          <label htmlFor="joinedAt" className="form-label">
            Join Date
          </label>
          <input
            id="joinedAt"
            type="date"
            {...register('joinedAt')}
            className="input"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : initialData ? 'Update Employee' : 'Create Employee'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
