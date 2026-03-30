'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

const STEPS = [
  { num: 1, title: 'Company Details', sub: 'Name your workspace', icon: '🏢' },
  { num: 2, title: 'Owner Account', sub: 'Create admin credentials', icon: '👤' },
  { num: 3, title: 'Working Hours', sub: 'Set your schedule', icon: '🕐' },
  { num: 4, title: 'Work Shifts', sub: 'Configure shifts', icon: '🔄' },
  { num: 5, title: 'All Done!', sub: 'Ready to launch', icon: '🚀' },
]

const DAYS = [
  { key: 'MON', label: 'Mon' },
  { key: 'TUE', label: 'Tue' },
  { key: 'WED', label: 'Wed' },
  { key: 'THU', label: 'Thu' },
  { key: 'FRI', label: 'Fri' },
  { key: 'SAT', label: 'Sat' },
  { key: 'SUN', label: 'Sun' },
]

const SHIFT_COLORS = ['#4f46e5', '#0891b2', '#059669', '#d97706', '#dc2626', '#7c3aed']

const TZ_OPTIONS = [
  'Asia/Karachi', 'UTC', 'America/New_York', 'America/Los_Angeles',
  'America/Chicago', 'Europe/London', 'Europe/Paris', 'Asia/Dubai',
  'Asia/Kolkata', 'Asia/Singapore', 'Australia/Sydney',
]

function FloatInput({ label, type = 'text', value, onChange, autoFocus = false, minLength }: {
  label: string; type?: string; value: string; onChange: (v: string) => void
  autoFocus?: boolean; minLength?: number
}) {
  const [focused, setFocused] = useState(false)
  const active = focused || !!value
  return (
    <div style={{ position: 'relative' }}>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoFocus={autoFocus}
        placeholder=" "
        minLength={minLength}
        style={{
          width: '100%', height: 52,
          background: focused ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.03)',
          border: `1.5px solid ${focused ? '#818cf8' : 'rgba(255,255,255,0.1)'}`,
          borderRadius: 10, padding: active ? '18px 14px 6px' : '0 14px',
          fontSize: 14, color: '#f1f5f9', outline: 'none', transition: 'all 0.2s',
          boxShadow: focused ? '0 0 0 3px rgba(79,70,229,0.15)' : 'none',
        }}
      />
      <label style={{
        position: 'absolute', left: 14, pointerEvents: 'none', transition: 'all 0.2s', transformOrigin: 'left top',
        top: active ? 8 : '50%', transform: active ? 'translateY(0) scale(0.78)' : 'translateY(-50%) scale(1)',
        color: focused ? '#818cf8' : '#475569', fontSize: 14, fontWeight: active ? 500 : 400,
      }}>{label}</label>
    </div>
  )
}

export default function SetupPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [tenantId, setTenantId] = useState('')
  const [animating, setAnimating] = useState(false)

  const [company, setCompany] = useState({ name: '', timezone: 'Asia/Karachi' })
  const [owner, setOwner] = useState({ first_name: '', last_name: '', email: '', password: '' })
  const [hours, setHours] = useState({ start: '09:00', end: '18:00', days: ['MON','TUE','WED','THU','FRI'], late_threshold: 15 })
  const [shifts, setShifts] = useState([{ name: 'General Shift', start_time: '09:00', end_time: '18:00', color: '#4f46e5' }])

  const toggleDay = (d: string) => setHours(h => ({
    ...h, days: h.days.includes(d) ? h.days.filter(x => x !== d) : [...h.days, d],
  }))

  const advanceStep = () => {
    setAnimating(true)
    setTimeout(() => { setStep(s => s + 1); setAnimating(false) }, 300)
  }

  const submit = async () => {
    setLoading(true)
    try {
      let body: Record<string, unknown> = { step }
      if (step === 1) {
        if (!company.name.trim()) { toast.error('Company name is required'); return }
        body = { step: 1, data: company }
      } else if (step === 2) {
        if (!owner.first_name || !owner.email || !owner.password) { toast.error('Fill all required fields'); return }
        if (owner.password.length < 6) { toast.error('Password must be at least 6 characters'); return }
        body = { step: 2, data: { ...owner, tenant_id: tenantId } }
      } else if (step === 3) {
        if (hours.days.length === 0) { toast.error('Select at least one working day'); return }
        body = { step: 3, data: { tenant_id: tenantId, working_hours_start: hours.start, working_hours_end: hours.end, working_days: hours.days, late_threshold: hours.late_threshold } }
      } else if (step === 4) {
        body = { step: 4, data: { tenant_id: tenantId, shifts } }
      } else if (step === 5) {
        body = { step: 5, data: { tenant_id: tenantId } }
      }

      const res = await fetch('/api/setup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error || 'Something went wrong'); return }

      if (step === 1 && json.tenant_id) setTenantId(json.tenant_id)
      if (step === 5) {
        toast.success('Setup complete! Redirecting to login...')
        setTimeout(() => router.push('/login'), 1500)
        return
      }
      advanceStep()
    } catch { toast.error('Network error') }
    finally { setLoading(false) }
  }

  const progress = ((step - 1) / 4) * 100

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #0f172a 100%)',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Background orbs */}
      <div style={{ position: 'absolute', width: 600, height: 600, left: '-150px', top: '-150px', background: 'radial-gradient(circle, rgba(79,70,229,0.12), transparent)', borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', width: 400, height: 400, right: 0, bottom: 0, background: 'radial-gradient(circle, rgba(124,58,237,0.1), transparent)', borderRadius: '50%', filter: 'blur(60px)', pointerEvents: 'none' }} />

      {/* Left sidebar */}
      <div style={{
        width: 280, flexShrink: 0, padding: '48px 24px',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column',
        position: 'relative', zIndex: 1,
      }}>
        <div style={{ marginBottom: 48 }}>
          <div style={{
            width: 44, height: 44, background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, marginBottom: 12, boxShadow: '0 4px 20px rgba(79,70,229,0.4)',
          }}>⚡</div>
          <h1 style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 700 }}>WorkForce Setup</h1>
          <p style={{ color: '#475569', fontSize: 12, marginTop: 4 }}>Configure your workspace</p>
        </div>

        <div style={{ flex: 1 }}>
          {STEPS.map(s => {
            const done = step > s.num
            const current = step === s.num
            return (
              <div key={s.num} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', borderRadius: 10, marginBottom: 4,
                background: current ? 'rgba(79,70,229,0.15)' : 'transparent',
                border: current ? '1px solid rgba(79,70,229,0.3)' : '1px solid transparent',
                transition: 'all 0.3s',
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: done ? 14 : 13,
                  background: done ? 'rgba(16,185,129,0.2)' : current ? 'rgba(79,70,229,0.3)' : 'rgba(255,255,255,0.05)',
                  border: `1.5px solid ${done ? '#10b981' : current ? '#818cf8' : 'rgba(255,255,255,0.08)'}`,
                  color: done ? '#10b981' : current ? '#c4b5fd' : '#475569',
                  fontWeight: 700, transition: 'all 0.3s',
                }}>
                  {done ? '✓' : s.num}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: current ? 600 : 400, color: done ? '#6ee7b7' : current ? '#e2e8f0' : '#475569', transition: 'all 0.3s' }}>{s.title}</div>
                  <div style={{ fontSize: 11, color: '#334155', marginTop: 1 }}>{s.sub}</div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Progress bar */}
        <div style={{ marginTop: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: '#475569' }}>Progress</span>
            <span style={{ fontSize: 11, color: '#818cf8', fontWeight: 600 }}>{Math.round(progress)}%</span>
          </div>
          <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 99 }}>
            <div style={{ height: 4, width: `${progress}%`, background: 'linear-gradient(90deg, #4f46e5, #7c3aed)', borderRadius: 99, transition: 'width 0.5s ease' }} />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 40, position: 'relative', zIndex: 1,
      }}>
        <div style={{
          width: '100%', maxWidth: 520,
          background: 'rgba(255,255,255,0.04)',
          backdropFilter: 'blur(40px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 20,
          padding: '40px 40px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
          opacity: animating ? 0 : 1,
          transform: animating ? 'translateY(10px)' : 'translateY(0)',
          transition: 'all 0.3s ease',
        }}>
          {/* Step header */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{STEPS[step-1].icon}</div>
            <h2 style={{ color: '#f1f5f9', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>{STEPS[step-1].title}</h2>
            <p style={{ color: '#475569', fontSize: 13, marginTop: 4 }}>{STEPS[step-1].sub}</p>
          </div>

          {/* Step 1: Company */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <FloatInput label="Company Name *" value={company.name} onChange={v => setCompany(c => ({ ...c, name: v }))} autoFocus />
              <div style={{ position: 'relative' }}>
                <label style={{ position: 'absolute', left: 14, top: 8, fontSize: 10, color: '#4f46e5', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Timezone</label>
                <select
                  value={company.timezone}
                  onChange={e => setCompany(c => ({ ...c, timezone: e.target.value }))}
                  style={{
                    width: '100%', height: 52, paddingTop: 18, paddingLeft: 14, paddingRight: 14, paddingBottom: 6,
                    background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.1)',
                    borderRadius: 10, fontSize: 14, color: '#f1f5f9', outline: 'none', cursor: 'pointer',
                    appearance: 'none',
                  }}
                >
                  {TZ_OPTIONS.map(tz => <option key={tz} value={tz} style={{ background: '#1e1b4b' }}>{tz}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Step 2: Owner */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <FloatInput label="First Name *" value={owner.first_name} onChange={v => setOwner(o => ({ ...o, first_name: v }))} autoFocus />
                <FloatInput label="Last Name" value={owner.last_name} onChange={v => setOwner(o => ({ ...o, last_name: v }))} />
              </div>
              <FloatInput label="Email Address *" type="email" value={owner.email} onChange={v => setOwner(o => ({ ...o, email: v }))} />
              <FloatInput label="Password (min 6 chars) *" type="password" value={owner.password} onChange={v => setOwner(o => ({ ...o, password: v }))} />
              <div style={{ padding: '10px 12px', background: 'rgba(79,70,229,0.1)', borderRadius: 8, border: '1px solid rgba(79,70,229,0.2)' }}>
                <p style={{ fontSize: 12, color: '#a5b4fc' }}>💡 This creates the Owner account with full system access. Store these credentials safely.</p>
              </div>
            </div>
          )}

          {/* Step 3: Working hours */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[['Work Starts', 'start'], ['Work Ends', 'end']].map(([label, key]) => (
                  <div key={key} style={{ position: 'relative' }}>
                    <label style={{ position: 'absolute', left: 14, top: 8, fontSize: 10, color: '#4f46e5', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</label>
                    <input
                      type="time"
                      value={key === 'start' ? hours.start : hours.end}
                      onChange={e => setHours(h => ({ ...h, [key]: e.target.value }))}
                      style={{
                        width: '100%', height: 52, paddingTop: 18, paddingLeft: 14, paddingBottom: 6,
                        background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.1)',
                        borderRadius: 10, fontSize: 14, color: '#f1f5f9', outline: 'none',
                        colorScheme: 'dark',
                      }}
                    />
                  </div>
                ))}
              </div>

              <div>
                <div style={{ fontSize: 12, color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Working Days</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {DAYS.map(d => (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => toggleDay(d.key)}
                      style={{
                        flex: 1, height: 40, borderRadius: 8, border: 'none', cursor: 'pointer',
                        fontSize: 12, fontWeight: 600, transition: 'all 0.2s',
                        background: hours.days.includes(d.key) ? 'linear-gradient(135deg, #4f46e5, #6d28d9)' : 'rgba(255,255,255,0.05)',
                        color: hours.days.includes(d.key) ? '#fff' : '#475569',
                        boxShadow: hours.days.includes(d.key) ? '0 2px 8px rgba(79,70,229,0.4)' : 'none',
                        transform: hours.days.includes(d.key) ? 'scale(1.05)' : 'scale(1)',
                      }}
                    >{d.label}</button>
                  ))}
                </div>
              </div>

              <div style={{ position: 'relative' }}>
                <label style={{ position: 'absolute', left: 14, top: 8, fontSize: 10, color: '#4f46e5', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Late Threshold (minutes)</label>
                <input
                  type="number" min={0} max={120}
                  value={hours.late_threshold}
                  onChange={e => setHours(h => ({ ...h, late_threshold: parseInt(e.target.value) || 0 }))}
                  style={{
                    width: '100%', height: 52, paddingTop: 18, paddingLeft: 14, paddingBottom: 6,
                    background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.1)',
                    borderRadius: 10, fontSize: 14, color: '#f1f5f9', outline: 'none',
                  }}
                />
              </div>
            </div>
          )}

          {/* Step 4: Shifts */}
          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {shifts.map((shift, i) => (
                <div key={i} style={{ padding: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 12, color: '#818cf8', fontWeight: 600 }}>Shift {i + 1}</span>
                    {shifts.length > 1 && (
                      <button type="button" onClick={() => setShifts(s => s.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 13 }}>Remove</button>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <input
                      value={shift.name}
                      onChange={e => setShifts(s => s.map((sh, idx) => idx === i ? { ...sh, name: e.target.value } : sh))}
                      placeholder="Shift name"
                      style={{ width: '100%', height: 40, padding: '0 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 13, color: '#f1f5f9', outline: 'none' }}
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {[['Start', 'start_time'], ['End', 'end_time']].map(([label, field]) => (
                        <div key={field}>
                          <div style={{ fontSize: 10, color: '#475569', marginBottom: 4 }}>{label}</div>
                          <input type="time" value={(shift as Record<string,string>)[field]} onChange={e => setShifts(s => s.map((sh, idx) => idx === i ? { ...sh, [field]: e.target.value } : sh))} style={{ width: '100%', height: 36, padding: '0 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12, color: '#f1f5f9', outline: 'none', colorScheme: 'dark' }} />
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: '#475569' }}>Color:</span>
                      {SHIFT_COLORS.map(c => (
                        <button key={c} type="button" onClick={() => setShifts(s => s.map((sh, idx) => idx === i ? { ...sh, color: c } : sh))} style={{ width: 22, height: 22, borderRadius: '50%', background: c, border: `2px solid ${shift.color === c ? '#fff' : 'transparent'}`, cursor: 'pointer', transition: 'transform 0.1s', transform: shift.color === c ? 'scale(1.2)' : 'scale(1)' }} />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => setShifts(s => [...s, { name: '', start_time: '09:00', end_time: '18:00', color: SHIFT_COLORS[s.length % SHIFT_COLORS.length] }])} style={{ height: 44, borderRadius: 10, border: '1.5px dashed rgba(79,70,229,0.4)', background: 'transparent', color: '#818cf8', fontSize: 13, cursor: 'pointer', transition: 'all 0.2s', fontWeight: 500 }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(79,70,229,0.08)'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#818cf8' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(79,70,229,0.4)' }}
              >+ Add Another Shift</button>
            </div>
          )}

          {/* Step 5: Done */}
          {step === 5 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 64, marginBottom: 16, animation: 'bounce 1s ease infinite' }}>🎉</div>
              <p style={{ color: '#94a3b8', marginBottom: 24, lineHeight: 1.6 }}>Your workspace is fully configured and ready to go. Click <strong style={{ color: '#e2e8f0' }}>Launch</strong> to complete setup.</p>
              <div style={{ padding: '16px 20px', background: 'rgba(16,185,129,0.08)', borderRadius: 12, border: '1px solid rgba(16,185,129,0.2)', textAlign: 'left' }}>
                <p style={{ color: '#6ee7b7', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>✅ What was created:</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                  {['Company workspace', 'Owner account', '4 system roles', 'Permission matrix', 'Leave types', 'Work shifts', 'Kanban board', 'Default schedule'].map(item => (
                    <div key={item} style={{ fontSize: 11, color: '#4ade80', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span>›</span> {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 32 }}>
            {step > 1 && step < 5
              ? <button type="button" onClick={() => setStep(s => s - 1)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', padding: '10px 20px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 500, transition: 'all 0.2s' }}>← Back</button>
              : <div />
            }
            <button
              type="button"
              onClick={submit}
              disabled={loading}
              style={{
                height: 44, padding: '0 28px', border: 'none', borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer',
                background: loading ? '#3730a3' : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                color: '#fff', fontSize: 14, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 8,
                boxShadow: loading ? 'none' : '0 4px 16px rgba(79,70,229,0.4)',
                transition: 'all 0.2s',
              }}
            >
              {loading
                ? <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} /> Working...</>
                : step === 5 ? '🚀 Launch Workspace' : 'Continue →'
              }
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bounce { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-10px); } }
      `}</style>
    </div>
  )
}
