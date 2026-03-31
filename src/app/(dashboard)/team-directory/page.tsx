'use client'
import { useState, useEffect, useCallback } from 'react'
import { Users, Search, Building2, CheckCircle2, XCircle, Mail, Phone, Hash } from 'lucide-react'

interface Employee { id:string; full_name:string; email:string; role:string; phone?:string; employee_id?:string; department?:string; position?:string; is_active:boolean; joining_date?:string }

const ROLE_META: Record<string,{color:string;bg:string}> = {
  owner:   {color:'#7C3AED',bg:'#F5F3FF'},
  admin:   {color:'#2563EB',bg:'#EFF6FF'},
  manager: {color:'#D97706',bg:'#FFFBEB'},
  worker:  {color:'#0891B2',bg:'#F0F9FF'},
}
const COLORS = ['#2563EB','#0891B2','#16A34A','#D97706','#7C3AED','#DC2626']

export default function TeamDirectoryPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    const p = new URLSearchParams()
    if (search) p.set('search', search)
    const res = await fetch('/api/users?' + p)
    const json = await res.json()
    if (json.data) setEmployees(json.data)
    setLoading(false)
  }, [search])

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t) }, [load])

  const depts = [...new Set(employees.map(e => e.department).filter(Boolean))]

  return (
    <div style={{ maxWidth: 1100, animation: 'fadeUp 0.35s ease' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700, color:'#0F172A', display:'flex', alignItems:'center', gap:8 }}>
            <Users size={20} color="#2563EB" strokeWidth={2} />
            Team Directory
          </h1>
          <p style={{ color:'#64748B', fontSize:13, marginTop:3 }}>{employees.length} team members across {depts.length} department{depts.length!==1?'s':''}</p>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
        {[
          { label:'Total Members', val:employees.length, Icon:Users, color:'#2563EB', bg:'#EFF6FF' },
          { label:'Active', val:employees.filter(e=>e.is_active).length, Icon:CheckCircle2, color:'#16A34A', bg:'#F0FDF4' },
          { label:'Departments', val:depts.length, Icon:Building2, color:'#0891B2', bg:'#F0F9FF' },
        ].map(({ label, val, Icon, color, bg }) => (
          <div key={label} style={{ background:'#fff', borderRadius:12, padding:'14px 18px', display:'flex', alignItems:'center', gap:12, border:'1px solid #E2E8F0', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ width:40, height:40, background:bg, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Icon size={19} strokeWidth={1.8} color={color} />
            </div>
            <div>
              <div style={{ fontSize:22, fontWeight:800, color:'#0F172A' }}>{val}</div>
              <div style={{ fontSize:11, color:'#94A3B8', fontWeight:500 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom:16, position:'relative', maxWidth:360 }}>
        <Search size={14} strokeWidth={2} color="#94A3B8" style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email or ID..."
        style={{ width:'100%', height:40, border:'1.5px solid #E2E8F0', borderRadius:9, paddingLeft:36, paddingRight:14, fontSize:13, color:'#0F172A', outline:'none', background:'#fff', transition:'border-color 0.15s' }}
        onFocus={e => e.target.style.borderColor='#2563EB'} onBlur={e => e.target.style.borderColor='#E2E8F0'} />
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:60, color:'#94A3B8' }}>Loading team...</div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(270px,1fr))', gap:14 }}>
          {employees.map(emp => {
            const meta = ROLE_META[emp.role] || {color:'#64748B', bg:'#F8FAFC'}
            const bgColor = COLORS[emp.full_name.charCodeAt(0) % COLORS.length]
            const initials = emp.full_name.split(' ').map((w:string)=>w[0]).slice(0,2).join('').toUpperCase()
            return (
              <div key={emp.id} style={{ background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', boxShadow:'0 1px 4px rgba(0,0,0,0.05)', overflow:'hidden', transition:'all 0.2s' }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow='0 6px 20px rgba(0,0,0,0.1)'; el.style.transform='translateY(-2px)' }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow='0 1px 4px rgba(0,0,0,0.05)'; el.style.transform='translateY(0)' }}
              >
                {/* Card header band */}
                <div style={{ height:5, background:`linear-gradient(90deg, ${bgColor}, ${bgColor}80)` }} />
                <div style={{ padding:'16px 18px' }}>
                  <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                    <div style={{ width:44, height:44, borderRadius:12, background:`${bgColor}18`, border:`2px solid ${bgColor}30`, display:'flex', alignItems:'center', justifyContent:'center', color:bgColor, fontWeight:800, fontSize:15, flexShrink:0 }}>
                      {initials}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, color:'#0F172A', fontSize:14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{emp.full_name}</div>
                      <div style={{ fontSize:12, color:'#64748B', marginTop:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:4 }}>
                        <Mail size={10} strokeWidth={2} />{emp.email}
                      </div>
                      <div style={{ display:'flex', gap:5, marginTop:7, flexWrap:'wrap' }}>
                        <span style={{ padding:'2px 8px', borderRadius:5, fontSize:11, fontWeight:700, background:meta.bg, color:meta.color, textTransform:'capitalize' }}>{emp.role}</span>
                        {emp.department && <span style={{ padding:'2px 8px', borderRadius:5, fontSize:11, background:'#F8FAFC', color:'#64748B', display:'flex', alignItems:'center', gap:3 }}><Building2 size={9} strokeWidth={2} />{emp.department}</span>}
                        {!emp.is_active && <span style={{ padding:'2px 8px', borderRadius:5, fontSize:11, background:'#FEF2F2', color:'#DC2626', display:'flex', alignItems:'center', gap:3 }}><XCircle size={9} strokeWidth={2} />Inactive</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop:12, paddingTop:12, borderTop:'1px solid #F8FAFC', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:11, color:'#94A3B8', display:'flex', alignItems:'center', gap:4 }}>
                      <Hash size={10} strokeWidth={2} />{emp.employee_id || '—'}
                    </span>
                    {emp.joining_date && (
                      <span style={{ fontSize:11, color:'#94A3B8' }}>
                        Joined {new Date(emp.joining_date).toLocaleDateString('en-US',{month:'short',year:'numeric'})}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          {employees.length === 0 && (
            <div style={{ gridColumn:'1/-1', padding:60, textAlign:'center' }}>
              <Search size={32} color="#E2E8F0" strokeWidth={1.2} style={{ display:'block', margin:'0 auto 12px' }} />
              <p style={{ fontWeight:600, color:'#374151' }}>No employees found</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
