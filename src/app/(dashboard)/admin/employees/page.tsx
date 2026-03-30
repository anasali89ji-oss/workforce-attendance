'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'

interface Employee { id: string; first_name: string; last_name: string; email: string; employee_id?: string; is_active: boolean; role?: { id: string; name: string; color: string }; department?: { id: string; name: string } }
interface Role { id: string; name: string; color: string }
interface Department { id: string; name: string }

export default function AdminEmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: 'Welcome@123', phone: '', role_id: '', department_id: '' })
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    const [eRes, rRes, dRes] = await Promise.all([
      fetch('/api/users?' + params),
      fetch('/api/roles'),
      fetch('/api/departments'),
    ])
    const eJson = await eRes.json(); const rJson = await rRes.json(); const dJson = await dRes.json()
    if (eJson.data) setEmployees(eJson.data)
    if (rJson.data) setRoles(rJson.data)
    if (dJson.data) setDepartments(dJson.data)
    setLoading(false)
  }, [search])

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t) }, [load])

  const create = async () => {
    if (!form.first_name || !form.last_name || !form.email) { toast.error('Fill required fields'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error); return }
      toast.success('Employee added!')
      setShowForm(false)
      setForm({ first_name: '', last_name: '', email: '', password: 'Welcome@123', phone: '', role_id: '', department_id: '' })
      await load()
    } finally { setSubmitting(false) }
  }

  const toggleActive = async (id: string, current: boolean) => {
    const res = await fetch('/api/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, is_active: !current }) })
    if (!res.ok) { toast.error('Failed'); return }
    toast.success(current ? 'Employee deactivated' : 'Employee activated')
    await load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
        <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-all text-sm">+ Add Employee</button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold mb-4">New Employee</h2>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label><input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label><input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Email *</label><input type="email" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone</label><input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Role</label><select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={form.role_id} onChange={e => setForm(f => ({ ...f, role_id: e.target.value }))}><option value="">Select role</option>{roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Department</label><select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={form.department_id} onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))}><option value="">Select dept</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
            <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Initial Password</label><input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} /></div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={create} disabled={submitting} className="px-5 py-2 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 disabled:opacity-50">{submitting ? 'Adding...' : 'Add Employee'}</button>
            <button onClick={() => setShowForm(false)} className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-sm" placeholder="🔍 Search employees..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {loading ? <div className="p-8 text-center text-gray-400">Loading...</div> : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>{['Employee', 'ID', 'Role', 'Department', 'Status', 'Actions'].map(h => <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {employees.map(emp => (
                <tr key={emp.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-semibold text-sm flex items-center justify-center">{emp.first_name[0]}{emp.last_name[0]}</div>
                      <div>
                        <div className="font-medium text-gray-900">{emp.first_name} {emp.last_name}</div>
                        <div className="text-xs text-gray-400">{emp.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-500">{emp.employee_id || '—'}</td>
                  <td className="px-5 py-3">{emp.role ? <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: emp.role.color + '20', color: emp.role.color }}>{emp.role.name}</span> : '—'}</td>
                  <td className="px-5 py-3 text-gray-500">{emp.department?.name || '—'}</td>
                  <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${emp.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{emp.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td className="px-5 py-3">
                    <button onClick={() => toggleActive(emp.id, emp.is_active)} className="text-xs text-gray-500 hover:text-indigo-600 transition-all">{emp.is_active ? 'Deactivate' : 'Activate'}</button>
                  </td>
                </tr>
              ))}
              {employees.length === 0 && <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">No employees found</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
