import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'

const sectionLabel = {
  fontFamily: 'Syne, sans-serif', fontSize: '13px', fontWeight: 600,
  color: 'var(--text-secondary)', textTransform: 'uppercase',
  letterSpacing: '0.07em', margin: '0 0 14px',
}

const fieldLabel = {
  fontSize: '12px', color: 'var(--text-secondary)',
  display: 'block', marginBottom: '5px',
}

function Field({ label, children }) {
  return (
    <div>
      <label style={fieldLabel}>{label}</label>
      {children}
    </div>
  )
}

function StatusBanner({ error, success }) {
  if (error) return (
    <div style={{ padding: '10px 14px', background: 'rgba(248,113,113,0.08)', border: '1px solid var(--danger)', borderRadius: '8px', fontSize: '13px', color: 'var(--danger)' }}>
      {error}
    </div>
  )
  if (success) return (
    <div style={{ padding: '10px 14px', background: 'rgba(52,211,153,0.08)', border: '1px solid var(--success)', borderRadius: '8px', fontSize: '13px', color: 'var(--success)' }}>
      {success}
    </div>
  )
  return null
}

const PLAN_LABELS = { free: 'Free', pro: 'Pro', max: 'Max', team: 'Max' }
const PLAN_COLORS = { free: 'var(--text-muted)', pro: 'var(--accent)', max: '#60a5fa', team: '#60a5fa' }

export default function Settings() {
  const navigate = useNavigate()

  // Billing / plan
  const [stats, setStats]           = useState(null)
  const [billingLoading, setBillingLoading] = useState(false)

  // Profile
  const [profile, setProfile] = useState({
    firstName: '', lastName: '', title: '', company: '', linkedinUrl: '', email: '',
  })
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError]   = useState(null)
  const [profileSaved, setProfileSaved]   = useState(false)

  // Agent / use-case context
  const [agentCtx, setAgentCtx] = useState({
    my_role: '', what_i_sell: '', icp_description: '',
  })
  const [ctxSaving, setCtxSaving] = useState(false)
  const [ctxError, setCtxError]   = useState(null)
  const [ctxSaved, setCtxSaved]   = useState(false)

  // Password
  const [pwForm, setPwForm]       = useState({ current: '', next: '', confirm: '' })
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError]     = useState(null)
  const [pwSuccess, setPwSuccess] = useState(false)

  useEffect(() => {
    api.getStats().then(setStats).catch(() => {})
    api.me().then(d => {
      const firstName  = d.first_name  || localStorage.getItem('user_first_name') || ''
      const lastName   = d.last_name   || localStorage.getItem('user_last_name')  || ''
      setProfile({
        firstName,
        lastName,
        title:       d.title       || '',
        company:     d.company     || '',
        linkedinUrl: d.linkedin_url || '',
        email:       d.user?.email  || '',
      })
    }).catch(() => {})

    api.getAgentContext().then(d => {
      if (d.context) setAgentCtx({
        my_role:         d.context.my_role         || '',
        what_i_sell:     d.context.what_i_sell     || '',
        icp_description: d.context.icp_description || '',
      })
    }).catch(() => {})
  }, [])

  async function handleManageBilling() {
    setBillingLoading(true)
    try {
      const data = await api.manageBilling()
      window.location.href = data.url
    } catch {
      navigate('/pricing')
    } finally {
      setBillingLoading(false)
    }
  }

  async function handleSaveProfile(e) {
    e.preventDefault()
    if (!profile.firstName.trim()) { setProfileError('First name is required'); return }
    const liUrl = profile.linkedinUrl.trim()
    if (liUrl && !liUrl.match(/^https?:\/\/(www\.)?linkedin\.com\/in\//i)) {
      setProfileError('LinkedIn URL must be a valid linkedin.com/in/ profile URL')
      return
    }
    setProfileError(null)
    setProfileSaving(true)
    try {
      await api.updateProfile({
        first_name:   profile.firstName.trim(),
        last_name:    profile.lastName.trim(),
        title:        profile.title.trim(),
        company:      profile.company.trim(),
        linkedin_url: profile.linkedinUrl.trim(),
      })
      localStorage.setItem('user_first_name', profile.firstName.trim())
      localStorage.setItem('user_last_name',  profile.lastName.trim())
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 2500)
    } catch (err) {
      setProfileError(err.message || 'Failed to save profile')
    } finally {
      setProfileSaving(false)
    }
  }

  async function handleSaveContext(e) {
    e.preventDefault()
    setCtxError(null)
    setCtxSaving(true)
    try {
      await api.saveAgentContext({
        ...agentCtx,
        my_company: profile.company.trim(), // keep in sync with profile company
      })
      setCtxSaved(true)
      setTimeout(() => setCtxSaved(false), 2500)
    } catch (err) {
      setCtxError(err.message || 'Failed to save')
    } finally {
      setCtxSaving(false)
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    if (pwForm.next !== pwForm.confirm) { setPwError('New passwords do not match'); return }
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

  const inp = { className: 'input', style: { fontSize: '14px' } }

  return (
    <div className="page-pad" style={{ maxWidth: '580px' }}>
      <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '26px', fontWeight: 700, margin: '0 0 4px' }}>
        Settings
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 36px' }}>
        Your profile, business context, and account.
      </p>

      {/* ── Plan & Billing ───────────────────────────────────────────────── */}
      {stats && (
        <section style={{ marginBottom: '32px' }}>
          <h2 style={sectionLabel}>Plan &amp; billing</h2>
          <div className="card" style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: stats.plan === 'free' ? '18px' : '0', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '18px', color: PLAN_COLORS[stats.plan] || 'var(--text-primary)' }}>
                    {PLAN_LABELS[stats.plan] || stats.plan} plan
                  </span>
                  {stats.plan === 'free' && (
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '99px', background: 'var(--bg-input)', color: 'var(--text-muted)', fontWeight: 600 }}>
                      Free forever
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>
                  {stats.plan === 'free' && 'Upgrade to unlock unlimited contacts, paths, and AI messages.'}
                  {stats.plan === 'pro'  && 'Pro · $19/month · 200 AI messages/month'}
                  {(stats.plan === 'max' || stats.plan === 'team') && 'Max · $49/month · Unlimited AI messages'}
                </div>
              </div>
              {stats.plan === 'free' ? (
                <button className="btn-primary" style={{ fontSize: '13px' }} onClick={() => navigate('/pricing')}>
                  Upgrade →
                </button>
              ) : (
                <button className="btn-ghost" style={{ fontSize: '13px' }} disabled={billingLoading} onClick={handleManageBilling}>
                  {billingLoading ? 'Loading…' : 'Manage billing →'}
                </button>
              )}
            </div>

            {/* Usage meters — only for capped plans */}
            {stats.plan === 'free' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { label: 'Contacts', used: stats.connections, limit: stats.contacts_limit },
                  { label: 'Path searches this month', used: stats.paths_this_month, limit: stats.paths_limit },
                  { label: 'AI messages this month', used: stats.agent_messages_this_month, limit: stats.agent_messages_limit },
                ].map(({ label, used, limit }) => limit != null && (
                  <div key={label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                      <span>{label}</span>
                      <span style={{ color: (used ?? 0) >= limit ? 'var(--danger)' : 'var(--text-muted)' }}>
                        {used ?? 0} / {limit}
                      </span>
                    </div>
                    <div style={{ height: '5px', background: 'var(--bg-input)', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.min(100, ((used ?? 0) / limit) * 100)}%`,
                        background: (used ?? 0) >= limit ? 'var(--danger)' : 'var(--accent)',
                        borderRadius: '99px', transition: 'width 0.3s',
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {stats.plan === 'pro' && (
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                  <span>AI messages this month</span>
                  <span style={{ color: (stats.agent_messages_this_month ?? 0) >= (stats.agent_messages_limit ?? 200) ? 'var(--danger)' : 'var(--text-muted)' }}>
                    {stats.agent_messages_this_month ?? 0} / {stats.agent_messages_limit ?? 200}
                  </span>
                </div>
                <div style={{ height: '5px', background: 'var(--bg-input)', borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, ((stats.agent_messages_this_month ?? 0) / (stats.agent_messages_limit ?? 200)) * 100)}%`,
                    background: (stats.agent_messages_this_month ?? 0) >= (stats.agent_messages_limit ?? 200) ? 'var(--danger)' : 'var(--accent)',
                    borderRadius: '99px', transition: 'width 0.3s',
                  }} />
                </div>
                {(stats.agent_messages_this_month ?? 0) >= (stats.agent_messages_limit ?? 200) * 0.8 && (
                  <div style={{ fontSize: '11px', color: 'var(--warning)', marginTop: '6px' }}>
                    Approaching limit — upgrade to Max for unlimited AI messages.
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Profile ──────────────────────────────────────────────────────── */}
      <section style={{ marginBottom: '32px' }}>
        <h2 style={sectionLabel}>Your profile</h2>
        <div className="card" style={{ padding: '22px 24px' }}>
          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <StatusBanner error={profileError} success={profileSaved ? 'Profile saved.' : null} />

            <div className="input-row-2" style={{ display: 'flex', gap: '10px' }}>
              <Field label="First name">
                <input {...inp} value={profile.firstName} onChange={e => setProfile(p => ({ ...p, firstName: e.target.value }))} required autoComplete="given-name" />
              </Field>
              <Field label="Last name">
                <input {...inp} value={profile.lastName} onChange={e => setProfile(p => ({ ...p, lastName: e.target.value }))} autoComplete="family-name" />
              </Field>
            </div>

            <Field label="Job title">
              <input {...inp} placeholder="e.g. VP of Sales" value={profile.title} onChange={e => setProfile(p => ({ ...p, title: e.target.value }))} autoComplete="organization-title" />
            </Field>

            <Field label="Company">
              <input {...inp} placeholder="e.g. Acme Corp" value={profile.company} onChange={e => setProfile(p => ({ ...p, company: e.target.value }))} autoComplete="organization" />
            </Field>

            <Field label="LinkedIn URL">
              <input {...inp} placeholder="https://linkedin.com/in/yourname" value={profile.linkedinUrl} onChange={e => setProfile(p => ({ ...p, linkedinUrl: e.target.value }))} type="url" autoComplete="url" />
            </Field>

            <Field label="Email">
              <input {...inp} value={profile.email} readOnly style={{ fontSize: '14px', opacity: 0.55, cursor: 'not-allowed' }} />
            </Field>

            <button
              type="submit"
              className="btn-primary"
              style={{ alignSelf: 'flex-start', fontSize: '14px' }}
              disabled={profileSaving}
            >
              {profileSaving ? 'Saving…' : 'Save profile'}
            </button>
          </form>
        </div>
      </section>

      {/* ── How you're using OrbitSix ─────────────────────────────────── */}
      <section style={{ marginBottom: '32px' }}>
        <h2 style={sectionLabel}>How you're using OrbitSix</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '-8px 0 14px' }}>
          This feeds your AI agent so it can make smarter recommendations and draft better intros.
        </p>
        <div className="card" style={{ padding: '22px 24px' }}>
          <form onSubmit={handleSaveContext} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <StatusBanner error={ctxError} success={ctxSaved ? 'Saved.' : null} />

            <Field label="Your role / what you do">
              <input {...inp} placeholder="e.g. VP of Sales, Founder, Account Executive" value={agentCtx.my_role} onChange={e => setAgentCtx(p => ({ ...p, my_role: e.target.value }))} />
            </Field>

            <Field label="What you sell or offer">
              <input {...inp} placeholder="e.g. B2B SaaS for finance teams, consulting, recruiting" value={agentCtx.what_i_sell} onChange={e => setAgentCtx(p => ({ ...p, what_i_sell: e.target.value }))} />
            </Field>

            <Field label="Who you're trying to reach (ideal customer / target persona)">
              <textarea
                className="input"
                rows={2}
                placeholder="e.g. Series B+ fintech startups, enterprise procurement teams, VP-level buyers…"
                value={agentCtx.icp_description}
                onChange={e => setAgentCtx(p => ({ ...p, icp_description: e.target.value }))}
                style={{ fontSize: '14px', resize: 'vertical' }}
              />
            </Field>

            <button
              type="submit"
              className="btn-primary"
              style={{ alignSelf: 'flex-start', fontSize: '14px' }}
              disabled={ctxSaving}
            >
              {ctxSaving ? 'Saving…' : 'Save'}
            </button>
          </form>
        </div>
      </section>

      {/* ── Change password ───────────────────────────────────────────── */}
      <section style={{ marginBottom: '32px' }}>
        <h2 style={sectionLabel}>Change password</h2>
        <div className="card" style={{ padding: '22px 24px' }}>
          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <StatusBanner error={pwError} success={pwSuccess ? 'Password updated.' : null} />
            <Field label="Current password">
              <input {...inp} type="password" value={pwForm.current} onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))} required autoComplete="current-password" />
            </Field>
            <Field label="New password">
              <input {...inp} type="password" value={pwForm.next} onChange={e => setPwForm(p => ({ ...p, next: e.target.value }))} required minLength={8} autoComplete="new-password" />
            </Field>
            <Field label="Confirm new password">
              <input {...inp} type="password" value={pwForm.confirm} onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} required autoComplete="new-password" />
            </Field>
            <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-start', fontSize: '14px' }} disabled={pwLoading}>
              {pwLoading ? 'Updating…' : 'Update password'}
            </button>
          </form>
        </div>
      </section>

      {/* ── Session ───────────────────────────────────────────────────── */}
      <section>
        <h2 style={sectionLabel}>Session</h2>
        <div className="card" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 500 }}>Sign out</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>You&apos;ll be returned to the sign-in page.</div>
          </div>
          <button className="btn-ghost" style={{ fontSize: '13px', flexShrink: 0 }} onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </section>
    </div>
  )
}
