import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'

function timeAgo(iso) {
  if (!iso) return '—'
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (diff < 60)    return `${diff}s ago`
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function StatCard({ label, value, sub }) {
  return (
    <div className="card" style={{ padding: '20px 24px', minWidth: 0 }}>
      <div style={{ fontSize: '28px', fontFamily: 'Syne, sans-serif', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
        {value ?? '—'}
      </div>
      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px' }}>{label}</div>
      {sub && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>{sub}</div>}
    </div>
  )
}

function PlanBadge({ plan, status }) {
  const colors = {
    free:  { bg: 'var(--bg-input)',    color: 'var(--text-muted)',  border: 'var(--border)' },
    pro:   { bg: 'var(--accent-dim)',  color: 'var(--accent)',      border: 'var(--accent)' },
    max:   { bg: 'var(--success-dim)', color: 'var(--success)',     border: 'var(--success)' },
  }
  const c = colors[plan] || colors.free
  const isPastDue = status === 'past_due'
  return (
    <span style={{
      padding: '2px 8px', borderRadius: '99px', fontSize: '11px', fontWeight: 700,
      background: isPastDue ? 'var(--danger-dim)' : c.bg,
      color: isPastDue ? 'var(--danger)' : c.color,
      border: `1px solid ${isPastDue ? 'var(--danger)' : c.border}`,
    }}>
      {isPastDue ? 'past due' : plan}
    </span>
  )
}

function SourceBadge({ source }) {
  if (!source) return null
  const label = source === 'oauth' ? 'LinkedIn OAuth' : source === 'chrome_extension' ? 'Extension' : source
  return (
    <span style={{
      padding: '2px 7px', borderRadius: '99px', fontSize: '10px', fontWeight: 600,
      background: 'var(--bg-input)', color: 'var(--text-muted)', border: '1px solid var(--border)',
    }}>
      {label}
    </span>
  )
}

function UserRow({ user, onClick }) {
  const isActive = user.days_since_active !== null && user.days_since_active < 3
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ')
  return (
    <tr
      onClick={() => onClick(user)}
      style={{ cursor: 'pointer', borderBottom: '1px solid var(--border-subtle)' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <td style={{ padding: '12px 16px', maxWidth: '220px' }}>
        {fullName && (
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {fullName}
          </div>
        )}
        <div style={{ fontSize: fullName ? '11px' : '13px', fontWeight: fullName ? 400 : 600, color: fullName ? 'var(--text-muted)' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user.email}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{timeAgo(user.created_at)}</span>
          {!user.email_verified && <span style={{ fontSize: '10px', color: 'var(--warning)' }}>unverified</span>}
          {!user.onboarding_complete && <span style={{ fontSize: '10px', color: 'var(--text-muted)', opacity: 0.6 }}>onboarding</span>}
        </div>
      </td>
      <td style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <PlanBadge plan={user.plan} status={user.subscription_status} />
          <SourceBadge source={user.signup_source} />
        </div>
      </td>
      <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'right' }}>
        {user.contacts.toLocaleString()}
      </td>
      <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'right' }}>
        {user.edges.toLocaleString()}
      </td>
      <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'right' }}>
        {user.agent_messages}
      </td>
      <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'right' }}>
        {user.outreach}
      </td>
      <td style={{ padding: '12px 16px', fontSize: '13px', textAlign: 'right' }}>
        <span style={{ color: isActive ? 'var(--success)' : 'var(--text-muted)' }}>
          {user.last_active_at ? timeAgo(user.last_active_at) : '—'}
        </span>
      </td>
    </tr>
  )
}

function UserDetail({ user, onClose, onDelete, onPlanChange }) {
  const [deleting, setDeleting]   = useState(false)
  const [detail,   setDetail]     = useState(null)
  const [planEdit, setPlanEdit]   = useState(false)
  const [newPlan,  setNewPlan]    = useState(user.plan)
  const [newStatus, setNewStatus] = useState(user.subscription_status)
  const [saving,   setSaving]     = useState(false)

  useEffect(() => {
    api.adminUser(user.id).then(setDetail).catch(() => {})
  }, [user.id])

  async function handleDelete() {
    if (!window.confirm(`Delete ${user.email} and ALL their data? This cannot be undone.`)) return
    setDeleting(true)
    try {
      await api.adminDeleteUser(user.id)
      onDelete(user.id)
      onClose()
    } catch (e) {
      alert('Delete failed: ' + e.message)
      setDeleting(false)
    }
  }

  async function handlePlanSave() {
    setSaving(true)
    try {
      await api.adminSetPlan(user.id, newPlan, newStatus)
      onPlanChange(user.id, newPlan, newStatus)
      setPlanEdit(false)
    } catch (e) {
      alert('Failed to update plan: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const fullName = detail
    ? [detail.user?.first_name, detail.user?.last_name].filter(Boolean).join(' ')
    : [user.first_name, user.last_name].filter(Boolean).join(' ')

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
      <div style={{ width: '440px', height: '100vh', background: 'var(--bg-sidebar)', borderLeft: '1px solid var(--border)', overflowY: 'auto', padding: '24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            {fullName && <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px' }}>{fullName}</div>}
            <div style={{ fontSize: fullName ? '12px' : '16px', color: fullName ? 'var(--text-muted)' : 'var(--text-primary)', fontWeight: fullName ? 400 : 700, fontFamily: fullName ? 'inherit' : 'Syne, sans-serif' }}>{user.email}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '20px', lineHeight: 1 }}>×</button>
        </div>

        {/* Identity */}
        <div className="card" style={{ padding: '14px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
            <PlanBadge plan={user.plan} status={user.subscription_status} />
            {user.email_verified
              ? <span className="badge badge-success">verified</span>
              : <span className="badge badge-warning">unverified</span>}
            {user.agreed_to_terms
              ? <span className="badge badge-success">ToS agreed</span>
              : <span className="badge badge-danger">no ToS</span>}
            {user.onboarding_complete
              ? <span className="badge badge-success">onboarded</span>
              : <span className="badge badge-warning">not onboarded</span>}
            <SourceBadge source={user.signup_source} />
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.8 }}>
            Signed up {timeAgo(user.created_at)}<br />
            {user.signup_ip && <>IP: {user.signup_ip}<br /></>}
            Last active: {user.last_active_at ? timeAgo(user.last_active_at) : 'never'}
          </div>
        </div>

        {/* Plan override */}
        <div className="card" style={{ padding: '14px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: planEdit ? '10px' : 0 }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Plan Override</div>
            {!planEdit && (
              <button onClick={() => setPlanEdit(true)} style={{ fontSize: '11px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                Change plan
              </button>
            )}
          </div>
          {planEdit ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <select
                value={newPlan}
                onChange={e => setNewPlan(e.target.value)}
                style={{ padding: '7px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '13px' }}
              >
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="max">Max</option>
              </select>
              <select
                value={newStatus}
                onChange={e => setNewStatus(e.target.value)}
                style={{ padding: '7px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '13px' }}
              >
                <option value="active">Active</option>
                <option value="canceled">Canceled</option>
                <option value="past_due">Past Due</option>
              </select>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handlePlanSave}
                  disabled={saving}
                  style={{ flex: 1, padding: '8px', background: 'var(--accent)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: saving ? 'default' : 'pointer' }}
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => { setPlanEdit(false); setNewPlan(user.plan); setNewStatus(user.subscription_status) }}
                  style={{ padding: '8px 14px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Current: <strong>{user.plan}</strong> · {user.subscription_status}
            </div>
          )}
        </div>

        {/* Usage stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
          {[
            { label: 'Contacts',  value: user.contacts },
            { label: 'Edges',     value: user.edges },
            { label: 'AI msgs',   value: user.agent_messages },
            { label: 'Paths',     value: user.saved_paths },
            { label: 'Outreach',  value: user.outreach },
            { label: 'Targets',   value: user.targets },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: '10px 12px' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'Syne, sans-serif' }}>{s.value ?? 0}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {detail ? (
          <>
            {/* Business context */}
            {detail.agent_context && (
              <div className="card" style={{ padding: '14px', marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Business Context</div>
                {[
                  ['Role',    detail.agent_context.my_role],
                  ['Company', detail.agent_context.my_company],
                  ['Sells',   detail.agent_context.what_i_sell],
                  ['ICP',     detail.agent_context.icp_description],
                ].filter(([, v]) => v).map(([label, val]) => (
                  <div key={label} style={{ marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{label}: </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{val}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Recent AI conversations */}
            {detail.recent_messages?.length > 0 && (
              <div className="card" style={{ padding: '14px', marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Recent AI Conversations</div>
                {detail.recent_messages.map((m, i) => (
                  <div key={i} style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: i < detail.recent_messages.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4, wordBreak: 'break-word' }}>"{m.content}"</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px' }}>{timeAgo(m.created_at)}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Target accounts */}
            {detail.targets?.length > 0 && (
              <div className="card" style={{ padding: '14px', marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Targets</div>
                {detail.targets.map(t => (
                  <div key={t.company} style={{ fontSize: '12px', color: 'var(--text-secondary)', padding: '3px 0' }}>• {t.company}</div>
                ))}
              </div>
            )}

            {/* Recent activity */}
            {detail.recent_activity?.length > 0 && (
              <div className="card" style={{ padding: '14px', marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Recent Activity</div>
                {detail.recent_activity.slice(0, 8).map((a, i) => (
                  <div key={i} style={{ fontSize: '12px', color: 'var(--text-secondary)', padding: '4px 0', borderBottom: i < 7 ? '1px solid var(--border-subtle)' : 'none', display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.text || a.type}</span>
                    <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{timeAgo(a.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[...Array(3)].map((_, i) => <div key={i} className="skeleton skeleton-card" />)}
          </div>
        )}

        {/* Danger zone */}
        <div className="card" style={{ padding: '14px', marginTop: '12px', borderColor: 'var(--danger)' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Danger Zone</div>
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{ width: '100%', padding: '9px', background: 'var(--danger-dim)', border: '1px solid var(--danger)', borderRadius: '8px', color: 'var(--danger)', fontSize: '13px', fontWeight: 600, cursor: deleting ? 'default' : 'pointer' }}
          >
            {deleting ? 'Deleting…' : 'Delete user + all data'}
          </button>
        </div>

      </div>
    </div>
  )
}

export default function Admin() {
  const navigate = useNavigate()
  const [stats,    setStats]    = useState(null)
  const [users,    setUsers]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [selected, setSelected] = useState(null)
  const [search,   setSearch]   = useState('')

  useEffect(() => {
    Promise.all([
      api.adminStats(),
      api.adminUsers(),
    ]).then(([s, u]) => {
      setStats(s)
      setUsers(u.users || [])
    }).catch(e => {
      if (e.status === 403) navigate('/dashboard')
      else setError('Failed to load admin data')
    }).finally(() => setLoading(false))
  }, [])

  function handlePlanChange(userId, plan, status) {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, plan, subscription_status: status } : u))
    setSelected(prev => prev?.id === userId ? { ...prev, plan, subscription_status: status } : prev)
  }

  const filtered = search.trim()
    ? users.filter(u =>
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        `${u.first_name} ${u.last_name}`.toLowerCase().includes(search.toLowerCase())
      )
    : users

  if (loading) {
    return (
      <div className="page-pad" style={{ maxWidth: '1200px' }}>
        <div className="skeleton skeleton-title" style={{ width: '120px', marginBottom: '24px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '28px' }}>
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton skeleton-card" />)}
        </div>
        <div className="skeleton" style={{ height: '300px', borderRadius: '12px' }} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="page-pad">
        <div className="empty-state card">
          <div className="empty-state-icon">⚠️</div>
          <h3>Access denied</h3>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-pad" style={{ maxWidth: '1200px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '26px', fontWeight: 700, margin: '0 0 4px' }}>Admin</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>Beta user monitoring</p>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 12px' }}>
          🔒 Admin only
        </div>
      </div>

      {/* Platform stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '28px' }}>
          <StatCard label="Total users"    value={stats.total_users}          sub={`+${stats.new_this_week} this week`} />
          <StatCard label="Total contacts" value={stats.total_contacts?.toLocaleString()} />
          <StatCard label="Connections"    value={stats.total_edges?.toLocaleString()} />
          <StatCard label="Agent messages" value={stats.total_agent_messages} />
          <StatCard label="Saved paths"    value={stats.total_paths} />
          <StatCard label="Outreach"       value={stats.total_outreach} />
        </div>
      )}

      {/* Plan breakdown */}
      {stats?.plans && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {Object.entries(stats.plans).map(([plan, count]) => (
            <div key={plan} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}>
              <PlanBadge plan={plan} status="active" />
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{count} user{count !== 1 ? 's' : ''}</span>
            </div>
          ))}
        </div>
      )}

      {/* User table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <input
            className="input"
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: '280px', fontSize: '13px', padding: '7px 12px' }}
          />
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{filtered.length} user{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['User', 'Plan', 'Contacts', 'Edges', 'AI msgs', 'Outreach', 'Last active'].map((h, i) => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: i > 1 ? 'right' : 'left', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No users yet</td>
                </tr>
              ) : (
                filtered.map(u => (
                  <UserRow key={u.id} user={u} onClick={setSelected} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <UserDetail
          user={selected}
          onClose={() => setSelected(null)}
          onDelete={id => setUsers(prev => prev.filter(u => u.id !== id))}
          onPlanChange={handlePlanChange}
        />
      )}
    </div>
  )
}
