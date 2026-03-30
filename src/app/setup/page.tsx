'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

const DAYS = ['MON','TUE','WED','THU','FRI','SAT','SUN']
const DAY_LABELS: Record<string,string> = {MON:'Mon',TUE:'Tue',WED:'Wed',THU:'Thu',FRI:'Fri',SAT:'Sat',SUN:'Sun'}

const STEP_TITLES = [
  'Welcome! Set up your Company',
  'Create Owner Account',
  'Configure Working Hours',
  'Add Work Shifts',
  'All Done!',
]

const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#0891b2']

export default function SetupPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [tenantId, setTenantId] = useState('')

  // Step 1
  const [company, setCompany] = useState({ name: '', timezone: 'Asia/Karachi' })
  // Step 2
  const [owner, setOwner] = useState({ first_name: '', last_name: '', email: '', password: '' })
  // Step 3
  const [hours, setHours] = useState({ start: '09:00', end: '18:00', days: ['MON','TUE','WED','THU','FRI'], late_threshold: 15 })
  // Step 4
  const [shifts, setShifts] = useState([{ name: 'General Shift', start_time: '09:00', end_time: '18:00', color: '#3b82f6' }])

  const toggleDay = (d: string) => setHours(h => ({
    ...h, days: h.days.includes(d) ? h.days.filter(x => x !== d) : [...h.days, d]
  }))

  const addShift = () => setShifts(s => [...s, { name: '', start_time: '09:00', end_time: '18:00', color: COLORS[s.length % COLORS.length] }])
  const updateShift = (i: number, field: string, val: string) => setShifts(s => s.map((sh, idx) => idx === i ? { ...sh, [field]: val } : sh))
  const removeShift = (i: number) => setShifts(s => s.filter((_, idx) => idx !== i))

  const submit = async () => {
    setLoading(true)
    try {
      let body: Record<string, unknown> = { step }

      if (step === 1) body = { step: 1, data: company }
      else if (step === 2) body = { step: 2, data: { ...owner, tenant_id: tenantId } }
      else if (step === 3) body = { step: 3, data: { tenant_id: tenantId, working_hours_start: hours.start, working_hours_end: hours.end, working_days: hours.days, late_threshold: hours.late_threshold } }
      else if (step === 4) body = { step: 4, data: { tenant_id: tenantId, shifts } }
      else if (step === 5) body = { step: 5, data: { tenant_id: tenantId } }

      const res = await fetch('/api/setup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const json = await res.json()

      if (!res.ok) { toast.error(json.error || 'Something went wrong'); return }

      if (step === 1 && json.tenant_id) setTenantId(json.tenant_id)
      if (step === 5) { toast.success('Setup complete! Redirecting to login...'); setTimeout(() => router.push('/login'), 1500); return }

      setStep(s => s + 1)
    } catch {
      toast.error('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {[1,2,3,4,5].map(n => (
              <div key={n} className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${n <= step ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {n < step ? '✓' : n}
              </div>
            ))}
          </div>
          <div className="h-2 bg-gray-200 rounded-full mt-2">
            <div className="h-2 bg-indigo-600 rounded-full transition-all" style={{ width: `${((step-1)/4)*100}%` }} />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="mb-6">
            <div className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">Step {step} of 5</div>
            <h1 className="text-2xl font-bold text-gray-900">{STEP_TITLES[step-1]}</h1>
          </div>

          {/* Step 1: Company */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Acme Corp" value={company.name} onChange={e => setCompany(c => ({ ...c, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" value={company.timezone} onChange={e => setCompany(c => ({ ...c, timezone: e.target.value }))}>
                  <option value="Asia/Karachi">Asia/Karachi (PKT)</option>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                  <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                  <option value="Europe/London">Europe/London (GMT)</option>
                  <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 2: Owner */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" value={owner.first_name} onChange={e => setOwner(o => ({ ...o, first_name: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" value={owner.last_name} onChange={e => setOwner(o => ({ ...o, last_name: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input type="email" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" value={owner.email} onChange={e => setOwner(o => ({ ...o, email: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                <input type="password" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" value={owner.password} onChange={e => setOwner(o => ({ ...o, password: e.target.value }))} />
              </div>
            </div>
          )}

          {/* Step 3: Working hours */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input type="time" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" value={hours.start} onChange={e => setHours(h => ({ ...h, start: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input type="time" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" value={hours.end} onChange={e => setHours(h => ({ ...h, end: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Working Days</label>
                <div className="flex gap-2 flex-wrap">
                  {DAYS.map(d => (
                    <button key={d} type="button" onClick={() => toggleDay(d)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${hours.days.includes(d) ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {DAY_LABELS[d]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Late Threshold (minutes)</label>
                <input type="number" min={0} max={60} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" value={hours.late_threshold} onChange={e => setHours(h => ({ ...h, late_threshold: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
          )}

          {/* Step 4: Shifts */}
          {step === 4 && (
            <div className="space-y-4">
              {shifts.map((shift, i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Shift {i+1}</span>
                    {shifts.length > 1 && <button type="button" onClick={() => removeShift(i)} className="text-red-500 text-xs hover:text-red-700">Remove</button>}
                  </div>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Shift name" value={shift.name} onChange={e => updateShift(i, 'name', e.target.value)} />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-500">Start</label>
                      <input type="time" className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={shift.start_time} onChange={e => updateShift(i, 'start_time', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">End</label>
                      <input type="time" className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={shift.end_time} onChange={e => updateShift(i, 'end_time', e.target.value)} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Color:</span>
                    {COLORS.map(c => (
                      <button key={c} type="button" onClick={() => updateShift(i, 'color', c)} className="w-6 h-6 rounded-full border-2 transition-all" style={{ backgroundColor: c, borderColor: shift.color === c ? '#1f2937' : 'transparent' }} />
                    ))}
                  </div>
                </div>
              ))}
              <button type="button" onClick={addShift} className="w-full border-2 border-dashed border-gray-300 rounded-lg py-2 text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-all">
                + Add Another Shift
              </button>
            </div>
          )}

          {/* Step 5: Done */}
          {step === 5 && (
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <span className="text-4xl">🎉</span>
              </div>
              <p className="text-gray-600">Your workspace is fully configured. Click below to complete setup and create your admin account.</p>
              <div className="bg-indigo-50 rounded-lg p-4 text-left text-sm text-indigo-800">
                <p className="font-semibold mb-1">What was set up:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Company tenant &amp; branding</li>
                  <li>Owner account &amp; permissions</li>
                  <li>5 system roles with granular permissions</li>
                  <li>Working hours &amp; shifts</li>
                  <li>Default leave types</li>
                  <li>Kanban board</li>
                </ul>
              </div>
            </div>
          )}

          <div className="flex justify-between mt-8">
            {step > 1 && step < 5 ? (
              <button type="button" onClick={() => setStep(s => s-1)} className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium">← Back</button>
            ) : <div />}
            <button
              type="button"
              onClick={submit}
              disabled={loading}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-all"
            >
              {loading ? 'Please wait...' : step === 5 ? 'Complete Setup 🚀' : 'Continue →'}
            </button>
          </div>
        </div>

        <p className="text-center text-sm text-gray-400 mt-4">WorkForce Attendance Management System</p>
      </div>
    </div>
  )
}
