'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { UserCog, Plus, Search, UserCheck, UserX, X, Mail, Hash, Building2, Shield, Check } from 'lucide-react'

interface Employee {
  id: string; full_name: string; email: string; role: string
  employee_id?: string; department?: string; position?: string
  phone?: string; is_active: boolean; joining_date?: string
}

const ROLE_META: Record<string,{color:string;bg:string}> = {
  owner:   {color:'#7c3aed',bg:'#f5f3ff'},
  admin:   {color:'#2563eb',bg:'#eff6ff'},
  manager: {color:'#d97706',bg:'#fffbeb'},
  worker:  {color:'#0891b2',bg:'#f0f9ff'},
}
function getInitials(name: string) { return name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase() }
const AVATAR_COLORS = ['#4f46e5','#0891b2','#059669','#d97706','#7c3aed','#dc2626']
function getColor(name: string) { return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length] }

const EMPTY_FORM = { full_name:'', email:'', password:'Welcome@123456', phone:'', role:'worker', department:'', position:'', employee_id:'' }

export default function AdminEmployeesPage() {
  const [employees, setEmployees]     = useState<Employee[]>([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [showModal, setShowModal]     = useState(false)
  const [editingId, setEditingId]     = useState<string|null>(null)
  const [form, setForm]               = useState(EMPTY_FORM)
  const [submitting, setSubmitting]   = useState(false)
  const [roleFilter, setRoleFilter]   = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all'|'active'|'inactive'>('active')

  const load = useCallback(async () => {
    const p = new URLSearchParams()
    if (search) p.set('search', search)
    const res = await fetch('/api/users?' + p)
    const json = await res.json()
    if (json.data) setEmployees(json.data)
    setLoading(false)
  }, [search])

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t) }, [load])

  const filtered = employees.filter(e => {
    if (roleFilter !== 'all' && e.role !== roleFilter) return false
    if (statusFilter === 'active' && !e.is_active) return false
    if (statusFilter === 'inactive' && e.is_active) return false
    return true
  })

  const openAdd = () => { setForm(EMPTY_FORM); setEditingId(null); setShowModal(true) }
  const openEdit = (emp: Employee) => {
    setForm({ full_name: emp.full_name, email: emp.email, password: '', phone: emp.phone||'', role: emp.role, department: emp.department||'', position: emp.position||'', employee_id: emp.employee_id||'' })
    setEditingId(emp.id)
    setShowModal(true)
  }

  const save = async () => {
    if (!form.full_name.trim() || !form.email.trim()) { toast.error('Name and email required'); return }
    setSubmitting(true)
    try {
      const method = editingId ? 'PATCH' : 'POST'
      const body   = editingId ? { id: editingId, ...form } : form
      const res = await fetch('/api/users', { method, headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error || 'Failed'); return }
      toast.success(editingId ? 'Employee updated' : 'Employee added successfully')
      setShowModal(false)
      await load()
    } finally { setSubmitting(false) }
  }

  const toggleActive = async (emp: Employee) => {
    const res = await fetch('/api/users', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id: emp.id, is_active: !emp.is_active }) })
    if (res.ok) { toast.success(emp.is_active ? 'Deactivated' : 'Activated'); await load() }
    else toast.error('Failed to update')
  }

  const F = (key: keyof typeof EMPTY_FORM) => (
    <input className="input" value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
  )

  return (
    <div className="page anim-fade-up">
      {/* Header */}
      <div className="section-header">
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserCog size={20} color="var(--brand-500)" strokeWidth={2} />
            Employees
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: 13, marginTop: 3 }}>
            {employees.length} total · {employees.filter(e=>e.is_active).length} active
          </p>
        </div>
        <button onClick={openAdd} className="btn btn-primary" style={{ gap: 6 }}>
          <Plus size={14} strokeWidth={2.5} />Add Employee
        </button>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 280px' }}>
          <Search size={14} color="var(--text-3)" strokeWidth={1.8} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input className="input input-sm" placeholder="Search employees..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 32 }} />
        </div>
        <select className="input input-sm" value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={{ width: 140 }}>
          <option value="all">All Roles</option>
          {['owner','admin','manager','worker'].map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['all','active','inactive'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} style={{
              padding: '4px 12px', borderRadius: 7, border: '1px solid', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: statusFilter===s ? 'var(--brand-600)' : 'var(--surface-2)', color: statusFilter===s ? '#fff' : 'var(--text-2)',
              borderColor: statusFilter===s ? 'var(--brand-600)' : 'var(--border-strong)', transition: 'all 0.15s',
            }}>
              {s.charAt(0).toUpperCase()+s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center' }}><span className="spinner spinner-lg" style={{ borderTopColor: 'var(--brand-500)' }} /></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th><th>Role</th><th>Department</th>
                  <th>Employee ID</th><th>Status</th><th>Joined</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp, i) => {
                  const meta = ROLE_META[emp.role] || { color:'#64748b', bg:'#f8fafc' }
                  const color = getColor(emp.full_name)
                  return (
                    <tr key={emp.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: 9, background: `${color}18`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, flexShrink: 0 }}>
                            {getInitials(emp.full_name)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{emp.full_name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 3 }}><Mail size={9} strokeWidth={2} />{emp.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="badge" style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}25`, textTransform: 'capitalize', fontSize: 10 }}>
                          {emp.role}
                        </span>
                      </td>
                      <td style={{ fontSize: 12 }}>{emp.department || <span style={{ color:'var(--text-3)' }}>—</span>}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-2)' }}>{emp.employee_id || '—'}</td>
                      <td>
                        <span className={`badge ${emp.is_active ? 'badge-success' : 'badge-default'}`} style={{ display: 'inline-flex', gap: 4, fontSize: 10 }}>
                          {emp.is_active ? <><UserCheck size={9} strokeWidth={2.5} />Active</> : <><UserX size={9} strokeWidth={2.5} />Inactive</>}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-3)' }}>
                        {emp.joining_date ? new Date(emp.joining_date).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => openEdit(emp)} className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: '4px 10px' }}>Edit</button>
                          <button onClick={() => toggleActive(emp)} className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: '4px 10px', color: emp.is_active ? 'var(--danger)' : 'var(--success)' }}>
                            {emp.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={7}>
                    <div className="empty-state"><UserCog size={40} strokeWidth={1.2} /><h3>No employees found</h3><p>Try adjusting your filters</p></div>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="modal-panel modal-lg" style={{ maxHeight: '85vh' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{editingId ? 'Edit Employee' : 'Add New Employee'}</h2>
                <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{editingId ? 'Update employee information' : 'Fill in the details to add a team member'}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="btn btn-ghost btn-icon" style={{ padding: 6 }}><X size={16} strokeWidth={2} /></button>
            </div>

            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 16, minHeight: 0, background: 'var(--surface)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  {F('full_name')}
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <input type="email" className="input" value={form.email} onChange={e => setForm(f => ({...f, email:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  {F('phone')}
                </div>
                <div className="form-group">
                  <label className="form-label">Employee ID</label>
                  <input className="input" value={form.employee_id} onChange={e => setForm(f => ({...f, employee_id:e.target.value}))} placeholder="Auto-generated if empty" />
                </div>
                <div className="form-group">
                  <label className="form-label">Department</label>
                  {F('department')}
                </div>
                <div className="form-group">
                  <label className="form-label">Position / Job Title</label>
                  {F('position')}
                </div>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select className="input" value={form.role} onChange={e => setForm(f => ({...f, role:e.target.value}))}>
                    {['worker','manager','admin','owner'].map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
                  </select>
                </div>
                {!editingId && (
                  <div className="form-group">
                    <label className="form-label">Initial Password</label>
                    <input type="password" className="input" value={form.password} onChange={e => setForm(f => ({...f, password:e.target.value}))} />
                  </div>
                )}
              </div>

              {/* Role preview */}
              <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Shield size={13} strokeWidth={2} color="var(--text-3)" />
                  Selected Role: <span style={{ color: ROLE_META[form.role]?.color || 'var(--text)', textTransform: 'capitalize' }}>{form.role}</span>
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.5 }}>
                  {form.role === 'owner' && 'Full access to all features including billing and account management.'}
                  {form.role === 'admin' && 'Can manage employees, roles, settings, and view all reports.'}
                  {form.role === 'manager' && 'Can approve leaves, view team attendance, and access analytics.'}
                  {form.role === 'worker' && 'Can clock in/out, submit leave requests, and view personal data.'}
                </p>
              </div>
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0 }}>
              <button onClick={() => setShowModal(false)} className="btn btn-ghost">Cancel</button>
              <button onClick={save} disabled={submitting} className="btn btn-primary" style={{ gap: 6 }}>
                {submitting ? <><span className="spinner spinner-sm" />Saving...</> : <><Check size={14} strokeWidth={2.5} />{editingId ? 'Save Changes' : 'Add Employee'}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
