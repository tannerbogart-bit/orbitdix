import { useNavigate } from 'react-router-dom'

export default function UpgradeModal({ message, onClose }) {
  const navigate = useNavigate()

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: '420px', textAlign: 'center' }}>
        {/* Icon */}
        <div style={{
          width: '52px', height: '52px', borderRadius: '14px',
          background: 'var(--accent-dim)', border: '1px solid var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
              stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="var(--accent-dim)" />
          </svg>
        </div>

        <h3 style={{
          fontFamily: 'Syne, sans-serif', fontSize: '20px', fontWeight: 700,
          margin: '0 0 10px',
        }}>
          Upgrade to Pro
        </h3>
        <p style={{
          fontSize: '14px', color: 'var(--text-secondary)',
          lineHeight: 1.6, margin: '0 0 28px',
        }}>
          {message || 'This feature requires a Pro plan.'}
        </p>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn-primary"
            style={{ flex: 1, justifyContent: 'center', fontSize: '14px', padding: '12px' }}
            onClick={() => { onClose(); navigate('/pricing') }}
          >
            See plans →
          </button>
          <button
            className="btn-ghost"
            style={{ fontSize: '14px' }}
            onClick={onClose}
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  )
}
