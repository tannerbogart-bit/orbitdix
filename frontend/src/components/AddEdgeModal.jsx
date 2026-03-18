import { useState, useMemo } from 'react'
import { api } from '../api/client'

function PersonPicker({ label, people, value, onChange, exclude }) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const pool = exclude ? people.filter(p => p.id !== exclude.id) : people
    if (!query.trim()) return pool
    const q = query.toLowerCase()
    return pool.filter(p =>
      p.first_name?.toLowerCase().includes(q) ||
      p.last_name?.toLowerCase().includes(q) ||
      (p.company || '').toLowerCase().includes(q)
    )
  }, [query, people, exclude])

  if (value) {
    const initials = ((value.first_name?.[0] || '') + (value.last_name?.[0] || '')).toUpperCase() || '?'
    return (
      <div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
          {label}
        </div>
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '10px 14px', background: 'var(--bg-input)',
            border: '1px solid var(--accent)', borderRadius: '8px',
          }}
        >
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            background: 'var(--accent-dim)', border: '1.5px solid var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '12px',
            color: 'var(--accent)', flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: '13px' }}>{value.first_name} {value.last_name}</div>
            {(value.title || value.company) && (
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {value.title || ''}{value.company ? ` · ${value.company}` : ''}
              </div>
            )}
          </div>
          <button
            onClick={() => onChange(null)}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
        {label}
      </div>
      <input
        className="input"
        placeholder="Search by name or company…"
        value={query}
        onChange={e => setQuery(e.target.value)}
        style={{ marginBottom: '8px' }}
      />
      <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
            No people found
          </div>
        ) : (
          filtered.map(p => {
            const initials = ((p.first_name?.[0] || '') + (p.last_name?.[0] || '')).toUpperCase() || '?'
            return (
              <div
                key={p.id}
                onClick={() => onChange(p)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '8px 12px', borderRadius: '7px', cursor: 'pointer',
                  background: 'var(--bg-input)', border: '1px solid var(--border)',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: 'var(--accent-dim)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontFamily: 'Syne, sans-serif',
                  fontWeight: 700, fontSize: '11px', color: 'var(--accent)', flexShrink: 0,
                }}>
                  {initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>{p.first_name} {p.last_name}</div>
                  {(p.title || p.company) && (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {p.title || ''}{p.company ? ` · ${p.company}` : ''}
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default function AddEdgeModal({ people, onAdd, onClose, preselect }) {
  const [personA, setPersonA] = useState(preselect || null)
  const [personB, setPersonB] = useState(null)
  const [note, setNote]       = useState('')
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState(null)

  // Exclude self from both pickers — connections are between contacts
  const contacts = people.filter(p => !p.is_self)

  async function handleSave() {
    if (!personA || !personB) return
    setSaving(true)
    setError(null)
    try {
      await api.createEdge({ from_person_id: personA.id, to_person_id: personB.id, relationship_note: note || null })
      onAdd(personA, personB)
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to create connection')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '20px',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="card"
        style={{ width: '100%', maxWidth: '460px', padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '18px', fontWeight: 700, margin: 0 }}>
            Add connection
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <PersonPicker label="Person A" people={contacts} value={personA} onChange={setPersonA} exclude={personB} />

        {/* Arrow */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 3v10M4 9l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        </div>

        <PersonPicker label="Person B" people={contacts} value={personB} onChange={setPersonB} exclude={personA} />

        {/* Relationship context */}
        <div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
            How do they know each other? <span style={{ textTransform: 'none', fontWeight: 400 }}>(optional)</span>
          </div>
          <input
            className="input"
            placeholder="e.g. Worked together at Acme 2019–2021, Stanford CS '15…"
            value={note}
            onChange={e => setNote(e.target.value)}
          />
        </div>

        {error && (
          <div style={{ fontSize: '13px', color: '#f87171', padding: '8px 12px', background: 'rgba(248,113,113,0.1)', borderRadius: '6px', border: '1px solid rgba(248,113,113,0.2)' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
          <button className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary"
            style={{ flex: 1, justifyContent: 'center' }}
            disabled={!personA || !personB || saving}
            onClick={handleSave}
          >
            {saving ? 'Saving…' : 'Connect'}
          </button>
        </div>
      </div>
    </div>
  )
}
