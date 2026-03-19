import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import AuthShell from './AuthShell'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [done, setDone]         = useState(false)
  const [error, setError]       = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, new_password: password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Reset failed')
        return
      }
      setDone(true)
    } catch {
      setError('Could not reach server. Is Flask running?')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <AuthShell step={1} totalSteps={5}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '26px', fontWeight: 700, margin: '0 0 6px' }}>
          Invalid link
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 24px' }}>
          This reset link is missing a token. Request a new one.
        </p>
        <button
          className="btn-ghost"
          style={{ width: '100%', justifyContent: 'center' }}
          onClick={() => navigate('/auth/forgot-password')}
        >
          Request reset link
        </button>
      </AuthShell>
    )
  }

  if (done) {
    return (
      <AuthShell step={1} totalSteps={5}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '26px', fontWeight: 700, margin: '0 0 6px' }}>
          Password updated
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 24px' }}>
          Your password has been reset. You can now sign in.
        </p>
        <button
          className="btn-primary"
          style={{ width: '100%', justifyContent: 'center' }}
          onClick={() => navigate('/auth/signin')}
        >
          Sign in
        </button>
      </AuthShell>
    )
  }

  return (
    <AuthShell step={1} totalSteps={5}>
      <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '26px', fontWeight: 700, margin: '0 0 6px' }}>
        Set new password
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 24px' }}>
        Choose a strong password for your account.
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
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
        />
        <input
          className="input"
          type="password"
          placeholder="Confirm password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          autoComplete="new-password"
        />
        <button
          type="submit"
          className="btn-primary"
          style={{ width: '100%', justifyContent: 'center' }}
          disabled={loading}
        >
          {loading ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </AuthShell>
  )
}
