'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Shield, Clock, Users, BarChart3, ArrowRight, AlertCircle } from 'lucide-react'

const FEATURES = [
  { Icon: Clock, title: 'Real-time Tracking', desc: 'Clock in/out with GPS validation and automatic late detection.' },
  { Icon: Users, title: 'Team Management', desc: 'Organize by departments, roles, and shifts with full visibility.' },
  { Icon: BarChart3, title: 'Advanced Analytics', desc: 'Deep insights into attendance patterns and workforce trends.' },
  { Icon: Shield, title: 'Enterprise Security', desc: 'End-to-end encryption, audit logs, and role-based access.' },
]

export default function LoginClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [emailFocused, setEmailFocused] = useState(false)
  const [pwFocused, setPwFocused] = useState(false)

  useEffect(() => {
    const token = document.cookie.includes('workforce_session_token')
    if (token) router.push(next)
  }, [router, next])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Login failed')
        setLoading(false)
        return
      }

      router.push(next)
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  const inputBase = (focused: boolean, hasValue: boolean) => ({
    width: '100%',
    height: 48,
    borderRadius: 12,
    border: `1.5px solid ${focused ? '#6366f1' : 'rgba(0,0,0,0.1)'}`,
    background: focused || hasValue ? '#fff' : 'rgba(255,255,255,0.6)',
    padding: '0 16px',
    fontSize: 14,
    color: '#0f172a',
    transition: 'all 0.2s',
    outline: 'none',
  })

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0a0f1e 0%, #1a1f3a 50%, #0f172a 100%)' }}>
        <div className="absolute inset-0 opacity-30">
          {[{ w: 400, h: 400, x: '-80px', y: '-80px', c: 'rgba(99,102,241,0.12)' },
            { w: 300, h: 300, x: '60%', y: '55%', c: 'rgba(139,92,246,0.1)' },
            { w: 250, h: 250, x: '10%', y: '65%', c: 'rgba(79,70,229,0.08)' }].map((o, i) => (
            <div key={i} style={{ position: 'absolute', width: o.w, height: o.h, left: o.x, top: o.y, background: o.c, borderRadius: '50%', filter: 'blur(60px)' }} />
          ))}
        </div>
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-[#6366f1] flex items-center justify-center">
                <Shield size={20} />
              </div>
              <div>
                <div className="text-lg font-bold">WorkForce Pro</div>
                <div className="text-[10px] text-white/50 tracking-widest uppercase">Enterprise Edition</div>
              </div>
            </div>
            <h1 className="text-4xl font-bold leading-tight mb-4">
              Workforce management<br />
              <span className="text-[#818cf8]">built for enterprises.</span>
            </h1>
            <p className="text-white/60 text-sm max-w-sm leading-relaxed mb-10">
              Real-time attendance tracking, leave management, analytics and team collaboration in one unified platform.
            </p>
            <div className="space-y-4">
              {FEATURES.map(({ Icon, title, desc }, i) => (
                <motion.div key={title} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.1 }} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon size={14} className="text-[#818cf8]" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{title}</div>
                    <div className="text-xs text-white/50 mt-0.5">{desc}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
          <div className="text-xs text-white/30">
            &copy; {new Date().getFullYear()} WorkForce Pro · Enterprise Edition
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-[var(--bg)]">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-[var(--text)]">Welcome back</h2>
            <p className="text-sm text-[var(--text-3)] mt-1">Sign in to your workspace to continue</p>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="mb-4 p-3 rounded-xl bg-[var(--danger)]/10 border border-[var(--danger)]/20 flex items-center gap-2 text-sm text-[var(--danger)]">
                <AlertCircle size={16} />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label mb-1.5 block">Email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} onFocus={() => setEmailFocused(true)} onBlur={() => setEmailFocused(false)}
                placeholder="you@company.com" autoComplete="email" required style={inputBase(emailFocused, !!email)} />
            </div>
            <div>
              <label className="form-label mb-1.5 block">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} onFocus={() => setPwFocused(true)} onBlur={() => setPwFocused(false)}
                  placeholder="Enter your password" autoComplete="current-password" required style={{ ...inputBase(pwFocused, !!password), paddingRight: 44 }} />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-3)] hover:text-[var(--text)] transition-colors">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded border-[var(--border-strong)]" />
                <span className="text-[var(--text-2)]">Remember me</span>
              </label>
              <span title="Contact your administrator to reset your password" className="text-[var(--text-3)] cursor-help text-sm">Forgot password?</span>
            </div>
            <button type="submit" disabled={loading || !email || !password} className="btn btn-primary w-full btn-lg">
              {loading ? <span className="spinner spinner-sm" /> : <>Sign In<ArrowRight size={16} /></>}
            </button>
          </form>

          <div className="mt-8 p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
            <div className="text-xs font-semibold text-[var(--text-2)] mb-2">Demo Credentials</div>
            <div className="space-y-1 text-xs text-[var(--text-3)]">
              <div className="flex justify-between"><span>Email</span><span className="font-mono text-[var(--text-2)]">admin@workforce.pro</span></div>
              <div className="flex justify-between"><span>Password</span><span className="font-mono text-[var(--text-2)]">Workforce2024!</span></div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
