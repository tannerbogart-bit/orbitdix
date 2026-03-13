// Step 1 — Sign In
import { useNavigate } from 'react-router-dom'
import AuthShell from './AuthShell'

export default function SignIn() {
  const navigate = useNavigate()

  return (
    <AuthShell step={1} totalSteps={5}>
      <h1
        style={{
          fontFamily: 'Syne, sans-serif',
          fontSize: '26px',
          fontWeight: 700,
          margin: '0 0 8px',
          color: 'var(--text-primary)',
        }}
      >
        Welcome to OrbitSix
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 28px' }}>
        Map your network. Reach anyone in 6 degrees.
      </p>

      {/* LinkedIn OAuth button */}
      <button
        className="btn-primary"
        style={{ width: '100%', justifyContent: 'center', fontSize: '15px', padding: '12px' }}
        onClick={() => navigate('/auth/linkedin')}
      >
        <LinkedInIcon />
        Continue with LinkedIn
      </button>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          margin: '20px 0',
          color: 'var(--text-muted)',
          fontSize: '13px',
        }}
      >
        <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        or
        <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
      </div>

      {/* Email form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <input className="input" type="email" placeholder="Work email" />
        <input className="input" type="password" placeholder="Password" />
        <button
          className="btn-ghost"
          style={{ width: '100%', justifyContent: 'center' }}
          onClick={() => navigate('/auth/confirmed')}
        >
          Sign In
        </button>
      </div>

      <p
        style={{
          textAlign: 'center',
          fontSize: '13px',
          color: 'var(--text-muted)',
          marginTop: '20px',
        }}
      >
        Don&apos;t have an account?{' '}
        <span
          style={{ color: 'var(--accent)', cursor: 'pointer' }}
          onClick={() => navigate('/auth/linkedin')}
        >
          Sign up free
        </span>
      </p>
    </AuthShell>
  )
}

function LinkedInIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect width="18" height="18" rx="3" fill="white" fillOpacity="0.15" />
      <text x="4" y="13" fill="white" fontSize="11" fontWeight="bold" fontFamily="sans-serif">in</text>
    </svg>
  )
}
