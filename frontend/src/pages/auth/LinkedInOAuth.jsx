// Step 2 — LinkedIn OAuth simulation
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthShell from './AuthShell'

export default function LinkedInOAuth() {
  const navigate = useNavigate()

  // Simulate OAuth redirect after 2s
  useEffect(() => {
    const t = setTimeout(() => navigate('/auth/confirmed'), 2200)
    return () => clearTimeout(t)
  }, [navigate])

  return (
    <AuthShell step={2} totalSteps={5}>
      <div style={{ textAlign: 'center' }}>
        {/* LinkedIn logo */}
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: '#0077b5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            boxShadow: '0 8px 24px rgba(0,119,181,0.3)',
          }}
        >
          <span style={{ color: 'white', fontWeight: 800, fontSize: '22px', fontFamily: 'sans-serif' }}>in</span>
        </div>

        <h2
          style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: '22px',
            fontWeight: 700,
            margin: '0 0 10px',
          }}
        >
          Connecting to LinkedIn
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 28px' }}>
          Authorizing access to your professional network&hellip;
        </p>

        {/* Spinner */}
        <div
          style={{
            width: '36px',
            height: '36px',
            border: '3px solid var(--border)',
            borderTop: '3px solid var(--accent)',
            borderRadius: '50%',
            margin: '0 auto 24px',
            animation: 'spin 0.8s linear infinite',
          }}
        />

        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          You&apos;ll be redirected automatically
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </AuthShell>
  )
}
