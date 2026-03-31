'use client'
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { UserCog, Plus, Search, UserCheck, UserX, X } from 'lucide-react'

interface Employee { id:string; full_name:string; email:string; role:string; employee_id?:string; department?:string; is_active:boolean }
const ROLE_META: Record<string,{color:string;bg:string}> = { owner:{color:'#7C3AED',bg:'#F5F3FF'}, admin:{color:'#2563EB',bg:'#EFF6FF'}, manager:{color:'#D97706',bg:'#FFFBEB'}, worker:{color:'#0891B2',bg:'#F0F9FF'} }

export default function AdminEmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ full_name:'', email:'', password:'Welcome@123', phone:'', role:'worker', department:'', position:'' })

  const load = useCallback(async () => {
    const p = new URLSearchParams()
    if (search) p.set('search', search)
    const res = await fetch('/api/users?' + p)
    const json = await res.json()
    if (json.data) setEmployees(json.data)
    setLoading(false)
  }, [search])

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t) }, [load])

  const create = async () => {
    if (!form.full_name || !form.email) { toast.error('Name and email required'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/users', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error); return }
      toast.success('Employee added!')
      setShowForm(false)
      setForm({ full_name:'', email:'', password:'Welcome@123', phone:'', role:'worker', department:'', position:'' })
      await load()
    } finally { setSubmitting(false) }
  }

  const toggleActive = async (id:string, current:boolean) => {
    const res = await fetch('/api/users', { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ id, is_active:!current }) })
    if (res.ok) { toast.success(current?'Deactivated':'Activated'); await load() }
  }

  const inputCls = { width:'100%', height:38, border:'1.5px solid #E2E8F0', borderRadius:8, padding:'0 10px', fontSize:13, color:'#0F172A', outline:'none', background:'#fff', transition:'border-color 0.15s' }

  return (
    <div style={{ maxWidth:1000, animation:'fadeUp 0.35s ease' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700, color:'#0F172A', display:'flex', alignItems:'center', gap:8 }}>
            <UserCog size={20} color="#2563EB" strokeWidth={2} />
            Employees
          </h1>
          <p style={{ color:'#64748B', fontSize:13, marginTop:3 }}>{employees.length} total employees</p>
        </div>
        <button onClick={() => setShowForm(v => !v)} style={{ display:'flex', alignItems:'center', gap:7, height:38, padding:'0 16px', background:showForm?'#F1F5F9':'#2563EB', color:showForm?'#64748B':'#fff', border:showForm?'1px solid #E2E8F0':'none', borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer' }}>
          {showForm ? <><X size={14} />Cancel</> : <><Plus size={14} />Add Employee</>}
        </button>
      </div>

      {showForm && (
        <div style={{ background:'#fff', borderRadius:14, padding:24, marginBottom:20, border:'1px solid #E2E8F0', boxShadow:'0 4px 20px rgba(0,0,0,0.07)', animation:'fadeUp 0.25s ease' }}>
          <h2 style={{ fontSize:14, fontWeight:700, color:'#0F172A', marginBottom:18 }}>New Employee</h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
            {[['Full Name *','full_name'],['Email *','email'],['Phone','phone'],['Department','department'],['Position','position']].map(([label,key]) => (
              <div key={key}>
                <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#64748B', textTransform:'uppercase', letterSpacing:0.5, marginBottom:5 }}>{label}</label>
                <input value={form[key as keyof typeof form]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                type={key==='email'?'email':'text'}
                style={inputCls}
                onFocus={e => e.target.style.borderColor='#2563EB'} onBlur={e => e.target.style.borderColor='#E2E8F0'} />
              </div>
            ))}
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#64748B', textTransform:'uppercase', letterSpacing:0.5, marginBottom:5 }}>Role</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role:e.target.value }))}
              style={{ ...inputCls, cursor:'pointer' }}>
                <option value="worker">Worker</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div style={{ gridColumn:'1/-1' }}>
              <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#64748B', textTransform:'uppercase', letterSpacing:0.5, marginBottom:5 }}>Initial Password</label>
              <input value={form.password} onChange={e => setForm(f => ({ ...f, password:e.target.value }))} style={inputCls}
              onFocus={e => e.target.style.borderColor='#2563EB'} onBlur={e => e.target.style.borderColor='#E2E8F0'} />
            </div>
          </div>
          <div style={{ display:'flex', gap:10, marginTop:16 }}>
            <button onClick={create} disabled={submitting} style={{ height:38, padding:'0 20px', background:'#2563EB', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:submitting?'not-allowed':'pointer', opacity:submitting?.7:1 }}>
              {submitting?'Adding...':'Add Employee'}
            </button>
            <button onClick={() => setShowForm(false)} style={{ height:38, padding:'0 16px', background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:8, fontSize:13, color:'#64748B', cursor:'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', boxShadow:'0 1px 4px rgba(0,0,0,0.05)', overflow:'hidden' }}>
        <div style={{ padding:'12px 20px', borderBottom:'1px solid #F1F5F9' }}>
          <div style={{ position:'relative', maxWidth:300 }}>
            <Search size={13} strokeWidth={2} color="#94A3B8" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employees..."
            style={{ width:'100%', height:36, border:'1.5px solid #E2E8F0', borderRadius:8, paddingLeft:30, fontSize:13, outline:'none', transition:'border-color 0.15s' }}
            onFocus={e => e.target.style.borderColor='#2563EB'} onBlur={e => e.target.style.borderColor='#E2E8F0'} />
          </div>
        </div>

        {loading ? <div style={{ padding:40, textAlign:'center', color:'#94A3B8' }}>Loading...</div> : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#F8FAFC' }}>
                {['Employee','ID','Role','Department','Status','Actions'].map(h => (
                  <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:11, fontWeight:700, color:'#64748B', textTransform:'uppercase', letterSpacing:0.6, borderBottom:'1px solid #E2E8F0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map((emp, i) => {
                const meta = ROLE_META[emp.role] || { color:'#64748B', bg:'#F8FAFC' }
                return (
                  <tr key={emp.id} style={{ borderBottom:'1px solid #F8FAFC', background: i%2===0?'#fff':'#FAFAFA' }}
                  onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background='#F1F5FF'}
                  onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background=i%2===0?'#fff':'#FAFAFA'}
                  >
                    <td style={{ padding:'11px 16px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:30, height:30, borderRadius:8, background:meta.bg, color:meta.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800 }}>
                          {emp.full_name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight:600, fontSize:13, color:'#0F172A' }}>{emp.full_name}</div>
                          <div style={{ fontSize:11, color:'#94A3B8' }}>{emp.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding:'11px 16px', fontSize:13, color:'#64748B', fontFamily:'monospace' }}>{emp.employee_id||'—'}</td>
                    <td style={{ padding:'11px 16px' }}>
                      <span style={{ padding:'2px 8px', borderRadius:5, fontSize:11, fontWeight:700, background:meta.bg, color:meta.color, textTransform:'capitalize' }}>{emp.role}</span>
                    </td>
                    <td style={{ padding:'11px 16px', fontSize:13, color:'#64748B' }}>{emp.department||'—'}</td>
                    <td style={{ padding:'11px 16px' }}>
                      <span style={{ display:'flex', alignItems:'center', gap:5, padding:'2px 8px', borderRadius:5, fontSize:11, fontWeight:700, background:emp.is_active?'#F0FDF4':'#F8FAFC', color:emp.is_active?'#16A34A':'#94A3B8', width:'fit-content' }}>
                        {emp.is_active ? <UserCheck size={11} strokeWidth={2} /> : <UserX size={11} strokeWidth={2} />}
                        {emp.is_active?'Active':'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding:'11px 16px' }}>
                      <button onClick={() => toggleActive(emp.id, emp.is_active)} style={{ fontSize:12, color:'#64748B', background:'none', border:'1px solid #E2E8F0', borderRadius:6, padding:'4px 10px', cursor:'pointer', transition:'all 0.15s' }}
                      onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor='#2563EB'; el.style.color='#2563EB' }}
                      onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor='#E2E8F0'; el.style.color='#64748B' }}
                      >{emp.is_active?'Deactivate':'Activate'}</button>
                    </td>
                  </tr>
                )
              })}
              {employees.length === 0 && <tr><td colSpan={6} style={{ padding:48, textAlign:'center', color:'#94A3B8' }}>No employees found</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
