export default function Team() {
  return (
    <div style={{ padding: '32px', maxWidth: '600px' }}>
      <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '26px', fontWeight: 700, margin: '0 0 4px' }}>
        Team
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 48px' }}>
        Collaborate on networking with your team.
      </p>

      <div
        className="card"
        style={{
          padding: '48px 40px',
          textAlign: 'center',
          background:
            'linear-gradient(135deg, rgba(124,110,224,0.06) 0%, rgba(96,165,250,0.03) 100%)',
          borderStyle: 'dashed',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'var(--accent-dim)',
            border: '2px dashed var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            fontSize: '24px',
          }}
        >
          👥
        </div>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '20px', fontWeight: 700, margin: '0 0 8px' }}>
          Invite your team
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 28px', maxWidth: '320px', marginLeft: 'auto', marginRight: 'auto' }}>
          Pool your networks together and find paths none of you could reach alone.
        </p>
        <button className="btn-primary" style={{ fontSize: '14px' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1v12M1 7h12" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Invite teammates
        </button>
      </div>

      <div
        style={{
          marginTop: '24px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
        }}
      >
        {[
          { emoji: '🔗', title: 'Shared paths',    desc: 'Everyone sees every path your team finds' },
          { emoji: '📊', title: 'Team analytics',  desc: 'Track outreach effectiveness across the team' },
          { emoji: '🎯', title: 'Assign targets',  desc: 'Coordinate who reaches out to whom'         },
          { emoji: '💬', title: 'Shared messages', desc: 'Build a library of proven intro templates'  },
        ].map((f) => (
          <div key={f.title} className="card" style={{ padding: '16px' }}>
            <div style={{ fontSize: '20px', marginBottom: '8px' }}>{f.emoji}</div>
            <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>{f.title}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
