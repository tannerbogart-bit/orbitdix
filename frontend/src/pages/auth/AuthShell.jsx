// Shared shell for all auth/onboarding steps

export default function AuthShell({ children, step = 1, totalSteps = 5 }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-base)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient glow */}
      <div
        style={{
          position: 'fixed',
          top: '-20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '800px',
          height: '500px',
          borderRadius: '50%',
          background:
            'radial-gradient(ellipse, rgba(124,110,224,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Logo */}
      <div style={{ marginBottom: '40px', textAlign: 'center' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px var(--accent-glow)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="3" fill="white" />
              <circle cx="9" cy="9" r="7" stroke="white" strokeWidth="1.5" fill="none" />
              <circle cx="9" cy="2" r="1.5" fill="white" />
              <circle cx="9" cy="16" r="1.5" fill="white" />
              <circle cx="2" cy="9" r="1.5" fill="white" />
              <circle cx="16" cy="9" r="1.5" fill="white" />
            </svg>
          </div>
          <span
            style={{
              fontFamily: 'Syne, sans-serif',
              fontWeight: 700,
              fontSize: '22px',
              color: 'var(--text-primary)',
              letterSpacing: '-0.3px',
            }}
          >
            OrbitSix
          </span>
        </div>
      </div>

      {/* Step indicator */}
      {totalSteps > 1 && (
        <div
          style={{
            display: 'flex',
            gap: '6px',
            marginBottom: '28px',
          }}
        >
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              style={{
                height: '3px',
                width: i === step - 1 ? '28px' : '12px',
                borderRadius: '2px',
                background:
                  i < step
                    ? 'var(--accent)'
                    : 'var(--border)',
                transition: 'width 0.3s, background 0.3s',
              }}
            />
          ))}
        </div>
      )}

      {/* Card */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '20px',
          padding: '36px',
          width: '100%',
          maxWidth: '440px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
        }}
      >
        {children}
      </div>
    </div>
  )
}
