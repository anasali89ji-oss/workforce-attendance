'use client'
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'

interface Employee { id: string; full_name: string; email: string; role: string; phone?: string; employee_id?: string; department?: string; position?: string; is_active: boolean }

const ROLE_META: Record<string, { color: string; bg: string }> = {
  owner:   { color: '#7c3aed', bg: '#f5f3ff' },
  admin:   { color: '#2563eb', bg: '#eff6ff' },
  manager: { color: '#d97706', bg: '#fffbeb' },
  worker:  { color: '#0891b2', bg: '#f0f9ff' },
}

export default function AdminEmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ full_name: '', email: '', password: 'Welcome@123', phone: '', role: 'worker', department: '', position: '' })

  const load = useCallback(async () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    const res = await fetch('/api/users?' + params)
    const json = await res.json()
    if (json.data) setEmployees(json.data)
    setLoading(false)
  }, [search])

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t) }, [load])

  const create = async () => {
    if (!form.full_name || !form.email) { toast.error('Name and email required'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error); return }
      toast.success('Employee added!')
      setShowForm(false)
      setForm({ full_name: '', email: '', password: 'Welcome@123', phone: '', role: 'worker', department: '', position: '' })
      await load()
    } finally { setSubmitting(false) }
  }

  const toggleActive = async (id: string, current: boolean) => {
    const res = await fetch('/api/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, is_active: !current }) })
    if (res.ok) { toast.success(current ? 'Deactivated' : 'Activated'); await load() }
  }

  const Field = ({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) => (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', height: 38, border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '0 10px', fontSize: 13, color: '#0f172a', outline: 'none', transition: 'border-color 0.15s' }} onFocus={e => e.target.style.borderColor = '#4f46e5'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
    </div>
  )

  return (
    <div style={{ maxWidth: 1000 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a' }}>Employees</h1>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>{employees.length} total employees</p>
        </div>
        <button onClick={() => setShowForm(v => !v)} style={{ height: 40, padding: '0 18px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          {showForm ? '✕ Cancel' : '+ Add Employee'}
        </button>
      </div>

      {showForm && (
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, marginBottom: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid #f1f5f9', animation: 'fadeUp 0.3s ease' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>New Employee</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            <Field label="Full Name *" value={form.full_name} onChange={v => setForm(f => ({ ...f, full_name: v }))} />
            <Field label="Email *" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} type="email" />
            <Field label="Phone" value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} />
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 }}>Role</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} style={{ width: '100%', height: 38, border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '0 10px', fontSize: 13, outline: 'none', background: '#fff', cursor: 'pointer' }}>
                <option value="worker">Worker</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <Field label="Department" value={form.department} onChange={v => setForm(f => ({ ...f, department: v }))} />
            <Field label="Position" value={form.position} onChange={v => setForm(f => ({ ...f, position: v }))} />
            <div style={{ gridColumn: '1/-1' }}>
              <Field label="Initial Password" value={form.password} onChange={v => setForm(f => ({ ...f, password: v }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button onClick={create} disabled={submitting} style={{ height: 38, padding: '0 20px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}>{submitting ? 'Adding...' : 'Add Employee'}</button>
            <button onClick={() => setShowForm(false)} style={{ height: 38, padding: '0 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#64748b', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ position: 'relative', maxWidth: 300 }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employees..." style={{ width: '100%', height: 36, border: '1.5px solid #e2e8f0', borderRadius: 8, paddingLeft: 32, fontSize: 13, outline: 'none', transition: 'border-color 0.15s' }} onFocus={e => e.target.style.borderColor = '#4f46e5'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
          </div>
        </div>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Employee','ID','Role','Department','Status','Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.6, borderBottom: '1px solid #f1f5f9' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => {
                const meta = ROLE_META[emp.role] || { color: '#64748b', bg: '#f8fafc' }
                return (
                  <tr key={emp.id} style={{ borderBottom: '1px solid #f8fafc' }}
                  onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = '#fafafa'}
                  onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = '#fff'}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: meta.bg, color: meta.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                          {emp.full_name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>{emp.full_name}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>{emp.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748b' }}>{emp.employee_id || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 5, fontSize: 11, fontWeight: 700, background: meta.bg, color: meta.color, textTransform: 'capitalize' }}>{emp.role}</span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748b' }}>{emp.department || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 5, fontSize: 11, fontWeight: 700, background: emp.is_active ? '#f0fdf4' : '#f8fafc', color: emp.is_active ? '#059669' : '#94a3b8' }}>
                        {emp.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button onClick={() => toggleActive(emp.id, emp.is_active)} style={{ fontSize: 12, color: '#64748b', background: 'none', border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', transition: 'all 0.15s' }}
                      onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = '#4f46e5'; el.style.color = '#4f46e5' }}
                      onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = '#e2e8f0'; el.style.color = '#64748b' }}
                      >{emp.is_active ? 'Deactivate' : 'Activate'}</button>
                    </td>
                  </tr>
                )
              })}
              {employees.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>No employees found</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
      <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  )
}
