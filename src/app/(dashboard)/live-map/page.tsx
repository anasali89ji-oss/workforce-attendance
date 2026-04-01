'use client'
import { useState, useEffect, useCallback } from 'react'
import { Map, Users, RefreshCw, Clock, CheckCircle2, Coffee, UserX } from 'lucide-react'

interface LiveUser { id:string; full_name:string; role:string; department?:string; punch_in_at?:string; status:string; is_late:boolean }
const COLORS = ['#4f46e5','#0891b2','#059669','#d97706','#7c3aed','#dc2626']
const getColor = (n:string) => COLORS[n.charCodeAt(0)%COLORS.length]
const getInit = (n:string) => n.split(' ').map((w:string)=>w[0]).slice(0,2).join('').toUpperCase()
const fmtTime = (iso?:string|null) => iso ? new Date(iso).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}) : '--:--'
const elapsed = (iso?:string|null) => {
  if (!iso) return '—'
  const m = Math.floor((Date.now()-new Date(iso).getTime())/60000)
  return m < 60 ? `${m}m` : `${Math.floor(m/60)}h ${m%60}m`
}

export default function LiveMapPage() {
  const [users,setUsers] = useState<LiveUser[]>([])
  const [loading,setLoading] = useState(true)
  const [lastUpdate,setLastUpdate] = useState<Date>(new Date())
  const [deptFilter,setDeptFilter] = useState('all')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/attendance?limit=100&date=today')
      const json = await res.json()
      if (json.data) setUsers(json.data)
    } catch {} finally { setLoading(false); setLastUpdate(new Date()) }
  }, [])

  useEffect(() => { load(); const t = setInterval(load,30000); return () => clearInterval(t) }, [load])

  const depts = ['all',...new Set(users.map(u=>u.department).filter(Boolean))]
  const filtered = deptFilter==='all' ? users : users.filter(u=>u.department===deptFilter)
  const present = users.filter(u=>['punched_in','on_break'].includes(u.status)).length

  return (
    <div className="page anim-fade-up">
      <div className="section-header">
        <div>
          <h1 style={{fontSize:20,fontWeight:800,color:'var(--text)',letterSpacing:'-0.02em',display:'flex',alignItems:'center',gap:8}}>
            <Map size={20} color="var(--brand-500)" strokeWidth={2}/> Live Map
          </h1>
          <p style={{color:'var(--text-3)',fontSize:13,marginTop:3}}>
            {present} currently clocked in · Updates every 30s · Last: {lastUpdate.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}
          </p>
        </div>
        <button onClick={load} className="btn btn-ghost btn-sm" style={{gap:5}}>
          <RefreshCw size={13} strokeWidth={2}/>Refresh
        </button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:12,marginBottom:20}}>
        {[{label:'Present',val:users.filter(u=>u.status==='punched_in').length,color:'#10b981',bg:'#d1fae5',Icon:CheckCircle2},
          {label:'On Break',val:users.filter(u=>u.status==='on_break').length,color:'#f59e0b',bg:'#fef3c7',Icon:Coffee},
          {label:'Absent',val:users.filter(u=>u.status==='missed'||!u.status).length,color:'#ef4444',bg:'#fee2e2',Icon:UserX},
          {label:'Total',val:users.length,color:'#4f46e5',bg:'#eef2ff',Icon:Users},
        ].map(({label,val,color,bg,Icon})=>(
          <div key={label} className="kpi-card" style={{padding:'14px 16px',display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:36,height:36,borderRadius:9,background:bg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <Icon size={17} color={color} strokeWidth={1.8}/>
            </div>
            <div>
              <div style={{fontSize:22,fontWeight:900,color:'var(--text)',letterSpacing:'-0.04em'}}>{val}</div>
              <div style={{fontSize:11,color:'var(--text-3)',fontWeight:500}}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{display:'flex',gap:6,marginBottom:16,flexWrap:'wrap'}}>
        {depts.map(d=>(
          <button key={d} onClick={()=>setDeptFilter(d)} style={{padding:'5px 12px',borderRadius:7,border:'1px solid',cursor:'pointer',fontSize:12,fontWeight:600,transition:'all 0.15s',
            background:deptFilter===d?'var(--brand-600)':'var(--surface-2)',color:deptFilter===d?'#fff':'var(--text-2)',borderColor:deptFilter===d?'var(--brand-600)':'var(--border-strong)'}}>
            {d==='all'?'All Departments':d}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{textAlign:'center',padding:60}}><span className="spinner spinner-lg" style={{borderTopColor:'var(--brand-500)'}}/></div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:12}}>
          {filtered.map(u=>{
            const color = getColor(u.full_name)
            const active = ['punched_in','on_break'].includes(u.status)
            return (
              <div key={u.id} className="card" style={{padding:'14px 16px',display:'flex',gap:12,alignItems:'center',opacity:active?1:0.55,transition:'opacity 0.2s'}}>
                <div style={{position:'relative',flexShrink:0}}>
                  <div style={{width:40,height:40,borderRadius:11,background:`${color}18`,color,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:14}}>
                    {getInit(u.full_name)}
                  </div>
                  <span style={{position:'absolute',bottom:-1,right:-1,width:10,height:10,borderRadius:'50%',border:'2px solid var(--surface)',background:active?'#10b981':'#94a3b8'}}/>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:13,color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{u.full_name}</div>
                  <div style={{fontSize:11,color:'var(--text-3)',marginTop:1}}>{u.department||u.role}</div>
                  {active && (
                    <div style={{fontSize:11,color:'#10b981',marginTop:3,fontWeight:600,display:'flex',alignItems:'center',gap:4}}>
                      <Clock size={9} strokeWidth={2}/> {fmtTime(u.punch_in_at)} · {elapsed(u.punch_in_at)}
                    </div>
                  )}
                </div>
                <span className={`badge ${active?'badge-success':'badge-default'}`} style={{fontSize:10,flexShrink:0}}>
                  {active ? (u.status==='on_break'?'Break':'Active') : 'Out'}
                </span>
              </div>
            )
          })}
          {filtered.length===0&&<div className="empty-state" style={{gridColumn:'1/-1'}}><Map size={40} strokeWidth={1.2}/><h3>No employees found</h3><p>Try a different filter</p></div>}
        </div>
      )}
    </div>
  )
}
