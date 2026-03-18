import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function PricingSuccess() {
  const navigate = useNavigate()

  useEffect(() => {
    const t = setTimeout(() => navigate('/dashboard'), 5000)
    return () => clearTimeout(t)
  }, [navigate])

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-page)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', textAlign: 'center', padding: '32px',
    }}>
      {/* Animated checkmark */}
      <div style={{
        width: '80px', height: '80px', borderRadius: '50%',
        background: 'rgba(52,211,153,0.1)', border: '2px solid var(--success)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: '24px',
        boxShadow: '0 0 40px rgba(52,211,153,0.2)',
      }}>
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
          <path d="M8 18.5l7 7 13-13" stroke="var(--success)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '28px', fontWeight: 700, margin: '0 0 10px' }}>
        You&apos;re all set!
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '16px', margin: '0 0 32px', maxWidth: '360px', lineHeight: 1.6 }}>
        Your subscription is active. Welcome to OrbitSix Pro — start finding paths and making warm intros.
      </p>

      <button className="btn-primary" style={{ fontSize: '15px', padding: '12px 28px' }} onClick={() => navigate('/dashboard')}>
        Go to Dashboard →
      </button>

      <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '20px' }}>
        Redirecting automatically in 5 seconds…
      </p>
    </div>
  )
}
