// Main app shell — sidebar + page content
import { useState, useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import { api } from '../api/client'

export default function Shell() {
  const navigate = useNavigate()
  const [unverified, setUnverified] = useState(false)
  const [resent, setResent]         = useState(false)

  useEffect(() => {
    api.me().then(d => {
      if (d.user && d.user.email_verified === false) setUnverified(true)
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
