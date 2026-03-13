// Step 5 — Syncing → redirect to dashboard
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthShell from './AuthShell'

const STEPS = [
  { label: 'Importing your connections',    delay: 0    },
  { label: 'Building your network map',     delay: 1200 },
  { label: 'Calculating orbit distances',   delay: 2400 },
  { label: 'Ready!',                        delay: 3400 },
]

export default function Syncing() {
  const navigate = useNavigate()
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const timers = STEPS.map((s, i) =>
      setTimeout(() => setCurrent(i), s.delay)
    )
    const done = setTimeout(() => navigate('/dashboard'), 4600)
    return () => { timers.forEach(clearTimeout); clearTimeout(done) }
  }, [navigate])

  const pct = Math.round(((current + 1) / STEPS.length) * 100)

  return (
    <AuthShell step={5} totalSteps={5}>
      <div style={{ textAlign: 'center' }}>
        {/* Orbit animation */}
        <div
          style={{
            width: '80px',
            height: '80px',
            margin: '0 auto 28px',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '2px solid var(--border)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: '8px',
              borderRadius: '50%',
              border: '2px solid var(--accent)',
              borderTopColor: 'transparent',
              animation: 'spin 1.2s linear infinite',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: '18px',
              borderRadius: '50%',
              border: '2px solid var(--accent)',
              borderBottomColor: 'transparent',
              animation: 'spin 0.8s linear infinite reverse',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: '28px',
              borderRadius: '50%',
              background: 'var(--accent)',
              boxShadow: '0 0 16px var(--accent-glow)',
            }}
          />
        </div>

        <h2
          style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: '22px',
            fontWeight: 700,
            margin: '0 0 6px',
          }}
        >
          {current === STEPS.length - 1 ? 'Your network is ready' : 'Setting up OrbitSix…'}
        </h2>
        <p
          style={{
            color: 'var(--text-secondary)',
            fontSize: '14px',
            margin: '0 0 28px',
            minHeight: '20px',
            transition: 'opacity 0.3s',
          }}
        >
          {STEPS[current].label}
        </p>

        {/* Progress bar */}
        <div
          style={{
            height: '4px',
            background: 'var(--border)',
            borderRadius: '2px',
            marginBottom: '20px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${pct}%`,
              background: 'linear-gradient(90deg, var(--accent), #60a5fa)',
              borderRadius: '2px',
              transition: 'width 0.5s ease',
            }}
          />
        </div>

        {/* Step list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
          {STEPS.map((s, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '13px',
                color: i <= current ? 'var(--text-primary)' : 'var(--text-muted)',
                transition: 'color 0.3s',
              }}
            >
              <div
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  flexShrink: 0,
                  background: i < current
                    ? 'rgba(52, 211, 153, 0.15)'
                    : i === current
                    ? 'var(--accent-dim)'
                    : 'transparent',
                  border: `1px solid ${i < current ? 'var(--success)' : i === current ? 'var(--accent)' : 'var(--border)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s',
                }}
              >
                {i < current && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5.5L4 7.5L8 3" stroke="var(--success)" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                )}
                {i === current && (
                  <div
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: 'var(--accent)',
                      animation: 'pulse 1s ease infinite',
                    }}
                  />
                )}
              </div>
              {s.label}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
      `}</style>
    </AuthShell>
  )
}
