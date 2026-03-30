'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'

interface AttendanceLog {
  id: string; date: string; clock_in?: string; clock_out?: string
  status: string; late_minutes: number; overtime_minutes: number
  user?: { first_name: string; last_name: string; employee_id?: string }
}

function fmt(iso?: string) {
  if (!iso) return '--:--'
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

const STATUS_STYLES: Record<string, string> = {
  present: 'bg-green-100 text-green-700',
  late: 'bg-yellow-100 text-yellow-700',
  absent: 'bg-red-100 text-red-700',
  on_leave: 'bg-blue-100 text-blue-700',
  half_day: 'bg-orange-100 text-orange-700',
}

export default function AttendancePage() {
  const [logs, setLogs] = useState<AttendanceLog[]>([])
  const [todayLog, setTodayLog] = useState<AttendanceLog | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [now, setNow] = useState(new Date())

  const today = new Date().toISOString().split('T')[0]

  const load = useCallback(async () => {
    const res = await fetch('/api/attendance?limit=30')
    const json = await res.json()
    if (json.data) {
      setLogs(json.data)
      const t = json.data.find((l: AttendanceLog) => l.date === today)
      setTodayLog(t || null)
    }
    setLoading(false)
  }, [today])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const clockAction = async (action: 'clock_in' | 'clock_out') => {
    setActing(true)
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error); return }
      toast.success(action === 'clock_in' ? 'Clocked in!' : 'Clocked out!')
      await load()
    } finally {
      setActing(false)
    }
  }

  const clockedIn = !!todayLog?.clock_in
  const clockedOut = !!todayLog?.clock_out

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>

      {/* Clock Widget */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 text-white">
        <div className="text-center mb-6">
          <div className="text-5xl font-mono font-bold tracking-tight">
            {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div className="text-slate-400 mt-1">{now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
        </div>
        <div className="flex justify-center gap-4">
          {!clockedIn && !clockedOut && (
            <button disabled={acting} onClick={() => clockAction('clock_in')} className="px-8 py-3 bg-green-500 hover:bg-green-400 text-white rounded-xl font-semibold text-lg transition-all disabled:opacity-50">
              {acting ? '...' : '🟢 Clock In'}
            </button>
          )}
          {clockedIn && !clockedOut && (
            <button disabled={acting} onClick={() => clockAction('clock_out')} className="px-8 py-3 bg-red-500 hover:bg-red-400 text-white rounded-xl font-semibold text-lg transition-all disabled:opacity-50">
              {acting ? '...' : '🔴 Clock Out'}
            </button>
          )}
          {clockedOut && <div className="text-green-400 text-lg font-semibold">✅ Shift complete</div>}
        </div>

        {todayLog && (
          <div className="mt-6 grid grid-cols-3 gap-4 text-center">
            <div><div className="text-slate-400 text-xs uppercase tracking-wider">Clock In</div><div className="text-xl font-semibold mt-1">{fmt(todayLog.clock_in)}</div></div>
            <div><div className="text-slate-400 text-xs uppercase tracking-wider">Clock Out</div><div className="text-xl font-semibold mt-1">{fmt(todayLog.clock_out)}</div></div>
            <div><div className="text-slate-400 text-xs uppercase tracking-wider">Status</div><div className="mt-1"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[todayLog.status] || 'bg-gray-100 text-gray-700'}`}>{todayLog.status}</span></div></div>
          </div>
        )}
      </div>

      {/* History */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Attendance History</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No attendance records yet</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {logs.map(log => (
              <div key={log.id} className="px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-sm font-medium text-gray-900 w-32">{fmtDate(log.date)}</div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[log.status] || 'bg-gray-100 text-gray-700'}`}>{log.status}</span>
                </div>
                <div className="flex items-center gap-6 text-sm text-gray-500">
                  <span>In: <span className="font-medium text-gray-900">{fmt(log.clock_in)}</span></span>
                  <span>Out: <span className="font-medium text-gray-900">{fmt(log.clock_out)}</span></span>
                  {log.late_minutes > 0 && <span className="text-yellow-600 text-xs">+{log.late_minutes}m late</span>}
                  {log.overtime_minutes > 0 && <span className="text-green-600 text-xs">+{log.overtime_minutes}m OT</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
