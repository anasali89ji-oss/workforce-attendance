'use client'
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'

interface Perm { module: string; slug: string; name: string }
interface Role { id: string; name: string; slug: string; description?: string; color: string; is_system: boolean; user_count: number; permissions: string[] }

const COLORS = ['#4f46e5','#0891b2','#059669','#d97706','#7c3aed','#dc2626','#e11d48','#0f766e','#b45309','#7c2d12']

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Perm[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Role|null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', color: '#4f46e5', permissions: [] as string[] })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const [r, p] = await Promise.all([fetch('/api/roles'), fetch('/api/roles/permissions')])
    const rj = await r.json(); const pj = await p.json()
    if (rj.data) setRoles(rj.data)
    if (pj.data) setPermissions(pj.data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const byModule = permissions.reduce((acc, p) => { if (!acc[p.module]) acc[p.module] = []; acc[p.module].push(p); return acc }, {} as Record<string,Perm[]>)

  const togglePerm = (slug: string) => setForm(f => ({ ...f, permissions: f.permissions.includes(slug) ? f.permissions.filter(x => x !== slug) : [...f.permissions, slug] }))

  const toggleModule = (module: string) => {
    const slugs = byModule[module].map(p => p.slug)
    const allOn = slugs.every(s => form.permissions.includes(s))
    setForm(f => ({ ...f, permissions: allOn ? f.permissions.filter(s => !slugs.includes(s)) : [...new Set([...f.permissions, ...slugs])] }))
  }

  const save = async () => {
    if (!form.name.trim()) { toast.error('Role name required'); return }
    setSaving(true)
    try {
      const method = creating ? 'POST' : 'PATCH'
      const body = creating ? form : { id: editing!.id, ...form }
      const res = await fetch('/api/roles', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error); return }
      toast.success(creating ? 'Role created!' : 'Role updated!')
      setEditing(null); setCreating(false)
      await load()
    } finally { setSaving(false) }
  }

  const deleteRole = async (id: string) => {
    if (!confirm('Delete this role? Users with this role won\'t be affected.')) return
    const res = await fetch(`/api/roles?id=${id}`, { method: 'DELETE' })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error); return }
    toast.success('Role deleted')
    await load()
  }

  const startCreate = () => { setEditing(null); setCreating(true); setForm({ name: '', description: '', color: '#4f46e5', permissions: [] }) }
  const startEdit = (r: Role) => { setCreating(false); setEditing(r); setForm({ name: r.name, description: r.description || '', color: r.color, permissions: r.permissions || [] }) }

  const showForm = creating || !!editing

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a' }}>Roles & Permissions</h1>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>Create custom roles with granular access control</p>
        </div>
        <button onClick={startCreate} style={{ height: 40, padding: '0 18px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Create Role</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: showForm ? '1fr 420px' : '1fr', gap: 16 }}>
        {/* Roles list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Loading...</div>
          ) : roles.map(role => (
            <div key={role.id} onClick={() => startEdit(role)} style={{
              background: '#fff', borderRadius: 14, padding: '16px 18px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              border: `2px solid ${editing?.id === role.id ? '#4f46e5' : '#f1f5f9'}`,
              cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { if (editing?.id !== role.id) (e.currentTarget as HTMLDivElement).style.borderColor = '#e2e8f0' }}
            onMouseLeave={e => { if (editing?.id !== role.id) (e.currentTarget as HTMLDivElement).style.borderColor = '#f1f5f9' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: role.color + '20', border: `2px solid ${role.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: role.color, flexShrink: 0 }}>
                    {role.name[0]}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{role.name}</span>
                      {role.is_system && <span style={{ padding: '1px 6px', background: '#f1f5f9', color: '#64748b', fontSize: 10, fontWeight: 700, borderRadius: 4 }}>SYSTEM</span>}
                    </div>
                    {role.description && <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{role.description}</p>}
                    <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>{role.user_count} user{role.user_count !== 1 ? 's' : ''}</span>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>{(role.permissions || []).length} permissions</span>
                    </div>
                  </div>
                </div>
                {!role.is_system && (
                  <button onClick={e => { e.stopPropagation(); deleteRole(role.id) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px', fontSize: 16, borderRadius: 6, transition: 'all 0.15s' }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.color = '#ef4444'; el.style.background = '#fef2f2' }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.color = '#94a3b8'; el.style.background = 'none' }}
                  >🗑</button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Form panel */}
        {showForm && (
          <div style={{ background: '#fff', borderRadius: 16, padding: '20px 20px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid #f1f5f9', position: 'sticky', top: 20, maxHeight: 'calc(100vh - 160px)', overflowY: 'auto' }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>{creating ? 'Create New Role' : `Edit: ${editing?.name}`}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>Role Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Operations Lead" style={{ width: '100%', height: 38, border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '0 10px', fontSize: 13, outline: 'none', transition: 'border-color 0.15s' }} onFocus={e => e.target.style.borderColor = '#4f46e5'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>Description</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ width: '100%', height: 38, border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '0 10px', fontSize: 13, outline: 'none' }} onFocus={e => e.target.style.borderColor = '#4f46e5'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 8 }}>Color</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))} style={{ width: 26, height: 26, borderRadius: '50%', background: c, border: `2.5px solid ${form.color === c ? '#0f172a' : 'transparent'}`, cursor: 'pointer', transition: 'transform 0.15s', transform: form.color === c ? 'scale(1.2)' : 'scale(1)' }} />
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 10 }}>Permissions</label>
                {Object.entries(byModule).map(([module, perms]) => {
                  const allOn = perms.every(p => form.permissions.includes(p.slug))
                  return (
                    <div key={module} style={{ marginBottom: 10, border: '1px solid #f1f5f9', borderRadius: 8, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'capitalize' }}>{module}</span>
                        <button type="button" onClick={() => toggleModule(module)} style={{ fontSize: 10, color: '#4f46e5', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>{allOn ? 'Deselect all' : 'Select all'}</button>
                      </div>
                      <div style={{ padding: '8px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                        {perms.map(p => (
                          <label key={p.slug} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: '#374151' }}>
                            <input type="checkbox" checked={form.permissions.includes(p.slug)} onChange={() => togglePerm(p.slug)} style={{ accentColor: '#4f46e5' }} />
                            {p.name}
                          </label>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={save} disabled={saving} style={{ flex: 1, height: 40, background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>{saving ? 'Saving...' : creating ? 'Create Role' : 'Save Changes'}</button>
                <button onClick={() => { setEditing(null); setCreating(false) }} style={{ height: 40, padding: '0 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#64748b', cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
