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
    free:  { bg: 'var(--bg-input)',    color: 'var(--text-muted)',      border: 'var(--border)' },
    pro:   { bg: 'var(--accent-dim)',  color: 'var(--accent)',           border: 'var(--accent)' },
    max:   { bg: 'var(--success-dim)', color: 'var(--success)',          border: 'var(--success)' },
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

function UserRow({ user, onClick }) {
  const isActive = user.days_since_active !== null && user.days_since_active < 3
  return (
    <tr
      onClick={() => onClick(user)}
      style={{ cursor: 'pointer', borderBottom: '1px solid var(--border-subtle)' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <td style={{ padding: '12px 16px', maxWidth: '200px' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user.email}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
          {timeAgo(user.created_at)}
          {!user.email_verified && <span style={{ color: 'var(--warning)', marginLeft: '6px' }}>unverified</span>}
        </div>
      </td>
      <td style={{ padding: '12px 16px' }}>
        <PlanBadge plan={user.plan} status={user.subscription_status} />
      </td>
      <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'right' }}>
        {user.contacts.toLocaleString()}
      </td>
      <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'right' }}>
        {user.agent_messages}
      </td>
      <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'right' }}>
        {user.saved_paths}
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

function UserDetail({ user, onClose, onDelete }) {
  const [deleting, setDeleting] = useState(false)
  const [detail, setDetail] = useState(null)

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

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
      <div style={{ width: '420px', height: '100vh', background: 'var(--bg-sidebar)', borderLeft: '1px solid var(--border)', overflowY: 'auto', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px' }}>User Detail</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '20px', lineHeight: 1 }}>×</button>
        </div>

        {/* Identity */}
        <div className="card" style={{ padding: '16px', marginBottom: '12px' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>{user.email}</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
            <PlanBadge plan={user.plan} status={user.subscription_status} />
            {user.email_verified
              ? <span className="badge badge-success">verified</span>
              : <span className="badge badge-warning">unverified</span>}
            {user.agreed_to_terms
              ? <span className="badge badge-success">ToS agreed</span>
              : <span className="badge badge-danger">no ToS</span>}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.7 }}>
            Signed up {timeAgo(user.created_at)}<br />
            {user.signup_ip && <>IP: {user.signup_ip}<br /></>}
            Last active: {user.last_active_at ? timeAgo(user.last_active_at) : 'never'}
          </div>
        </div>

        {/* Usage stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
          {[
            { label: 'Contacts',       value: user.contacts },
            { label: 'Agent messages', value: user.agent_messages },
            { label: 'Saved paths',    value: user.saved_paths },
            { label: 'Outreach',       value: user.outreach },
            { label: 'Targets',        value: user.targets },
            { label: 'Paths found',    value: user.paths_found },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: '12px 14px' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'Syne, sans-serif' }}>{s.value ?? 0}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {detail ? (
          <>
            {/* Agent context */}
            {detail.agent_context && (
              <div className="card" style={{ padding: '14px', marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Business Context</div>
                {[
                  ['Role',       detail.agent_context.my_role],
                  ['Company',    detail.agent_context.my_company],
                  ['Sells',      detail.agent_context.what_i_sell],
                  ['ICP',        detail.agent_context.icp_description],
                ].filter(([, v]) => v).map(([label, val]) => (
                  <div key={label} style={{ marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{label}: </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{val}</span>
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
  const [stats,   setStats]   = useState(null)
  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [selected, setSelected] = useState(null)
  const [search,  setSearch]  = useState('')

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

  const filtered = search.trim()
    ? users.filter(u => u.email.toLowerCase().includes(search.toLowerCase()))
    : users

  if (loading) {
    return (
      <div className="page-pad" style={{ maxWidth: '1100px' }}>
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
    <div className="page-pad" style={{ maxWidth: '1100px' }}>
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
          <StatCard label="Agent messages" value={stats.total_agent_messages}  />
          <StatCard label="Saved paths"    value={stats.total_paths}           />
          <StatCard label="Outreach sent"  value={stats.total_outreach}        />
          <StatCard label="Connections"    value={stats.total_edges?.toLocaleString()} />
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
            placeholder="Search by email…"
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
                {['Email', 'Plan', 'Contacts', 'AI msgs', 'Paths', 'Outreach', 'Last active'].map((h, i) => (
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
        />
      )}
    </div>
  )
}
