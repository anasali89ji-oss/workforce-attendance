'use client'

import { Bell, Calendar } from 'lucide-react'
import type { CurrentUser } from '@/types'

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner', admin: 'Administrator', manager: 'Manager', worker: 'Employee'
}

export default function TopBar({ user }: { user: CurrentUser }) {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  return (
    <header style={{
      height: 56, background: '#FFFFFF',
      borderBottom: '1px solid #E2E8F0',
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px', flexShrink: 0,
      position: 'sticky', top: 0, zIndex: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748B', fontSize: 13 }}>
        <Calendar size={14} strokeWidth={1.8} />
        <span>{today}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button style={{
          background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8',
          padding: 6, borderRadius: 8, display: 'flex', alignItems: 'center',
          transition: 'all 0.15s', position: 'relative',
        }}>
          <Bell size={16} strokeWidth={1.8} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{user.full_name}</div>
            <div style={{ fontSize: 11, color: '#94A3B8' }}>{ROLE_LABELS[user.role] || user.role}</div>
          </div>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 12,
          }}>
            {user.full_name.split(' ').map((w: string) => w[0]).slice(0,2).join('').toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  )
}
