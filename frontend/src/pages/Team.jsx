export default function Team() {
  return (
    <div className="page-pad" style={{ maxWidth: '600px' }}>
      <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '26px', fontWeight: 700, margin: '0 0 4px' }}>
        Team
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 32px' }}>
        Collaborate on warm introductions with your whole team.
      </p>

      {/* Coming soon card */}
      <div className="card" style={{ padding: '40px', background: 'var(--gradient-card-subtle)', marginBottom: '24px', textAlign: 'center' }}>
        <div style={{
          width: '52px', height: '52px', borderRadius: '14px',
          background: 'var(--accent-dim)', border: '1px solid var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px', fontSize: '22px',
        }}>
          👥
        </div>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '20px', margin: '0 0 10px', color: 'var(--text-primary)' }}>
          Coming soon
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 24px', maxWidth: '360px', marginInline: 'auto' }}>
          Team collaboration is in development. You'll be able to share paths, coordinate outreach, and build a shared network — across your entire team.
        </p>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 16px', background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: '99px', fontSize: '13px', color: 'var(--accent)', fontWeight: 600 }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)', animation: 'pulse 1.5s infinite' }} />
          In development — Max plan
        </div>
      </div>

      {/* Feature preview */}
      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '12px', fontFamily: 'DM Sans, sans-serif' }}>
        What's coming
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
        {[
          { emoji: '🔗', title: 'Shared paths',    desc: 'Everyone sees every path your team uncovers' },
          { emoji: '📊', title: 'Team analytics',  desc: 'Track outreach performance across the team' },
          { emoji: '🎯', title: 'Assign targets',  desc: 'Coordinate who reaches out to each account' },
          { emoji: '💬', title: 'Message library', desc: 'Build a shared library of proven intro templates' },
        ].map(f => (
          <div key={f.title} className="card" style={{ padding: '16px', opacity: 0.5, cursor: 'default' }}>
            <div style={{ fontSize: '18px', marginBottom: '8px' }}>{f.emoji}</div>
            <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px', color: 'var(--text-primary)' }}>{f.title}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
