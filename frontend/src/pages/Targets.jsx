import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useToast } from '../components/Toast'

// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS = {
  connected:  { label: 'Connected',  color: 'var(--success)',  bg: 'rgba(52,211,153,0.1)' },
  bridgeable: { label: 'Bridgeable', color: 'var(--warning)',  bg: 'rgba(251,191,36,0.1)' },
  gap:        { label: 'No warm path', color: 'var(--danger)', bg: 'rgba(248,113,113,0.08)' },
  loading:    { label: '…',           color: 'var(--text-muted)', bg: 'var(--bg-input)' },
}

function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.loading
  return (
    <span style={{
      fontSize: '11px', fontWeight: 600, padding: '3px 9px', borderRadius: '99px',
      background: s.bg, color: s.color, whiteSpace: 'nowrap',
    }}>{s.label}</span>
  )
}

// ── Link icon ─────────────────────────────────────────────────────────────────
function ExternalLink({ href, title }) {
  if (!href) return null
  const url = href.startsWith('http') ? href : `https://${href}`
  return (
    <a href={url} target="_blank" rel="noreferrer" title={title}
      style={{ color: 'var(--text-muted)', textDecoration: 'none', lineHeight: 1 }}
      onClick={e => e.stopPropagation()}
    >
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
        <path d="M5 2H2a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        <path d="M7.5 1H12M12 1v4.5M12 1L6 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </a>
  )
}

// ── Add target form ───────────────────────────────────────────────────────────
function AddTargetForm({ onAdded }) {
  const [company, setCompany]   = useState('')
  const [website, setWebsite]   = useState('')
  const [linkedin, setLinkedin] = useState('')
  const [notes, setNotes]       = useState('')
  const [open, setOpen]         = useState(false)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState(null)
  const inputRef = useRef(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!company.trim()) return
    setSaving(true)
    setError(null)
    try {
      const t = await api.addTargetAccount({
        company_name: company.trim(),
        website_url:  website.trim()  || undefined,
        linkedin_url: linkedin.trim() || undefined,
        reason:       notes.trim()    || undefined,
      })
      onAdded(t)
      setCompany(''); setWebsite(''); setLinkedin(''); setNotes('')
      setOpen(false)
    } catch (err) {
      setError(err.message || 'Failed to add')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card" style={{ padding: '18px 20px', marginBottom: '16px' }}>
      {!open ? (
        <button
          className="btn-ghost"
          style={{ width: '100%', justifyContent: 'center', fontSize: '14px', borderStyle: 'dashed' }}
          onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50) }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Add target company
        </button>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
            Add target company
          </div>
          {error && (
            <div style={{ fontSize: '13px', color: 'var(--danger)', padding: '8px 12px', background: 'rgba(248,113,113,0.08)', borderRadius: '8px' }}>
              {error}
            </div>
          )}
          <input
            ref={inputRef}
            className="input"
            placeholder="Company name *"
            value={company}
            onChange={e => setCompany(e.target.value)}
            required
            style={{ fontSize: '14px' }}
          />
          <div className="input-row-2" style={{ display: 'flex', gap: '8px' }}>
            <input
              className="input"
              placeholder="Website URL (optional)"
              value={website}
              onChange={e => setWebsite(e.target.value)}
              style={{ fontSize: '13px', flex: 1 }}
            />
            <input
              className="input"
              placeholder="LinkedIn company URL (optional)"
              value={linkedin}
              onChange={e => setLinkedin(e.target.value)}
              style={{ fontSize: '13px', flex: 1 }}
            />
          </div>
          <input
            className="input"
            placeholder="Why this company? (optional notes for your agent)"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            style={{ fontSize: '13px' }}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="submit" className="btn-primary" style={{ fontSize: '13px' }} disabled={saving || !company.trim()}>
              {saving ? 'Adding…' : 'Add company'}
            </button>
            <button type="button" className="btn-ghost" style={{ fontSize: '13px' }} onClick={() => { setOpen(false); setError(null) }}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

// ── Bulk import modal ─────────────────────────────────────────────────────────
function BulkImportModal({ onImported, onClose }) {
  const [text, setText]         = useState('')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState(null)
  const fileRef = useRef(null)

  function parseCompanies(raw) {
    return raw
      .split(/[\n,]+/)
      .map(s => s.trim())
      .filter(Boolean)
  }

  function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setText(ev.target.result)
    reader.readAsText(file)
  }

  async function handleImport() {
    const companies = parseCompanies(text)
    if (!companies.length) { setError('No company names found'); return }
    setSaving(true)
    setError(null)
    try {
      const result = await api.bulkAddTargets(companies)
      onImported(result)
    } catch (err) {
      setError(err.message || 'Failed to import')
    } finally {
      setSaving(false)
    }
  }

  const companies = parseCompanies(text)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '18px', fontWeight: 700, margin: 0 }}>
            Import target list
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 14px', lineHeight: 1.6 }}>
          Paste company names below — one per line, or comma-separated. Or upload a CSV with company names.
        </p>

        {error && (
          <div style={{ fontSize: '13px', color: 'var(--danger)', padding: '8px 12px', background: 'rgba(248,113,113,0.08)', borderRadius: '8px', marginBottom: '12px' }}>
            {error}
          </div>
        )}

        <textarea
          className="input"
          rows={8}
          placeholder={"Salesforce\nHubSpot\nStripe\nOpenAI\n..."}
          value={text}
          onChange={e => setText(e.target.value)}
          style={{ fontSize: '13px', resize: 'vertical', marginBottom: '10px', fontFamily: 'monospace' }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <button
            className="btn-ghost"
            style={{ fontSize: '12px', padding: '7px 12px' }}
            onClick={() => fileRef.current?.click()}
          >
            Upload CSV / TXT
          </button>
          <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={handleFileChange} />
          {companies.length > 0 && (
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {companies.length} compan{companies.length === 1 ? 'y' : 'ies'} found
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn-primary"
            style={{ fontSize: '14px' }}
            onClick={handleImport}
            disabled={saving || companies.length === 0}
          >
            {saving ? 'Importing…' : `Import ${companies.length} compan${companies.length === 1 ? 'y' : 'ies'}`}
          </button>
          <button className="btn-ghost" style={{ fontSize: '14px' }} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── Target card ───────────────────────────────────────────────────────────────
function TargetCard({ target, intelligence, onRemove, onAskAgent, onFindPath }) {
  const [editing, setEditing] = useState(false)
  const [notes, setNotes]     = useState(target.reason || '')
  const [website, setWebsite] = useState(target.website_url || '')
  const [linkedin, setLinkedin] = useState(target.linkedin_url || '')
  const [saving, setSaving]   = useState(false)

  const intel = intelligence || {}
  const status = intel.status || 'loading'

  async function handleSaveEdit() {
    setSaving(true)
    try {
      await api.updateTargetAccount(target.id, {
        reason: notes.trim() || null,
        website_url: website.trim() || null,
        linkedin_url: linkedin.trim() || null,
      })
      setEditing(false)
    } catch {}
    setSaving(false)
  }

  return (
    <div className="card" style={{ padding: '18px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px' }}>
              {target.company_name}
            </span>
            <StatusBadge status={status} />
            <ExternalLink href={target.website_url || website} title="Website" />
            <ExternalLink href={target.linkedin_url || linkedin} title="LinkedIn" />
          </div>
          {(target.reason || notes) && !editing && (
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {target.reason || notes}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          <button
            onClick={() => setEditing(e => !e)}
            title="Edit"
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '3px' }}
          >
            <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
              <path d="M10.5 2.5l2 2-8 8H2.5v-2l8-8z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            onClick={() => onRemove(target.id)}
            title="Remove"
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '3px' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 3.5h10M5 3.5V2.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5v1M6 6.5v3M8 6.5v3M3.5 3.5l.5 8h6l.5-8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Edit form */}
      {editing && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px', padding: '12px', background: 'var(--bg-input)', borderRadius: '8px' }}>
          <input
            className="input"
            placeholder="Website URL"
            value={website}
            onChange={e => setWebsite(e.target.value)}
            style={{ fontSize: '13px' }}
          />
          <input
            className="input"
            placeholder="LinkedIn company URL"
            value={linkedin}
            onChange={e => setLinkedin(e.target.value)}
            style={{ fontSize: '13px' }}
          />
          <input
            className="input"
            placeholder="Notes / why this company"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            style={{ fontSize: '13px' }}
          />
          <div style={{ display: 'flex', gap: '6px' }}>
            <button className="btn-primary" style={{ fontSize: '12px', padding: '6px 12px' }} onClick={handleSaveEdit} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button className="btn-ghost" style={{ fontSize: '12px', padding: '6px 12px' }} onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Intelligence */}
      {status === 'loading' ? (
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Analyzing your network…</div>
      ) : (
        <>
          {/* Stats row */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '15px' }}>
                {intel.direct_count ?? 0}
              </span>{' '}direct connection{intel.direct_count !== 1 ? 's' : ''}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '15px' }}>
                {intel.bridge_count ?? 0}
              </span>{' '}bridge contact{intel.bridge_count !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Direct connections */}
          {intel.direct_people?.length > 0 && (
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                Direct connections
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {intel.direct_people.slice(0, 3).map((p, i) => (
                  <div key={i} style={{ fontSize: '13px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)', flexShrink: 0 }} />
                    <span style={{ fontWeight: 500 }}>{p.name}</span>
                    {p.title && <span style={{ color: 'var(--text-muted)' }}>· {p.title}</span>}
                  </div>
                ))}
                {intel.direct_people.length > 3 && (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>+{intel.direct_people.length - 3} more</div>
                )}
              </div>
            </div>
          )}

          {/* Bridge contacts */}
          {intel.top_bridges?.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                Best intro path via
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {intel.top_bridges.slice(0, 2).map((b, i) => (
                  <div key={i} style={{ fontSize: '13px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--warning)', flexShrink: 0, marginTop: '5px' }} />
                    <div>
                      <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{b.name}</span>
                      {b.title && <span style={{ color: 'var(--text-muted)' }}> · {b.title}</span>}
                      {b.connects_to_name && (
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '1px' }}>
                          knows {b.connects_to_name}{b.connects_to_title ? ` (${b.connects_to_title})` : ''} at {target.company_name}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Gap state */}
          {status === 'gap' && (
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '10px 12px', background: 'var(--bg-input)', borderRadius: '8px', marginBottom: '12px' }}>
              No warm paths found yet. Ask the agent for strategies to build a connection here.
            </div>
          )}
        </>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
        <button
          className="btn-primary"
          style={{ fontSize: '12px', padding: '7px 14px' }}
          onClick={() => onAskAgent(target.company_name, intel)}
        >
          Ask agent →
        </button>
        {intel.direct_count > 0 && (
          <button
            className="btn-ghost"
            style={{ fontSize: '12px', padding: '7px 14px' }}
            onClick={() => onFindPath(target.company_name)}
          >
            Find path
          </button>
        )}
      </div>
    </div>
  )
}

// ── Summary bar ───────────────────────────────────────────────────────────────
function SummaryBar({ summary }) {
  if (!summary || summary.total === 0) return null
  return (
    <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
      {[
        { label: 'Total targets',  value: summary.total,      color: 'var(--text-primary)' },
        { label: 'Connected',      value: summary.connected,  color: 'var(--success)' },
        { label: 'Bridgeable',     value: summary.bridgeable, color: 'var(--warning)' },
        { label: 'No warm path',   value: summary.gap,        color: 'var(--danger)' },
      ].map(s => (
        <div key={s.label} className="card" style={{ padding: '12px 18px', textAlign: 'center', flex: '1', minWidth: '80px' }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 700, color: s.color }}>{s.value}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>{s.label}</div>
        </div>
      ))}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Targets() {
  const navigate = useNavigate()
  const toast    = useToast()

  const [targets, setTargets]           = useState([])
  const [intelligence, setIntelligence] = useState({})  // keyed by target id
  const [summary, setSummary]           = useState(null)
  const [loading, setLoading]           = useState(true)
  const [showImport, setShowImport]     = useState(false)

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const [targetsData, intelData] = await Promise.all([
        api.getTargetAccounts(),
        api.getTargetsIntelligence().catch(() => ({ targets: [], summary: null })),
      ])
      setTargets(targetsData.targets || [])

      // Index intelligence by target id
      const intelMap = {}
      for (const t of (intelData.targets || [])) {
        intelMap[t.id] = t
      }
      setIntelligence(intelMap)
      setSummary(intelData.summary || null)
    } catch {
      toast?.add('Failed to load targets', 'error')
    } finally {
      setLoading(false)
    }
  }

  function handleAdded(newTarget) {
    setTargets(prev => [newTarget, ...prev])
    // refresh intelligence in background
    api.getTargetsIntelligence().then(d => {
      const m = {}
      for (const t of (d.targets || [])) m[t.id] = t
      setIntelligence(m)
      setSummary(d.summary || null)
    }).catch(() => {})
    toast?.add(`${newTarget.company_name} added to targets`, 'success')
  }

  async function handleRemove(id) {
    try {
      await api.deleteTargetAccount(id)
      setTargets(prev => prev.filter(t => t.id !== id))
      setIntelligence(prev => { const n = { ...prev }; delete n[id]; return n })
      toast?.add('Target removed', 'success')
    } catch {
      toast?.add('Failed to remove target', 'error')
    }
  }

  async function handleBulkImported(result) {
    setShowImport(false)
    const added   = result.added_count   || 0
    const skipped = (result.skipped || []).length
    if (added > 0) {
      const msg = skipped > 0
        ? `${added} compan${added === 1 ? 'y' : 'ies'} added · ${skipped} already in list`
        : `${added} compan${added === 1 ? 'y' : 'ies'} added`
      toast?.add(msg, 'success')
      loadAll()
    } else {
      toast?.add('All companies already in your target list', 'info')
    }
  }

  function handleAskAgent(companyName, intel) {
    let prompt
    if (intel.status === 'connected') {
      prompt = `I have direct connections at ${companyName}. Who should I reach out to first and how?`
    } else if (intel.status === 'bridgeable') {
      const bridge = intel.top_bridges?.[0]?.name
      prompt = bridge
        ? `Help me get introduced to someone at ${companyName} through ${bridge}. Draft the ask.`
        : `Analyze my best path into ${companyName} and help me draft an intro request.`
    } else {
      prompt = `I have no warm paths into ${companyName} yet. What's the best strategy to build a connection there?`
    }
    navigate('/agent', { state: { prompt } })
  }

  function handleFindPath(companyName) {
    navigate('/find-path', { state: { searchQuery: companyName } })
  }

  return (
    <div className="page-pad" style={{ maxWidth: '760px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '26px', fontWeight: 700, margin: '0 0 4px' }}>
            Target Accounts
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
            Companies you want to reach — your agent maps the warmest path in.
          </p>
        </div>
        <button
          className="btn-ghost"
          style={{ fontSize: '13px', padding: '9px 16px', flexShrink: 0 }}
          onClick={() => setShowImport(true)}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 9V1M4 6l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M1 11h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Import list
        </button>
      </div>

      {/* Summary */}
      {!loading && summary && <SummaryBar summary={summary} />}

      {/* Add form */}
      <AddTargetForm onAdded={handleAdded} />

      {/* Target cards */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
          Loading your targets…
        </div>
      ) : targets.length === 0 ? (
        <div className="card" style={{ padding: '48px 32px', textAlign: 'center' }}>
          <div style={{ fontSize: '44px', marginBottom: '14px' }}>🎯</div>
          <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '18px', fontWeight: 700, margin: '0 0 8px' }}>
            No target companies yet
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 22px', lineHeight: 1.6, maxWidth: '380px', marginInline: 'auto' }}>
            Add the companies you want to break into. Your AI agent will map your warmest path to each one.
          </p>
          <button className="btn-ghost" style={{ fontSize: '14px' }} onClick={() => setShowImport(true)}>
            Import a list of companies
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {targets.map(t => (
            <TargetCard
              key={t.id}
              target={t}
              intelligence={intelligence[t.id]}
              onRemove={handleRemove}
              onAskAgent={handleAskAgent}
              onFindPath={handleFindPath}
            />
          ))}
        </div>
      )}

      {showImport && (
        <BulkImportModal onImported={handleBulkImported} onClose={() => setShowImport(false)} />
      )}
    </div>
  )
}
