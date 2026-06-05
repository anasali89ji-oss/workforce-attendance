'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Users, Clock, AlertTriangle, CalendarCheck,
  TrendingUp, Activity, ArrowUpRight, ArrowDownRight,
  Coffee, Briefcase
} from 'lucide-react'
import { formatDuration, formatTime, formatDate } from '@/lib/utils'
import { ProgressRing } from '@/components/ui/ProgressRing'
import { RealtimeBadge } from '@/components/ui/RealtimeBadge'
import type { CurrentUser, AttendanceLog, AnalyticsSummary } from '@/types'
import { useRealtime } from '@/hooks/useRealtime'

interface DashboardClientProps {
  user: CurrentUser
}

export default function DashboardClient({ user }: DashboardClientProps) {
  const [elapsed, setElapsed] = useState(0)
  const [now, setNow] = useState(new Date())

  const { data: summary, refetch: refetchSummary } = useQuery<AnalyticsSummary>({
    queryKey: ['analytics', 'summary'],
    queryFn: async () => {
      const res = await fetch('/api/analytics?type=summary')
      if (!res.ok) throw new Error('Failed to fetch analytics')
      const json = await res.json()
      return json.data
    },
    refetchInterval: 30000,
  })

  const { data: myLog, refetch: refetchMyLog } = useQuery<AttendanceLog>({
    queryKey: ['attendance', 'today'],
    queryFn: async () => {
      // Fix 5.6: Use date= param (YYYY-MM-DD) to fetch today's record specifically, not month with limit=1
      const today = new Date().toISOString().slice(0, 10)
      const res = await fetch(`/api/attendance?date=${today}&limit=1`)
      if (!res.ok) throw new Error('Failed to fetch attendance')
      const json = await res.json()
      return json.data?.[0]
    },
  })

  const { data: trend } = useQuery({
    queryKey: ['analytics', 'trend'],
    queryFn: async () => {
      const res = await fetch('/api/analytics?type=attendance_trend')
      if (!res.ok) throw new Error('Failed to fetch trend')
      const json = await res.json()
      return json.data
    },
  })

  useRealtime('dashboard', [
    { event: 'INSERT', table: 'attendance_logs', callback: () => { refetchSummary(); refetchMyLog() } },
    { event: 'UPDATE', table: 'attendance_logs', callback: () => { refetchSummary(); refetchMyLog() } },
  ])

  useEffect(() => {
    if (!myLog?.punch_in_at || myLog?.punch_out_at) return
    const interval = setInterval(() => {
      const start = new Date(myLog.punch_in_at!).getTime()
      setElapsed(Math.floor((Date.now() - start) / 1000))
      setNow(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [myLog])

  const clockedIn = !!myLog?.punch_in_at && myLog.status !== 'punched_out'
  const clockedOut = myLog?.status === 'punched_out'

  const fmtTime = (d?: string) => d ? formatTime(d) : '--:--'
  const fmtDur = (m?: number) => formatDuration(m || 0)
  const fmtElapsed = (s: number) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }

  const handleClockAction = async (action: 'clock_in' | 'clock_out') => {
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        refetchMyLog()
        refetchSummary()
      }
    } catch (err) {
      console.error('Clock action failed:', err)
    }
  }

  const kpis = [
    { label: 'Total Employees', value: summary?.total_employees || 0, icon: Users, color: '#6366f1', trend: '+2%', trendUp: true },
    { label: 'Present Today', value: summary?.present_today || 0, icon: CalendarCheck, color: '#10b981', trend: `${summary?.attendance_rate || 0}%`, trendUp: (summary?.attendance_rate || 0) >= 90 },
    { label: 'Late Arrivals', value: summary?.late_today || 0, icon: AlertTriangle, color: '#f59e0b', trend: summary?.late_today ? `${Math.round((summary.late_today / (summary.present_today || 1)) * 100)}%` : '0%', trendUp: false },
    { label: 'On Leave', value: summary?.on_leave_today || 0, icon: Coffee, color: '#8b5cf6', trend: `${summary?.pending_leaves || 0} pending`, trendUp: false },
  ]

  return (
    <div className="space-y-6 anim-fade-up">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text)]">
            Good {now.getHours() < 12 ? 'morning' : now.getHours() < 17 ? 'afternoon' : 'evening'}, {user.first_name || user.full_name.split(' ')[0]}
          </h1>
          <p className="text-sm text-[var(--text-3)] mt-0.5">{formatDate(now)} · {user.tenant.name}</p>
        </div>
        <RealtimeBadge />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <div key={kpi.label} className="kpi-card" style={{ animationDelay: `${i * 0.05}s` }}>
            <div className="flex items-center justify-between mb-3">
              <div className="kpi-card-icon" style={{ background: `${kpi.color}15`, color: kpi.color }}>
                <kpi.icon size={20} />
              </div>
              {kpi.trend && (
                <span className={`flex items-center gap-0.5 text-xs font-semibold ${kpi.trendUp ? 'text-[var(--success)]' : 'text-[var(--text-3)]'}`}>
                  {kpi.trendUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {kpi.trend}
                </span>
              )}
            </div>
            <div className="text-2xl font-bold text-[var(--text)]">{kpi.value}</div>
            <div className="text-xs text-[var(--text-3)] mt-0.5">{kpi.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-[var(--text)]">Time Tracking</h2>
              <p className="text-xs text-[var(--text-3)] mt-0.5">
                {!clockedIn ? 'Start your workday' : clockedOut ? 'Shift complete' : `On duty · ${fmtElapsed(elapsed)} elapsed`}
              </p>
            </div>
            <ProgressRing
              progress={clockedOut ? 100 : clockedIn ? Math.min((elapsed / 28800) * 100, 100) : 0}
              size={56}
              strokeWidth={4}
              color={clockedOut ? '#10b981' : clockedIn ? '#6366f1' : '#94a3b8'}
            />
          </div>

          <div className="flex items-center gap-4 mb-6">
            <button onClick={() => handleClockAction('clock_in')} disabled={clockedIn} className={`btn flex-1 ${clockedIn ? 'btn-ghost opacity-50' : 'btn-primary'}`}>
              <Clock size={16} />
              {clockedIn ? 'Clocked In' : 'Clock In'}
            </button>
            <button onClick={() => handleClockAction('clock_out')} disabled={!clockedIn || clockedOut} className={`btn flex-1 ${!clockedIn || clockedOut ? 'btn-ghost opacity-50' : 'btn-secondary'}`}>
              <Clock size={16} />
              {clockedOut ? 'Clocked Out' : 'Clock Out'}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'CLOCK IN', value: fmtTime(myLog?.punch_in_at) },
              { label: 'CLOCK OUT', value: fmtTime(myLog?.punch_out_at) },
              { label: 'DURATION', value: clockedIn ? fmtElapsed(elapsed) : fmtDur(myLog?.net_duration_minutes) || '--' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-[var(--surface-2)] rounded-xl p-3 text-center">
                <div className="text-[10px] font-bold text-[var(--text-3)] tracking-wider">{label}</div>
                <div className="text-sm font-semibold text-[var(--text)] mt-1">{value}</div>
              </div>
            ))}
          </div>

          {myLog?.is_late && (
            <div className="mt-4 flex items-center gap-2 text-xs text-[var(--warning)] bg-[var(--warning)]/10 rounded-lg px-3 py-2">
              <AlertTriangle size={14} />
              You were marked late today
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="text-sm font-bold text-[var(--text)] mb-4 flex items-center gap-2">
              <Activity size={16} className="text-[var(--brand-500)]" />
              Today&apos;s Overview
            </h3>
            <div className="space-y-3">
              {[
                { label: 'Attendance Rate', value: summary?.attendance_rate || 0, max: 100, color: '#6366f1' },
                { label: 'On Time', value: summary?.present_today ? Math.round(((summary.present_today - summary.late_today) / summary.present_today) * 100) : 0, max: 100, color: '#10b981' },
                { label: 'Pending Requests', value: (summary?.pending_leaves || 0) + (summary?.pending_overtime || 0), max: 20, color: '#f59e0b' },
              ].map(stat => (
                <div key={stat.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[var(--text-2)]">{stat.label}</span>
                    <span className="font-semibold text-[var(--text)]">{stat.value}{stat.max === 100 ? '%' : ''}</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${Math.min((stat.value / stat.max) * 100, 100)}%`, background: stat.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-bold text-[var(--text)] mb-3 flex items-center gap-2">
              <Briefcase size={16} className="text-[var(--success)]" />
              Work Schedule
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-[var(--text-3)]">Hours</span><span className="font-medium text-[var(--text)]">{user.tenant.working_hours_start} - {user.tenant.working_hours_end}</span></div>
              <div className="flex justify-between"><span className="text-[var(--text-3)]">Days</span><span className="font-medium text-[var(--text)]">{user.tenant.working_days.join(', ')}</span></div>
              <div className="flex justify-between"><span className="text-[var(--text-3)]">Late Threshold</span><span className="font-medium text-[var(--text)]">{user.tenant.late_threshold} min</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-[var(--text)]">7-Day Attendance Trend</h2>
          <TrendingUp size={16} className="text-[var(--text-3)]" />
        </div>
        <div className="h-48 flex items-end gap-2">
          {trend?.map((day: { date: string; present: number; late: number }) => {
            const max = Math.max(...trend.map((d: { present: number }) => d.present), 1)
            return (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex gap-0.5 items-end" style={{ height: '140px' }}>
                  <div className="flex-1 rounded-t-md bg-[var(--brand-500)]/80 transition-all duration-500" style={{ height: `${(day.present / max) * 100}%` }} />
                  <div className="flex-1 rounded-t-md bg-[var(--warning)]/60 transition-all duration-500" style={{ height: `${(day.late / max) * 100}%` }} />
                </div>
                <span className="text-[10px] text-[var(--text-3)]">{new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}</span>
              </div>
            )
          }) || (
            <div className="w-full h-full flex items-center justify-center text-[var(--text-3)] text-sm">No data available</div>
          )}
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[var(--brand-500)]/80" /> Present</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[var(--warning)]/60" /> Late</span>
        </div>
      </div>
    </div>
  )
}
