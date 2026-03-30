'use client'

import { useState, useEffect, useCallback } from 'react'

interface Employee { id: string; first_name: string; last_name: string; email: string; phone?: string; employee_id?: string; is_active: boolean; joined_at: string; role?: { name: string; color: string }; department?: { name: string } }

export default function TeamDirectoryPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([])

  const load = useCallback(async () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (deptFilter) params.set('department_id', deptFilter)
    const [empRes, deptRes] = await Promise.all([
      fetch('/api/users?' + params),
      fetch('/api/departments'),
    ])
    const empJson = await empRes.json()
    const deptJson = await deptRes.json()
    if (empJson.data) setEmployees(empJson.data)
    if (deptJson.data) setDepartments(deptJson.data)
    setLoading(false)
  }, [search, deptFilter])

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [load])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Team Directory</h1>

      {/* Filters */}
      <div className="flex gap-3">
        <input
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="🔍 Search by name, email or ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={deptFilter}
          onChange={e => setDeptFilter(e.target.value)}
        >
          <option value="">All Departments</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Employees', val: employees.length, icon: '👥' },
          { label: 'Active', val: employees.filter(e => e.is_active).length, icon: '✅' },
          { label: 'Departments', val: departments.length, icon: '🏢' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
            <span className="text-2xl">{s.icon}</span>
            <div>
              <div className="text-xl font-bold text-gray-900">{s.val}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Cards */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map(emp => (
            <div key={emp.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {emp.first_name[0]}{emp.last_name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 truncate">{emp.first_name} {emp.last_name}</div>
                  <div className="text-xs text-gray-500 truncate">{emp.email}</div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {emp.role && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: emp.role.color + '20', color: emp.role.color }}>
                        {emp.role.name}
                      </span>
                    )}
                    {emp.department && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">{emp.department.name}</span>
                    )}
                    {!emp.is_active && <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-600">Inactive</span>}
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between text-xs text-gray-400">
                <span>ID: {emp.employee_id || '—'}</span>
                <span>Joined {new Date(emp.joined_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
              </div>
            </div>
          ))}
          {employees.length === 0 && (
            <div className="col-span-3 text-center py-12 text-gray-400">No employees found</div>
          )}
        </div>
      )}
    </div>
  )
}
