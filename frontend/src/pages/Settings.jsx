import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'

export default function Settings() {
  const navigate = useNavigate()
  const [user, setUser] = useState({ email: '', firstName: '', lastName: '' })

  const [pwForm, setPwForm]     = useState({ current: '', next: '', confirm: '' })
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError]   = useState(null)
  const [pwSuccess, setPwSuccess] = useState(false)

  useEffect(() => {
    const firstName = localStorage.getItem('user_first_name') || ''
    const lastName  = localStorage.getItem('user_last_name')  || ''
    api.me().then(d => setUser({
      email: d.user?.email || '',
      firstName,
      lastName,
    })).catch(() => {})
  }, [])

  async function handleChangePassword(e) {
    e.preventDefault()
    if (pwForm.next !== pwForm.confirm) {
      setPwError('New passwords do not match')
      return
    }
    setPwError(null)
    setPwLoading(true)
    try {
      await api.changePassword(pwForm.current, pwForm.next)
      setPwSuccess(true)
      setPwForm({ current: '', next: '', confirm: '' })
      setTimeout(() => setPwSuccess(false), 3000)
    } catch (err) {
      setPwError(err.message || 'Failed to update password')
    } finally {
      setPwLoading(false)
    }
  }

  function handleSignOut() {
    localStorage.clear()
    navigate('/auth/signin', { replace: true })
  }

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || '—'

  return (
    <div style={{ padding: '32px', maxWidth: '560px' }}>
      <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '26px', fontWeight: 700, margin: '0 0 4px' }}>
        Settings
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 36px' }}>
        Manage your account.
      </p>

      {/* Account info */}
      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 16px' }}>
          Account
        </h2>
        <div className="card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Name</span>
            <span style={{ fontSize: '14px', fontWeight: 500 }}>{displayName}</span>
          </div>
          <div style={{ borderTop: '1px solid var(--border-subtle)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Email</span>
            <span style={{ fontSize: '14px', fontWeight: 500 }}>{user.email || '—'}</span>
          </div>
        </div>
      </section>

      {/* Change password */}
      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 16px' }}>
          Change password
        </h2>
        <div className="card" style={{ padding: '20px 24px' }}>
          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {pwError && (
              <div style={{
                padding: '10px 14px', background: 'rgba(248,113,113,0.08)',
                border: '1px solid var(--danger)', borderRadius: '8px',
                fontSize: '13px', color: 'var(--danger)',
              }}>
                {pwError}
              </div>
            )}
            {pwSuccess && (
              <div style={{
                padding: '10px 14px', background: 'rgba(52,211,153,0.08)',
                border: '1px solid var(--success)', borderRadius: '8px',
                fontSize: '13px', color: 'var(--success)',
              }}>
                Password updated successfully.
              </div>
            )}
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Current password
              </label>
              <input
                className="input"
                type="password"
                value={pwForm.current}
                onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))}
                required
                autoComplete="current-password"
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                New password
              </label>
              <input
                className="input"
                type="password"
                value={pwForm.next}
                onChange={e => setPwForm(p => ({ ...p, next: e.target.value }))}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Confirm new password
              </label>
              <input
                className="input"
                type="password"
                value={pwForm.confirm}
                onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
                required
                autoComplete="new-password"
              />
            </div>
            <button
              type="submit"
              className="btn-primary"
              style={{ alignSelf: 'flex-start', fontSize: '14px' }}
              disabled={pwLoading}
            >
              {pwLoading ? 'Updating…' : 'Update password'}
            </button>
          </form>
        </div>
      </section>

      {/* Danger zone */}
      <section>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 16px' }}>
          Session
        </h2>
        <div className="card" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 500 }}>Sign out</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>You&apos;ll be returned to the sign-in page.</div>
          </div>
          <button className="btn-ghost" style={{ fontSize: '13px' }} onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </section>
    </div>
  )
}
