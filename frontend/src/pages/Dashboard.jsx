import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import UpgradeModal from '../components/UpgradeModal'

const ACTIVITY_META = {
  path_found:        { emoji: '🔗', color: 'var(--accent)' },
  message_drafted:   { emoji: '✉️', color: 'var(--success)' },
  connection_added:  { emoji: '⚡', color: 'var(--warning)' },
  person_imported:   { emoji: '📥', color: 'var(--accent)' },
}

function timeAgo(isoString) {
  const diff = Math.floor((Date.now() - new Date(isoString)) / 1000)
  if (diff < 60)    return `${diff}s ago`
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function StatCard({ label, value, delta }) {
  return (
    <div className="card" style={{ padding: '20px 24px' }}>
      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>{label}</div>
      <div
        style={{
          fontFamily: 'Syne, sans-serif',
          fontSize: '28px',
          fontWeight: 700,
          color: 'var(--text-primary)',
          lineHeight: 1,
          marginBottom: '8px',
        }}
      >
        {value}
      </div>
      {delta && (
        <span className="badge badge-success" style={{ fontSize: '11px' }}>
          ↑ {delta}
        </span>
      )}
    </div>
  )
}


export default function Dashboard() {
  const navigate = useNavigate()
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [stats, setStats]           = useState({ connections: '…' })
  const [activities, setActivities] = useState(null)
  const [userName, setUserName]     = useState(localStorage.getItem('user_first_name') || '')
  const [showUpgrade, setShowUpgrade] = useState(false)

  useEffect(() => {
    api.getStats().then(setStats).catch(() => {})
    api.listActivity().then(d => setActivities((d.activities || []).slice(0, 5))).catch(() => setActivities([]))
    api.listPeople().then(data => {
      const self = (data.people || []).find(p => p.is_self)
      if (self?.first_name) {
        setUserName(self.first_name)
        localStorage.setItem('user_first_name', self.first_name)
      }
    }).catch(() => {})
  }, [])

  return (
    <div className="page-pad" style={{ maxWidth: '900px' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1
          style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: '26px',
            fontWeight: 700,
            margin: '0 0 4px',
          }}
        >
          Good morning{userName ? `, ${userName}` : ''} 👋
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
          Here&apos;s what&apos;s happening in your network today.
        </p>
      </div>

      {/* Chrome extension sync banner */}
      {!bannerDismissed && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(124,110,224,0.15) 0%, rgba(96,165,250,0.08) 100%)',
            border: '1px solid var(--accent)',
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 12px var(--accent-glow)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="3" fill="white" />
              <circle cx="9" cy="9" r="7" stroke="white" strokeWidth="1.5" fill="none" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px' }}>
              Sync with Chrome extension
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Install the OrbitSix extension to automatically keep your network map up to date.
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <button
              className="btn-primary"
              style={{ fontSize: '13px', padding: '8px 14px' }}
              onClick={() => navigate('/auth/install-extension')}
            >
              Install now
            </button>
            <button
              className="btn-ghost"
              style={{ fontSize: '13px', padding: '8px 14px' }}
              onClick={() => setBannerDismissed(true)}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="stats-grid-3">
        <StatCard label="Connections"      value={stats.connections?.toLocaleString()     ?? '…'} />
        <StatCard label="Paths Found"      value={stats.paths_found?.toLocaleString()     ?? '—'} />
        <StatCard label="Messages Drafted" value={stats.messages_drafted?.toLocaleString() ?? '—'} />
      </div>

      {/* Free plan usage meter */}
      {stats.paths_limit && (
        <div
          className="card"
          style={{ padding: '16px 20px', marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '16px' }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>Path searches this month</span>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                {stats.paths_this_month ?? 0} / {stats.paths_limit}
              </span>
            </div>
            <div style={{ height: '6px', background: 'var(--bg-input)', borderRadius: '99px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, ((stats.paths_this_month ?? 0) / stats.paths_limit) * 100)}%`,
                background: (stats.paths_this_month ?? 0) >= stats.paths_limit ? 'var(--danger)' : 'var(--accent)',
                borderRadius: '99px',
                transition: 'width 0.3s',
              }} />
            </div>
          </div>
          <button
            className="btn-primary"
            style={{ fontSize: '12px', padding: '7px 14px', whiteSpace: 'nowrap', flexShrink: 0 }}
            onClick={() => setShowUpgrade(true)}
          >
            Upgrade →
          </button>
        </div>
      )}

      {/* Quick actions */}
      <div style={{ marginBottom: '28px' }}>
        <h2
          style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: '16px',
            fontWeight: 600,
            margin: '0 0 14px',
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          Quick actions
        </h2>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            className="btn-primary"
            onClick={() => navigate('/find-path')}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="3" cy="8" r="2" stroke="white" strokeWidth="1.5" />
              <circle cx="13" cy="8" r="2" stroke="white" strokeWidth="1.5" />
              <path d="M5 8h6" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Find a Path
          </button>
          <button
            className="btn-ghost"
            onClick={() => navigate('/network')}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="8" cy="1.5" r="1.5" fill="currentColor" />
              <circle cx="8" cy="14.5" r="1.5" fill="currentColor" />
              <circle cx="1.5" cy="8" r="1.5" fill="currentColor" />
              <circle cx="14.5" cy="8" r="1.5" fill="currentColor" />
            </svg>
            View Network
          </button>
          <button
            className="btn-ghost"
            onClick={async () => {
              try {
                const data = await api.manageBilling()
                window.location.href = data.url
              } catch (err) {
                navigate('/pricing')
              }
            }}
          >
            Manage billing
          </button>
        </div>
      </div>

      {/* Agent CTA */}
      <div
        className="card"
        style={{
          padding: '20px 24px',
          marginBottom: '28px',
          background: 'linear-gradient(135deg, rgba(124,110,224,0.1) 0%, rgba(96,165,250,0.05) 100%)',
          borderColor: 'rgba(124,110,224,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          cursor: 'pointer',
        }}
        onClick={() => navigate('/agent')}
      >
        <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 14px var(--accent-glow)' }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="3" fill="white" />
            <circle cx="9" cy="9" r="7" stroke="white" strokeWidth="1.5" fill="none" />
            <circle cx="9" cy="2" r="1.5" fill="white" />
            <circle cx="9" cy="16" r="1.5" fill="white" />
            <circle cx="2" cy="9" r="1.5" fill="white" />
            <circle cx="16" cy="9" r="1.5" fill="white" />
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px' }}>
            AI Network Agent
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Get connection recommendations, gap analysis, and intro strategies tailored to your targets.
          </div>
        </div>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: 'var(--accent)', flexShrink: 0 }}>
          <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* Recent activity */}
      <div>
        <h2
          style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: '16px',
            fontWeight: 600,
            margin: '0 0 14px',
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          Recent activity
        </h2>
        {activities === null ? (
          <div className="card" style={{ padding: '24px', color: 'var(--text-muted)', fontSize: '14px' }}>Loading…</div>
        ) : activities.length === 0 ? (
          <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
            Start finding paths and sending messages to see activity here.
          </div>
        ) : (
          <div className="card" style={{ overflow: 'hidden' }}>
            {activities.map((item, i) => {
              const meta = ACTIVITY_META[item.type] || ACTIVITY_META.path_found
              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '14px',
                    padding: '14px 20px',
                    borderBottom: i < activities.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                  }}
                >
                  <div style={{ fontSize: '18px', width: '28px', textAlign: 'center', flexShrink: 0 }}>{meta.emoji}</div>
                  <div style={{ flex: 1, fontSize: '13px', color: 'var(--text-primary)' }}>{item.text}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{timeAgo(item.created_at)}</div>
                </div>
              )
            })}
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-subtle)' }}>
              <button className="btn-ghost" style={{ fontSize: '12px', padding: '6px 12px' }} onClick={() => navigate('/activity')}>
                View all activity →
              </button>
            </div>
          </div>
        )}
      </div>

      {showUpgrade && (
        <UpgradeModal
          message="Upgrade to Pro for unlimited path searches, saved paths, AI-drafted messages, and more."
          onClose={() => setShowUpgrade(false)}
        />
      )}
    </div>
  )
}
