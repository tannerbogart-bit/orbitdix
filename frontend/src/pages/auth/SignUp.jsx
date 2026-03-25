// Email signup form — creates account via POST /api/auth/signup
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import AuthShell from './AuthShell'

export default function SignUp() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: '' })
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [showPw, setShowPw]   = useState(false)

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  function passwordStrength(pw) {
    if (!pw) return null
    const hasLength  = pw.length >= 8
    const hasComplex = /[\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw)
    if (!hasLength)  return { label: 'Too short',  color: 'var(--danger)',  pct: 20 }
    if (!hasComplex) return { label: 'Add a number or symbol', color: 'var(--warning)', pct: 55 }
    if (pw.length < 12) return { label: 'Good',   color: 'var(--success)', pct: 80 }
    return { label: 'Strong', color: 'var(--success)', pct: 100 }
  }

  const strength = passwordStrength(form.password)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (!agreedToTerms) {
      setError('Please agree to the Terms of Service and Privacy Policy to continue.')
      return
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (!/[\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(form.password)) {
      setError('Password must contain at least one number or special character.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/signup', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_name: `${form.first_name} ${form.last_name}`.trim() + "'s Workspace",
          email:      form.email,
          password:   form.password,
          first_name: form.first_name,
          last_name:  form.last_name,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Signup failed')
        return
      }
      localStorage.setItem('access_token', data.access_token)
      if (data.refresh_token) localStorage.setItem('refresh_token', data.refresh_token)
      navigate('/onboarding', { replace: true })
    } catch {
      setError('Could not reach server. Is Flask running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell step={1} totalSteps={5}>
      <h1
        style={{
          fontFamily: 'Syne, sans-serif',
          fontSize: '26px',
          fontWeight: 700,
          margin: '0 0 6px',
          color: 'var(--text-primary)',
        }}
      >
        Create your account
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 24px' }}>
        Map your network. Reach anyone in 6 degrees.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {error && (
          <div
            style={{
              padding:      '10px 14px',
              background:   'rgba(248,113,113,0.08)',
              border:       '1px solid var(--danger)',
              borderRadius: '8px',
              color:        'var(--danger)',
              fontSize:     '13px',
            }}
          >
            {error}
          </div>
        )}
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            className="input"
            type="text"
            placeholder="First name"
            value={form.first_name}
            onChange={set('first_name')}
            required
            autoComplete="given-name"
            style={{ flex: 1 }}
          />
          <input
            className="input"
            type="text"
            placeholder="Last name"
            value={form.last_name}
            onChange={set('last_name')}
            required
            autoComplete="family-name"
            style={{ flex: 1 }}
          />
        </div>
        <input
          className="input"
          type="email"
          placeholder="Work email"
          value={form.email}
          onChange={set('email')}
          required
          autoComplete="email"
        />
        <div>
          <div style={{ position: 'relative' }}>
            <input
              className="input"
              type={showPw ? 'text' : 'password'}
              placeholder="Password (8+ characters, include a number)"
              value={form.password}
              onChange={set('password')}
              required
              autoComplete="new-password"
              style={{ paddingRight: '42px' }}
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px', lineHeight: 1 }}
            >
              {showPw ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
          {strength && (
            <div style={{ marginTop: '6px' }}>
              <div style={{ height: '3px', background: 'var(--bg-input)', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${strength.pct}%`, background: strength.color, borderRadius: '99px', transition: 'width 0.25s, background 0.25s' }} />
              </div>
              <div style={{ fontSize: '11px', color: strength.color, marginTop: '4px' }}>{strength.label}</div>
            </div>
          )}
        </div>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          <input
            type="checkbox"
            checked={agreedToTerms}
            onChange={e => setAgreedToTerms(e.target.checked)}
            style={{ marginTop: '2px', accentColor: 'var(--accent)', flexShrink: 0 }}
          />
          <span>
            By creating an account you agree to our{' '}
            <Link to="/terms" target="_blank" style={{ color: 'var(--accent)' }}>Terms of Service</Link>
            {' '}and{' '}
            <Link to="/privacy" target="_blank" style={{ color: 'var(--accent)' }}>Privacy Policy</Link>.
          </span>
        </label>
        <button
          type="submit"
          className="btn-primary"
          style={{ width: '100%', justifyContent: 'center' }}
          disabled={loading}
        >
          {loading ? 'Creating account…' : 'Create Account'}
        </button>
      </form>

      <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)', marginTop: '16px' }}>
        Already have an account?{' '}
        <span
          style={{ color: 'var(--accent)', cursor: 'pointer' }}
          onClick={() => navigate('/auth/signin')}
        >
          Sign in
        </span>
      </p>
    </AuthShell>
  )
}

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4"/>
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 2l12 12M6.5 6.6A2 2 0 0 0 9.4 9.5M4.2 4.3C2.5 5.3 1 8 1 8s2.5 5 7 5a7.2 7.2 0 0 0 3.8-1.1M7 3.1A6.8 6.8 0 0 1 8 3c4.5 0 7 5 7 5s-.9 1.7-2.3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
