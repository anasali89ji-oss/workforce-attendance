'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Settings, Building2, Clock, Bell, Shield, Save, Globe, Calendar } from 'lucide-react'

interface Tenant { name:string; timezone:string; work_start_time:string; work_end_time:string; late_threshold:number; work_days:string; subdomain:string }

const TIMEZONES = ['Asia/Karachi','UTC','America/New_York','America/Los_Angeles','America/Chicago','Europe/London','Europe/Paris','Europe/Berlin','Asia/Dubai','Asia/Kolkata','Asia/Singapore','Asia/Tokyo','Australia/Sydney']
const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
const DAY_NUMS = [1,2,3,4,5,6,0]

type Tab = 'general' | 'hours' | 'notifications' | 'security'

export default function SettingsPage() {
  const [tenant, setTenant]   = useState<Tenant|null>(null)
  const [tab, setTab]         = useState<Tab>('general')
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    fetch('/api/auth/me').then(r=>r.json()).then(j => { if (j.data?.tenant) setTenant(j.data.tenant) })
  }, [])

  const save = async () => {
    if (!tenant) return
    setSaving(true)
    try {
      const res = await fetch('/api/tenants', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(tenant) })
      if (res.ok) toast.success('Settings saved')
      else toast.error('Failed to save')
    } finally { setSaving(false) }
  }

  const toggleDay = (dayNum: number) => {
    if (!tenant) return
    const days = (tenant.work_days || '').split(',').filter(Boolean).map(Number)
    const updated = days.includes(dayNum) ? days.filter(d=>d!==dayNum) : [...days, dayNum]
    setTenant(t => t ? { ...t, work_days: updated.sort().join(',') } : t)
  }

  const isDayActive = (dayNum: number) => (tenant?.work_days||'').split(',').map(Number).includes(dayNum)

  if (!tenant) return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <div style={{ textAlign: 'center' }}>
        <span className="spinner spinner-lg" style={{ borderTopColor: 'var(--brand-500)' }} />
        <p style={{ color: 'var(--text-3)', marginTop: 12, fontSize: 13 }}>Loading settings...</p>
      </div>
    </div>
  )

  const TABS: { id: Tab; label: string; Icon: React.FC<{size?:number;strokeWidth?:number;color?:string}> }[] = [
    { id:'general',       label:'General',       Icon:Building2 },
    { id:'hours',         label:'Working Hours', Icon:Clock },
    { id:'notifications', label:'Notifications', Icon:Bell },
    { id:'security',      label:'Security',      Icon:Shield },
  ]

  return (
    <div className="page anim-fade-up page-sm">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Settings size={20} color="var(--brand-500)" strokeWidth={2} />
          Settings
        </h1>
        <p style={{ color: 'var(--text-3)', fontSize: 13, marginTop: 3 }}>Configure your workspace and preferences</p>
      </div>

      {/* Tab nav */}
      <div className="tabs-underline" style={{ marginBottom: 24 }}>
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setTab(id)} className={`tab-underline ${tab===id?'active':''}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon size={14} strokeWidth={tab===id?2.5:1.8} />
            {label}
          </button>
        ))}
      </div>

      {/* General */}
      {tab === 'general' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: '20px 22px' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 7 }}>
              <Building2 size={15} color="var(--brand-500)" strokeWidth={2} />
              Company Information
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Company Name</label>
                <input className="input" value={tenant.name} onChange={e => setTenant(t=>t?{...t,name:e.target.value}:t)} />
              </div>
              <div className="form-group">
                <label className="form-label">Subdomain</label>
                <input className="input" value={tenant.subdomain} disabled style={{ opacity: 0.7, cursor: 'not-allowed' }} />
                <span className="form-hint">Contact support to change subdomain</span>
              </div>
              <div className="form-group">
                <label className="form-label">Timezone</label>
                <select className="input" value={tenant.timezone} onChange={e=>setTenant(t=>t?{...t,timezone:e.target.value}:t)}>
                  {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Working Hours */}
      {tab === 'hours' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: '20px 22px' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 7 }}>
              <Clock size={15} color="var(--brand-500)" strokeWidth={2} />
              Shift Times
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Work Starts At</label>
                <input type="time" className="input" value={tenant.work_start_time} onChange={e=>setTenant(t=>t?{...t,work_start_time:e.target.value}:t)} />
              </div>
              <div className="form-group">
                <label className="form-label">Work Ends At</label>
                <input type="time" className="input" value={tenant.work_end_time} onChange={e=>setTenant(t=>t?{...t,work_end_time:e.target.value}:t)} />
              </div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Late Threshold (minutes after start time)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <input type="range" min={0} max={120} step={5} value={tenant.late_threshold}
                    onChange={e=>setTenant(t=>t?{...t,late_threshold:parseInt(e.target.value)}:t)}
                    style={{ flex: 1, accentColor: 'var(--brand-500)' }} />
                  <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', minWidth: 48, textAlign: 'right' }}>
                    {tenant.late_threshold}m
                  </span>
                </div>
                <span className="form-hint">Employees clocking in after {tenant.work_start_time} + {tenant.late_threshold} min will be marked late</span>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '20px 22px' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
              <Calendar size={15} color="var(--brand-500)" strokeWidth={2} />
              Working Days
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {DAYS.map((day, idx) => {
                const num = DAY_NUMS[idx]
                const active = isDayActive(num)
                return (
                  <button key={day} type="button" onClick={() => toggleDay(num)} style={{
                    padding: '8px 16px', borderRadius: 10, border: `2px solid ${active ? 'var(--brand-500)' : 'var(--border)'}`,
                    background: active ? 'var(--brand-50)' : 'var(--surface-2)',
                    color: active ? 'var(--brand-700)' : 'var(--text-2)',
                    fontWeight: active ? 700 : 500, fontSize: 13, cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}>
                    {day.slice(0,3)}
                  </button>
                )
              })}
            </div>
            <p className="form-hint" style={{ marginTop: 10 }}>
              {(tenant.work_days||'').split(',').filter(Boolean).length} days selected
            </p>
          </div>
        </div>
      )}

      {/* Notifications */}
      {tab === 'notifications' && (
        <div className="card" style={{ padding: '20px 22px' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 7 }}>
            <Bell size={15} color="var(--brand-500)" strokeWidth={2} />
            Notification Preferences
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[
              { label: 'Late clock-in alert', desc: 'Get notified when employees clock in late' },
              { label: 'Leave request submitted', desc: 'When a new leave request is created' },
              { label: 'Leave approved/rejected', desc: 'Status changes on leave requests' },
              { label: 'Daily attendance summary', desc: 'End-of-day summary report' },
              { label: 'New employee added', desc: 'When a new team member joins' },
            ].map((item, i) => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: i < 4 ? '1px solid var(--border)' : 'none' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{item.desc}</div>
                </div>
                <label style={{ position: 'relative', width: 40, height: 22, cursor: 'pointer', flexShrink: 0 }}>
                  <input type="checkbox" defaultChecked={i < 3} style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }} />
                  <span style={{
                    position: 'absolute', inset: 0, background: 'var(--brand-500)', borderRadius: 99,
                    transition: 'background 0.2s',
                  }}><span style={{ position: 'absolute', width: 16, height: 16, background: '#fff', borderRadius: '50%', top: 3, left: 21, boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} /></span>
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Security */}
      {tab === 'security' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: '20px 22px' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 7 }}>
              <Shield size={15} color="var(--brand-500)" strokeWidth={2} />
              Security Settings
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                { label: 'Two-Factor Authentication', desc: 'Require 2FA for all admin accounts' },
                { label: 'Session Timeout', desc: 'Auto logout after 8 hours of inactivity' },
                { label: 'Audit Logging', desc: 'Record all user actions for compliance' },
              ].map((item, i) => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{item.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{item.desc}</div>
                  </div>
                  <span className="badge badge-success" style={{ fontSize: 10 }}>Enabled</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ padding: '12px 16px', borderRadius: 10, background: '#eff6ff', border: '1px solid #bfdbfe' }}>
            <p style={{ fontSize: 12, color: '#1e40af' }}>
              <strong>Enterprise security:</strong> All data is encrypted at rest and in transit. Supabase RLS policies protect tenant data isolation.
            </p>
          </div>
        </div>
      )}

      {/* Save button */}
      {(tab === 'general' || tab === 'hours') && (
        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={save} disabled={saving} className="btn btn-primary btn-lg" style={{ gap: 7 }}>
            {saving ? <><span className="spinner spinner-sm" />Saving...</> : <><Save size={15} strokeWidth={2.5} />Save Settings</>}
          </button>
        </div>
      )}
    </div>
  )
}
