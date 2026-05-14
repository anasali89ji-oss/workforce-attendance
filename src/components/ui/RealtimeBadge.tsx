'use client'

import { useEffect, useState } from 'react'

export function RealtimeBadge() {
  const [connected, setConnected] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setConnected(navigator.onLine)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-[var(--surface-2)] border border-[var(--border)]">
      <span className={`w-2 h-2 rounded-full ${connected ? 'bg-[var(--success)]' : 'bg-[var(--danger)]'}`}>
        {connected && <span className="w-2 h-2 rounded-full bg-[var(--success)] animate-ping absolute" />}
      </span>
      <span className="text-[10px] font-semibold text-[var(--text-3)] uppercase tracking-wider">
        {connected ? 'Live' : 'Offline'}
      </span>
    </div>
  )
}
