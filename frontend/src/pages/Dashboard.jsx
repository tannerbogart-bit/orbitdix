import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'

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
  const [stats, setStats]   = useState({ connections: '…' })
  const [userName, setUserName] = useState(localStorage.getItem('user_first_name') || '')

  useEffect(() => {
    api.getStats().then(setStats).catch(() => {})
    api.listPeople().then(data => {
      const self = (data.people || []).find(p => p.is_self)
      if (self?.first_name) {
        setUserName(self.first_name)
        localStorage.setItem('user_first_name', self.first_name)
      }
    }).catch(() => {})
  }, [])

  return (
    <div style={{ padding: '32px', maxWidth: '900px' }}>
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
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        <StatCard label="Connections"   value={stats.connections?.toLocaleString() ?? '…'} />
        <StatCard label="Paths Found"   value="—" />
        <StatCard label="Messages Sent" value="—" />
      </div>

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
        </div>
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
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
          Activity tracking coming soon.
        </div>
      </div>
    </div>
  )
}
