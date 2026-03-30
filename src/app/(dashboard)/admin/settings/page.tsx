'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'

export default function SettingsPage() {
  const [tenant, setTenant] = useState<{ name: string; timezone: string; working_hours_start: string; working_hours_end: string; late_threshold: number; working_days: string[] } | null>(null)
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

  if (!tenant) return <div className="text-center py-12 text-gray-400">Loading...</div>

  const DAYS = ['MON','TUE','WED','THU','FRI','SAT','SUN']

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">Company Settings</h1>
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
          <input className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" value={tenant.name} onChange={e => setTenant(t => t && ({ ...t, name: e.target.value }))} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
          <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" value={tenant.timezone} onChange={e => setTenant(t => t && ({ ...t, timezone: e.target.value }))}>
            <option value="Asia/Karachi">Asia/Karachi (PKT)</option>
            <option value="UTC">UTC</option>
            <option value="America/New_York">America/New_York (EST)</option>
            <option value="Europe/London">Europe/London (GMT)</option>
            <option value="Asia/Dubai">Asia/Dubai (GST)</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Work Start</label>
            <input type="time" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" value={tenant.working_hours_start} onChange={e => setTenant(t => t && ({ ...t, working_hours_start: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Work End</label>
            <input type="time" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" value={tenant.working_hours_end} onChange={e => setTenant(t => t && ({ ...t, working_hours_end: e.target.value }))} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Working Days</label>
          <div className="flex gap-2">
            {DAYS.map(d => (
              <button key={d} type="button" onClick={() => setTenant(t => t && ({ ...t, working_days: t.working_days.includes(d) ? t.working_days.filter(x => x !== d) : [...t.working_days, d] }))} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${tenant.working_days.includes(d) ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{d.slice(0,2)}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Late Threshold (minutes)</label>
          <input type="number" min={0} max={120} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" value={tenant.late_threshold} onChange={e => setTenant(t => t && ({ ...t, late_threshold: parseInt(e.target.value) || 0 }))} />
        </div>
        <button onClick={save} disabled={saving} className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-all">{saving ? 'Saving...' : 'Save Settings'}</button>
      </div>
    </div>
  )
}
