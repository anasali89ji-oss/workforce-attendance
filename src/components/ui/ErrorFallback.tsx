'use client'

import { AlertTriangle, RefreshCw } from 'lucide-react'

interface ErrorFallbackProps {
  error: Error
  resetErrorBoundary: () => void
}

export function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  return (
    <div className="min-h-[50vh] flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-[var(--danger)]/10 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={28} className="text-[var(--danger)]" />
        </div>
        <h2 className="text-lg font-bold text-[var(--text)] mb-2">Something went wrong</h2>
        <p className="text-sm text-[var(--text-3)] mb-1">
          {error.message || 'An unexpected error occurred'}
        </p>
        <p className="text-xs text-[var(--text-3)] mb-6 font-mono bg-[var(--surface-2)] p-2 rounded-lg">
          {error.name}
        </p>
        <button
          onClick={resetErrorBoundary}
          className="btn btn-primary"
        >
          <RefreshCw size={14} />
          Try again
        </button>
      </div>
    </div>
  )
}
