'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Users, Grid, List, X, Mail, Phone, Hash, Building2, Calendar, UserCheck, UserX } from 'lucide-react'

interface Employee {
  id: string; full_name: string; email: string; role: string
  phone?: string; employee_id?: string; department?: string
  position?: string; is_active: boolean; joining_date?: string; avatar_url?: string
}

const ROLE_META: Record<string, { color: string; bg: string }> = {
  owner:   { color: '#7c3aed', bg: '#f5f3ff' },
  admin:   { color: '#2563eb', bg: '#eff6ff' },
  manager: { color: '#d97706', bg: '#fffbeb' },
  worker:  { color: '#0891b2', bg: '#f0f9ff' },
}
const AVATAR_COLORS = ['#4f46e5','#0891b2','#059669','#d97706','#7c3aed','#dc2626']

function getAvatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
}
function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

type ViewMode = 'grid' | 'list'

export default function TeamDirectoryPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Employee | null>(null)
  const [view, setView] = useState<ViewMode>('grid')

  const load = useCallback(async () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    const res = await fetch('/api/users?' + params)
    const json = await res.json()
    if (json.data) setEmployees(json.data)
    setLoading(false)
  }, [search])

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t) }, [load])

  const depts = [...new Set(employees.map(e => e.department).filter(Boolean))]
  const active = employees.filter(e => e.is_active).length

  return (
    <div className="page anim-fade-up">
      {/* Header */}
      <div className="section-header">
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={20} color="var(--brand-500)" strokeWidth={2} />
            Team Directory
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: 13, marginTop: 3 }}>
            {employees.length} total · {active} active · {depts.length} department{depts.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ display: 'flex', background: 'var(--surface-3)', borderRadius: 9, padding: 3, border: '1px solid var(--border)' }}>
            {(['grid','list'] as ViewMode[]).map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                padding: '6px 12px', borderRadius: 7, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5,
                background: view === v ? 'var(--surface)' : 'transparent',
                color: view === v ? 'var(--text)' : 'var(--text-3)',
                boxShadow: view === v ? 'var(--shadow-xs)' : 'none', transition: 'all 0.15s',
              }}>
                {v === 'grid' ? <Grid size={13} strokeWidth={2} /> : <List size={13} strokeWidth={2} />}
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20, position: 'relative', maxWidth: 380 }}>
        <Search size={15} color="var(--text-3)" strokeWidth={1.8} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input
          className="input" placeholder="Search by name, email or ID..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: 36 }}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><span className="spinner spinner-lg" style={{ borderTopColor: 'var(--brand-500)' }} /></div>
      ) : view === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px,1fr))', gap: 14 }}>
          {employees.map(emp => {
            const meta = ROLE_META[emp.role] || { color: '#64748b', bg: '#f8fafc' }
            const color = getAvatarColor(emp.full_name)
            return (
              <div key={emp.id} className="card card-hover" onClick={() => setSelected(emp)} style={{
                padding: '18px 18px', cursor: 'pointer', overflow: 'hidden', position: 'relative',
              }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg, ${color}, ${color}80)` }} />
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginTop: 8 }}>
                  <div style={{ width: 46, height: 46, borderRadius: 12, background: `${color}18`, border: `2px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, fontWeight: 800, fontSize: 15, flexShrink: 0 }}>
                    {getInitials(emp.full_name)}
                    {emp.is_active && <span style={{ position: 'absolute', bottom: -1, right: -1, width: 9, height: 9, borderRadius: '50%', background: '#10b981', border: '2px solid var(--surface)' }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.full_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Mail size={10} strokeWidth={1.8} />{emp.email}
                    </div>
                    <div style={{ display: 'flex', gap: 5, marginTop: 7, flexWrap: 'wrap' }}>
                      <span className="badge" style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}20`, textTransform: 'capitalize', fontSize: 10 }}>
                        {emp.role}
                      </span>
                      {emp.department && <span className="badge badge-default" style={{ fontSize: 10 }}>{emp.department}</span>}
                      {!emp.is_active && <span className="badge badge-danger" style={{ fontSize: 10 }}>Inactive</span>}
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-3)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Hash size={10} strokeWidth={2} />{emp.employee_id || '—'}</span>
                  {emp.joining_date && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={10} strokeWidth={1.8} />{new Date(emp.joining_date).toLocaleDateString('en-US',{month:'short',year:'numeric'})}</span>}
                </div>
              </div>
            )
          })}
          {employees.length === 0 && (
            <div className="empty-state" style={{ gridColumn: '1/-1' }}>
              <Search size={40} strokeWidth={1.2} /><h3>No employees found</h3>
              <p>Try different search terms</p>
            </div>
          )}
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr><th>Employee</th><th>Role</th><th>Department</th><th>Position</th><th>Status</th><th>Joined</th></tr>
            </thead>
            <tbody>
              {employees.map(emp => {
                const meta = ROLE_META[emp.role] || { color: '#64748b', bg: '#f8fafc' }
                const color = getAvatarColor(emp.full_name)
                return (
                  <tr key={emp.id} onClick={() => setSelected(emp)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}18`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 11, flexShrink: 0 }}>
                          {getInitials(emp.full_name)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{emp.full_name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{emp.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className="badge" style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}20`, textTransform: 'capitalize', fontSize: 10 }}>{emp.role}</span></td>
                    <td style={{ fontSize: 12 }}>{emp.department || '—'}</td>
                    <td style={{ fontSize: 12 }}>{emp.position || '—'}</td>
                    <td>
                      <span className={`badge ${emp.is_active ? 'badge-success' : 'badge-default'}`} style={{ display: 'inline-flex', gap: 4, fontSize: 10 }}>
                        {emp.is_active ? <><UserCheck size={9} strokeWidth={2.5} />Active</> : <><UserX size={9} strokeWidth={2.5} />Inactive</>}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-3)' }}>
                      {emp.joining_date ? new Date(emp.joining_date).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—'}
                    </td>
                  </tr>
                )
              })}
              {employees.length === 0 && <tr><td colSpan={6}><div className="empty-state"><Search size={36} strokeWidth={1.2} /><h3>No results</h3></div></td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Profile slide-over */}
      {selected && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, backdropFilter: 'blur(4px)', animation: 'fadeIn 0.15s ease' }} onClick={() => setSelected(null)} />
          <div className="slide-over" style={{ width: 420, zIndex: 210, animation: 'slideOverIn 0.3s cubic-bezier(0.16,1,0.3,1)' }}>
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: `${getAvatarColor(selected.full_name)}18`,
                  border: `2px solid ${getAvatarColor(selected.full_name)}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: getAvatarColor(selected.full_name), fontWeight: 800, fontSize: 18, flexShrink: 0,
                }}>
                  {getInitials(selected.full_name)}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)' }}>{selected.full_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{selected.position || selected.department || 'No position set'}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    <span className="badge" style={{ background: ROLE_META[selected.role]?.bg || '#f8fafc', color: ROLE_META[selected.role]?.color || '#64748b', border: `1px solid ${ROLE_META[selected.role]?.color || '#64748b'}20`, textTransform: 'capitalize', fontSize: 10 }}>{selected.role}</span>
                    <span className={`badge ${selected.is_active ? 'badge-success' : 'badge-default'}`} style={{ fontSize: 10 }}>{selected.is_active ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="btn btn-ghost btn-icon" style={{ padding: 6 }}>
                <X size={16} strokeWidth={2} />
              </button>
            </div>

            {/* Details */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { label: 'Employee ID', value: selected.employee_id || '—', Icon: Hash },
                  { label: 'Email Address', value: selected.email, Icon: Mail },
                  { label: 'Phone', value: selected.phone || '—', Icon: Phone },
                  { label: 'Department', value: selected.department || '—', Icon: Building2 },
                  { label: 'Position', value: selected.position || '—', Icon: Users },
                  { label: 'Joined', value: selected.joining_date ? new Date(selected.joining_date).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}) : '—', Icon: Calendar },
                ].map(({ label, value, Icon }) => (
                  <div key={label} style={{ display: 'flex', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={15} color="var(--text-3)" strokeWidth={1.8} />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
                      <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500, marginTop: 2 }}>{value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes slideOverIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  )
}
