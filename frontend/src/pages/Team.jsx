import { useState } from 'react'
import { useToast } from '../components/Toast'

export default function Team() {
  const toast = useToast()
  const [email, setEmail] = useState('')

  function handleInvite(e) {
    e.preventDefault()
    if (!email.trim()) return
    // Placeholder — team invites not yet implemented
    toast?.add('Team invites coming soon! We\'ll notify you when it\'s ready.', 'info')
    setEmail('')
  }

  return (
    <div className="page-pad" style={{ maxWidth: '600px' }}>
      <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '26px', fontWeight: 700, margin: '0 0 4px' }}>
        Team
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 32px' }}>
        Collaborate on networking with your team.
      </p>

      <div
        className="card"
        style={{
          padding: '40px',
          background: 'linear-gradient(135deg, rgba(124,110,224,0.06) 0%, rgba(96,165,250,0.03) 100%)',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px',
            background: 'var(--accent-dim)', border: '1px solid var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
          }}>👥</div>
          <div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px' }}>Team features coming soon</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Join the waitlist to get early access</div>
          </div>
        </div>

        <form onSubmit={handleInvite} style={{ display: 'flex', gap: '8px' }}>
          <input
            className="input"
            type="email"
            placeholder="teammate@company.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{ flex: 1 }}
          />
          <button className="btn-primary" type="submit" style={{ fontSize: '13px', padding: '9px 16px', flexShrink: 0 }}>
            Notify me
          </button>
        </form>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
        {[
          { emoji: '🔗', title: 'Shared paths',    desc: 'Everyone sees every path your team finds' },
          { emoji: '📊', title: 'Team analytics',  desc: 'Track outreach effectiveness across the team' },
          { emoji: '🎯', title: 'Assign targets',  desc: 'Coordinate who reaches out to whom' },
          { emoji: '💬', title: 'Shared messages', desc: 'Build a library of proven intro templates' },
        ].map(f => (
          <div key={f.title} className="card" style={{ padding: '16px', opacity: 0.6 }}>
            <div style={{ fontSize: '20px', marginBottom: '8px' }}>{f.emoji}</div>
            <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>{f.title}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
