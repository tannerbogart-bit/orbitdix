// Step 1 — Sign In
// OAuth buttons do a full-page redirect to the Flask backend (/api/auth/<provider>/login)
// which redirects to the provider, then back to /auth/oauth-callback with a JWT.
import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import AuthShell from './AuthShell'

const OAUTH_PROVIDERS = [
  {
    id:    'linkedin',
    label: 'Continue with LinkedIn',
    color: '#0077b5',
    icon:  <LinkedInIcon />,
  },
  {
    id:    'google',
    label: 'Continue with Google',
    color: '#4285f4',
    icon:  <GoogleIcon />,
  },
  {
    id:    'microsoft',
    label: 'Continue with Microsoft',
    color: '#2f2f2f',
    icon:  <MicrosoftIcon />,
  },
]

export default function SignIn() {
  const navigate        = useNavigate()
  const [searchParams]  = useSearchParams()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)
  const [showPw,   setShowPw]   = useState(false)

  useEffect(() => {
    const e = searchParams.get('error')
    if (e === 'google_not_configured')    setError('Google sign-in is not enabled on this server yet.')
    if (e === 'linkedin_not_configured')  setError('LinkedIn sign-in is not enabled on this server yet.')
    if (e === 'microsoft_not_configured') setError('Microsoft sign-in is not enabled on this server yet.')
  }, [])

  // Full-page redirect — the backend handles the OAuth flow and eventually
  // redirects the browser to /auth/oauth-callback#token=...
  function handleOAuth(provider) {
    window.location.href = `/api/auth/${provider}/login`
  }

  async function handleEmailSignIn(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Sign in failed')
        return
      }
      localStorage.setItem('access_token', data.access_token)
      navigate('/auth/confirmed', { replace: true })
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
        Welcome to OrbitSix
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 24px' }}>
        Map your network. Reach anyone in 6 degrees.
      </p>

      {/* OAuth provider buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
        {OAUTH_PROVIDERS.map(({ id, label, color, icon }) => (
          <button
            key={id}
            onClick={() => handleOAuth(id)}
            style={{
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              gap:            '10px',
              width:          '100%',
              padding:        '11px 16px',
              background:     color,
              color:          '#fff',
              border:         'none',
              borderRadius:   '8px',
              fontSize:       '14px',
              fontWeight:     500,
              fontFamily:     'DM Sans, sans-serif',
              cursor:         'pointer',
              transition:     'opacity 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.88')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div
        style={{
          display:    'flex',
          alignItems: 'center',
          gap:        '12px',
          margin:     '4px 0 20px',
          color:      'var(--text-muted)',
          fontSize:   '12px',
        }}
      >
        <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        or sign in with email
        <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
      </div>

      {/* Email / password form */}
      <form onSubmit={handleEmailSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
        <input
          className="input"
          type="email"
          placeholder="Work email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <div style={{ position: 'relative' }}>
          <input
            className="input"
            type={showPw ? 'text' : 'password'}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
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
        <button
          type="submit"
          className="btn-primary"
          style={{ width: '100%', justifyContent: 'center' }}
          disabled={loading}
        >
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>

      <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)', marginTop: '12px' }}>
        <span
          style={{ color: 'var(--accent)', cursor: 'pointer' }}
          onClick={() => navigate('/auth/forgot-password')}
        >
          Forgot password?
        </span>
      </p>

      <p
        style={{
          textAlign:  'center',
          fontSize:   '13px',
          color:      'var(--text-muted)',
          marginTop:  '8px',
        }}
      >
        Don&apos;t have an account?{' '}
        <span
          style={{ color: 'var(--accent)', cursor: 'pointer' }}
          onClick={() => navigate('/auth/signup')}
        >
          Sign up with email
        </span>
      </p>
    </AuthShell>
  )
}

// ── Icons ──────────────────────────────────────────────────────────────────────

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

function LinkedInIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect width="18" height="18" rx="3" fill="white" fillOpacity="0.2" />
      <text x="3.5" y="13" fill="white" fontSize="11" fontWeight="bold" fontFamily="sans-serif">in</text>
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        fill="white"
        fillOpacity="0.9"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
        fill="white"
        fillOpacity="0.7"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        fill="white"
        fillOpacity="0.5"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
        fill="white"
        fillOpacity="0.8"
      />
    </svg>
  )
}

function MicrosoftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="1"  y="1"  width="7.5" height="7.5" fill="#f25022" fillOpacity="0.85" />
      <rect x="9.5" y="1"  width="7.5" height="7.5" fill="#7fba00" fillOpacity="0.85" />
      <rect x="1"  y="9.5" width="7.5" height="7.5" fill="#00a4ef" fillOpacity="0.85" />
      <rect x="9.5" y="9.5" width="7.5" height="7.5" fill="#ffb900" fillOpacity="0.85" />
    </svg>
  )
}
