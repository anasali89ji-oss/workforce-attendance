'use client'

import { CSSProperties } from 'react'

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
type Status = 'online' | 'away' | 'offline' | 'busy'

const SIZES: Record<AvatarSize, number> = { xs: 20, sm: 28, md: 36, lg: 48, xl: 64, '2xl': 80 }
const RADII: Record<AvatarSize, number> = { xs: 5, sm: 7, md: 9, lg: 12, xl: 16, '2xl': 20 }
const STATUS_COLORS: Record<Status, string> = { online: '#10b981', away: '#f59e0b', offline: '#94a3b8', busy: '#ef4444' }
const PALETTE = ['#4f46e5','#0891b2','#059669','#d97706','#7c3aed','#dc2626','#be185d','#0f766e']

function getColor(name: string) { return PALETTE[name.charCodeAt(0) % PALETTE.length] }
function getInitials(name: string) { return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() }

interface AvatarProps {
  src?: string | null
  name: string
  size?: AvatarSize
  status?: Status
  shape?: 'rounded' | 'circle'
  style?: CSSProperties
}

export function Avatar({ src, name, size = 'md', status, shape = 'rounded', style }: AvatarProps) {
  const px = SIZES[size]
  const r = shape === 'circle' ? '50%' : `${RADII[size]}px`
  const color = getColor(name)
  const fontSize = px * 0.35

  return (
    <div style={{ position: 'relative', display: 'inline-flex', flexShrink: 0, ...style }}>
      {src ? (
        <img src={src} alt={name} style={{ width: px, height: px, borderRadius: r, objectFit: 'cover', display: 'block' }} />
      ) : (
        <div style={{ width: px, height: px, borderRadius: r, background: `${color}20`, border: `2px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, fontWeight: 800, fontSize, flexShrink: 0, userSelect: 'none' }}>
          {getInitials(name)}
        </div>
      )}
      {status && (
        <span style={{ position: 'absolute', bottom: -1, right: -1, width: Math.max(7, px * 0.22), height: Math.max(7, px * 0.22), borderRadius: '50%', background: STATUS_COLORS[status], border: '2px solid var(--surface)' }} />
      )}
    </div>
  )
}

interface AvatarGroupProps {
  users: { name: string; src?: string | null }[]
  max?: number
  size?: AvatarSize
}

export function AvatarGroup({ users, max = 4, size = 'sm' }: AvatarGroupProps) {
  const px = SIZES[size]
  const shown = users.slice(0, max)
  const extra = users.length - max

  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {shown.map((u, i) => (
        <div key={i} style={{ marginLeft: i > 0 ? -px * 0.3 : 0, zIndex: shown.length - i, position: 'relative' }}>
          <Avatar name={u.name} src={u.src} size={size} style={{ border: '2px solid var(--surface)', borderRadius: '50%' }} />
        </div>
      ))}
      {extra > 0 && (
        <div style={{ width: px, height: px, borderRadius: '50%', background: 'var(--surface-3)', border: '2px solid var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: px * 0.3, fontWeight: 700, color: 'var(--text-2)', marginLeft: -px * 0.3 }}>
          +{extra}
        </div>
      )}
    </div>
  )
}
