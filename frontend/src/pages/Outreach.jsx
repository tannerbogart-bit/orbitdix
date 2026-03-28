import { useEffect, useState } from 'react'
import { api } from '../api/client'

const STATUS_TABS = [
  { key: 'all',      label: 'All' },
  { key: 'drafted',  label: 'Drafted' },
  { key: 'sent',     label: 'Sent' },
  { key: 'replied',  label: 'Replied' },
  { key: 'no_reply', label: 'No reply' },
]

const STATUS_META = {
  drafted:  { label: 'Drafted',  color: 'var(--text-muted)',    bg: 'var(--bg-input)' },
  sent:     { label: 'Sent',     color: 'var(--accent)',        bg: 'var(--accent-dim)' },
  replied:  { label: 'Replied',  color: 'var(--success)',       bg: 'var(--success-dim)' },
  no_reply: { label: 'No reply', color: 'var(--warning)',       bg: 'var(--warning-dim)' },
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.drafted
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '99px',
      fontSize: '11px',
      fontWeight: 600,
      color: meta.color,
      background: meta.bg,
      border: `1px solid ${meta.color}`,
      whiteSpace: 'nowrap',
    }}>
      {meta.label}
    </span>
  )
}

function OutreachCard({ record, onUpdate, onDelete }) {
  const [expanded, setExpanded]     = useState(false)
  const [editNotes, setEditNotes]   = useState(false)
  const [notes, setNotes]           = useState(record.notes || '')
  const [followUp, setFollowUp]     = useState(record.follow_up_at ? record.follow_up_at.slice(0, 10) : '')
  const [saving, setSaving]         = useState(false)
  const [statusChanging, setStatusChanging] = useState(false)

  async function changeStatus(newStatus) {
    setStatusChanging(true)
    try {
      const updated = await api.updateOutreach(record.id, { status: newStatus })
      onUpdate(updated)
    } catch {/* ignore */} finally {
      setStatusChanging(false)
    }
  }

  async function saveNotes() {
    setSaving(true)
    try {
      const updated = await api.updateOutreach(record.id, {
        notes: notes,
        follow_up_at: followUp || null,
      })
      onUpdate(updated)
      setEditNotes(false)
    } catch {/* ignore */} finally {
      setSaving(false)
    }
  }

  const created = record.created_at
    ? new Date(record.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : ''

  const isOverdue = record.follow_up_at && record.status !== 'replied'
    && new Date(record.follow_up_at) < new Date()

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '16px 20px',
      marginBottom: '10px',
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>
              {record.target_name || 'Unknown'}
            </span>
            {record.target_company && (
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                @ {record.target_company}
              </span>
            )}
            <StatusBadge status={record.status} />
          </div>
          {record.via_person_name && (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>
              via {record.via_person_name}
              {record.path_summary && (
                <span style={{ marginLeft: '6px', color: 'var(--border)' }}>· {record.path_summary}</span>
              )}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{created}</span>
          <button
            onClick={() => setExpanded(e => !e)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px 4px' }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Follow-up date */}
      {record.follow_up_at && !expanded && (
        <div style={{ fontSize: '12px', marginTop: '8px', color: isOverdue ? 'var(--warning)' : 'var(--text-muted)' }}>
          {isOverdue ? '⚠ ' : ''}Follow up: {new Date(record.follow_up_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </div>
      )}

      {/* Expanded detail */}
      {expanded && (
        <div style={{ marginTop: '14px', borderTop: '1px solid var(--border)', paddingTop: '14px' }}>

          {/* Status pipeline */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
              Status
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {['drafted', 'sent', 'replied', 'no_reply'].map(s => (
                <button
                  key={s}
                  disabled={statusChanging}
                  onClick={() => record.status !== s && changeStatus(s)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '99px',
                    fontSize: '12px',
                    fontWeight: record.status === s ? 700 : 400,
                    border: `1px solid ${record.status === s ? STATUS_META[s].color : 'var(--border)'}`,
                    background: record.status === s ? STATUS_META[s].bg : 'transparent',
                    color: record.status === s ? STATUS_META[s].color : 'var(--text-muted)',
                    cursor: record.status === s ? 'default' : 'pointer',
                    fontFamily: 'DM Sans, sans-serif',
                  }}
                >
                  {STATUS_META[s].label}
                </button>
              ))}
            </div>
          </div>

          {/* Message */}
          {record.message && (
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                Message
              </div>
              <div style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '10px 12px',
                fontSize: '13px',
                color: 'var(--text-secondary)',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.6,
                maxHeight: '140px',
                overflowY: 'auto',
              }}>
                {record.message}
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(record.message).catch(() => {})}
                style={{
                  marginTop: '6px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '11px',
                  color: 'var(--accent)',
                  padding: 0,
                  fontFamily: 'DM Sans, sans-serif',
                }}
              >
                Copy message
              </button>
            </div>
          )}

          {/* Notes + follow-up */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Notes &amp; follow-up
              </div>
              {!editNotes && (
                <button
                  onClick={() => setEditNotes(true)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--accent)', padding: 0, fontFamily: 'DM Sans, sans-serif' }}
                >
                  Edit
                </button>
              )}
            </div>
            {editNotes ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Add notes…"
                  rows={3}
                  style={{
                    width: '100%',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    padding: '8px 10px',
                    resize: 'vertical',
                    fontFamily: 'DM Sans, sans-serif',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="date"
                    value={followUp}
                    onChange={e => setFollowUp(e.target.value)}
                    style={{
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      padding: '6px 10px',
                      fontFamily: 'DM Sans, sans-serif',
                      outline: 'none',
                    }}
                  />
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Follow-up date</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn-primary"
                    style={{ fontSize: '12px', padding: '6px 16px' }}
                    onClick={saveNotes}
                    disabled={saving}
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    className="btn-ghost"
                    style={{ fontSize: '12px' }}
                    onClick={() => { setEditNotes(false); setNotes(record.notes || ''); setFollowUp(record.follow_up_at ? record.follow_up_at.slice(0, 10) : '') }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {record.notes
                  ? <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{record.notes}</div>
                  : <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No notes yet</div>
                }
                {record.follow_up_at && (
                  <div style={{ fontSize: '12px', marginTop: '6px', color: isOverdue ? 'var(--warning)' : 'var(--text-muted)' }}>
                    {isOverdue ? '⚠ Overdue · ' : ''}Follow up: {new Date(record.follow_up_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Delete */}
          <button
            onClick={() => onDelete(record.id)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '12px',
              color: 'var(--danger)',
              padding: 0,
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            Remove
          </button>
        </div>
      )}
    </div>
  )
}

export default function OutreachPage() {
  const [allRecords, setAllRecords] = useState([])
  const [loading, setLoading]       = useState(true)
  const [activeTab, setActiveTab]   = useState('all')

  useEffect(() => {
    setLoading(true)
    // Always fetch all records so counts are always accurate across tabs
    api.listOutreach(null)
      .then(d => setAllRecords(d.outreach || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const records = activeTab === 'all'
    ? allRecords
    : allRecords.filter(r => r.status === activeTab)

  function handleUpdate(updated) {
    setAllRecords(prev => prev.map(r => r.id === updated.id ? updated : r))
  }

  async function handleDelete(id) {
    const snapshot = allRecords
    setAllRecords(r => r.filter(x => x.id !== id))
    try {
      await api.deleteOutreach(id)
    } catch {
      setAllRecords(snapshot)  // revert on failure
    }
  }

  const counts = {
    drafted:  allRecords.filter(r => r.status === 'drafted').length,
    sent:     allRecords.filter(r => r.status === 'sent').length,
    replied:  allRecords.filter(r => r.status === 'replied').length,
    no_reply: allRecords.filter(r => r.status === 'no_reply').length,
  }

  return (
    <div className="page-pad" style={{ maxWidth: '800px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '26px', fontWeight: 700, margin: '0 0 6px' }}>
          Outreach Tracker
        </h1>
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>
          Track messages you've drafted, sent, and received replies on.
        </p>
      </div>

      {/* Summary pills */}
      {records.length > 0 && (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {[
            { key: 'drafted',  label: `${counts.drafted} drafted`,   color: 'var(--text-muted)' },
            { key: 'sent',     label: `${counts.sent} sent`,         color: 'var(--accent)' },
            { key: 'replied',  label: `${counts.replied} replied`,   color: 'var(--success)' },
            { key: 'no_reply', label: `${counts.no_reply} no reply`, color: 'var(--warning)' },
          ].map(p => (
            <span key={p.key} style={{ fontSize: '12px', color: p.color, fontWeight: 600 }}>
              {p.label}
            </span>
          ))}
        </div>
      )}

      {/* Status tabs */}
      <div style={{
        display: 'flex',
        gap: '4px',
        background: 'var(--bg-input)',
        borderRadius: '10px',
        padding: '4px',
        marginBottom: '20px',
        width: 'fit-content',
      }}>
        {STATUS_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '6px 14px',
              borderRadius: '7px',
              border: 'none',
              background: activeTab === tab.key ? 'var(--bg-card)' : 'transparent',
              color: activeTab === tab.key ? 'var(--text-primary)' : 'var(--text-muted)',
              fontWeight: activeTab === tab.key ? 600 : 400,
              fontSize: '13px',
              cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif',
              transition: 'all 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ color: 'var(--text-muted)', fontSize: '14px', padding: '32px 0' }}>Loading…</div>
      ) : records.length === 0 ? (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '48px 32px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>✉️</div>
          <h3 style={{ margin: '0 0 8px', fontFamily: 'Syne, sans-serif' }}>No outreach yet</h3>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '360px', marginLeft: 'auto', marginRight: 'auto' }}>
            When you draft a message in the path finder, it'll show up here so you can track replies and follow-ups.
          </p>
        </div>
      ) : (
        <div>
          {records.map(r => (
            <OutreachCard
              key={r.id}
              record={r}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
