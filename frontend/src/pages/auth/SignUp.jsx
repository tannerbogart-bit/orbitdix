// Email signup form — creates account via POST /api/auth/signup
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthShell from './AuthShell'

export default function SignUp() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
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
        <input
          className="input"
          type="password"
          placeholder="Password (8+ characters)"
          value={form.password}
          onChange={set('password')}
          required
          autoComplete="new-password"
        />
        <button
          type="submit"
          className="btn-ghost"
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
