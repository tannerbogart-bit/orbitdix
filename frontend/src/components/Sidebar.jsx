import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { api } from '../api/client'

const NAV = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="1" y="1" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <rect x="10" y="1" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <rect x="1" y="10" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <rect x="10" y="10" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    to: '/agent',
    label: 'AI Agent',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="9" cy="2" r="1.5" fill="currentColor" />
        <circle cx="9" cy="16" r="1.5" fill="currentColor" />
        <circle cx="2" cy="9" r="1.5" fill="currentColor" />
        <circle cx="16" cy="9" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    to: '/find-path',
    label: 'Find a Path',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="3.5" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="14.5" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M6 9h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="9" cy="4" r="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3.5 6.5 L9 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M14.5 6.5 L9 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    to: '/network',
    label: 'My Network',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="9" cy="1.5" r="1.5" fill="currentColor" />
        <circle cx="9" cy="16.5" r="1.5" fill="currentColor" />
        <circle cx="1.5" cy="9" r="1.5" fill="currentColor" />
        <circle cx="16.5" cy="9" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    to: '/saved',
    label: 'Saved Paths',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path
          d="M3 2h12a1 1 0 0 1 1 1v13l-7-3.5L2 16V3a1 1 0 0 1 1-1z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    to: '/targets',
    label: 'Targets',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="9" cy="9" r="4" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="9" cy="9" r="1.5" fill="currentColor"/>
      </svg>
    ),
  },
  {
    to: '/outreach',
    label: 'Outreach',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M2 4h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M1 5l8 6 8-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    to: '/team',
    label: 'Team',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="6" r="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3 16c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="14.5" cy="5" r="2" stroke="currentColor" strokeWidth="1.25" />
        <path d="M16.5 13c0-2.209-0.9-4-2-4.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    to: '/activity',
    label: 'Activity',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path
          d="M1 10h3l2-6 3 10 2-8 2 4h4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const [user, setUser] = useState(() => {
    // Seed from localStorage so it shows immediately on load
    const firstName = localStorage.getItem('user_first_name') || ''
    const lastName  = localStorage.getItem('user_last_name')  || ''
    const email     = localStorage.getItem('user_email')      || ''
    return { firstName, lastName, email }
  })
  const [isMax, setIsMax] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    api.me().then(data => {
      const firstName = localStorage.getItem('user_first_name') || ''
      const lastName  = localStorage.getItem('user_last_name')  || ''
      setUser({ firstName, lastName, email: data.user?.email || '' })
    }).catch(() => {})

    // Also pull from people list to get first/last name
    api.listPeople().then(data => {
      const self = (data.people || []).find(p => p.is_self)
      if (self) {
        localStorage.setItem('user_first_name', self.first_name || '')
        localStorage.setItem('user_last_name',  self.last_name  || '')
        setUser(prev => ({ ...prev, firstName: self.first_name || '', lastName: self.last_name || '' }))
      }
    }).catch(() => {})

    api.getStats().then(d => setIsMax(!!d.is_max)).catch(() => {})

    // Detect admin status — silently check; 403 means not admin
    api.adminStats().then(() => setIsAdmin(true)).catch(() => {})
  }, [])

  const initials = ((user.firstName?.[0] || '') + (user.lastName?.[0] || '')).toUpperCase() || '?'
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'You'

  return (
    <aside
      className="app-sidebar"
      style={{
        background: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        overflow: 'hidden',
      }}
    >
      {/* Logo */}
      <div
        className="logo-wrap"
        style={{
          padding: '20px 18px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          borderBottom: '1px solid var(--border-subtle)',
          cursor: 'pointer',
        }}
        onClick={() => navigate('/dashboard')}
      >
        <div
          style={{
            width: '30px',
            height: '30px',
            borderRadius: '8px',
            background: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 12px var(--accent-glow)',
            flexShrink: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="3" fill="white" />
            <circle cx="9" cy="9" r="7" stroke="white" strokeWidth="1.5" fill="none" />
            <circle cx="9" cy="2" r="1.5" fill="white" />
            <circle cx="9" cy="16" r="1.5" fill="white" />
            <circle cx="2" cy="9" r="1.5" fill="white" />
            <circle cx="16" cy="9" r="1.5" fill="white" />
          </svg>
        </div>
        <span
          className="logo-text"
          style={{
            fontFamily: 'Syne, sans-serif',
            fontWeight: 700,
            fontSize: '17px',
            color: 'var(--text-primary)',
            letterSpacing: '-0.2px',
          }}
        >
          OrbitSix
        </span>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 10px', overflow: 'auto' }}>
        {NAV.map((item) => {
          const isTeam = item.to === '/team'
          if (isTeam && !isMax) {
            return (
              <div
                key={item.to}
                title="Upgrade to Max to access Team"
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '9px 10px', borderRadius: '8px', marginBottom: '2px',
                  color: 'var(--text-muted)',
                  fontFamily: 'DM Sans, sans-serif', fontWeight: 400, fontSize: '14px',
                  cursor: 'not-allowed', opacity: 0.45,
                }}
              >
                {item.icon}
                <span className="nav-label">{item.label}</span>
                <span style={{ marginLeft: 'auto', fontSize: '10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '4px', padding: '1px 5px', color: 'var(--text-muted)' }}>Max</span>
              </div>
            )
          }
          return (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '9px 10px',
                borderRadius: '8px',
                marginBottom: '2px',
                color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                background: isActive ? 'var(--accent-dim)' : 'transparent',
                fontFamily: 'DM Sans, sans-serif',
                fontWeight: isActive ? 600 : 400,
                fontSize: '14px',
                textDecoration: 'none',
                transition: 'background 0.15s, color 0.15s',
              })}
            >
              {item.icon}
              <span className="nav-label">{item.label}</span>
            </NavLink>
          )
        })}
      </nav>

      {/* Admin link — only visible if ADMIN_EMAILS matches */}
      {isAdmin && (
        <NavLink
          to="/admin"
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '9px 10px',
            borderRadius: '8px',
            marginBottom: '2px',
            marginTop: '8px',
            color: isActive ? 'var(--accent)' : 'var(--text-muted)',
            background: isActive ? 'var(--accent-dim)' : 'transparent',
            fontFamily: 'DM Sans, sans-serif',
            fontWeight: isActive ? 600 : 400,
            fontSize: '13px',
            textDecoration: 'none',
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: '12px',
            marginTop: '6px',
          })}
        >
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
            <rect x="1" y="1" width="16" height="4" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="1" y="8" width="7" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="10" y="8" width="7" height="4" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
          <span className="nav-label">Admin</span>
        </NavLink>
      )}

      {/* Feedback link */}
      <div style={{ padding: '6px 14px 2px', textAlign: 'center' }}>
        <a
          href="mailto:hello@orbitsix.com?subject=OrbitSix Feedback"
          style={{ fontSize: '11px', color: 'var(--text-muted)', textDecoration: 'none' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          Send feedback
        </a>
      </div>

      {/* User → Settings */}
      <div
        className="user-wrap"
        onClick={() => navigate('/settings')}
        style={{
          padding: '12px 14px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          cursor: 'pointer',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'var(--accent-dim)',
            border: '1.5px solid var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Syne, sans-serif',
            fontWeight: 700,
            fontSize: '12px',
            color: 'var(--accent)',
            flexShrink: 0,
          }}
        >
          {initials}
        </div>
        <div className="user-info" style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {displayName}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</div>
        </div>
      </div>
    </aside>
  )
}
