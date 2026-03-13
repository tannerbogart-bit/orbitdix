// Step 4 — Install Chrome Extension
import { useNavigate } from 'react-router-dom'
import AuthShell from './AuthShell'

export default function InstallExtension() {
  const navigate = useNavigate()

  return (
    <AuthShell step={4} totalSteps={5}>
      <h2
        style={{
          fontFamily: 'Syne, sans-serif',
          fontSize: '22px',
          fontWeight: 700,
          margin: '0 0 10px',
        }}
      >
        Install the Chrome extension
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 24px' }}>
        OrbitSix works best with the browser extension — it syncs your LinkedIn
        activity and keeps your network map up to date automatically.
      </p>

      {/* Extension card */}
      <div
        style={{
          background: 'var(--bg-input)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'var(--accent-dim)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="4" fill="var(--accent)" />
            <circle cx="12" cy="12" r="9" stroke="var(--accent)" strokeWidth="1.5" fill="none" />
            <circle cx="12" cy="3" r="2" fill="var(--accent)" />
            <circle cx="12" cy="21" r="2" fill="var(--accent)" />
            <circle cx="3" cy="12" r="2" fill="var(--accent)" />
            <circle cx="21" cy="12" r="2" fill="var(--accent)" />
          </svg>
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: '15px', marginBottom: '2px' }}>OrbitSix for Chrome</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Auto-sync · Path alerts · 1-click intros
          </div>
        </div>
      </div>

      {/* Features */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px' }}>
        {[
          'Automatically sync new connections',
          'Get notified when paths open up',
          'Send intro messages without leaving LinkedIn',
        ].map((f) => (
          <div
            key={f}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '14px',
              color: 'var(--text-secondary)',
            }}
          >
            <div
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: 'rgba(52, 211, 153, 0.1)',
                border: '1px solid var(--success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 5.5L4 7.5L8 3" stroke="var(--success)" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            {f}
          </div>
        ))}
      </div>

      <button
        className="btn-primary"
        style={{ width: '100%', justifyContent: 'center', fontSize: '15px', padding: '12px', marginBottom: '10px' }}
        onClick={() => navigate('/auth/syncing')}
      >
        Add to Chrome
      </button>
      <button
        className="btn-ghost"
        style={{ width: '100%', justifyContent: 'center', fontSize: '14px' }}
        onClick={() => navigate('/auth/syncing')}
      >
        Skip for now
      </button>
    </AuthShell>
  )
}
