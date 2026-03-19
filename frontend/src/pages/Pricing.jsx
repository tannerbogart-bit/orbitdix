import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'

const PLANS = [
  {
    id:       'free',
    name:     'Free',
    price:    '$0',
    period:   'forever',
    tagline:  'Start mapping your network',
    accent:   false,
    features: [
      '50 contacts',
      '5 path searches per month',
      'Chrome extension sync',
      'CSV import',
      'Basic network graph',
    ],
    cta:      'Get started free',
    ctaStyle: 'ghost',
  },
  {
    id:       'pro',
    name:     'Pro',
    price:    '$19',
    period:   'per month',
    tagline:  'For serious networkers',
    accent:   true,
    badge:    'Most popular',
    features: [
      'Unlimited contacts',
      'Unlimited path searches',
      'Relationship context on connections',
      'AI-drafted intro messages',
      'Save & revisit paths',
      'Full activity history',
      'Priority support',
    ],
    cta:      'Start Pro',
    ctaStyle: 'primary',
  },
  // Team plan hidden until features are built
]

function PlanCard({ plan, onSelect, loading }) {
  return (
    <div
      style={{
        background: plan.accent ? 'linear-gradient(160deg, rgba(124,110,224,0.12) 0%, rgba(96,165,250,0.05) 100%)' : 'var(--bg-card)',
        border: `1.5px solid ${plan.accent ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: '16px',
        padding: '32px 28px',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        boxShadow: plan.accent ? '0 0 40px rgba(124,110,224,0.15)' : 'none',
        transition: 'transform 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
    >
      {plan.badge && (
        <div style={{
          position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)',
          background: 'var(--accent)', color: '#fff',
          fontSize: '11px', fontWeight: 700, fontFamily: 'Syne, sans-serif',
          padding: '4px 14px', borderRadius: '20px', letterSpacing: '0.04em', textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}>
          {plan.badge}
        </div>
      )}

      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '18px', marginBottom: '4px' }}>
          {plan.name}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          {plan.tagline}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '36px', color: 'var(--text-primary)' }}>
            {plan.price}
          </span>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{plan.period}</span>
        </div>
      </div>

      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
        {plan.features.map(f => (
          <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '14px', color: 'var(--text-secondary)' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: '1px' }}>
              <circle cx="8" cy="8" r="7.5" fill={plan.accent ? 'var(--accent-dim)' : 'rgba(255,255,255,0.05)'} stroke={plan.accent ? 'var(--accent)' : 'var(--border)'} />
              <path d="M5 8.5l2 2 4-4" stroke={plan.accent ? 'var(--accent)' : 'var(--text-muted)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {f}
          </li>
        ))}
      </ul>

      <button
        className={plan.ctaStyle === 'primary' ? 'btn-primary' : 'btn-ghost'}
        style={{ width: '100%', justifyContent: 'center', fontSize: '14px', padding: '12px' }}
        onClick={() => onSelect(plan.id)}
        disabled={loading === plan.id}
      >
        {loading === plan.id ? 'Redirecting…' : plan.cta}
      </button>
    </div>
  )
}

export default function Pricing() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(null)
  const [error, setError]     = useState(null)
  const isLoggedIn = !!localStorage.getItem('access_token')

  async function handleSelect(planId) {
    setError(null)

    if (planId === 'free') {
      navigate(isLoggedIn ? '/dashboard' : '/auth/signin')
      return
    }

    if (!isLoggedIn) {
      // Send them to sign in first, then back to pricing
      navigate('/auth/signin')
      return
    }

    setLoading(planId)
    try {
      const data = await api.createCheckout(planId)
      window.location.href = data.url
    } catch (err) {
      setError(err.message || 'Could not start checkout. Check that Stripe is configured.')
      setLoading(null)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', color: 'var(--text-primary)' }}>
      {/* Nav */}
      <nav style={{
        padding: '16px 32px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
          onClick={() => navigate(isLoggedIn ? '/dashboard' : '/pricing')}
        >
          <div style={{
            width: '28px', height: '28px', borderRadius: '7px', background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 12px var(--accent-glow)',
          }}>
            <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="3" fill="white" />
              <circle cx="9" cy="9" r="7" stroke="white" strokeWidth="1.5" fill="none" />
              <circle cx="9" cy="2" r="1.5" fill="white" />
              <circle cx="9" cy="16" r="1.5" fill="white" />
              <circle cx="2" cy="9" r="1.5" fill="white" />
              <circle cx="16" cy="9" r="1.5" fill="white" />
            </svg>
          </div>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px' }}>OrbitSix</span>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {isLoggedIn ? (
            <button className="btn-ghost" style={{ fontSize: '13px' }} onClick={() => navigate('/dashboard')}>
              Dashboard →
            </button>
          ) : (
            <>
              <button className="btn-ghost" style={{ fontSize: '13px' }} onClick={() => navigate('/auth/signin')}>
                Sign in
              </button>
              <button className="btn-primary" style={{ fontSize: '13px' }} onClick={() => navigate('/auth/signin')}>
                Get started
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '72px 32px 48px' }}>
        <div style={{
          display: 'inline-block',
          background: 'var(--accent-dim)', color: 'var(--accent)',
          fontSize: '12px', fontWeight: 700, fontFamily: 'Syne, sans-serif',
          padding: '5px 14px', borderRadius: '20px', border: '1px solid var(--accent)',
          letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '20px',
        }}>
          Simple pricing
        </div>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '44px', fontWeight: 700, margin: '0 0 16px', lineHeight: 1.1 }}>
          Reach anyone in<br />
          <span style={{ color: 'var(--accent)' }}>6 degrees</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '17px', maxWidth: '480px', margin: '0 auto', lineHeight: 1.6 }}>
          Map your network, find the shortest path to anyone, and get warm intros — not cold emails.
        </p>
      </div>

      {/* Pricing cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '24px',
        maxWidth: '980px',
        margin: '0 auto',
        padding: '0 32px 80px',
      }}>
        {PLANS.map(plan => (
          <PlanCard key={plan.id} plan={plan} onSelect={handleSelect} loading={loading} />
        ))}
      </div>

      {error && (
        <div style={{
          maxWidth: '480px', margin: '-48px auto 48px',
          background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
          borderRadius: '10px', padding: '14px 18px',
          fontSize: '13px', color: '#f87171', textAlign: 'center',
        }}>
          {error}
        </div>
      )}

      {/* FAQ */}
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '0 32px 80px' }}>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '20px', fontWeight: 700, marginBottom: '24px', textAlign: 'center' }}>
          Common questions
        </h2>
        {[
          { q: 'Can I try Pro before paying?', a: 'Start on the Free plan — no credit card required. Upgrade any time.' },
          { q: 'What counts as a "contact"?', a: 'Any person in your network graph — imported via CSV, Chrome extension, or added manually.' },
          { q: 'How does billing work?', a: 'Monthly subscription via Stripe. Cancel any time — you keep access until the end of your billing period.' },
          { q: 'Is my network data private?', a: 'Yes. Your connections are visible only to you (and your team on the Team plan).' },
        ].map(({ q, a }) => (
          <div key={q} style={{ borderBottom: '1px solid var(--border-subtle)', padding: '18px 0' }}>
            <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '6px' }}>{q}</div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{a}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
