import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../../api/client'
import AuthShell from './AuthShell'

export default function VerifyEmail() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [status, setStatus]     = useState(token ? 'verifying' : 'prompt')
  const [resending, setResending] = useState(false)
  const [resent, setResent]     = useState(false)
  const [error, setError]       = useState(null)

  useEffect(() => {
    if (!token) return
    fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); setStatus('error') }
        else setStatus('done')
      })
      .catch(() => { setError('Could not reach server.'); setStatus('error') })
  }, [token])

  async function handleResend() {
    setResending(true)
    try {
      await api.resendVerification()
      setResent(true)
    } catch (err) {
      setError(err.message || 'Failed to resend')
    } finally {
      setResending(false)
    }
  }

  if (status === 'verifying') {
    return (
      <AuthShell step={1} totalSteps={5}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Verifying your email…</p>
      </AuthShell>
    )
  }

  if (status === 'done') {
    return (
      <AuthShell step={1} totalSteps={5}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '26px', fontWeight: 700, margin: '0 0 6px' }}>
          Email verified!
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 24px' }}>
          Your account is fully activated.
        </p>
        <button
          className="btn-primary"
          style={{ width: '100%', justifyContent: 'center' }}
          onClick={() => navigate('/dashboard')}
        >
          Go to dashboard
        </button>
      </AuthShell>
    )
  }

  if (status === 'error') {
    return (
      <AuthShell step={1} totalSteps={5}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '26px', fontWeight: 700, margin: '0 0 6px' }}>
          Link expired
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 24px' }}>
          {error}
        </p>
        <button
          className="btn-primary"
          style={{ width: '100%', justifyContent: 'center' }}
          onClick={handleResend}
          disabled={resending || resent}
        >
          {resent ? 'Sent! Check your inbox' : resending ? 'Sending…' : 'Resend verification email'}
        </button>
      </AuthShell>
    )
  }

  // prompt — no token, just landed here after signup
  return (
    <AuthShell step={1} totalSteps={5}>
      <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '26px', fontWeight: 700, margin: '0 0 6px' }}>
        Check your email
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 24px', lineHeight: 1.6 }}>
        We&apos;ve sent a verification link to your email address. Click it to activate your account.
      </p>
      {error && (
        <div style={{
          padding: '10px 14px', background: 'var(--danger-dim)',
          border: '1px solid var(--danger)', borderRadius: '8px',
          fontSize: '13px', color: 'var(--danger)', marginBottom: '16px',
        }}>
          {error}
        </div>
      )}
      <button
        className="btn-ghost"
        style={{ width: '100%', justifyContent: 'center', marginBottom: '10px' }}
        onClick={handleResend}
        disabled={resending || resent}
      >
        {resent ? 'Sent! Check your inbox' : resending ? 'Sending…' : 'Resend verification email'}
      </button>
      <button
        className="btn-ghost"
        style={{ width: '100%', justifyContent: 'center', fontSize: '13px' }}
        onClick={() => navigate('/dashboard')}
      >
        Skip for now →
      </button>
    </AuthShell>
  )
}
