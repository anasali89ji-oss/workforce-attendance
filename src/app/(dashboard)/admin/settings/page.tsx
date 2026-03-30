'use client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

export default function SettingsPage() {
  const [tenant, setTenant] = useState<{ name: string; timezone: string; work_start_time: string; work_end_time: string; late_threshold: number; work_days: string } | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(j => {
      if (j.data?.tenant) setTenant(j.data.tenant)
    })
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/tenants', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tenant) })
      if (res.ok) toast.success('Settings saved!')
      else toast.error('Failed to save')
    } finally { setSaving(false) }
  }

  if (!tenant) return <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>Loading...</div>

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  )

  const inputStyle = { width: '100%', height: 42, border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '0 12px', fontSize: 14, color: '#0f172a', outline: 'none', transition: 'border-color 0.15s', background: '#fff' }

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a' }}>Company Settings</h1>
        <p style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>Manage your workspace configuration</p>
      </div>

      <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Field label="Company Name">
            <input value={tenant.name} onChange={e => setTenant(t => t && ({ ...t, name: e.target.value }))} style={inputStyle} onFocus={e => e.target.style.borderColor = '#4f46e5'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
          </Field>

          <Field label="Timezone">
            <select value={tenant.timezone} onChange={e => setTenant(t => t && ({ ...t, timezone: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
              {['Asia/Karachi','UTC','America/New_York','America/Los_Angeles','America/Chicago','Europe/London','Europe/Paris','Asia/Dubai','Asia/Kolkata','Asia/Singapore','Australia/Sydney'].map(tz => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Work Start Time">
              <input type="time" value={tenant.work_start_time} onChange={e => setTenant(t => t && ({ ...t, work_start_time: e.target.value }))} style={inputStyle} onFocus={e => e.target.style.borderColor = '#4f46e5'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
            </Field>
            <Field label="Work End Time">
              <input type="time" value={tenant.work_end_time} onChange={e => setTenant(t => t && ({ ...t, work_end_time: e.target.value }))} style={inputStyle} onFocus={e => e.target.style.borderColor = '#4f46e5'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
            </Field>
          </div>

          <Field label="Late Threshold (minutes after start time)">
            <input type="number" min={0} max={120} value={tenant.late_threshold} onChange={e => setTenant(t => t && ({ ...t, late_threshold: parseInt(e.target.value) || 0 }))} style={inputStyle} onFocus={e => e.target.style.borderColor = '#4f46e5'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
          </Field>

          <button onClick={save} disabled={saving} style={{ height: 44, background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, boxShadow: '0 2px 8px rgba(79,70,229,0.3)', transition: 'all 0.2s' }}
          onMouseEnter={e => { if (!saving) (e.currentTarget as HTMLButtonElement).style.background = '#4338ca' }}
          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = '#4f46e5'}
          >{saving ? 'Saving...' : 'Save Settings'}</button>
        </div>
      </div>
    </div>
  )
}
