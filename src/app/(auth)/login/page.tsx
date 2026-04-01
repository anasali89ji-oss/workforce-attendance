'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Mail, Lock, Eye, EyeOff, ArrowRight, Zap, CheckCircle, BarChart2, Shield } from 'lucide-react'

const FEATURES = [
  { Icon: CheckCircle, title: 'Real-time Attendance', desc: 'Track clock-ins with GPS and automatic late detection' },
  { Icon: BarChart2, title: 'Analytics & Reports', desc: 'Executive dashboards with attendance trends and insights' },
  { Icon: Shield, title: 'Enterprise Security', desc: 'Role-based access control with full audit logging' },
]

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)
  const [emailFocused, setEmailFocused] = useState(false)
  const [pwFocused, setPwFocused] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)

  useEffect(() => { emailRef.current?.focus() }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) { toast.error('Enter your email and password'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const json = await res.json()
      if (!res.ok) {
        setShake(true)
        toast.error(json.error || 'Invalid credentials')
        setTimeout(() => setShake(false), 600)
        return
      }
      toast.success('Welcome back!')
      router.push('/dashboard')
      router.refresh()
    } catch { toast.error('Network error. Please try again.') }
    finally { setLoading(false) }
  }

  const inputBase = (focused: boolean, hasVal: boolean) => ({
    width: '100%', height: 52, borderRadius: 12,
    background: focused ? '#fff' : '#f8fafc',
    border: `1.5px solid ${focused ? '#4f46e5' : '#e2e8f0'}`,
    padding: hasVal || focused ? '18px 44px 6px 44px' : '0 44px',
    fontSize: 14, color: '#0f172a', outline: 'none',
    boxShadow: focused ? '0 0 0 3px rgba(79,70,229,0.12)' : 'none',
    transition: 'all 0.2s', caretColor: '#4f46e5',
  })

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: 'Inter, sans-serif' }}>

      {/* ── Left panel (dark gradient) ── */}
      <div style={{
        width: '55%', minHeight: '100vh', position: 'relative',
        background: 'linear-gradient(145deg, #0a0f1e 0%, #1e1b4b 45%, #312e81 100%)',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '60px 70px', overflow: 'hidden',
      }}>
        {/* Animated orbs */}
        {[
          { w: 400, h: 400, x: '-80px', y: '-80px', c: 'rgba(99,102,241,0.12)' },
          { w: 300, h: 300, x: '60%', y: '55%', c: 'rgba(139,92,246,0.1)' },
          { w: 250, h: 250, x: '10%', y: '65%', c: 'rgba(79,70,229,0.08)' },
        ].map((o, i) => (
          <div key={i} style={{
            position: 'absolute', width: o.w, height: o.h,
            left: o.x, top: o.y,
            background: `radial-gradient(circle, ${o.c}, transparent)`,
            borderRadius: '50%', filter: 'blur(40px)', pointerEvents: 'none',
          }} />
        ))}

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 52 }}>
            <div style={{
              width: 48, height: 48, background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
              borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(79,70,229,0.5)',
            }}>
              <Zap size={22} color="#fff" strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ color: '#f1f5f9', fontWeight: 800, fontSize: 20, letterSpacing: '-0.02em' }}>WorkForce Pro</div>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>Enterprise Attendance Management</div>
            </div>
          </div>

          <h2 style={{ color: '#f1f5f9', fontSize: 34, fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.03em', marginBottom: 14 }}>
            Workforce management<br />
            <span style={{ background: 'linear-gradient(135deg,#818cf8,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              built for enterprises.
            </span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, lineHeight: 1.7, marginBottom: 44, maxWidth: 380 }}>
            Real-time attendance tracking, leave management, analytics and team collaboration in one unified platform.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {FEATURES.map(({ Icon, title, desc }) => (
              <div key={title} style={{ display: 'flex', gap: 14 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={17} color="#818cf8" strokeWidth={1.8} />
                </div>
                <div>
                  <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{title}</div>
                  <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, lineHeight: 1.5 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel (login form) ── */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 60px', background: '#fff',
      }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ marginBottom: 36 }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', marginBottom: 6 }}>
              Welcome back
            </h1>
            <p style={{ color: '#64748b', fontSize: 14 }}>Sign in to your workspace to continue</p>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }} className={shake ? 'anim-shake' : ''}>

            {/* Email */}
            <div style={{ position: 'relative' }}>
              <Mail size={16} color={emailFocused ? '#4f46e5' : '#94a3b8'} strokeWidth={1.8} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', transition: 'color 0.2s' }} />
              <input
                ref={emailRef}
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                placeholder=" "
                autoComplete="email"
                style={inputBase(emailFocused, !!email)}
              />
              <label style={{
                position: 'absolute', left: 44, pointerEvents: 'none', transition: 'all 0.2s', transformOrigin: 'left top',
                top: (emailFocused || email) ? 8 : '50%',
                transform: (emailFocused || email) ? 'translateY(0) scale(0.78)' : 'translateY(-50%) scale(1)',
                color: emailFocused ? '#4f46e5' : '#94a3b8', fontSize: 14,
                fontWeight: (emailFocused || email) ? 600 : 400,
              }}>Email address</label>
            </div>

            {/* Password */}
            <div style={{ position: 'relative' }}>
              <Lock size={16} color={pwFocused ? '#4f46e5' : '#94a3b8'} strokeWidth={1.8} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', transition: 'color 0.2s' }} />
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={() => setPwFocused(true)}
                onBlur={() => setPwFocused(false)}
                placeholder=" "
                autoComplete="current-password"
                style={{ ...inputBase(pwFocused, !!password), paddingRight: 44 }}
              />
              <label style={{
                position: 'absolute', left: 44, pointerEvents: 'none', transition: 'all 0.2s', transformOrigin: 'left top',
                top: (pwFocused || password) ? 8 : '50%',
                transform: (pwFocused || password) ? 'translateY(0) scale(0.78)' : 'translateY(-50%) scale(1)',
                color: pwFocused ? '#4f46e5' : '#94a3b8', fontSize: 14,
                fontWeight: (pwFocused || password) ? 600 : 400,
              }}>Password</label>
              <button
                type="button" onClick={() => setShowPw(v => !v)}
                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', padding: 2, transition: 'color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#4f46e5')}
                onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}
              >
                {showPw ? <EyeOff size={16} strokeWidth={1.8} /> : <Eye size={16} strokeWidth={1.8} />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                height: 52, borderRadius: 12, border: 'none',
                background: loading ? '#a5b4fc' : 'linear-gradient(135deg, #4f46e5, #6d28d9)',
                color: '#fff', fontSize: 14, fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: loading ? 'none' : '0 4px 20px rgba(79,70,229,0.4)',
                transition: 'all 0.2s', marginTop: 6,
              }}
              onMouseEnter={e => { if (!loading) { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 28px rgba(79,70,229,0.5)' }}}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'none'; (e.currentTarget as HTMLButtonElement).style.boxShadow = loading ? 'none' : '0 4px 20px rgba(79,70,229,0.4)' }}
            >
              {loading
                ? <><span className="spinner spinner-sm" style={{ borderTopColor: '#fff' }} />Signing in...</>
                : <>Sign In <ArrowRight size={16} strokeWidth={2.5} /></>
              }
            </button>
          </form>

          {/* Demo credentials */}
          <div style={{
            marginTop: 28, padding: '14px 16px',
            background: 'linear-gradient(135deg, #eef2ff, #e0e7ff)',
            borderRadius: 12, border: '1px solid #c7d2fe',
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#4338ca', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Zap size={13} strokeWidth={2.5} />Demo Credentials
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {[['Email', 'anasali89ji@gmail.com'], ['Password', '(your setup password)']].map(([label, val]) => (
                <div key={label}>
                  <div style={{ fontSize: 10, color: '#818cf8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
                  <div style={{ fontSize: 12, color: '#4338ca', fontWeight: 600, marginTop: 1, wordBreak: 'break-all' }}>{val}</div>
                </div>
              ))}
            </div>
          </div>

          <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12, marginTop: 28 }}>
            © {new Date().getFullYear()} WorkForce Pro · Enterprise Edition
          </p>
        </div>
      </div>
    </div>
  )
}
