import { useState } from 'react'

export default function DraftMessageModal({ path, target, onClose }) {
  const [message, setMessage] = useState(
    `Hi ${target?.first_name},\n\nI came across your profile and I'd love to connect. I noticed we share ${target?.mutual || 'some'} mutual connections — would you be open to a quick chat?\n\nBest,\nJordan`
  )
  const [sent, setSent] = useState(false)

  function handleSend() {
    setSent(true)
    setTimeout(onClose, 1800)
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h3
              style={{
                fontFamily: 'Syne, sans-serif',
                fontSize: '18px',
                fontWeight: 700,
                margin: '0 0 4px',
              }}
            >
              Draft intro message
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
              Sending via LinkedIn to {target?.first_name} {target?.last_name}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Path chain preview */}
        {path && path.length > 0 && (
          <div
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '14px 16px',
              marginBottom: '16px',
            }}
          >
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Your path
            </div>
            <div className="path-chain" style={{ gap: '0' }}>
              {path.map((person, i) => (
                <div key={person.id} style={{ display: 'flex', alignItems: 'center' }}>
                  <div className="path-node">
                    <div
                      className={`path-node-avatar ${i === 0 || i === path.length - 1 ? 'highlighted' : ''}`}
                      style={{ width: '36px', height: '36px', fontSize: '12px' }}
                    >
                      {person.avatar}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', maxWidth: '48px', textAlign: 'center', lineHeight: 1.2 }}>
                      {person.first_name}
                    </div>
                  </div>
                  {i < path.length - 1 && (
                    <div className="path-edge-line" style={{ minWidth: '20px', top: '-10px' }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Message textarea */}
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={7}
          style={{
            width: '100%',
            background: 'var(--bg-input)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            color: 'var(--text-primary)',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '14px',
            lineHeight: 1.6,
            padding: '12px 14px',
            resize: 'vertical',
            outline: 'none',
            boxSizing: 'border-box',
            marginBottom: '16px',
            transition: 'border-color 0.15s, box-shadow 0.15s',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = 'var(--accent)'
            e.target.style.boxShadow = '0 0 0 3px var(--accent-dim)'
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'var(--border)'
            e.target.style.boxShadow = 'none'
          }}
        />

        {sent ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px',
              background: 'rgba(52, 211, 153, 0.1)',
              border: '1px solid var(--success)',
              borderRadius: '8px',
              color: 'var(--success)',
              fontWeight: 600,
              fontSize: '14px',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8.5L6.5 12L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Message sent!
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className="btn-primary"
              style={{ flex: 1, justifyContent: 'center', fontSize: '14px' }}
              onClick={handleSend}
            >
              Send via LinkedIn
            </button>
            <button className="btn-ghost" onClick={onClose} style={{ fontSize: '14px' }}>
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
