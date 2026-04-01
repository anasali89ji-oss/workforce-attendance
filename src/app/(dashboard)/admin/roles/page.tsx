'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { ShieldCheck, Plus, Trash2, Check, X, Lock, Users, ChevronRight } from 'lucide-react'

interface Perm { module: string; slug: string; name: string }
interface Role  { id: string; name: string; slug: string; description?: string; color: string; is_system: boolean; user_count: number; permissions: string[] }

const COLORS = ['#4f46e5','#0891b2','#10b981','#f59e0b','#7c3aed','#ef4444','#0f766e','#be185d']
const MODULE_ICONS: Record<string,string> = { attendance:'⏰', employees:'👤', leave:'📋', roles:'🔑', analytics:'📊', kanban:'📌', settings:'⚙️', payroll:'💰' }

export default function RolesPage() {
  const [roles, setRoles]     = useState<Role[]>([])
  const [perms, setPerms]     = useState<Perm[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Role|null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm]        = useState({ name:'', description:'', color:'#4f46e5', permissions:[] as string[] })
  const [saving, setSaving]    = useState(false)

  const load = useCallback(async () => {
    const [r, p] = await Promise.all([fetch('/api/roles'), fetch('/api/roles/permissions')])
    const rj = await r.json(); const pj = await p.json()
    if (rj.data) setRoles(rj.data)
    if (pj.data) setPerms(pj.data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const byModule = perms.reduce((acc, p) => { (acc[p.module] ??= []).push(p); return acc }, {} as Record<string,Perm[]>)

  const togglePerm = (slug: string) =>
    setForm(f => ({ ...f, permissions: f.permissions.includes(slug) ? f.permissions.filter(x=>x!==slug) : [...f.permissions, slug] }))

  const toggleModule = (mod: string) => {
    const slugs = byModule[mod].map(p => p.slug)
    const allOn = slugs.every(s => form.permissions.includes(s))
    setForm(f => ({ ...f, permissions: allOn ? f.permissions.filter(s=>!slugs.includes(s)) : [...new Set([...f.permissions,...slugs])] }))
  }

  const startCreate = () => { setSelected(null); setCreating(true); setForm({ name:'', description:'', color:'#4f46e5', permissions:[] }) }
  const startEdit   = (role: Role) => { setCreating(false); setSelected(role); setForm({ name:role.name, description:role.description||'', color:role.color, permissions:role.permissions||[] }) }

  const save = async () => {
    if (!form.name.trim()) { toast.error('Role name required'); return }
    setSaving(true)
    try {
      const method = creating ? 'POST' : 'PATCH'
      const body   = creating ? form : { id: selected!.id, ...form }
      const res = await fetch('/api/roles', { method, headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error); return }
      toast.success(creating ? 'Role created' : 'Role updated')
      setCreating(false); setSelected(null)
      await load()
    } finally { setSaving(false) }
  }

  const deleteRole = async (id: string) => {
    if (!confirm('Delete this role?')) return
    const res = await fetch(`/api/roles?id=${id}`, { method:'DELETE' })
    if (!res.ok) { toast.error((await res.json()).error); return }
    toast.success('Role deleted'); setSelected(null); await load()
  }

  const showForm = creating || !!selected

  return (
    <div className="page anim-fade-up">
      <div className="section-header">
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={20} color="var(--brand-500)" strokeWidth={2} />
            Roles & Permissions
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: 13, marginTop: 3 }}>Granular access control for your workspace</p>
        </div>
        <button onClick={startCreate} className="btn btn-primary" style={{ gap: 6 }}>
          <Plus size={14} strokeWidth={2.5} />Create Role
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: showForm ? '1fr 440px' : '1fr', gap: 16 }}>

        {/* Role list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {loading ? (
            Array.from({length:4}).map((_,i)=><div key={i} className="skeleton" style={{ height: 88 }} />)
          ) : (
            roles.map(role => {
              const isActive = selected?.id === role.id
              return (
                <div key={role.id} onClick={() => startEdit(role)} style={{
                  background: 'var(--surface)', borderRadius: 14, padding: '14px 18px',
                  border: `2px solid ${isActive ? 'var(--brand-500)' : 'var(--border)'}`,
                  cursor: 'pointer', transition: 'all 0.15s',
                  boxShadow: isActive ? '0 0 0 3px rgba(79,70,229,0.12)' : 'var(--shadow-xs)',
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-strong)' }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 11, background: `${role.color}18`, border: `2px solid ${role.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: role.color, fontWeight: 900, fontSize: 16, flexShrink: 0 }}>
                        {role.name[0]}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{role.name}</span>
                          {role.is_system && (
                            <span className="badge badge-default" style={{ fontSize: 9, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                              <Lock size={8} strokeWidth={2.5} />SYSTEM
                            </span>
                          )}
                        </div>
                        {role.description && <p style={{ fontSize: 12, color: 'var(--text-3)' }}>{role.description}</p>}
                        <div style={{ display: 'flex', gap: 14, marginTop: 4 }}>
                          <span style={{ fontSize: 11, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4 }}><Users size={11} strokeWidth={1.8} />{role.user_count} user{role.user_count!==1?'s':''}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4 }}><ShieldCheck size={11} strokeWidth={1.8} />{(role.permissions||[]).length} permissions</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {!role.is_system && (
                        <button onClick={e => { e.stopPropagation(); deleteRole(role.id) }}
                          className="btn btn-ghost btn-icon-sm"
                          style={{ padding: 6, color: 'var(--text-3)', transition: 'all 0.15s' }}
                          onMouseEnter={e => { const el=e.currentTarget as HTMLButtonElement; el.style.background='#fee2e2'; el.style.color='#dc2626' }}
                          onMouseLeave={e => { const el=e.currentTarget as HTMLButtonElement; el.style.background='transparent'; el.style.color='var(--text-3)' }}
                        >
                          <Trash2 size={13} strokeWidth={2} />
                        </button>
                      )}
                      <ChevronRight size={16} color={isActive ? 'var(--brand-500)' : 'var(--text-3)'} />
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Permissions panel */}
        {showForm && (
          <div style={{ position: 'sticky', top: 20 }}>
            <div className="card" style={{ maxHeight: 'calc(100vh - 180px)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{creating ? 'New Role' : `Edit: ${selected?.name}`}</h2>
              </div>

              <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Role Name *</label>
                  <input className="input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Operations Lead" />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <input className="input" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="What does this role do?" />
                </div>

                <div>
                  <label className="form-label" style={{ marginBottom: 8 }}>Color</label>
                  <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                    {COLORS.map(c => (
                      <button key={c} type="button" onClick={() => setForm(f=>({...f,color:c}))} style={{
                        width: 26, height: 26, borderRadius: 7, background: c,
                        border: `2.5px solid ${form.color===c ? '#0f172a' : 'transparent'}`,
                        cursor: 'pointer', transform: form.color===c ? 'scale(1.15)' : 'scale(1)',
                        transition: 'all 0.15s',
                      }} />
                    ))}
                  </div>
                </div>

                {/* Permission matrix */}
                <div>
                  <label className="form-label" style={{ marginBottom: 10 }}>Permissions</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {Object.entries(byModule).map(([mod, mPerms]) => {
                      const onCount = mPerms.filter(p=>form.permissions.includes(p.slug)).length
                      const allOn   = onCount === mPerms.length
                      return (
                        <div key={mod} style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--surface-2)', cursor: 'pointer' }} onClick={() => toggleModule(mod)}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 7 }}>
                              <span>{MODULE_ICONS[mod] || '📦'}</span>
                              {mod.charAt(0).toUpperCase()+mod.slice(1)}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                              <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{onCount}/{mPerms.length}</span>
                              <div style={{ width: 34, height: 18, borderRadius: 99, background: allOn ? 'var(--brand-500)' : 'var(--surface-4)', position: 'relative', transition: 'background 0.2s' }}>
                                <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: allOn ? 18 : 2, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                              </div>
                            </div>
                          </div>
                          <div style={{ padding: '8px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                            {mPerms.map(p => (
                              <label key={p.slug} style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 12, color: 'var(--text-2)', padding: '3px 0' }}>
                                <input type="checkbox" checked={form.permissions.includes(p.slug)} onChange={() => togglePerm(p.slug)} style={{ accentColor: 'var(--brand-500)', width: 13, height: 13 }} />
                                {p.name}
                              </label>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, flexShrink: 0 }}>
                <button onClick={save} disabled={saving} className="btn btn-primary" style={{ flex: 1, gap: 6 }}>
                  {saving ? <><span className="spinner spinner-sm" />Saving...</> : <><Check size={14} strokeWidth={2.5} />{creating?'Create Role':'Save Changes'}</>}
                </button>
                <button onClick={() => { setSelected(null); setCreating(false) }} className="btn btn-ghost" style={{ gap: 5 }}>
                  <X size={13} strokeWidth={2} />Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
