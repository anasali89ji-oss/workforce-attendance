'use client'
import { useState, useEffect, useCallback } from 'react'

interface Employee { id: string; full_name: string; email: string; role: string; phone?: string; employee_id?: string; department?: string; position?: string; is_active: boolean; joining_date?: string; avatar_url?: string }

const ROLE_META: Record<string, { color: string; bg: string }> = {
  owner:   { color: '#7c3aed', bg: '#f5f3ff' },
  admin:   { color: '#2563eb', bg: '#eff6ff' },
  manager: { color: '#d97706', bg: '#fffbeb' },
  worker:  { color: '#0891b2', bg: '#f0f9ff' },
}

export default function TeamDirectoryPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    const res = await fetch('/api/users?' + params)
    const json = await res.json()
    if (json.data) setEmployees(json.data)
    setLoading(false)
  }, [search])

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t) }, [load])

  const departments = [...new Set(employees.map(e => e.department).filter(Boolean))]

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' }}>Team Directory</h1>
        <p style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>{employees.length} team members</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Members', val: employees.length, icon: '👥', color: '#4f46e5', bg: '#eef2ff' },
          { label: 'Active', val: employees.filter(e => e.is_active).length, icon: '✅', color: '#10b981', bg: '#f0fdf4' },
          { label: 'Departments', val: departments.length, icon: '🏢', color: '#0891b2', bg: '#f0f9ff' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
            <div style={{ width: 40, height: 40, background: s.bg, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a' }}>{s.val}</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 16 }}>🔍</span>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email or ID..."
            style={{ width: '100%', height: 42, border: '1.5px solid #e2e8f0', borderRadius: 10, paddingLeft: 38, paddingRight: 14, fontSize: 13, color: '#0f172a', outline: 'none', background: '#fff', maxWidth: 360, transition: 'border-color 0.2s' }}
            onFocus={e => e.target.style.borderColor = '#4f46e5'}
            onBlur={e => e.target.style.borderColor = '#e2e8f0'}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>Loading team...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px,1fr))', gap: 14 }}>
          {employees.map(emp => {
            const meta = ROLE_META[emp.role] || { color: '#64748b', bg: '#f8fafc' }
            const initials = emp.full_name.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase()
            const colors = ['#4f46e5','#0891b2','#059669','#d97706','#7c3aed','#dc2626']
            const bg = colors[emp.full_name.charCodeAt(0) % colors.length]
            return (
              <div key={emp.id} style={{ background: '#fff', borderRadius: 14, padding: '18px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', transition: 'all 0.2s', cursor: 'default' }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.1)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)' }}
              >
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: `linear-gradient(135deg, ${bg}, ${bg}aa)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
                    {initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.full_name}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.email}</div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 5, fontSize: 11, fontWeight: 700, background: meta.bg, color: meta.color, textTransform: 'capitalize' }}>{emp.role}</span>
                      {emp.department && <span style={{ padding: '2px 8px', borderRadius: 5, fontSize: 11, background: '#f8fafc', color: '#64748b' }}>{emp.department}</span>}
                      {!emp.is_active && <span style={{ padding: '2px 8px', borderRadius: 5, fontSize: 11, background: '#fef2f2', color: '#dc2626' }}>Inactive</span>}
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f8fafc', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8' }}>
                  <span>ID: {emp.employee_id || '—'}</span>
                  {emp.joining_date && <span>Joined {new Date(emp.joining_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>}
                </div>
              </div>
            )
          })}
          {employees.length === 0 && (
            <div style={{ gridColumn: '1/-1', padding: 60, textAlign: 'center', color: '#94a3b8' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>🔍</div>
              <p style={{ fontWeight: 600, color: '#374151' }}>No employees found</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
