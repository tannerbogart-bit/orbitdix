import { useState } from 'react'
import { api } from '../api/client'

function buildMessage(target, path, edges = []) {
  if (!path || path.length < 2) {
    return `Hi ${target?.first_name},\n\nI'd love to connect and learn more about your work. Would you be open to a quick chat?\n\nBest`
  }

  // Build edge note map
  const edgeNoteMap = {}
  for (const e of edges) {
    const key = `${Math.min(e.from_person_id, e.to_person_id)}-${Math.max(e.from_person_id, e.to_person_id)}`
    if (e.relationship_note) edgeNoteMap[key] = e.relationship_note
  }

  // The first hop is always: me → connector (path[1])
  const connector = path[1]
  const connectorNote = (() => {
    if (path.length < 2) return null
    const key = `${Math.min(path[0].id, path[1].id)}-${Math.max(path[0].id, path[1].id)}`
    return edgeNoteMap[key] || null
  })()

  // The last hop: path[n-2] → target
  const introducerToTarget = path.length > 2 ? path[path.length - 2] : connector
  const introducerNote = (() => {
    if (path.length < 2) return null
    const a = path[path.length - 2], b = path[path.length - 1]
    const key = `${Math.min(a.id, b.id)}-${Math.max(a.id, b.id)}`
    return edgeNoteMap[key] || null
  })()

  const connectorContext = connectorNote ? ` (${connectorNote})` : ''
  const introducerContext = introducerNote
    ? ` I understand you two know each other — ${introducerNote}.`
    : ''

  if (path.length === 2) {
    // Direct: me → target — no intermediary, just a direct cold message
    return `Hi ${target?.first_name},\n\nI came across your profile and wanted to reach out directly. I'd love to connect and hear more about your work.\n\nWould you be open to a quick chat?\n\nBest`
  }

  const via = introducerToTarget.first_name !== connector.first_name
    ? `${connector.first_name}${connectorContext} → ${introducerToTarget.first_name}`
    : `${connector.first_name}${connectorContext}`

  return `Hi ${connector?.first_name},\n\nI hope you're doing well! I'm trying to get an intro to ${target?.first_name} ${target?.last_name}${introducerContext}\n\nWould you be able to make an introduction? I'd love to connect with them about [your reason].\n\nPath: ${via} → ${target?.first_name}\n\nThanks so much!`
}

export default function DraftMessageModal({ path, target, edges = [], onClose }) {
  const [message, setMessage] = useState(() => buildMessage(target, path, edges))
  const [sent, setSent] = useState(false)

  function handleSend() {
    setSent(true)
    api.recordMessageDrafted().catch(() => {})
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
