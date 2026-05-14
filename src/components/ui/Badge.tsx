import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'purple' | 'cyan' | 'orange'
  icon?: LucideIcon
  className?: string
}

const variants = {
  default: 'badge-default',
  primary: 'badge-primary',
  success: 'badge-success',
  danger: 'badge-danger',
  warning: 'badge-warning',
  info: 'badge-info',
  purple: 'badge-purple',
  cyan: 'badge-cyan',
  orange: 'badge-orange',
}

export function Badge({ children, variant = 'default', icon: Icon, className }: BadgeProps) {
  return (
    <span className={cn('badge', variants[variant], className)}>
      {Icon && <Icon size={12} />}
      {children}
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const statusMap: Record<string, { variant: BadgeProps['variant']; label: string }> = {
    present: { variant: 'success', label: 'Present' },
    absent: { variant: 'danger', label: 'Absent' },
    late: { variant: 'warning', label: 'Late' },
    'on_leave': { variant: 'purple', label: 'On Leave' },
    pending: { variant: 'warning', label: 'Pending' },
    approved: { variant: 'success', label: 'Approved' },
    rejected: { variant: 'danger', label: 'Rejected' },
    active: { variant: 'success', label: 'Active' },
    inactive: { variant: 'default', label: 'Inactive' },
    punched_in: { variant: 'success', label: 'Clocked In' },
    punched_out: { variant: 'default', label: 'Clocked Out' },
    on_break: { variant: 'info', label: 'On Break' },
  }

  const config = statusMap[status] || { variant: 'default', label: status }
  return <Badge variant={config.variant}>{config.label}</Badge>
}
