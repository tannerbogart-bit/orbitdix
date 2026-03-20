import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'

export default function Settings() {
  const navigate = useNavigate()

  const [profile, setProfile]       = useState({ firstName: '', lastName: '', email: '' })
  const [profileForm, setProfileForm] = useState({ firstName: '', lastName: '' })
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError]   = useState(null)
  const [profileSaved, setProfileSaved]   = useState(false)

  const [pwForm, setPwForm]     = useState({ current: '', next: '', confirm: '' })
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError]   = useState(null)
  const [pwSuccess, setPwSuccess] = useState(false)

  useEffect(() => {
    api.me().then(d => {
      const firstName = d.first_name || localStorage.getItem('user_first_name') || ''
      const lastName  = d.last_name  || localStorage.getItem('user_last_name')  || ''
      const email     = d.user?.email || ''
      setProfile({ firstName, lastName, email })
      setProfileForm({ firstName, lastName })
    }).catch(() => {})
  }, [])

  async function handleSaveProfile(e) {
    e.preventDefault()
    if (!profileForm.firstName.trim()) {
      setProfileError('First name is required')
      return
    }
    setProfileError(null)
    setProfileSaving(true)
    try {
      await api.updateProfile({ first_name: profileForm.firstName.trim(), last_name: profileForm.lastName.trim() })
      setProfile(p => ({ ...p, firstName: profileForm.firstName.trim(), lastName: profileForm.lastName.trim() }))
      localStorage.setItem('user_first_name', profileForm.firstName.trim())
      localStorage.setItem('user_last_name',  profileForm.lastName.trim())
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 2500)
    } catch (err) {
      setProfileError(err.message || 'Failed to update profile')
    } finally {
      setProfileSaving(false)
    }
  }

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

  const sectionLabel = {
    fontFamily: 'Syne, sans-serif', fontSize: '14px', fontWeight: 600,
    color: 'var(--text-secondary)', textTransform: 'uppercase',
    letterSpacing: '0.06em', margin: '0 0 16px',
  }

  const fieldLabel = {
    fontSize: '12px', color: 'var(--text-secondary)',
    display: 'block', marginBottom: '6px',
  }

  return (
    <div className="page-pad" style={{ maxWidth: '560px' }}>
      <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '26px', fontWeight: 700, margin: '0 0 4px' }}>
        Settings
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 36px' }}>
        Manage your account.
      </p>

      {/* Profile */}
      <section style={{ marginBottom: '32px' }}>
        <h2 style={sectionLabel}>Profile</h2>
        <div className="card" style={{ padding: '20px 24px' }}>
          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {profileError && (
              <div style={{ padding: '10px 14px', background: 'rgba(248,113,113,0.08)', border: '1px solid var(--danger)', borderRadius: '8px', fontSize: '13px', color: 'var(--danger)' }}>
                {profileError}
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={fieldLabel}>First name</label>
                <input
                  className="input"
                  value={profileForm.firstName}
                  onChange={e => setProfileForm(p => ({ ...p, firstName: e.target.value }))}
                  required
                  autoComplete="given-name"
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={fieldLabel}>Last name</label>
                <input
                  className="input"
                  value={profileForm.lastName}
                  onChange={e => setProfileForm(p => ({ ...p, lastName: e.target.value }))}
                  autoComplete="family-name"
                />
              </div>
            </div>
            <div>
              <label style={fieldLabel}>Email</label>
              <input
                className="input"
                value={profile.email}
                readOnly
                style={{ opacity: 0.6, cursor: 'not-allowed' }}
              />
            </div>
            <button
              type="submit"
              className="btn-primary"
              style={{ alignSelf: 'flex-start', fontSize: '14px', background: profileSaved ? 'var(--success)' : undefined }}
              disabled={profileSaving}
            >
              {profileSaved ? 'Saved!' : profileSaving ? 'Saving…' : 'Save profile'}
            </button>
          </form>
        </div>
      </section>

      {/* Change password */}
      <section style={{ marginBottom: '32px' }}>
        <h2 style={sectionLabel}>Change password</h2>
        <div className="card" style={{ padding: '20px 24px' }}>
          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {pwError && (
              <div style={{ padding: '10px 14px', background: 'rgba(248,113,113,0.08)', border: '1px solid var(--danger)', borderRadius: '8px', fontSize: '13px', color: 'var(--danger)' }}>
                {pwError}
              </div>
            )}
            {pwSuccess && (
              <div style={{ padding: '10px 14px', background: 'rgba(52,211,153,0.08)', border: '1px solid var(--success)', borderRadius: '8px', fontSize: '13px', color: 'var(--success)' }}>
                Password updated successfully.
              </div>
            )}
            <div>
              <label style={fieldLabel}>Current password</label>
              <input className="input" type="password" value={pwForm.current} onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))} required autoComplete="current-password" />
            </div>
            <div>
              <label style={fieldLabel}>New password</label>
              <input className="input" type="password" value={pwForm.next} onChange={e => setPwForm(p => ({ ...p, next: e.target.value }))} required minLength={8} autoComplete="new-password" />
            </div>
            <div>
              <label style={fieldLabel}>Confirm new password</label>
              <input className="input" type="password" value={pwForm.confirm} onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} required autoComplete="new-password" />
            </div>
            <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-start', fontSize: '14px' }} disabled={pwLoading}>
              {pwLoading ? 'Updating…' : 'Update password'}
            </button>
          </form>
        </div>
      </section>

      {/* Session */}
      <section>
        <h2 style={sectionLabel}>Session</h2>
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
