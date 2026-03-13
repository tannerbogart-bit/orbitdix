import { mockActivity } from '../data/mockData'

const TYPE_META = {
  path_found:   { emoji: '🔗', label: 'Path found',    color: 'var(--accent)'  },
  message_sent: { emoji: '✉️', label: 'Message sent',  color: 'var(--success)' },
  connection:   { emoji: '⚡', label: 'New connection', color: 'var(--warning)' },
}

export default function Activity() {
  if (mockActivity.length === 0) {
    return (
      <div style={{ padding: '32px', maxWidth: '600px' }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '26px', fontWeight: 700, margin: '0 0 4px' }}>
          Activity
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 48px' }}>
          Your networking activity will appear here.
        </p>
        <div style={{ textAlign: 'center', padding: '60px 40px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '20px', fontWeight: 700, margin: '0 0 8px' }}>
            No activity yet
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Start finding paths and sending messages to see activity here.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '32px', maxWidth: '680px' }}>
      <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '26px', fontWeight: 700, margin: '0 0 4px' }}>
        Activity
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 24px' }}>
        Your recent networking activity
      </p>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {['All', 'Paths', 'Messages', 'Connections'].map((f) => (
          <button
            key={f}
            className="badge"
            style={{
              background: f === 'All' ? 'var(--accent-dim)' : 'var(--bg-card)',
              color: f === 'All' ? 'var(--accent)' : 'var(--text-secondary)',
              border: `1px solid ${f === 'All' ? 'var(--accent)' : 'var(--border)'}`,
              cursor: 'pointer',
              fontSize: '13px',
              padding: '6px 14px',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {mockActivity.map((item, i) => {
          const meta = TYPE_META[item.type] || TYPE_META.path_found
          return (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '16px 20px',
                borderBottom: i < mockActivity.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  flexShrink: 0,
                  background:
                    item.type === 'path_found'   ? 'var(--accent-dim)' :
                    item.type === 'message_sent' ? 'rgba(52,211,153,0.1)' :
                                                   'rgba(251,191,36,0.1)',
                }}
              >
                {meta.emoji}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '2px' }}>
                  {item.text}
                </div>
                <span
                  className="badge"
                  style={{
                    background: 'transparent',
                    padding: '0',
                    fontSize: '12px',
                    color: meta.color,
                  }}
                >
                  {meta.label}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                {item.time}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
