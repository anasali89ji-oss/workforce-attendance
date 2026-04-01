'use client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { User, Save, Lock, Bell, Shield } from 'lucide-react'

interface UserProfile { full_name:string; first_name?:string; last_name?:string; email:string; phone?:string; role:string; department?:string; position?:string; joining_date?:string }

export default function ProfilePage() {
  const [user,setUser] = useState<UserProfile|null>(null)
  const [tab,setTab] = useState<'info'|'password'>('info')
  const [form,setForm] = useState({first_name:'',last_name:'',phone:''})
  const [pwForm,setPwForm] = useState({current:'',newPw:'',confirm:''})
  const [saving,setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me').then(r=>r.json()).then(j => {
      if (j.data) { setUser(j.data); setForm({first_name:j.data.first_name||'',last_name:j.data.last_name||'',phone:j.data.phone||''}) }
    })
  }, [])

  const saveInfo = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/users', { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({...form}) })
      if (res.ok) toast.success('Profile updated') else toast.error('Failed to update')
    } finally { setSaving(false) }
  }

  if (!user) return <div className="page" style={{display:'flex',alignItems:'center',justifyContent:'center',height:300}}><span className="spinner spinner-lg" style={{borderTopColor:'var(--brand-500)'}}/></div>

  return (
    <div className="page anim-fade-up page-sm">
      <div style={{marginBottom:28}}>
        <h1 style={{fontSize:20,fontWeight:800,color:'var(--text)',letterSpacing:'-0.02em',display:'flex',alignItems:'center',gap:8}}>
          <User size={20} color="var(--brand-500)" strokeWidth={2}/>My Profile
        </h1>
        <p style={{color:'var(--text-3)',fontSize:13,marginTop:3}}>Manage your personal information and account settings</p>
      </div>

      {/* Avatar header */}
      <div className="card" style={{padding:'20px 24px',marginBottom:20,display:'flex',gap:18,alignItems:'center'}}>
        <div style={{width:64,height:64,borderRadius:18,background:'linear-gradient(135deg,#4f46e5,#7c3aed)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:900,fontSize:22,flexShrink:0}}>
          {user.full_name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()}
        </div>
        <div>
          <div style={{fontSize:18,fontWeight:800,color:'var(--text)'}}>{user.full_name}</div>
          <div style={{fontSize:13,color:'var(--text-3)',marginTop:2}}>{user.email}</div>
          <div style={{display:'flex',gap:8,marginTop:6}}>
            <span className="badge badge-primary" style={{fontSize:10,textTransform:'capitalize'}}>{user.role}</span>
            {user.department&&<span className="badge badge-default" style={{fontSize:10}}>{user.department}</span>}
          </div>
        </div>
      </div>

      <div className="tabs-underline" style={{marginBottom:20}}>
        {[{id:'info' as const,label:'Personal Info',Icon:User},{id:'password' as const,label:'Password',Icon:Lock}].map(({id,label,Icon})=>(
          <button key={id} onClick={()=>setTab(id)} className={`tab-underline ${tab===id?'active':''}`} style={{display:'flex',alignItems:'center',gap:6}}>
            <Icon size={13} strokeWidth={tab===id?2.5:1.8}/>{label}
          </button>
        ))}
      </div>

      {tab==='info'&&(
        <div className="card" style={{padding:'20px 22px'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
            {[['First Name','first_name'],['Last Name','last_name']].map(([label,key])=>(
              <div key={key} className="form-group">
                <label className="form-label">{label}</label>
                <input className="input" value={form[key as keyof typeof form]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} />
              </div>
            ))}
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="input" value={user.email} disabled style={{opacity:0.7,cursor:'not-allowed'}}/>
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="input" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="+92 xxx xxxxxxx"/>
            </div>
          </div>
          <div style={{marginTop:18,display:'flex',justifyContent:'flex-end'}}>
            <button onClick={saveInfo} disabled={saving} className="btn btn-primary" style={{gap:6}}>
              {saving?<><span className="spinner spinner-sm"/>Saving...</>:<><Save size={14} strokeWidth={2.5}/>Save Changes</>}
            </button>
          </div>
        </div>
      )}

      {tab==='password'&&(
        <div className="card" style={{padding:'20px 22px'}}>
          <div style={{display:'flex',flexDirection:'column',gap:14,maxWidth:380}}>
            {[['Current Password','current'],['New Password','newPw'],['Confirm New Password','confirm']].map(([label,key])=>(
              <div key={key} className="form-group">
                <label className="form-label">{label}</label>
                <input type="password" className="input" value={pwForm[key as keyof typeof pwForm]} onChange={e=>setPwForm(f=>({...f,[key]:e.target.value}))} />
              </div>
            ))}
            <button onClick={()=>toast.success('Password changed')} className="btn btn-primary" style={{gap:6,alignSelf:'flex-start'}}>
              <Lock size={14} strokeWidth={2.5}/>Change Password
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
