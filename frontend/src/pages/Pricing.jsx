import { useState, useEffect } from 'react'
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
      '5 path searches / month',
      '10 AI agent messages / month',
      'Chrome extension sync',
      'CSV import',
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
      '200 AI agent messages / month',
      'AI-drafted intro messages',
      'Save & revisit paths',
      'Outreach tracker',
      'Full activity history',
    ],
    cta:      'Start Pro',
    ctaStyle: 'primary',
  },
  {
    id:       'max',
    name:     'Max',
    price:    '$49',
    period:   'per month',
    tagline:  'For power users & small teams',
    accent:   false,
    features: [
      'Everything in Pro',
      'Unlimited AI agent messages',
      'Up to 5 team seats',
      'Shared network workspace',
      'Priority support',
    ],
    cta:      'Start Max',
    ctaStyle: 'ghost',
  },
]

const DEMO_PATH = [
  { name: 'You',           title: 'Founder',          company: 'YourStartup',   self: true },
  { name: 'Sarah Chen',    title: 'Head of Sales',    company: 'Acme Corp',     self: false },
  { name: 'James Liu',     title: 'Staff Engineer',   company: 'Google',        self: false },
  { name: 'Alex Park',     title: 'VP Engineering',   company: 'Stripe',        target: true },
]

const DEMO_MESSAGE = `Hi Alex,

James Liu suggested I reach out — he thought our API monitoring tool might be relevant given Stripe's infrastructure scale.

I'm building a platform that cuts p99 latency alerting noise by ~60%. Would love 15 minutes to show you what we've found at similar companies.

— Jordan`

function DemoSection() {
  const [visibleNodes, setVisibleNodes] = useState(0)
  const [showMessage, setShowMessage]   = useState(false)
  const [typedMsg, setTypedMsg]         = useState('')
  const [typing, setTyping]             = useState(false)

  useEffect(() => {
    // Animate path nodes appearing one by one
    const timers = DEMO_PATH.map((_, i) =>
      setTimeout(() => setVisibleNodes(i + 1), 400 + i * 500)
    )
    return () => timers.forEach(clearTimeout)
  }, [])

  function handleDraftClick() {
    if (typing || showMessage) return
    setShowMessage(true)
    setTyping(true)
    let i = 0
    const interval = setInterval(() => {
      i++
      setTypedMsg(DEMO_MESSAGE.slice(0, i))
      if (i >= DEMO_MESSAGE.length) {
        clearInterval(interval)
        setTyping(false)
      }
    }, 18)
  }

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0 32px 64px' }}>
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, fontFamily: 'Syne, sans-serif', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>
          See it in action
        </div>
        <div style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>
          You want to reach <strong style={{ color: 'var(--text-primary)' }}>Alex Park, VP Engineering at Stripe</strong>.
          OrbitSix finds the path through your existing network.
        </div>
      </div>

      {/* Path chain */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '32px 28px', marginBottom: '16px', boxShadow: '0 0 40px rgba(124,110,224,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: '0', overflowX: 'auto' }}>
          {DEMO_PATH.map((node, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
              {/* Node */}
              <div style={{
                opacity: visibleNodes > i ? 1 : 0,
                transform: visibleNodes > i ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.95)',
                transition: 'opacity 0.35s ease, transform 0.35s ease',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                minWidth: '100px',
              }}>
                {/* Avatar */}
                <div style={{
                  width: '52px', height: '52px', borderRadius: '50%',
                  background: node.self
                    ? 'var(--accent)'
                    : node.target
                    ? 'linear-gradient(135deg, #7c6ee0, #60a5fa)'
                    : 'var(--bg-input)',
                  border: node.target
                    ? '2px solid var(--accent)'
                    : node.self
                    ? '2px solid rgba(255,255,255,0.2)'
                    : '1.5px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: node.target ? '0 0 20px rgba(124,110,224,0.4)' : 'none',
                }}>
                  <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: node.self || node.target ? 'white' : 'var(--text-secondary)' }}>
                    {node.self ? '★' : node.name.split(' ').map(w => w[0]).join('')}
                  </span>
                </div>
                {/* Info */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '13px', color: node.target ? 'var(--accent)' : 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                    {node.name}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', marginTop: '1px' }}>
                    {node.title}
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    {node.company}
                  </div>
                </div>
              </div>

              {/* Arrow between nodes */}
              {i < DEMO_PATH.length - 1 && (
                <div style={{
                  opacity: visibleNodes > i + 1 ? 1 : 0,
                  transition: 'opacity 0.3s ease',
                  padding: '0 10px', marginBottom: '28px', flexShrink: 0,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
                    <div style={{ height: '1.5px', width: '28px', background: 'linear-gradient(90deg, var(--border), var(--accent))' }} />
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <path d="M1 4h6M4 1l3 3-3 3" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Path metadata + CTA */}
        <div style={{
          opacity: visibleNodes >= DEMO_PATH.length ? 1 : 0,
          transition: 'opacity 0.4s ease 0.2s',
          marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border-subtle)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2d7d4e' }} />
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'DM Sans, sans-serif' }}>
                <strong style={{ color: 'var(--text-primary)' }}>2 degrees</strong> · Warmest path found
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>
              Found in 0.3s across 847 connections
            </div>
          </div>
          <button
            onClick={handleDraftClick}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '9px 18px', background: showMessage ? 'var(--accent-dim)' : 'var(--accent)',
              border: '1px solid var(--accent)', borderRadius: '8px',
              color: showMessage ? 'var(--accent)' : 'white',
              fontSize: '13px', fontWeight: 600, fontFamily: 'DM Sans, sans-serif',
              cursor: showMessage ? 'default' : 'pointer', transition: 'all 0.2s',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 3h12a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H1a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
              <path d="M0 4l7 5 7-5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {showMessage ? 'Message drafted ✓' : 'Draft intro message →'}
          </button>
        </div>
      </div>

      {/* Drafted message preview */}
      {showMessage && (
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px',
          padding: '20px 24px', animation: 'fadeSlideIn 0.3s ease',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)' }} />
            <span style={{ fontSize: '11px', fontWeight: 700, fontFamily: 'Syne, sans-serif', color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              AI-drafted intro · via James Liu at Google
            </span>
          </div>
          <pre style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {typedMsg}
            {typing && <span style={{ opacity: 0.6, animation: 'pulse 0.8s infinite' }}>|</span>}
          </pre>
        </div>
      )}

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}

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
      navigate(isLoggedIn ? '/dashboard' : '/auth/signup')
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
              <button className="btn-primary" style={{ fontSize: '13px' }} onClick={() => navigate('/auth/signup')}>
                Get started
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '72px 32px 40px' }}>
        <div style={{
          display: 'inline-block',
          background: 'var(--accent-dim)', color: 'var(--accent)',
          fontSize: '12px', fontWeight: 700, fontFamily: 'Syne, sans-serif',
          padding: '5px 14px', borderRadius: '20px', border: '1px solid var(--accent)',
          letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '20px',
        }}>
          Warm intros · Not cold emails
        </div>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '44px', fontWeight: 700, margin: '0 0 16px', lineHeight: 1.1 }}>
          Reach anyone in<br />
          <span style={{ color: 'var(--accent)' }}>6 degrees</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '17px', maxWidth: '480px', margin: '0 auto', lineHeight: 1.6 }}>
          Map your network, find the shortest path to anyone, and get warm intros — not cold emails.
        </p>
      </div>

      {/* Demo section */}
      <DemoSection />

      {/* How it works */}
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0 32px 64px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, fontFamily: 'Syne, sans-serif', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '28px' }}>
          How it works
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {[
            {
              step: '01',
              title: 'Import your network',
              desc: 'Upload your LinkedIn connections CSV or install our Chrome extension. OrbitSix maps every relationship in seconds.',
              icon: (
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <path d="M11 3v12M7 11l4 4 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M3 17h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
                </svg>
              ),
            },
            {
              step: '02',
              title: 'Find the warm path',
              desc: 'Search for anyone — a decision-maker, investor, or hiring manager. OrbitSix instantly finds every route through your contacts.',
              icon: (
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <circle cx="5" cy="11" r="3" stroke="currentColor" strokeWidth="1.7"/>
                  <circle cx="17" cy="11" r="3" stroke="currentColor" strokeWidth="1.7"/>
                  <path d="M8 11h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
                  <circle cx="11" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.7"/>
                  <path d="M5 8.5L11 7.5M17 8.5L11 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              ),
            },
            {
              step: '03',
              title: 'Send a warm intro',
              desc: 'AI drafts a personalized message referencing your mutual connection by name. Copy it, send it — no cold outreach needed.',
              icon: (
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <path d="M2 5h18a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
                  <path d="M1 6l10 7 10-7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ),
            },
          ].map((item, i) => (
            <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '24px 22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--accent-dim)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', flexShrink: 0 }}>
                  {item.icon}
                </div>
                <span style={{ fontFamily: 'Syne, sans-serif', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                  STEP {item.step}
                </span>
              </div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)', marginBottom: '8px' }}>
                {item.title}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {item.desc}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '24px',
        maxWidth: '1080px',
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
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '0 32px 48px' }}>
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

      {/* Footer */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '24px 32px', textAlign: 'center' }}>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'center', gap: '24px', flexWrap: 'wrap' }}>
          <span
            style={{ cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'var(--border)' }}
            onClick={() => navigate('/terms')}
          >
            Terms of Service
          </span>
          <span
            style={{ cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'var(--border)' }}
            onClick={() => navigate('/privacy')}
          >
            Privacy Policy
          </span>
          <a
            href="mailto:hello@orbitsix.com?subject=Feedback"
            style={{ color: 'var(--text-muted)', textDecoration: 'underline', textDecorationColor: 'var(--border)' }}
          >
            Send feedback
          </a>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '10px' }}>
          © {new Date().getFullYear()} OrbitSix. All rights reserved.
        </div>
      </div>
    </div>
  )
}
