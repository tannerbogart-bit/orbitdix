// Main app shell — sidebar + page content
import { useState, useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import { api } from '../api/client'

const STALE_DAYS = 30

function daysSince(isoStr) {
  if (!isoStr) return null
  const ms = Date.now() - new Date(isoStr).getTime()
  return Math.floor(ms / 86400000)
}

export default function Shell() {
  const navigate = useNavigate()
  const [unverified, setUnverified] = useState(false)
  const [resent, setResent]         = useState(false)
  const [staleDays, setStaleDays]   = useState(null)   // null = not stale / not loaded
  const [staleDismissed, setStaleDismissed] = useState(false)

  useEffect(() => {
    api.me().then(d => {
      if (d.user && d.user.email_verified === false) setUnverified(true)
    }).catch(() => {})

    api.getStats().then(d => {
      const days = daysSince(d.last_synced_at)
      // Only show banner when data is genuinely stale (>30 days since last sync)
      if (d.connections > 0 && days !== null && days > STALE_DAYS) {
        setStaleDays(days)
      }
    }).catch(() => {})
  }, [])

  async function handleResend() {
    try {
      await api.resendVerification()
      setResent(true)
    } catch {}
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <main
        style={{
          flex: 1,
          overflow: 'auto',
          background: 'var(--bg-base)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Stale data banner */}
        {staleDays !== null && !staleDismissed && (
          <div style={{
            background: 'rgba(124,110,224,0.07)',
            borderBottom: '1px solid rgba(124,110,224,0.2)',
            padding: '9px 24px',
            display: 'flex', alignItems: 'center', gap: '10px',
            fontSize: '13px', color: 'var(--text-secondary)', flexShrink: 0,
          }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" stroke="var(--accent)" strokeWidth="1.4"/>
              <path d="M8 4v4.5l2.5 1.5" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <span>
              {staleDays === null
                ? 'Your network has never been synced.'
                : `Your network data is ${staleDays} days old.`}
              {' '}
              <a
                href="https://www.linkedin.com/mynetwork/invite-connect/connections/"
                target="_blank"
                rel="noreferrer"
                style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}
              >
                Visit LinkedIn connections
              </a>
              {' '}to auto-sync via the extension.
            </span>
            <button
              onClick={() => setStaleDismissed(true)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginLeft: 'auto', padding: '2px', lineHeight: 1 }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Unverified email banner */}
        {unverified && (
          <div style={{
            background: 'rgba(251,191,36,0.08)',
            borderBottom: '1px solid rgba(251,191,36,0.3)',
            padding: '10px 24px',
            display: 'flex', alignItems: 'center', gap: '12px',
            fontSize: '13px', color: '#fbbf24', flexShrink: 0,
          }}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <path d="M8 1l7 13H1L8 1z" stroke="#fbbf24" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M8 6v4M8 11.5v.5" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span>Please verify your email to keep full access.</span>
            {resent ? (
              <span style={{ color: 'rgba(251,191,36,0.7)' }}>Verification email sent!</span>
            ) : (
              <button
                onClick={handleResend}
                style={{ background: 'none', border: 'none', color: '#fbbf24', cursor: 'pointer', fontWeight: 600, padding: 0, fontSize: '13px', textDecoration: 'underline' }}
              >
                Resend
              </button>
            )}
            <button
              onClick={() => setUnverified(false)}
              style={{ background: 'none', border: 'none', color: 'rgba(251,191,36,0.5)', cursor: 'pointer', marginLeft: 'auto', padding: '2px' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Ambient glow */}
        <div
          style={{
            position: 'fixed', top: '-10%', right: '-5%',
            width: '600px', height: '500px', borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(124,110,224,0.05) 0%, transparent 70%)',
            pointerEvents: 'none', zIndex: 0,
          }}
        />
        <div style={{ position: 'relative', zIndex: 1, flex: 1 }}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
