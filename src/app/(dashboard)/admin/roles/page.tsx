'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'

interface Permission { id: string; name: string; slug: string; module: string }
interface Role { id: string; name: string; slug: string; description?: string; color: string; is_system: boolean; user_count: number; permissions: Permission[] }

const COLORS = ['#6366f1','#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#0891b2','#e11d48','#84cc16','#f97316']

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Role | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', color: '#6366f1', permission_ids: [] as string[] })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const [rRes, pRes] = await Promise.all([fetch('/api/roles'), fetch('/api/roles/permissions')])
    const rJson = await rRes.json()
    const pJson = await pRes.json()
    if (rJson.data) setRoles(rJson.data)
    if (pJson.data) setPermissions(pJson.data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const byModule = permissions.reduce((acc, p) => {
    if (!acc[p.module]) acc[p.module] = []
    acc[p.module].push(p)
    return acc
  }, {} as Record<string, Permission[]>)

  const togglePerm = (id: string) => {
    setForm(f => ({
      ...f,
      permission_ids: f.permission_ids.includes(id) ? f.permission_ids.filter(x => x !== id) : [...f.permission_ids, id],
    }))
  }

  const selectAll = (module: string) => {
    const ids = byModule[module].map(p => p.id)
    const allSelected = ids.every(id => form.permission_ids.includes(id))
    setForm(f => ({
      ...f,
      permission_ids: allSelected ? f.permission_ids.filter(id => !ids.includes(id)) : [...new Set([...f.permission_ids, ...ids])],
    }))
  }

  const startEdit = (role: Role) => {
    setEditing(role)
    setCreating(false)
    setForm({ name: role.name, description: role.description || '', color: role.color, permission_ids: (role.permissions || []).map(p => p.id) })
  }

  const startCreate = () => {
    setEditing(null)
    setCreating(true)
    setForm({ name: '', description: '', color: '#6366f1', permission_ids: [] })
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
    if (!confirm('Delete this role?')) return
    const res = await fetch(`/api/roles?id=${id}`, { method: 'DELETE' })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error); return }
    toast.success('Role deleted')
    await load()
  }

  const showForm = editing || creating

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Roles & Permissions</h1>
          <p className="text-sm text-gray-500 mt-1">Manage custom roles and granular permission assignments</p>
        </div>
        <button onClick={startCreate} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-all text-sm">
          + Create Role
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Roles list */}
        <div className="space-y-3">
          {loading ? <div className="text-gray-400 text-center py-8">Loading...</div> : roles.map(role => (
            <div key={role.id} className={`bg-white rounded-xl p-4 shadow-sm border-2 transition-all cursor-pointer ${editing?.id === role.id ? 'border-indigo-400' : 'border-gray-100 hover:border-gray-200'}`} onClick={() => startEdit(role)}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ backgroundColor: role.color }}>
                    {role.name[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 text-sm">{role.name}</span>
                      {role.is_system && <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">System</span>}
                    </div>
                    {role.description && <p className="text-xs text-gray-500 mt-0.5">{role.description}</p>}
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                      <span>{role.user_count} user{role.user_count !== 1 ? 's' : ''}</span>
                      <span>{(role.permissions || []).length} permissions</span>
                    </div>
                  </div>
                </div>
                {!role.is_system && (
                  <button onClick={e => { e.stopPropagation(); deleteRole(role.id) }} className="text-red-400 hover:text-red-600 text-sm transition-all">🗑</button>
                )}
              </div>
              {/* Permission pills */}
              <div className="flex flex-wrap gap-1 mt-3">
                {Object.keys(byModule).map(mod => {
                  const modPerms = (role.permissions || []).filter(p => p.module === mod)
                  if (!modPerms.length) return null
                  return <span key={mod} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs rounded-full capitalize">{mod}</span>
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Edit/Create form */}
        {showForm && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 sticky top-4 max-h-[80vh] overflow-y-auto">
            <h2 className="font-semibold text-gray-900 mb-4">{creating ? 'Create New Role' : `Edit: ${editing?.name}`}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role Name *</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Operations Lead" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                <div className="flex gap-2">
                  {COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))} className="w-7 h-7 rounded-full border-2 transition-all" style={{ backgroundColor: c, borderColor: form.color === c ? '#1f2937' : 'transparent' }} />
                  ))}
                </div>
              </div>

              {/* Permissions by module */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Permissions</label>
                <div className="space-y-3">
                  {Object.entries(byModule).map(([module, perms]) => {
                    const allSelected = perms.every(p => form.permission_ids.includes(p.id))
                    return (
                      <div key={module} className="border border-gray-100 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 capitalize">{module}</span>
                          <button type="button" onClick={() => selectAll(module)} className="text-xs text-indigo-600 hover:text-indigo-800">{allSelected ? 'Deselect all' : 'Select all'}</button>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {perms.map(p => (
                            <label key={p.id} className="flex items-center gap-2 cursor-pointer group">
                              <input type="checkbox" checked={form.permission_ids.includes(p.id)} onChange={() => togglePerm(p.id)} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                              <span className="text-xs text-gray-700 group-hover:text-gray-900">{p.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={save} disabled={saving} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 transition-all">
                  {saving ? 'Saving...' : creating ? 'Create Role' : 'Save Changes'}
                </button>
                <button onClick={() => { setEditing(null); setCreating(false) }} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-all">Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
