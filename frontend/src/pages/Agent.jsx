import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from '../api/client'

// Lightweight markdown renderer — handles patterns Claude commonly outputs
function MarkdownMessage({ content, streaming }) {
  if (!content) {
    return streaming ? <span style={{ opacity: 0.5 }}>Thinking…</span> : null
  }

  const lines = content.split('\n')
  const elements = []
  let i = 0

  function parseInline(text) {
    // Split on bold, italic, inline code — process left to right
    const parts = []
    let remaining = text
    let key = 0

    while (remaining.length > 0) {
      // Bold **text** or __text__
      const bold = remaining.match(/^(.*?)\*\*(.+?)\*\*(.*)$/s)
      const italic = remaining.match(/^(.*?)\*(.+?)\*(.*)$/s)
      const code = remaining.match(/^(.*?)`([^`]+)`(.*)$/s)

      // Find which match starts earliest
      const boldIdx  = bold   ? bold[1].length   : Infinity
      const italicIdx = italic ? italic[1].length : Infinity
      const codeIdx  = code   ? code[1].length   : Infinity
      const earliest = Math.min(boldIdx, italicIdx, codeIdx)

      if (earliest === Infinity) {
        parts.push(<span key={key++}>{remaining}</span>)
        break
      } else if (earliest === boldIdx) {
        if (bold[1]) parts.push(<span key={key++}>{bold[1]}</span>)
        parts.push(<strong key={key++}>{bold[2]}</strong>)
        remaining = bold[3]
      } else if (earliest === codeIdx) {
        if (code[1]) parts.push(<span key={key++}>{code[1]}</span>)
        parts.push(
          <code key={key++} style={{
            background: 'var(--bg-input)', border: '1px solid var(--border)',
            borderRadius: '4px', padding: '1px 5px', fontSize: '12px',
            fontFamily: 'monospace', color: 'var(--accent)',
          }}>{code[2]}</code>
        )
        remaining = code[3]
      } else {
        if (italic[1]) parts.push(<span key={key++}>{italic[1]}</span>)
        parts.push(<em key={key++}>{italic[2]}</em>)
        remaining = italic[3]
      }
    }
    return parts
  }

  while (i < lines.length) {
    const line = lines[i]

    // Code block ```
    if (line.trim().startsWith('```')) {
      const codeLines = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      elements.push(
        <pre key={i} style={{
          background: 'var(--bg-input)', border: '1px solid var(--border)',
          borderRadius: '8px', padding: '12px 14px', overflowX: 'auto',
          fontSize: '12px', fontFamily: 'monospace', margin: '8px 0', lineHeight: 1.6,
        }}>
          <code>{codeLines.join('\n')}</code>
        </pre>
      )
      i++
      continue
    }

    // H1/H2 heading
    if (line.startsWith('## ')) {
      elements.push(
        <div key={i} style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', marginTop: '14px', marginBottom: '4px' }}>
          {parseInline(line.slice(3))}
        </div>
      )
      i++; continue
    }
    if (line.startsWith('# ')) {
      elements.push(
        <div key={i} style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)', marginTop: '14px', marginBottom: '6px' }}>
          {parseInline(line.slice(2))}
        </div>
      )
      i++; continue
    }

    // Bullet list — collect consecutive bullets
    if (line.match(/^[-*•]\s+/) || line.match(/^\d+\.\s+/)) {
      const listItems = []
      const ordered = line.match(/^\d+\.\s+/)
      while (i < lines.length && (lines[i].match(/^[-*•]\s+/) || lines[i].match(/^\d+\.\s+/))) {
        const text = lines[i].replace(/^[-*•]\s+/, '').replace(/^\d+\.\s+/, '')
        listItems.push(<li key={i} style={{ marginBottom: '3px' }}>{parseInline(text)}</li>)
        i++
      }
      const Tag = ordered ? 'ol' : 'ul'
      elements.push(
        <Tag key={`list-${i}`} style={{ margin: '6px 0', paddingLeft: '20px', lineHeight: 1.6 }}>
          {listItems}
        </Tag>
      )
      continue
    }

    // Horizontal rule
    if (line.match(/^---+$/) || line.match(/^\*\*\*+$/)) {
      elements.push(<hr key={i} style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '10px 0' }} />)
      i++; continue
    }

    // Empty line → spacing
    if (line.trim() === '') {
      // Only add spacing if the last element wasn't also a spacer
      if (elements.length > 0) {
        elements.push(<div key={i} style={{ height: '8px' }} />)
      }
      i++; continue
    }

    // Regular paragraph line
    elements.push(
      <div key={i} style={{ lineHeight: 1.65 }}>
        {parseInline(line)}
      </div>
    )
    i++
  }

  return <>{elements}</>
}

const TOOL_LABELS = {
  search_network:          'Searching your network…',
  find_path:               'Mapping connection path…',
  find_path_to_company:    'Finding best path into company…',
  list_people_at_company:  'Looking up contacts at company…',
  save_outreach_draft:     'Saving to Outreach Tracker…',
  get_network_overview:    'Analyzing your network…',
  analyze_network_gaps:    'Running gap analysis…',
  get_target_accounts:     'Loading target accounts…',
  add_target_account:      'Saving target account…',
  remove_target_account:   'Removing target account…',
  get_outreach_history:    'Checking outreach history…',
}

const SUGGESTION_ICONS = {
  gap:      '⚡',
  analysis: '🔍',
  recommend:'💡',
  target:   '🎯',
}

export default function Agent() {
  const [messages, setMessages]           = useState([])
  const [input, setInput]                 = useState('')
  const [streaming, setStreaming]         = useState(false)
  const [activeTools, setActiveTools]     = useState([])
  const [upgradeRequired, setUpgradeRequired] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)

  const [context, setContext]     = useState({ my_company: '', my_role: '', what_i_sell: '', icp_description: '' })
  const [contextSaving, setContextSaving] = useState(false)
  const [contextSaved, setContextSaved]   = useState(false)

  const [targets, setTargets]     = useState([])
  const [newCompany, setNewCompany] = useState('')
  const [addingTarget, setAddingTarget] = useState(false)

  const [suggestions, setSuggestions]         = useState([])
  const [contextOpen, setContextOpen]         = useState(true)
  const [clearing, setClearing]               = useState(false)
  const [sidebarOpen, setSidebarOpen]         = useState(false)
  const [quota, setQuota]                     = useState(null)
  const [outreachSaved, setOutreachSaved]     = useState(false)  // show "View in Outreach" link after save

  const messagesEndRef = useRef(null)
  const abortRef       = useRef(null)
  const location       = useLocation()

  // Pre-fill input from state (Targets page) or ?prompt= query param (Find Path no-path CTA)
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const qPrompt = params.get('prompt')
    if (location.state?.prompt) {
      setInput(location.state.prompt)
      window.history.replaceState({}, '')
    } else if (qPrompt) {
      setInput(qPrompt)
      window.history.replaceState({}, '', '/agent')  // clean URL after reading
    }
  }, [])

  useEffect(() => {
    api.getAgentContext().then(data => {
      if (data.context) setContext({
        my_company:      data.context.my_company      || '',
        my_role:         data.context.my_role         || '',
        what_i_sell:     data.context.what_i_sell     || '',
        icp_description: data.context.icp_description || '',
      })
    }).catch(() => {})

    loadTargets()
    loadHistory()
    loadSuggestions()

    api.getStats().then(d => {
      if (d.agent_messages_limit !== null && d.agent_messages_limit !== undefined) {
        setQuota({ used: d.agent_messages_this_month || 0, limit: d.agent_messages_limit })
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, activeTools])

  function loadTargets() {
    api.getTargetAccounts().then(data => setTargets(data.targets || [])).catch(() => {})
  }

  function loadHistory() {
    api.getAgentHistory().then(data => {
      if (data.messages && data.messages.length > 0) {
        setMessages(data.messages)
      }
      setHistoryLoaded(true)
    }).catch(() => { setHistoryLoaded(true) })
  }

  function loadSuggestions() {
    api.getAgentSuggestions().then(data => setSuggestions(data.suggestions || [])).catch(() => {})
  }

  async function saveContext() {
    setContextSaving(true)
    try {
      await api.saveAgentContext(context)
      setContextSaved(true)
      setTimeout(() => setContextSaved(false), 2000)
    } catch {}
    setContextSaving(false)
  }

  async function addTarget(e) {
    e.preventDefault()
    if (!newCompany.trim()) return
    setAddingTarget(true)
    try {
      await api.addTargetAccount({ company_name: newCompany.trim() })
      setNewCompany('')
      loadTargets()
      loadSuggestions() // refresh suggestions after adding target
    } catch {}
    setAddingTarget(false)
  }

  async function removeTarget(id) {
    try {
      await api.deleteTargetAccount(id)
      setTargets(prev => prev.filter(t => t.id !== id))
      loadSuggestions()
    } catch {}
  }

  async function clearHistory() {
    if (!window.confirm('Clear conversation history? This cannot be undone.')) return
    setClearing(true)
    try {
      await api.clearAgentHistory()
      setMessages([])
      loadSuggestions()
    } catch {}
    setClearing(false)
  }

  async function sendMessage(text) {
    if (!text.trim() || streaming) return
    const userMsg = { role: 'user', content: text.trim() }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setInput('')
    setStreaming(true)
    setActiveTools([])

    let assistantText = ''
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    const token = localStorage.getItem('access_token')
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        // Send only the new user message — backend merges with persisted history
        body: JSON.stringify({ messages: [userMsg] }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        if (err.upgrade_required) {
          setUpgradeRequired(err.error || true)
          setMessages(prev => prev.slice(0, -1))
          setStreaming(false)
          return
        }
        throw new Error(err.error || `HTTP ${response.status}`)
      }

      const reader  = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))
            if (event.type === 'text') {
              assistantText += event.text
              setMessages(prev => {
                const updated = [...prev]
                updated[updated.length - 1] = { role: 'assistant', content: assistantText }
                return updated
              })
            } else if (event.type === 'tool_start') {
              setActiveTools(prev => [...prev, event.tool])
            } else if (event.type === 'tool_done') {
              setActiveTools(prev => prev.filter(t => t !== event.tool))
              if (event.tool === 'save_outreach_draft') setOutreachSaved(true)
            } else if (event.type === 'suggestions') {
              setSuggestions(event.items || [])
            } else if (event.type === 'error') {
              assistantText += `\n\n*Error: ${event.message}*`
              setMessages(prev => {
                const updated = [...prev]
                updated[updated.length - 1] = { role: 'assistant', content: assistantText }
                return updated
              })
            }
          } catch {}
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }
          return updated
        })
      }
    }

    setStreaming(false)
    setActiveTools([])
    setQuota(q => q ? { ...q, used: q.used + 1 } : q)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  function stopStreaming() {
    abortRef.current?.abort()
    setStreaming(false)
    setActiveTools([])
  }

  // ── Upgrade wall ──────────────────────────────────────────────────────────
  if (upgradeRequired) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '48px', maxWidth: '480px', textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>✦</div>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
            {typeof upgradeRequired === 'string' && upgradeRequired.includes('Pro AI messages')
              ? 'Pro monthly limit reached'
              : typeof upgradeRequired === 'string' && upgradeRequired.includes('free')
              ? 'Free monthly limit reached'
              : 'AI Agent requires a paid plan'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6, marginBottom: '28px' }}>
            {typeof upgradeRequired === 'string'
              ? upgradeRequired
              : 'Start on Pro for 200 AI messages/month, or Max for unlimited access to your network intelligence assistant.'}
          </p>
          <a href="/pricing" style={{ display: 'inline-block', padding: '12px 28px', background: 'var(--accent)', color: 'white', borderRadius: '8px', fontWeight: 600, fontSize: '14px', textDecoration: 'none' }}>
            View plans
          </a>
        </div>
      </div>
    )
  }

  const showEmptyState = historyLoaded && messages.length === 0

  return (
    <div className="agent-layout">

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 49 }}
        />
      )}

      {/* ── Left panel ─────────────────────────────────────────────────────── */}
      <div className={`agent-sidebar${sidebarOpen ? ' open' : ''}`}>
        <div style={{ padding: '20px 18px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>AI Agent</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Network intelligence assistant</div>
          {quota && (
            <div style={{ marginTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontFamily: 'DM Sans, sans-serif' }}>
                <span>{Math.max(0, quota.limit - quota.used)} messages remaining</span>
                <span style={{ color: quota.used >= quota.limit ? 'var(--danger)' : 'var(--text-muted)' }}>{quota.used}/{quota.limit}</span>
              </div>
              <div style={{ height: '3px', background: 'var(--bg-input)', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(100, (quota.used / quota.limit) * 100)}%`,
                  background: quota.used / quota.limit > 0.85 ? 'var(--danger)' : quota.used / quota.limit > 0.6 ? 'var(--warning)' : 'var(--accent)',
                  borderRadius: '99px',
                  transition: 'width 0.3s',
                }} />
              </div>
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>

          {/* Business Context */}
          <div style={{ marginBottom: '12px' }}>
            <button
              onClick={() => setContextOpen(o => !o)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '12px' }}
            >
              <span>Your Business Context</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: contextOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {contextOpen && (
              <div style={{ marginTop: '8px', padding: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
                {[
                  { key: 'my_role',         label: 'Your role',      placeholder: 'e.g. VP of Sales' },
                  { key: 'my_company',      label: 'Your company',   placeholder: 'e.g. Acme Corp' },
                  { key: 'what_i_sell',     label: 'What you sell',  placeholder: 'e.g. B2B SaaS for finance teams' },
                  { key: 'icp_description', label: 'Ideal customer', placeholder: 'e.g. Series B+ fintech startups' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key} style={{ marginBottom: '8px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '3px', fontFamily: 'DM Sans, sans-serif' }}>{label}</div>
                    <textarea
                      value={context[key]}
                      onChange={e => setContext(prev => ({ ...prev, [key]: e.target.value }))}
                      placeholder={placeholder}
                      rows={key === 'what_i_sell' || key === 'icp_description' ? 2 : 1}
                      style={{ width: '100%', padding: '6px 8px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px', fontFamily: 'DM Sans, sans-serif', resize: 'none', boxSizing: 'border-box', lineHeight: 1.4 }}
                    />
                  </div>
                ))}
                <button
                  onClick={saveContext}
                  disabled={contextSaving}
                  style={{ width: '100%', padding: '7px', background: contextSaved ? '#2d7d4e' : 'var(--accent)', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: contextSaving ? 'default' : 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'background 0.2s' }}
                >
                  {contextSaved ? 'Saved!' : contextSaving ? 'Saving…' : 'Save Context'}
                </button>
              </div>
            )}
          </div>

          {/* Target Accounts */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px 6px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif' }}>
                Target Accounts
              </div>
              <a href="/targets" style={{ fontSize: '11px', color: 'var(--accent)', textDecoration: 'none', fontFamily: 'DM Sans, sans-serif' }}>
                Manage →
              </a>
            </div>

            {targets.length === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '6px 2px', fontFamily: 'DM Sans, sans-serif' }}>
                No targets yet.{' '}
                <a href="/targets" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Add companies →</a>
              </div>
            ) : (
              targets.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 8px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '6px', marginBottom: '4px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {t.company_name}
                    </div>
                  </div>
                  <button onClick={() => removeTarget(t.id)} title="Remove" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px', lineHeight: 1, flexShrink: 0 }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Clear history */}
          {messages.length > 0 && (
            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
              <button
                onClick={clearHistory}
                disabled={clearing}
                style={{ width: '100%', padding: '7px', background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: '6px', fontSize: '12px', color: 'var(--text-muted)', cursor: clearing ? 'default' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}
              >
                {clearing ? 'Clearing…' : 'Clear conversation'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Chat panel ─────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
          <button className="agent-sidebar-toggle" onClick={() => setSidebarOpen(o => !o)}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 3h12M1 7h12M1 11h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Context &amp; Targets
          </button>

          {/* Empty state with proactive suggestion chips */}
          {showEmptyState && (
            <div style={{ maxWidth: '560px', margin: '0 auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px var(--accent-glow)', flexShrink: 0 }}>
                  <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
                    <circle cx="9" cy="9" r="3" fill="white" />
                    <circle cx="9" cy="9" r="7" stroke="white" strokeWidth="1.5" fill="none" />
                    <circle cx="9" cy="2" r="1.5" fill="white" />
                    <circle cx="9" cy="16" r="1.5" fill="white" />
                    <circle cx="2" cy="9" r="1.5" fill="white" />
                    <circle cx="16" cy="9" r="1.5" fill="white" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '18px', color: 'var(--text-primary)' }}>Network Agent</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px', fontFamily: 'DM Sans, sans-serif' }}>Your strategic networking assistant</div>
                </div>
              </div>

              {/* Proactive suggestion chips */}
              {suggestions.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '10px' }}>
                    Suggested for you
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(s.prompt)}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: '20px', color: 'var(--accent)', fontSize: '13px', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, cursor: 'pointer', transition: 'background 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.color = 'white' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent-dim)'; e.currentTarget.style.color = 'var(--accent)' }}
                      >
                        <span>{SUGGESTION_ICONS[s.icon] || '→'}</span>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Capability guide */}
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '12px' }}>
                What I can do for you
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  {
                    icon: '🔗',
                    title: 'Find warm paths',
                    desc: 'Discover who in your network can introduce you to anyone.',
                    prompts: [
                      'Find a path to someone at Stripe',
                      'Who can get me into HubSpot?',
                    ],
                  },
                  {
                    icon: '⚡',
                    title: 'Gap analysis',
                    desc: 'See which targets you have no warm route into — and who bridges the gap.',
                    prompts: [
                      'Analyze gaps across all my target accounts',
                      'Which targets have no warm path yet?',
                    ],
                  },
                  {
                    icon: '🔍',
                    title: 'Research & profile',
                    desc: 'Learn who you know at any company and how strong those connections are.',
                    prompts: [
                      'Who in my network works at Salesforce?',
                      'What companies are best represented in my network?',
                    ],
                  },
                  {
                    icon: '✉️',
                    title: 'Draft intro messages',
                    desc: 'Write a personalized ask through your mutual connection — ready to send.',
                    prompts: [
                      'Draft an intro request through my connection at OpenAI',
                      'Write a warm intro ask for my best path into Stripe',
                    ],
                  },
                ].map((cap, ci) => (
                  <div key={ci} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '16px' }}>{cap.icon}</span>
                      <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>{cap.title}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px', lineHeight: 1.5 }}>{cap.desc}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      {cap.prompts.map((p, pi) => (
                        <button
                          key={pi}
                          onClick={() => sendMessage(p)}
                          style={{ padding: '7px 12px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-secondary)', fontSize: '12px', fontFamily: 'DM Sans, sans-serif', textAlign: 'left', cursor: 'pointer', transition: 'border-color 0.15s, color 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                        >
                          → {p}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '720px', margin: '0 auto 16px' }}
            >
              {msg.role === 'assistant' && (
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'var(--accent-dim)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: '10px', marginTop: '2px' }}>
                  <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
                    <circle cx="9" cy="9" r="3" fill="var(--accent)" />
                    <circle cx="9" cy="9" r="7" stroke="var(--accent)" strokeWidth="1.5" fill="none" />
                  </svg>
                </div>
              )}
              <div style={{ maxWidth: '80%', padding: msg.role === 'user' ? '10px 14px' : '12px 16px', background: msg.role === 'user' ? 'var(--accent)' : 'var(--bg-card)', border: msg.role === 'user' ? 'none' : '1px solid var(--border)', borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '4px 14px 14px 14px', color: msg.role === 'user' ? 'white' : 'var(--text-primary)', fontSize: '14px', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.6, wordBreak: 'break-word' }}>
                {msg.role === 'user'
                  ? <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
                  : <MarkdownMessage content={msg.content} streaming={i === messages.length - 1 && streaming} />
                }
              </div>
            </div>
          ))}

          {/* Inline follow-up suggestion chips — shown after last assistant response */}
          {!streaming && suggestions.length > 0 && messages.length > 0 && messages[messages.length - 1]?.role === 'assistant' && (
            <div style={{ maxWidth: '720px', margin: '-4px auto 12px', paddingLeft: '38px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s.prompt)}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 12px', background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: '20px', color: 'var(--accent)', fontSize: '12px', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, cursor: 'pointer', transition: 'background 0.15s, color 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.color = 'white' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent-dim)'; e.currentTarget.style.color = 'var(--accent)' }}
                >
                  <span>{SUGGESTION_ICONS[s.icon] || '→'}</span>
                  {s.label}
                </button>
              ))}
            </div>
          )}

          {/* Outreach saved confirmation */}
          {outreachSaved && (
            <div style={{ maxWidth: '720px', margin: '0 auto 8px', paddingLeft: '38px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '7px 14px', background: 'rgba(52,211,153,0.08)', border: '1px solid var(--success)', borderRadius: '8px', fontSize: '13px', fontFamily: 'DM Sans, sans-serif', color: 'var(--success)' }}>
                ✓ Draft saved to Outreach Tracker
                <a href="/outreach" style={{ color: 'var(--success)', fontWeight: 600, textDecoration: 'underline', marginLeft: '4px' }}>View →</a>
                <button onClick={() => setOutreachSaved(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--success)', opacity: 0.6, padding: '0 2px', lineHeight: 1, fontSize: '14px' }}>×</button>
              </div>
            </div>
          )}

          {/* Active tool indicators */}
          {activeTools.length > 0 && (
            <div style={{ maxWidth: '720px', margin: '0 auto 8px', paddingLeft: '38px' }}>
              {activeTools.map((tool, i) => (
                <div key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: '20px', fontSize: '12px', color: 'var(--accent)', fontFamily: 'DM Sans, sans-serif', marginRight: '6px', marginBottom: '4px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)', animation: 'pulse 1s infinite' }} />
                  {TOOL_LABELS[tool] || tool}
                </div>
              ))}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="agent-chat-input-bar" style={{ padding: '16px 32px 24px', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-sidebar)' }}>
          <div style={{ display: 'flex', gap: '10px', maxWidth: '720px', margin: '0 auto', alignItems: 'flex-end' }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your network, find paths, run gap analysis…"
              rows={1}
              disabled={streaming}
              style={{ flex: 1, padding: '12px 14px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'DM Sans, sans-serif', resize: 'none', lineHeight: 1.5, maxHeight: '120px', overflowY: 'auto', opacity: streaming ? 0.7 : 1 }}
              onInput={e => {
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
              }}
            />
            {streaming ? (
              <button onClick={stopStreaming} style={{ padding: '10px 16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-secondary)', fontSize: '13px', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                Stop
              </button>
            ) : (
              <button onClick={() => sendMessage(input)} disabled={!input.trim()} style={{ padding: '10px 20px', background: input.trim() ? 'var(--accent)' : 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', color: input.trim() ? 'white' : 'var(--text-muted)', fontSize: '13px', fontWeight: 600, fontFamily: 'DM Sans, sans-serif', cursor: input.trim() ? 'pointer' : 'default', flexShrink: 0, transition: 'background 0.15s, color 0.15s' }}>
                Send
              </button>
            )}
          </div>
          <div style={{ maxWidth: '720px', margin: '8px auto 0', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>
            Enter to send · Shift+Enter for new line
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}
