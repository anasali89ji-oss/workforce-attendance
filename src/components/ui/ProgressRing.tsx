'use client'

import { useEffect, useState, ReactNode } from 'react'

interface ProgressRingProps {
  value: number       // 0–100
  size?: number
  strokeWidth?: number
  color?: string
  trackColor?: string
  label?: ReactNode
  showValue?: boolean
  animate?: boolean
}

export function ProgressRing({ value, size = 64, strokeWidth = 6, color = 'var(--brand-500)', trackColor = 'var(--surface-4)', label, showValue = true, animate = true }: ProgressRingProps) {
  const [current, setCurrent] = useState(animate ? 0 : value)

  useEffect(() => {
    if (!animate) { setCurrent(value); return }
    const start = performance.now()
    const duration = 800
    const from = 0
    const to = Math.min(100, Math.max(0, value))
    const raf = (ts: number) => {
      const progress = Math.min(1, (ts - start) / duration)
      const ease = 1 - Math.pow(1 - progress, 3)
      setCurrent(from + (to - from) * ease)
      if (progress < 1) requestAnimationFrame(raf)
    }
    requestAnimationFrame(raf)
  }, [value, animate])

  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (current / 100) * circ
  const center = size / 2
  const fontSize = size * 0.24

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={center} cy={center} r={r} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
        <circle cx={center} cy={center} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.1s linear' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {showValue && !label && (
          <span style={{ fontSize, fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>
            {Math.round(current)}%
          </span>
        )}
        {label}
      </div>
    </div>
  )
}
