import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            justifyContent: 'center',
            height:         '100vh',
            gap:            '16px',
            color:          'var(--text-secondary)',
            fontFamily:     'DM Sans, sans-serif',
          }}
        >
          <svg width="40" height="40" viewBox="0 0 16 16" fill="none">
            <path d="M8 1l7 13H1L8 1z" stroke="var(--danger)" strokeWidth="1.5" strokeLinejoin="round"/>
            <path d="M8 6v4M8 11.5v.5" stroke="var(--danger)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Something went wrong
          </p>
          <p style={{ margin: 0, fontSize: '13px', maxWidth: '320px', textAlign: 'center' }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            className="btn-ghost"
            onClick={() => window.location.reload()}
          >
            Reload page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
