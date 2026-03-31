'use client'
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Shield, Plus, Trash2, Check, X, Users, Lock, ChevronRight } from 'lucide-react'

interface Perm { module: string; slug: string; name: string }
interface Role { id: string; name: string; slug: string; description?: string; color: string; is_system: boolean; user_count: number; permissions: string[] }

const COLORS = ['#2563EB','#0891B2','#16A34A','#D97706','#7C3AED','#DC2626','#0F766E','#B45309','#9333EA','#1D4ED8']
const MODULE_ICONS: Record<string,string> = { attendance:'🕐', employees:'👤', leave:'📋', roles:'🔑', analytics:'📊', kanban:'📌', settings:'⚙️', payroll:'💰' }

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [perms, setPerms] = useState<Perm[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Role|null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name:'', description:'', color:'#2563EB', permissions:[] as string[] })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const [r,p] = await Promise.all([fetch('/api/roles'), fetch('/api/roles/permissions')])
    const rj = await r.json(); const pj = await p.json()
    if (rj.data) setRoles(rj.data)
    if (pj.data) setPerms(pj.data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const byModule = perms.reduce((a,p) => { if(!a[p.module]) a[p.module]=[]; a[p.module].push(p); return a }, {} as Record<string,Perm[]>)

  const togglePerm = (slug:string) => setForm(f => ({
    ...f, permissions: f.permissions.includes(slug) ? f.permissions.filter(x=>x!==slug) : [...f.permissions, slug]
  }))

  const toggleModule = (mod:string) => {
    const slugs = byModule[mod].map(p=>p.slug)
    const allOn = slugs.every(s=>form.permissions.includes(s))
    setForm(f => ({ ...f, permissions: allOn ? f.permissions.filter(s=>!slugs.includes(s)) : [...new Set([...f.permissions,...slugs])] }))
  }

  const startCreate = () => { setSelected(null); setCreating(true); setForm({ name:'', description:'', color:'#2563EB', permissions:[] }) }
  const startEdit = (r:Role) => {
    setCreating(false); setSelected(r)
    setForm({ name:r.name, description:r.description||'', color:r.color, permissions: r.permissions||[] })
  }

  const save = async () => {
    if (!form.name.trim()) { toast.error('Role name is required'); return }
    setSaving(true)
    try {
      const method = creating ? 'POST' : 'PATCH'
      const body = creating ? form : { id: selected!.id, ...form }
      const res = await fetch('/api/roles', { method, headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error); return }
      toast.success(creating ? 'Role created!' : 'Role updated!')
      setCreating(false); setSelected(null)
      await load()
    } finally { setSaving(false) }
  }

  const deleteRole = async (id:string) => {
    if (!confirm('Delete this role?')) return
    const res = await fetch(`/api/roles?id=${id}`, { method:'DELETE' })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error); return }
    toast.success('Role deleted')
    if (selected?.id === id) setSelected(null)
    await load()
  }

  const showForm = creating || !!selected

  return (
    <div style={{ maxWidth:1100, animation:'fadeUp 0.35s ease' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700, color:'#0F172A', display:'flex', alignItems:'center', gap:8 }}>
            <Shield size={20} color="#2563EB" strokeWidth={2} />
            Roles & Permissions
          </h1>
          <p style={{ color:'#64748B', fontSize:13, marginTop:3 }}>Manage access control with granular permission assignment</p>
        </div>
        <button onClick={startCreate} style={{ display:'flex', alignItems:'center', gap:7, height:38, padding:'0 16px', background:'#2563EB', color:'#fff', border:'none', borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', boxShadow:'0 2px 8px rgba(37,99,235,0.3)' }}>
          <Plus size={14} strokeWidth={2.5} />Create Role
        </button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns: showForm ? '1fr 420px' : '1fr', gap:16 }}>
        {/* Role list */}
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {loading ? <div style={{ padding:40, textAlign:'center', color:'#94A3B8' }}>Loading...</div>
          : roles.map(role => {
            const isActive = selected?.id === role.id || (creating && false)
            return (
              <div key={role.id} onClick={() => startEdit(role)} style={{
                background:'#fff', borderRadius:13, padding:'14px 16px',
                border:`2px solid ${isActive ? '#2563EB' : '#E2E8F0'}`,
                cursor:'pointer', transition:'all 0.15s',
                boxShadow: isActive ? '0 0 0 3px rgba(37,99,235,0.1)' : '0 1px 4px rgba(0,0,0,0.05)',
              }}
              onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.borderColor='#BFDBFE' }}
              onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.borderColor='#E2E8F0' }}
              >
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div style={{ display:'flex', gap:12 }}>
                    <div style={{
                      width:38, height:38, borderRadius:10, flexShrink:0,
                      background:`${role.color}18`, border:`2px solid ${role.color}30`,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      color:role.color, fontWeight:800, fontSize:14,
                    }}>{role.name[0]}</div>
                    <div>
                      <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:3 }}>
                        <span style={{ fontWeight:700, fontSize:14, color:'#0F172A' }}>{role.name}</span>
                        {role.is_system && (
                          <span style={{ padding:'1px 7px', background:'#F1F5F9', color:'#64748B', fontSize:10, fontWeight:700, borderRadius:4, display:'flex', alignItems:'center', gap:3 }}>
                            <Lock size={9} strokeWidth={2.5} />SYSTEM
                          </span>
                        )}
                      </div>
                      {role.description && <p style={{ fontSize:12, color:'#64748B' }}>{role.description}</p>}
                      <div style={{ display:'flex', gap:12, marginTop:5 }}>
                        <span style={{ fontSize:11, color:'#94A3B8', display:'flex', alignItems:'center', gap:4 }}>
                          <Users size={11} strokeWidth={1.8} />{role.user_count} user{role.user_count!==1?'s':''}
                        </span>
                        <span style={{ fontSize:11, color:'#94A3B8', display:'flex', alignItems:'center', gap:4 }}>
                          <Lock size={11} strokeWidth={1.8} />{(role.permissions||[]).length} permissions
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    {!role.is_system && (
                      <button onClick={e => { e.stopPropagation(); deleteRole(role.id) }}
                      style={{ background:'none', border:'1px solid #E2E8F0', cursor:'pointer', color:'#94A3B8', padding:6, borderRadius:7, display:'flex', alignItems:'center', transition:'all 0.15s' }}
                      onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.background='#FEF2F2'; el.style.borderColor='#FECACA'; el.style.color='#DC2626' }}
                      onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.background='none'; el.style.borderColor='#E2E8F0'; el.style.color='#94A3B8' }}
                      ><Trash2 size={13} strokeWidth={2} /></button>
                    )}
                    <ChevronRight size={16} color={isActive ? '#2563EB' : '#CBD5E1'} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Edit/Create Form */}
        {showForm && (
          <div style={{ background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', boxShadow:'0 4px 20px rgba(0,0,0,0.08)', position:'sticky', top:20, maxHeight:'calc(100vh - 140px)', overflowY:'auto' }}>
            <div style={{ padding:'18px 20px', borderBottom:'1px solid #F1F5F9' }}>
              <h2 style={{ fontSize:14, fontWeight:700, color:'#0F172A' }}>
                {creating ? 'Create New Role' : `Edit: ${selected?.name}`}
              </h2>
            </div>
            <div style={{ padding:'18px 20px', display:'flex', flexDirection:'column', gap:16 }}>
              {/* Name */}
              <div>
                <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#64748B', textTransform:'uppercase', letterSpacing:0.5, marginBottom:6 }}>Role Name *</label>
                <input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Operations Lead"
                style={{ width:'100%', height:40, border:'1.5px solid #E2E8F0', borderRadius:8, padding:'0 12px', fontSize:13, outline:'none', transition:'border-color 0.15s' }}
                onFocus={e => e.target.style.borderColor='#2563EB'} onBlur={e => e.target.style.borderColor='#E2E8F0'} />
              </div>
              {/* Description */}
              <div>
                <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#64748B', textTransform:'uppercase', letterSpacing:0.5, marginBottom:6 }}>Description</label>
                <input value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))} placeholder="Role description..."
                style={{ width:'100%', height:40, border:'1.5px solid #E2E8F0', borderRadius:8, padding:'0 12px', fontSize:13, outline:'none', transition:'border-color 0.15s' }}
                onFocus={e => e.target.style.borderColor='#2563EB'} onBlur={e => e.target.style.borderColor='#E2E8F0'} />
              </div>
              {/* Color */}
              <div>
                <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#64748B', textTransform:'uppercase', letterSpacing:0.5, marginBottom:8 }}>Color</label>
                <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
                  {COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setForm(f=>({...f,color:c}))} style={{
                      width:28, height:28, borderRadius:7, background:c, border:`2.5px solid ${form.color===c?'#0F172A':'transparent'}`,
                      cursor:'pointer', transition:'all 0.15s', transform:form.color===c?'scale(1.15)':'scale(1)',
                    }} />
                  ))}
                </div>
              </div>

              {/* Permissions */}
              <div>
                <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#64748B', textTransform:'uppercase', letterSpacing:0.5, marginBottom:10 }}>Permissions</label>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {Object.entries(byModule).map(([mod, modPerms]) => {
                    const allOn = modPerms.every(p => form.permissions.includes(p.slug))
                    const someOn = modPerms.some(p => form.permissions.includes(p.slug))
                    return (
                      <div key={mod} style={{ border:'1px solid #F1F5F9', borderRadius:9, overflow:'hidden' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 12px', background:'#F8FAFC', cursor:'pointer' }}
                        onClick={() => toggleModule(mod)}>
                          <span style={{ fontSize:12, fontWeight:700, color:'#374151', display:'flex', alignItems:'center', gap:6, textTransform:'capitalize' }}>
                            <span style={{ fontSize:14 }}>{MODULE_ICONS[mod] || '📦'}</span>{mod}
                          </span>
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <span style={{ fontSize:10, color:'#94A3B8' }}>{modPerms.filter(p=>form.permissions.includes(p.slug)).length}/{modPerms.length}</span>
                            <div style={{ width:32, height:17, borderRadius:99, background:allOn?'#2563EB':someOn?'#BFDBFE':'#E2E8F0', position:'relative', transition:'background 0.2s' }}>
                              <div style={{ width:13, height:13, borderRadius:'50%', background:'#fff', position:'absolute', top:2, left:allOn?17:2, transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }} />
                            </div>
                          </div>
                        </div>
                        <div style={{ padding:'8px 12px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:5 }}>
                          {modPerms.map(p => (
                            <label key={p.slug} style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:12, color:'#374151', padding:'2px 0' }}>
                              <input type="checkbox" checked={form.permissions.includes(p.slug)} onChange={() => togglePerm(p.slug)}
                              style={{ accentColor:'#2563EB', width:13, height:13 }} />
                              {p.name}
                            </label>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display:'flex', gap:8, paddingTop:4 }}>
                <button onClick={save} disabled={saving} style={{ flex:1, height:40, background:saving?'#93C5FD':'#2563EB', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:saving?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6, transition:'background 0.15s' }}>
                  {saving ? 'Saving...' : <><Check size={14} strokeWidth={2.5} />{creating?'Create Role':'Save Changes'}</>}
                </button>
                <button onClick={() => { setSelected(null); setCreating(false) }} style={{ height:40, padding:'0 14px', background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:8, fontSize:13, color:'#64748B', cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
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
