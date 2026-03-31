'use client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Settings, Clock, Calendar, Building2, Save, Globe } from 'lucide-react'

export default function SettingsPage() {
  const [tenant, setTenant] = useState<{ name:string; timezone:string; work_start_time:string; work_end_time:string; late_threshold:number; work_days:string }|null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me').then(r=>r.json()).then(j => { if (j.data?.tenant) setTenant(j.data.tenant) })
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/tenants', { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify(tenant) })
      if (res.ok) toast.success('Settings saved successfully')
      else toast.error('Failed to save settings')
    } finally { setSaving(false) }
  }

  if (!tenant) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:200, color:'#94A3B8', gap:8 }}>
      <div className="spinner-blue" style={{ width:20, height:20, borderRadius:'50%' }} />
      Loading settings...
    </div>
  )

  const TIMEZONES = ['Asia/Karachi','UTC','America/New_York','America/Los_Angeles','America/Chicago','Europe/London','Europe/Paris','Asia/Dubai','Asia/Kolkata','Asia/Singapore','Australia/Sydney']

  const inp = (val:string, onChange:(v:string)=>void, type='text') => (
    <input type={type} value={val} onChange={e=>onChange(e.target.value)}
    style={{ width:'100%', height:42, border:'1.5px solid #E2E8F0', borderRadius:9, padding:'0 12px', fontSize:14, color:'#0F172A', outline:'none', background:'#fff', transition:'border-color 0.15s' }}
    onFocus={e=>e.target.style.borderColor='#2563EB'} onBlur={e=>e.target.style.borderColor='#E2E8F0'} />
  )

  const Label = ({ children, icon: Icon }: { children:React.ReactNode; icon:React.FC<{size?:number;strokeWidth?:number;color?:string}> }) => (
    <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, fontWeight:700, color:'#374151', marginBottom:7 }}>
      <Icon size={13} strokeWidth={2} color="#64748B" />{children}
    </label>
  )

  return (
    <div style={{ maxWidth:620, animation:'fadeUp 0.35s ease' }}>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:20, fontWeight:700, color:'#0F172A', display:'flex', alignItems:'center', gap:8 }}>
          <Settings size={20} color="#2563EB" strokeWidth={2} />
          Company Settings
        </h1>
        <p style={{ color:'#64748B', fontSize:13, marginTop:3 }}>Configure your workspace and working hours</p>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        {/* Company info card */}
        <div style={{ background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', boxShadow:'0 1px 4px rgba(0,0,0,0.05)', overflow:'hidden' }}>
          <div style={{ padding:'14px 20px', borderBottom:'1px solid #F1F5F9', display:'flex', alignItems:'center', gap:8 }}>
            <Building2 size={15} color="#2563EB" strokeWidth={2} />
            <span style={{ fontWeight:700, fontSize:13, color:'#0F172A' }}>Company Information</span>
          </div>
          <div style={{ padding:'18px 20px', display:'flex', flexDirection:'column', gap:14 }}>
            <div>
              <Label icon={Building2}>Company Name</Label>
              {inp(tenant.name, v=>setTenant(t=>t&&({...t,name:v})))}
            </div>
            <div>
              <Label icon={Globe}>Timezone</Label>
              <select value={tenant.timezone} onChange={e=>setTenant(t=>t&&({...t,timezone:e.target.value}))}
              style={{ width:'100%', height:42, border:'1.5px solid #E2E8F0', borderRadius:9, padding:'0 12px', fontSize:14, color:'#0F172A', outline:'none', background:'#fff', cursor:'pointer' }}>
                {TIMEZONES.map(tz=><option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Working hours card */}
        <div style={{ background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', boxShadow:'0 1px 4px rgba(0,0,0,0.05)', overflow:'hidden' }}>
          <div style={{ padding:'14px 20px', borderBottom:'1px solid #F1F5F9', display:'flex', alignItems:'center', gap:8 }}>
            <Clock size={15} color="#2563EB" strokeWidth={2} />
            <span style={{ fontWeight:700, fontSize:13, color:'#0F172A' }}>Working Hours</span>
          </div>
          <div style={{ padding:'18px 20px', display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div>
                <Label icon={Clock}>Work Starts</Label>
                {inp(tenant.work_start_time, v=>setTenant(t=>t&&({...t,work_start_time:v})), 'time')}
              </div>
              <div>
                <Label icon={Clock}>Work Ends</Label>
                {inp(tenant.work_end_time, v=>setTenant(t=>t&&({...t,work_end_time:v})), 'time')}
              </div>
            </div>
            <div>
              <Label icon={Calendar}>Late Threshold (minutes after start)</Label>
              <input type="number" min={0} max={120} value={tenant.late_threshold}
              onChange={e=>setTenant(t=>t&&({...t,late_threshold:parseInt(e.target.value)||0}))}
              style={{ width:'100%', height:42, border:'1.5px solid #E2E8F0', borderRadius:9, padding:'0 12px', fontSize:14, color:'#0F172A', outline:'none', background:'#fff', transition:'border-color 0.15s' }}
              onFocus={e=>e.target.style.borderColor='#2563EB'} onBlur={e=>e.target.style.borderColor='#E2E8F0'} />
              <p style={{ fontSize:11, color:'#94A3B8', marginTop:5 }}>Employees clocking in after this many minutes past start time will be marked as late</p>
            </div>
          </div>
        </div>

        <button onClick={save} disabled={saving} style={{
          height:44, background: saving?'#93C5FD':'#2563EB', color:'#fff', border:'none',
          borderRadius:10, fontSize:14, fontWeight:600,
          cursor:saving?'not-allowed':'pointer',
          display:'flex', alignItems:'center', justifyContent:'center', gap:7,
          boxShadow: saving?'none':'0 2px 8px rgba(37,99,235,0.3)',
          transition:'all 0.15s',
        }}>
          {saving ? 'Saving...' : <><Save size={15} strokeWidth={2.5} />Save Settings</>}
        </button>
      </div>
    </div>
  )
}
