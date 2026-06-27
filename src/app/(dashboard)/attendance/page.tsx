'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Clock, Calendar, CheckCircle2, XCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatDate, formatTime, formatDuration } from '@/lib/utils'
import { SearchFilter } from '@/components/ui/SearchFilter'
import { ExportMenu } from '@/components/ui/ExportMenu'
import { EmptyState } from '@/components/ui/EmptyState'
import { SkeletonTable } from '@/components/ui/Skeleton'
import type { AttendanceLog } from '@/types'

export default function AttendancePage() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const { data, isLoading } = useQuery({
    queryKey: ['attendance', month],
    queryFn: async () => {
      const res = await fetch(`/api/attendance?month=${month}&limit=100`)
      if (!res.ok) throw new Error('Failed to fetch')
      const json = await res.json()
      return json.data as AttendanceLog[]
    },
  })

  const filtered = (data || []).filter(log => {
    const matchesSearch = !search ||
      log.user?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      log.user?.employee_id?.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(filtered.map(l => l.id)))
  }

  const handleExport = async (format: 'csv' | 'excel' | 'pdf' | 'json') => {
    const res = await fetch('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table: 'attendance_logs', format, filters: { dateFrom: `${month}-01` } }),
    })
    if (format === 'csv') {
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `attendance_${month}.csv`
      a.click()
    }
  }

  const getCalendarDays = () => {
    const [year, mon] = month.split('-').map(Number)
    const firstDay = new Date(year, mon - 1, 1)
    const lastDay = new Date(year, mon, 0)
    const days: (number | null)[] = []
    for (let i = 0; i < firstDay.getDay(); i++) days.push(null)
    for (let i = 1; i <= lastDay.getDate(); i++) days.push(i)
    return days
  }

  const getDayLogs = (day: number) => {
    const dateStr = `${month}-${day.toString().padStart(2, '0')}`
    // BUG-5.2 FIX: Always normalize via new Date() — JSON serialization always produces ISO strings
    return filtered.filter(l => {
      const logDate = new Date(l.attendance_date).toISOString().slice(0, 10)
      return logDate === dateStr
    })
  }

  const statusBadge = (status: string, isLate?: boolean) => {
    const styles: Record<string, string> = {
      punched_in: 'bg-[#d1fae5] text-[#065f46] border-[#a7f3d0]',
      punched_out: 'bg-[var(--surface-3)] text-[var(--text-2)] border-[var(--border-strong)]',
      on_break: 'bg-[#dbeafe] text-[#1e40af] border-[#bfdbfe]',
      missed: 'bg-[#fee2e2] text-[#991b1b] border-[#fecaca]',
      on_leave: 'bg-[#ede9fe] text-[#5b21b6] border-[#ddd6fe]',
    }
    return (
      <span className={`badge ${styles[status] || styles.punched_out}`}>
        {status.replace('_', ' ')}
        {isLate && <span className="ml-1 text-[10px]">Late</span>}
      </span>
    )
  }

  return (
    <div className="page anim-fade-up">
      <div className="section-header">
        <h1 className="section-title">
          <Clock size={20} className="text-[var(--brand-500)]" />
          Attendance Records
        </h1>
        <div className="flex items-center gap-2">
          <div className="tabs-list">
            <button onClick={() => setView('list')} className="tab-trigger" data-state={view === 'list' ? 'active' : 'inactive'}>List</button>
            <button onClick={() => setView('calendar')} className="tab-trigger" data-state={view === 'calendar' ? 'active' : 'inactive'}>Calendar</button>
          </div>
          <ExportMenu onExport={handleExport} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <SearchFilter onSearch={setSearch} placeholder="Search by name or ID..." className="w-64" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input input-sm w-40">
          <option value="all">All Status</option>
          <option value="punched_in">Clocked In</option>
          <option value="punched_out">Clocked Out</option>
          <option value="on_break">On Break</option>
          <option value="missed">Missed</option>
        </select>
        <div className="flex items-center gap-1 ml-auto">
          <button onClick={() => { const [y, m] = month.split('-').map(Number); setMonth(new Date(y, m - 2, 1).toISOString().slice(0, 7)) }} className="btn btn-icon btn-sm"><ChevronLeft size={14} /></button>
          <span className="text-sm font-semibold text-[var(--text)] min-w-[100px] text-center">{new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
          <button onClick={() => { const [y, m] = month.split('-').map(Number); setMonth(new Date(y, m, 1).toISOString().slice(0, 7)) }} className="btn btn-icon btn-sm"><ChevronRight size={14} /></button>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-[var(--brand-50)] dark:bg-[var(--brand-900)]/20 rounded-xl border border-[var(--brand-200)] dark:border-[var(--brand-700)]">
          <span className="text-sm font-medium text-[var(--brand-700)] dark:text-[var(--brand-400)]">{selectedIds.size} selected</span>
          <div className="flex-1" />
          <button className="btn btn-sm btn-primary"><CheckCircle2 size={14} /> Approve</button>
          <button className="btn btn-sm btn-danger"><XCircle size={14} /> Reject</button>
        </div>
      )}

      {isLoading ? (
        <SkeletonTable rows={8} cols={6} />
      ) : view === 'list' ? (
        <div className="card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-10"><input type="checkbox" checked={filtered.length > 0 && selectedIds.size === filtered.length} onChange={toggleSelectAll} className="rounded border-[var(--border-strong)]" /></th>
                <th>Employee</th><th>Date</th><th>Clock In</th><th>Clock Out</th><th>Duration</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7}><EmptyState icon={Calendar} title="No attendance records" description="No records found for the selected period." /></td></tr>
              ) : (
                filtered.map(log => (
                  <tr key={log.id} className="group">
                    <td><input type="checkbox" checked={selectedIds.has(log.id)} onChange={() => toggleSelect(log.id)} className="rounded border-[var(--border-strong)]" /></td>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[var(--brand-500)]/10 flex items-center justify-center text-xs font-bold text-[var(--brand-600)]">
                          {log.user?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?'}
                        </div>
                        <div>
                          <div className="font-medium text-[var(--text)]">{log.user?.full_name}</div>
                          <div className="text-xs text-[var(--text-3)]">{log.user?.employee_id}</div>
                        </div>
                      </div>
                    </td>
                    <td>{formatDate(log.attendance_date)}</td>
                    <td>{formatTime(log.punch_in_at) || '--'}</td>
                    <td>{formatTime(log.punch_out_at) || '--'}</td>
                    <td>{formatDuration(log.net_duration_minutes)}</td>
                    <td>{statusBadge(log.status, log.is_late)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card p-5">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className="text-center text-xs font-bold text-[var(--text-3)] py-2">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {getCalendarDays().map((day, i) => {
              if (!day) return <div key={i} className="aspect-square" />
              const dayLogs = getDayLogs(day)
              return (
                <div key={day} className={`aspect-square rounded-lg border border-[var(--border)] p-1.5 flex flex-col ${dayLogs.length > 0 ? 'bg-[var(--surface-2)]' : ''}`}>
                  <span className="text-xs font-medium text-[var(--text-2)]">{day}</span>
                  {dayLogs.length > 0 && (
                    <div className="mt-auto flex flex-wrap gap-0.5">
                      {dayLogs.slice(0, 3).map((log, j) => (
                        <div key={j} className={`w-2 h-2 rounded-full ${log.is_late ? 'bg-[var(--warning)]' : log.status === 'punched_out' ? 'bg-[var(--success)]' : 'bg-[var(--brand-500)]'}`} title={log.user?.full_name} />
                      ))}
                      {dayLogs.length > 3 && <span className="text-[8px] text-[var(--text-3)]">+{dayLogs.length - 3}</span>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
