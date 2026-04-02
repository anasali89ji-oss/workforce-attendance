'use client'
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Building2, Plus, Users, Edit2, Trash2, Check, X } from 'lucide-react'
import { Modal, ConfirmDialog, DataTable, Column, Avatar } from '@/components/ui'

interface Dept { id:string; name:string; description?:string; head_user_id?:string; employee_count:number; created_at:string; head?:{full_name:string} }

export default function DepartmentsPage() {
  const [depts, setDepts] = useState<Dept[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string|null>(null)
  const [form, setForm] = useState({ name:'', description:'' })
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string|null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/departments')
    const json = await res.json()
    if (json.data) setDepts(json.data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const openAdd = () => { setForm({ name:'', description:'' }); setEditId(null); setShowModal(true) }
  const openEdit = (d: Dept) => { setForm({ name:d.name, description:d.description||'' }); setEditId(d.id); setShowModal(true) }

  const save = async () => {
    if (!form.name.trim()) { toast.error('Name required'); return }
    setSaving(true)
    try {
      const method = editId ? 'PATCH' : 'POST'
      const body = editId ? { id:editId, ...form } : form
      const res = await fetch('/api/departments', { method, headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error); return }
      toast.success(editId ? 'Department updated' : 'Department created')
      setShowModal(false)
      await load()
    } finally { setSaving(false) }
  }

  const colors = ['#4f46e5','#0891b2','#059669','#d97706','#7c3aed','#dc2626','#be185d','#0f766e']
  const getColor = (n:string) => colors[n.charCodeAt(0) % colors.length]

  const columns: Column<Dept>[] = [
    { key:'name', header:'Department', sortable:true, render:(d) => (
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <div style={{width:34,height:34,borderRadius:9,background:`${getColor(d.name)}18`,color:getColor(d.name),display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:14,flexShrink:0}}>
          {d.name[0]}
        </div>
        <div>
          <div style={{fontWeight:600,fontSize:13,color:'var(--text)'}}>{d.name}</div>
          {d.description && <div style={{fontSize:11,color:'var(--text-3)',marginTop:1}}>{d.description}</div>}
        </div>
      </div>
    )},
    { key:'employee_count', header:'Employees', sortable:true, render:(d) => (
      <span style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:12,color:'var(--text-2)'}}>
        <Users size={13} strokeWidth={1.8}/>{d.employee_count}
      </span>
    )},
    { key:'head', header:'Department Head', render:(d) => d.head
      ? <div style={{display:'flex',alignItems:'center',gap:7}}><Avatar name={d.head.full_name} size="xs"/><span style={{fontSize:12}}>{d.head.full_name}</span></div>
      : <span style={{color:'var(--text-3)',fontSize:12}}>Not assigned</span>
    },
    { key:'actions', header:'', render:(d) => (
      <div style={{display:'flex',gap:6}}>
        <button onClick={()=>openEdit(d)} className="btn btn-ghost btn-sm" style={{padding:'4px 8px',gap:4}}><Edit2 size={12} strokeWidth={2}/>Edit</button>
        <button onClick={()=>setDeleteId(d.id)} className="btn btn-ghost btn-sm" style={{padding:'4px 8px',color:'var(--danger)'}}><Trash2 size={12} strokeWidth={2}/></button>
      </div>
    )},
  ]

  return (
    <div className="page anim-fade-up">
      <div className="section-header">
        <div>
          <h1 style={{fontSize:20,fontWeight:800,color:'var(--text)',letterSpacing:'-0.02em',display:'flex',alignItems:'center',gap:8}}>
            <Building2 size={20} color="var(--brand-500)" strokeWidth={2}/>Departments
          </h1>
          <p style={{color:'var(--text-3)',fontSize:13,marginTop:3}}>{depts.length} department{depts.length!==1?'s':''}</p>
        </div>
        <button onClick={openAdd} className="btn btn-primary" style={{gap:6}}>
          <Plus size={14} strokeWidth={2.5}/>Add Department
        </button>
      </div>

      <div className="card" style={{overflow:'hidden'}}>
        <DataTable data={depts} columns={columns} loading={loading} searchable searchPlaceholder="Search departments..." exportable exportFileName="departments"
          emptyTitle="No departments" emptyMessage="Add your first department to organize your team"
          emptyAction={<button onClick={openAdd} className="btn btn-primary btn-sm" style={{marginTop:8,gap:5}}><Plus size={13}/>Add Department</button>}/>
      </div>

      <Modal open={showModal} onClose={()=>setShowModal(false)} title={editId?'Edit Department':'New Department'} size="sm"
        footer={<div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button onClick={()=>setShowModal(false)} className="btn btn-ghost">Cancel</button>
          <button onClick={save} disabled={saving} className="btn btn-primary" style={{gap:6}}>
            {saving?<><span className="spinner spinner-sm"/>Saving...</>:<><Check size={14} strokeWidth={2.5}/>{editId?'Save':'Create'}</>}
          </button>
        </div>}>
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <div className="form-group">
            <label className="form-label">Department Name *</label>
            <input className="input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Engineering"/>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="input" rows={3} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="What does this department do?"
              style={{height:'auto',padding:'10px 12px',resize:'vertical'}}/>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={()=>setDeleteId(null)} onConfirm={async()=>{
        const res = await fetch(`/api/departments?id=${deleteId}`,{method:'DELETE'})
        if(res.ok){toast.success('Deleted');await load()}else toast.error('Failed')
        setDeleteId(null)
      }} title="Delete Department" message="Are you sure? Employees in this department will need to be reassigned." confirmLabel="Delete" variant="danger"/>
    </div>
  )
}
