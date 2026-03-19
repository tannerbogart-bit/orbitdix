import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthShell from './AuthShell'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)
  const [devLink, setDevLink] = useState(null)
  const [error, setError]     = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong')
        return
      }
      setSent(true)
      if (data.dev_reset_link) setDevLink(data.dev_reset_link)
    } catch {
      setError('Could not reach server. Is Flask running?')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <AuthShell step={1} totalSteps={5}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '26px', fontWeight: 700, margin: '0 0 6px' }}>
          Check your email
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 24px', lineHeight: 1.6 }}>
          If <strong>{email}</strong> is registered, you&apos;ll receive a reset link shortly.
        </p>
        {devLink && (
          <div style={{
            background: 'rgba(124,110,224,0.08)', border: '1px solid var(--accent)',
            borderRadius: '8px', padding: '12px 14px', marginBottom: '20px', fontSize: '13px',
          }}>
            <div style={{ fontWeight: 600, marginBottom: '6px', color: 'var(--accent)' }}>Dev mode — reset link:</div>
            <a href={devLink} style={{ color: 'var(--accent)', wordBreak: 'break-all' }}>{devLink}</a>
          </div>
        )}
        <button
          className="btn-ghost"
          style={{ width: '100%', justifyContent: 'center' }}
          onClick={() => navigate('/auth/signin')}
        >
          Back to sign in
        </button>
      </AuthShell>
    )
  }

  return (
    <AuthShell step={1} totalSteps={5}>
      <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '26px', fontWeight: 700, margin: '0 0 6px' }}>
        Forgot password?
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 24px' }}>
        Enter your email and we&apos;ll send you a reset link.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {error && (
          <div style={{
            padding: '10px 14px', background: 'rgba(248,113,113,0.08)',
            border: '1px solid var(--danger)', borderRadius: '8px',
            color: 'var(--danger)', fontSize: '13px',
          }}>
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
        <button
          type="submit"
          className="btn-primary"
          style={{ width: '100%', justifyContent: 'center' }}
          disabled={loading}
        >
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>

      <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)', marginTop: '20px' }}>
        Remember your password?{' '}
        <span style={{ color: 'var(--accent)', cursor: 'pointer' }} onClick={() => navigate('/auth/signin')}>
          Sign in
        </span>
      </p>
    </AuthShell>
  )
}
