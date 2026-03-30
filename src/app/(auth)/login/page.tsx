'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)

  useEffect(() => { emailRef.current?.focus() }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) { toast.error('Please enter your email and password'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error || 'Invalid credentials'); return }
      toast.success('Welcome back!')
      router.push('/dashboard')
      router.refresh()
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = (focused: boolean, hasValue: boolean) => ({
    width: '100%' as const,
    height: 52,
    background: focused ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
    border: `1.5px solid ${focused ? '#818cf8' : 'rgba(255,255,255,0.1)'}`,
    borderRadius: 10,
    padding: hasValue || focused ? '18px 14px 6px' : '0 14px',
    paddingRight: 44,
    fontSize: 14,
    color: '#f1f5f9',
    outline: 'none' as const,
    transition: 'all 0.2s',
    caretColor: '#818cf8',
    boxShadow: focused ? '0 0 0 3px rgba(79,70,229,0.2)' : 'none',
  })

  const [emailFocused, setEmailFocused] = useState(false)
  const [pwFocused, setPwFocused] = useState(false)

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, position: 'relative', overflow: 'hidden',
    }}>
      {/* Glow orbs */}
      <div style={{ position: 'absolute', width: 500, height: 500, left: '-100px', top: '-100px', background: 'radial-gradient(circle, rgba(99,102,241,0.15), transparent)', borderRadius: '50%', filter: 'blur(60px)' }} />
      <div style={{ position: 'absolute', width: 400, height: 400, right: '-50px', bottom: '10%', background: 'radial-gradient(circle, rgba(139,92,246,0.12), transparent)', borderRadius: '50%', filter: 'blur(60px)' }} />

      <div style={{
        width: '100%', maxWidth: 420, position: 'relative', zIndex: 1,
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(40px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 24,
        padding: '48px 40px',
        boxShadow: '0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
        animation: 'fadeUp 0.5s ease both',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 60, height: 60,
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, margin: '0 auto 16px',
            boxShadow: '0 8px 32px rgba(79,70,229,0.5)',
          }}>⚡</div>
          <h1 style={{ color: '#f1f5f9', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>WorkForce</h1>
          <p style={{ color: '#475569', fontSize: 13, marginTop: 4 }}>Attendance Management System</p>
        </div>

        <div style={{ marginBottom: 28 }}>
          <h2 style={{ color: '#e2e8f0', fontSize: 17, fontWeight: 600 }}>Sign in to your account</h2>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Email */}
          <div style={{ position: 'relative' }}>
            <input
              ref={emailRef}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              autoComplete="email"
              placeholder=" "
              style={inputStyle(emailFocused, !!email)}
            />
            <label style={{
              position: 'absolute', left: 14, pointerEvents: 'none', transition: 'all 0.2s', transformOrigin: 'left top',
              top: (emailFocused || email) ? 9 : '50%',
              transform: (emailFocused || email) ? 'translateY(0) scale(0.78)' : 'translateY(-50%) scale(1)',
              color: emailFocused ? '#818cf8' : '#475569', fontSize: 14,
              fontWeight: (emailFocused || email) ? 500 : 400,
            }}>Email address</label>
          </div>

          {/* Password */}
          <div style={{ position: 'relative' }}>
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onFocus={() => setPwFocused(true)}
              onBlur={() => setPwFocused(false)}
              autoComplete="current-password"
              placeholder=" "
              style={{ ...inputStyle(pwFocused, !!password), paddingRight: 44 }}
            />
            <label style={{
              position: 'absolute', left: 14, pointerEvents: 'none', transition: 'all 0.2s', transformOrigin: 'left top',
              top: (pwFocused || password) ? 9 : '50%',
              transform: (pwFocused || password) ? 'translateY(0) scale(0.78)' : 'translateY(-50%) scale(1)',
              color: pwFocused ? '#818cf8' : '#475569', fontSize: 14,
              fontWeight: (pwFocused || password) ? 500 : 400,
            }}>Password</label>
            <button type="button" onClick={() => setShowPw(v => !v)} style={{
              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: '#475569', fontSize: 15, padding: 4,
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#818cf8')}
            onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
            >{showPw ? '🙈' : '👁️'}</button>
          </div>

          <button type="submit" disabled={loading} style={{
            marginTop: 4, height: 48, border: 'none', borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer',
            background: loading ? '#3730a3' : 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            color: '#fff', fontSize: 14, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.2s',
            boxShadow: loading ? 'none' : '0 4px 20px rgba(79,70,229,0.5)',
            letterSpacing: '0.01em',
          }}>
            {loading
              ? <><span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} /> Signing in...</>
              : 'Sign In →'
            }
          </button>
        </form>

        <div style={{
          marginTop: 24, padding: '12px 14px', borderRadius: 8,
          background: 'rgba(79,70,229,0.12)', border: '1px solid rgba(79,70,229,0.2)',
        }}>
          <p style={{ color: '#a5b4fc', fontSize: 12, textAlign: 'center' }}>
            First time? Visit <span style={{ color: '#818cf8', fontWeight: 600 }}>/setup</span> to create your workspace
          </p>
        </div>

        <p style={{ textAlign: 'center', color: '#1e293b', fontSize: 11, marginTop: 20 }}>
          © {new Date().getFullYear()} WorkForce · Enterprise Attendance Management
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  )
}
