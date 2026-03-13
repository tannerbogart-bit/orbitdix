import { createContext, useContext, useState, useCallback, useEffect } from 'react'

const ToastCtx = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const add = useCallback((message, type = 'info') => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500)
  }, [])

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastCtx.Provider value={{ add }}>
      {children}

      {/* Toast container */}
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          zIndex: 200,
          pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onRemove={remove} />
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

function ToastItem({ toast, onRemove }) {
  const colors = {
    success: { border: 'var(--success)', icon: '✓', bg: 'rgba(52,211,153,0.08)' },
    error:   { border: 'var(--danger)',  icon: '✕', bg: 'rgba(248,113,113,0.08)' },
    info:    { border: 'var(--accent)',  icon: 'ℹ', bg: 'var(--accent-dim)'      },
  }
  const c = colors[toast.type] || colors.info

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${c.border}`,
        borderLeft: `3px solid ${c.border}`,
        borderRadius: '10px',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        minWidth: '260px',
        maxWidth: '340px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        animation: 'slideInRight 0.2s ease',
        pointerEvents: 'auto',
        cursor: 'default',
      }}
      onClick={() => onRemove(toast.id)}
    >
      <div
        style={{
          width: '22px',
          height: '22px',
          borderRadius: '50%',
          background: c.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: 700,
          color: c.border,
          flexShrink: 0,
        }}
      >
        {c.icon}
      </div>
      <span style={{ fontSize: '13px', color: 'var(--text-primary)', flex: 1 }}>
        {toast.message}
      </span>
    </div>
  )
}

export function useToast() {
  return useContext(ToastCtx)
}

// Inject animation
const style = document.createElement('style')
style.textContent = `
  @keyframes slideInRight {
    from { transform: translateX(20px); opacity: 0; }
    to   { transform: translateX(0);    opacity: 1; }
  }
`
document.head.appendChild(style)
