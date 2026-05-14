'use client'

import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('empty-state', className)}>
      {Icon && <Icon size={40} strokeWidth={1.2} className="text-[var(--text-3)] mb-2" />}
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && (
        <button onClick={action.onClick} className="btn btn-primary mt-2">
          {action.label}
        </button>
      )}
    </div>
  )
}
