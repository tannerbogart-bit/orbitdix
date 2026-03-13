// Step 3 — Account Confirmed
import { useNavigate } from 'react-router-dom'
import AuthShell from './AuthShell'

export default function AccountConfirmed() {
  const navigate = useNavigate()

  return (
    <AuthShell step={3} totalSteps={5}>
      <div style={{ textAlign: 'center' }}>
        {/* Check icon */}
        <div
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'rgba(52, 211, 153, 0.12)',
            border: '2px solid var(--success)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            boxShadow: '0 0 28px rgba(52, 211, 153, 0.2)',
          }}
        >
          <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
            <path
              d="M7 15.5L12.5 21L23 10"
              stroke="var(--success)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h2
          style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: '24px',
            fontWeight: 700,
            margin: '0 0 10px',
          }}
        >
          Account confirmed!
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 8px' }}>
          Your LinkedIn network is ready to map.
        </p>
        <p
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            color: 'var(--success)',
            margin: '0 0 32px',
          }}
        >
          <span style={{ fontSize: '16px' }}>✓</span>
          312 connections imported
        </p>

        {/* Profile preview */}
        <div
          style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            marginBottom: '28px',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'var(--accent-dim)',
              border: '2px solid var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'Syne, sans-serif',
              fontWeight: 700,
              fontSize: '15px',
              color: 'var(--accent)',
              flexShrink: 0,
            }}
          >
            JB
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 600, fontSize: '15px' }}>Jordan Blake</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Product Manager · Acme Corp
            </div>
          </div>
        </div>

        <button
          className="btn-primary"
          style={{ width: '100%', justifyContent: 'center', fontSize: '15px', padding: '12px' }}
          onClick={() => navigate('/auth/install-extension')}
        >
          Continue →
        </button>
      </div>
    </AuthShell>
  )
}
