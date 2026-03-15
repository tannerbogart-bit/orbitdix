// Handles the redirect back from the backend after a successful OAuth exchange.
// The backend sends:  /auth/oauth-callback#token=<jwt>&user_id=<id>&tenant_id=<id>
// We read the fragment, persist the JWT, then hand off to the syncing animation.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthShell from './AuthShell'

export default function OAuthCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState(null)

  useEffect(() => {
    const fragment = window.location.hash.slice(1) // strip leading '#'
    const params   = new URLSearchParams(fragment)

    const token    = params.get('token')
    const userId   = params.get('user_id')
    const tenantId = params.get('tenant_id')
    const err      = params.get('error')

    if (err) {
      setError(decodeURIComponent(err))
      return
    }

    if (!token) {
      setError('No access token received from server.')
      return
    }

    // Persist JWT for subsequent API calls
    localStorage.setItem('access_token', token)
    if (userId)   localStorage.setItem('user_id',   userId)
    if (tenantId) localStorage.setItem('tenant_id', tenantId)

    // Clear the fragment so the token is not visible in history
    window.history.replaceState(null, '', window.location.pathname)

    // Hand off to the syncing animation before landing on the dashboard
    navigate('/auth/syncing', { replace: true })
  }, [navigate])

  if (error) {
    return (
      <AuthShell step={2} totalSteps={5}>
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(248, 113, 113, 0.1)',
              border: '2px solid var(--danger)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 8v5M12 16.5v.5" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round" />
              <circle cx="12" cy="12" r="10" stroke="var(--danger)" strokeWidth="1.5" />
            </svg>
          </div>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '20px', fontWeight: 700, margin: '0 0 8px' }}>
            Sign-in failed
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 24px' }}>
            {error}
          </p>
          <button className="btn-primary" onClick={() => navigate('/auth/signin', { replace: true })}>
            Back to sign in
          </button>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell step={2} totalSteps={5}>
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            border: '3px solid var(--border)',
            borderTop: '3px solid var(--accent)',
            borderRadius: '50%',
            margin: '0 auto 20px',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
          Completing sign in&hellip;
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </AuthShell>
  )
}
