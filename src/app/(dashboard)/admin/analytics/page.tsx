'use client'

import { useState, useEffect, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'

interface Summary { total_employees: number; present_today: number; absent_today: number; late_today: number; on_leave_today: number; attendance_rate: number; pending_leaves: number }
interface DeptStat { department: string; total: number; present: number; attendance_rate: number }
interface LeaveStat { name: string; color: string; count: number; days: number }
interface MonthlyPoint { date: string; present: number; late: number; absent: number }

export default function AdminAnalyticsPage() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [deptStats, setDeptStats] = useState<DeptStat[]>([])
  const [leaveStats, setLeaveStats] = useState<LeaveStat[]>([])
  const [monthly, setMonthly] = useState<MonthlyPoint[]>([])
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))

  const load = useCallback(async () => {
    const [s, d, l, m] = await Promise.all([
      fetch('/api/analytics?type=summary').then(r => r.json()),
      fetch('/api/analytics?type=department_stats').then(r => r.json()),
      fetch(`/api/analytics?type=leave_summary&month=${month}`).then(r => r.json()),
      fetch(`/api/analytics?type=monthly_attendance&month=${month}`).then(r => r.json()),
    ])
    if (s.data) setSummary(s.data)
    if (d.data) setDeptStats(d.data)
    if (l.data) setLeaveStats(l.data)
    if (m.data) setMonthly(m.data)
  }, [month])

  useEffect(() => { load() }, [load])

  const kpis = summary ? [
    { label: 'Total Employees', value: summary.total_employees, icon: '👥', color: 'from-blue-500 to-blue-600' },
    { label: 'Present Today', value: summary.present_today, icon: '✅', color: 'from-green-500 to-green-600' },
    { label: 'Late Today', value: summary.late_today, icon: '⚠️', color: 'from-yellow-500 to-yellow-600' },
    { label: 'On Leave', value: summary.on_leave_today, icon: '🏖️', color: 'from-purple-500 to-purple-600' },
    { label: 'Attendance Rate', value: `${summary.attendance_rate}%`, icon: '📊', color: 'from-indigo-500 to-indigo-600' },
    { label: 'Pending Leaves', value: summary.pending_leaves, icon: '📋', color: 'from-orange-500 to-orange-600' },
  ] : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <input type="month" className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={month} onChange={e => setMonth(e.target.value)} />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map(k => (
          <div key={k.label} className={`bg-gradient-to-br ${k.color} text-white rounded-xl p-4`}>
            <div className="text-2xl mb-2">{k.icon}</div>
            <div className="text-2xl font-bold">{k.value}</div>
            <div className="text-xs opacity-80 mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Monthly Attendance Chart */}
      {monthly.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4">Monthly Attendance Trend</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => new Date(d).getDate().toString()} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="present" stroke="#10b981" strokeWidth={2} dot={false} name="Present" />
              <Line type="monotone" dataKey="late" stroke="#f59e0b" strokeWidth={2} dot={false} name="Late" />
              <Line type="monotone" dataKey="absent" stroke="#ef4444" strokeWidth={2} dot={false} name="Absent" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Stats */}
        {deptStats.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-4">Department Attendance</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={deptStats} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                <YAxis dataKey="department" type="category" tick={{ fontSize: 11 }} width={80} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Bar dataKey="attendance_rate" fill="#4f46e5" radius={[0, 4, 4, 0]} name="Attendance %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Leave distribution */}
        {leaveStats.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-4">Leave Distribution</h2>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={leaveStats} dataKey="days" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {leaveStats.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `${v} days`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Dept table */}
      {deptStats.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Department Summary</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Department', 'Total', 'Present', 'Rate'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {deptStats.map(d => (
                  <tr key={d.department} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">{d.department}</td>
                    <td className="px-5 py-3 text-gray-600">{d.total}</td>
                    <td className="px-5 py-3 text-gray-600">{d.present}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-1.5 bg-indigo-600 rounded-full" style={{ width: `${d.attendance_rate}%` }} />
                        </div>
                        <span className="text-gray-900 font-medium">{d.attendance_rate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
