import { useState, useEffect, useMemo } from 'react'
import { api } from '../api/client'

const TYPE_META = {
  path_found:        { emoji: '🔗', label: 'Path found',       color: 'var(--accent)',  bg: 'var(--accent-dim)',           filter: 'Paths'       },
  message_drafted:   { emoji: '✉️', label: 'Message drafted',  color: 'var(--success)', bg: 'var(--success-dim)',        filter: 'Messages'    },
  connection_added:  { emoji: '⚡', label: 'Connection added', color: 'var(--warning)', bg: 'var(--warning-dim)',        filter: 'Connections' },
  person_imported:   { emoji: '📥', label: 'Import',           color: 'var(--accent)',  bg: 'var(--accent-dim)',           filter: 'Imports'     },
}

const FILTERS = ['All', 'Paths', 'Messages', 'Connections', 'Imports']

function timeAgo(isoString) {
  const diff = Math.floor((Date.now() - new Date(isoString)) / 1000)
  if (diff < 60)   return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function dateGroup(isoString) {
  const now  = new Date()
  const date = new Date(isoString)
  const todayStart     = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterdayStart = new Date(todayStart - 86400000)
  const weekStart      = new Date(todayStart - 6 * 86400000)
  if (date >= todayStart)     return 'Today'
  if (date >= yesterdayStart) return 'Yesterday'
  if (date >= weekStart)      return 'This week'
  return 'Earlier'
}

function groupActivities(items) {
  const ORDER = ['Today', 'Yesterday', 'This week', 'Earlier']
  const groups = {}
  for (const item of items) {
    const g = dateGroup(item.created_at)
    if (!groups[g]) groups[g] = []
    groups[g].push(item)
  }
  return ORDER.filter(g => groups[g]).map(g => ({ label: g, items: groups[g] }))
}

export default function Activity() {
  const [activities, setActivities] = useState([])
  const [loading, setLoading]       = useState(true)
  const [filter, setFilter]         = useState('All')

  useEffect(() => {
    api.listActivity()
      .then(data => setActivities(data.activities || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    if (filter === 'All') return activities
    return activities.filter(a => TYPE_META[a.type]?.filter === filter)
  }, [activities, filter])

  const grouped = useMemo(() => groupActivities(filtered), [filtered])

  if (loading) {
    return (
      <div className="page-pad" style={{ maxWidth: '680px' }}>
        <div className="skeleton skeleton-title" style={{ width: '120px', marginBottom: '8px' }} />
        <div className="skeleton skeleton-text" style={{ width: '220px', marginBottom: '28px' }} />
        <div className="card" style={{ overflow: 'hidden' }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', borderBottom: i < 4 ? '1px solid var(--border-subtle)' : 'none' }}>
              <div className="skeleton" style={{ width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton skeleton-text" style={{ width: '50%' }} />
                <div className="skeleton skeleton-text" style={{ width: '30%', marginBottom: 0 }} />
              </div>
              <div className="skeleton skeleton-text" style={{ width: '48px', marginBottom: 0 }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="page-pad" style={{ maxWidth: '600px' }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '26px', fontWeight: 700, margin: '0 0 4px' }}>Activity</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 32px' }}>Your networking activity will appear here.</p>
        <div className="empty-state card">
          <div className="empty-state-icon">📭</div>
          <h3>No activity yet</h3>
          <p>Find paths, draft messages, and add connections — it'll all show up here.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-pad" style={{ maxWidth: '680px' }}>
      <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '26px', fontWeight: 700, margin: '0 0 4px' }}>Activity</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 24px' }}>
        Your recent networking activity.
      </p>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="badge"
            style={{
              background: filter === f ? 'var(--accent-dim)' : 'var(--bg-card)',
              color: filter === f ? 'var(--accent)' : 'var(--text-secondary)',
              border: `1px solid ${filter === f ? 'var(--accent)' : 'var(--border)'}`,
              cursor: 'pointer', fontSize: '13px', padding: '6px 14px',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {grouped.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-state-icon">🔍</div>
          <h3>No {filter.toLowerCase()} activity</h3>
          <p>Nothing here yet for this filter.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {grouped.map(({ label, items }) => (
            <div key={label}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                {label}
              </div>
              <div className="card" style={{ overflow: 'hidden' }}>
                {items.map((item, i) => {
                  const meta = TYPE_META[item.type] || TYPE_META.path_found
                  return (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '14px',
                        padding: '16px 20px',
                        borderBottom: i < items.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '10px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '16px', flexShrink: 0, background: meta.bg,
                      }}>
                        {meta.emoji}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '2px' }}>{item.text}</div>
                        <span style={{ fontSize: '12px', color: meta.color }}>{meta.label}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {timeAgo(item.created_at)}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
