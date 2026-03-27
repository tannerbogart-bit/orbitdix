// Post-signup onboarding wizard — 3 steps:
// 1. Import LinkedIn network (CSV or extension)
// 2. Set targets + business context (feeds agent)
// 3. Ready — agent surfaces first insights
import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import AuthShell from '../auth/AuthShell'

// ── CSV helpers (same logic as CSVUploadModal) ────────────────────────────
const BATCH_SIZE = 200

function parseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  if (lines.length < 2) return []

  function parseLine(line) {
    const fields = []
    let field = '', inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { field += '"'; i++ }
        else inQuotes = !inQuotes
      } else if (ch === ',' && !inQuotes) {
        fields.push(field.trim()); field = ''
      } else { field += ch }
    }
    fields.push(field.trim())
    return fields
  }

  const HEADER_KEYWORDS = ['first name', 'last name', 'firstname', 'lastname']
  let headerIdx = 0
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const lower = lines[i].toLowerCase()
    if (HEADER_KEYWORDS.some(k => lower.includes(k))) { headerIdx = i; break }
  }

  const headers = parseLine(lines[headerIdx]).map(h => h.toLowerCase().replace(/\s+/g, '_'))
  return lines.slice(headerIdx + 1).filter(l => l.trim()).map(line => {
    const values = parseLine(line)
    const row = {}
    headers.forEach((h, i) => { row[h] = values[i] || '' })
    return row
  })
}

function rowToPerson(row) {
  const firstName   = row['first_name'] || row['firstname'] || ''
  const lastName    = row['last_name']  || row['lastname']  || ''
  const email       = row['email_address'] || row['email'] || ''
  const company     = row['company'] || row['organization'] || ''
  const title       = row['position'] || row['title'] || row['job_title'] || ''
  const linkedinUrl = row['url'] || row['linkedin_url'] || row['linkedin'] || ''
  if (!firstName && !lastName && !email) return null
  return {
    first_name: firstName, last_name: lastName,
    email: email || undefined, company: company || undefined,
    title: title || undefined, linkedin_url: linkedinUrl || undefined,
  }
}

// ── Shared button / input styles ──────────────────────────────────────────
const primaryBtn = (extra = {}) => ({
  width: '100%', justifyContent: 'center', fontSize: '15px',
  padding: '12px', display: 'flex', alignItems: 'center', gap: '8px',
  ...extra,
})

const ghostBtn = (extra = {}) => ({
  width: '100%', justifyContent: 'center', fontSize: '14px',
  padding: '10px', ...extra,
})

// ── Step 1: Import network ────────────────────────────────────────────────
function StepImport({ onDone, onSkip }) {  // onDone(count), onSkip()
  const fileRef = useRef(null)
  const [dragging, setDragging]   = useState(false)
  const [importing, setImporting] = useState(false)
  const [imported, setImported]   = useState(null)
  const [error, setError]         = useState(null)

  async function handleFile(file) {
    if (!file) return
    setError(null)
    setImporting(true)
    try {
      const text  = await file.text()
      const rows  = parseCSV(text)
      const people = rows.map(rowToPerson).filter(Boolean)

      if (people.length === 0) {
        setError("Couldn't find any contacts in this file. Make sure it's a LinkedIn connections export.")
        setImporting(false)
        return
      }

      let total = 0
      for (let i = 0; i < people.length; i += BATCH_SIZE) {
        const batch = people.slice(i, i + BATCH_SIZE)
        const res = await api.bulkImport(batch)
        total += res.imported ?? 0
      }
      setImported(total)
      // auto-advance after a short moment so user sees the success state
    } catch {
      setError('Import failed. Please try again.')
    } finally {
      setImporting(false)
    }
  }

  function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  if (imported !== null) {
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(52,211,153,0.1)', border: '2px solid var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M5 12l5 5L19 7" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 700, margin: '0 0 8px' }}>
          {imported.toLocaleString()} connections imported
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 28px', lineHeight: 1.5 }}>
          OrbitSix can now map warm paths through your entire network. Next, tell the agent who you want to reach.
        </p>
        <button className="btn-primary" style={primaryBtn()} onClick={() => onDone(imported)}>
          Continue → Set your targets
        </button>
      </div>
    )
  }

  return (
    <div>
      <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 700, margin: '0 0 8px' }}>
        Import your LinkedIn network
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 24px', lineHeight: 1.5 }}>
        Export your connections from LinkedIn, then drop the CSV here. OrbitSix maps every path between you and your targets.
      </p>

      {/* How to export */}
      <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '14px 16px', marginBottom: '20px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
        <strong style={{ color: 'var(--text-primary)' }}>How to export from LinkedIn:</strong>
        <br />
        Settings &amp; Privacy → Data Privacy → Get a copy of your data → Connections → Request archive
      </div>

      {error && (
        <div style={{ padding: '10px 14px', background: 'rgba(248,113,113,0.08)', border: '1px solid var(--danger)', borderRadius: '8px', fontSize: '13px', color: 'var(--danger)', marginBottom: '14px' }}>
          {error}
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: '12px',
          padding: '36px 20px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragging ? 'var(--accent-dim)' : 'var(--bg-input)',
          transition: 'all 0.15s',
          marginBottom: '16px',
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={e => handleFile(e.target.files[0])}
        />
        {importing ? (
          <div style={{ color: 'var(--accent)', fontSize: '14px' }}>Importing connections…</div>
        ) : (
          <>
            <div style={{ fontSize: '28px', marginBottom: '10px' }}>📥</div>
            <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Drop your CSV here</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>or click to browse</div>
          </>
        )}
      </div>

      <button className="btn-ghost" style={ghostBtn()} onClick={onSkip}>
        Skip for now — I'll import later
      </button>
    </div>
  )
}

// ── Step 2: Targets + context ─────────────────────────────────────────────
function StepTargets({ onDone }) {
  const [profile, setProfile] = useState({ title: '', company: '' })
  const [context, setContext] = useState({ my_role: '', what_i_sell: '', icp_description: '' })
  const [targets, setTargets] = useState(['', '', ''])
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState(null)

  function setTarget(i, val) {
    setTargets(prev => { const next = [...prev]; next[i] = val; return next })
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      // Save profile fields (title + company) onto the self-person record
      const me = await api.me().catch(() => null)
      await api.updateProfile({
        first_name:   localStorage.getItem('user_first_name') || me?.first_name || 'User',
        last_name:    localStorage.getItem('user_last_name')  || me?.last_name  || '',
        title:        profile.title.trim(),
        company:      profile.company.trim(),
      })

      // Save agent context (role, what you sell, ICP + company for agent awareness)
      await api.saveAgentContext({
        my_role:         context.my_role,
        my_company:      profile.company.trim(),
        what_i_sell:     context.what_i_sell,
        icp_description: context.icp_description,
      })

      // Save target accounts
      const companies = targets.map(t => t.trim()).filter(Boolean)
      await Promise.all(companies.map(name => api.addTargetAccount({ company_name: name })))

      onDone(companies.length, targets)
    } catch {
      setError('Something went wrong. Please try again.')
      setSaving(false)
    }
  }

  const inp = { style: { width: '100%', padding: '8px 12px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' } }
  const lbl = { style: { fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' } }

  return (
    <form onSubmit={handleSave}>
      <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 700, margin: '0 0 6px' }}>
        Who are you trying to reach?
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 20px', lineHeight: 1.5 }}>
        Your AI agent uses this to surface the best paths and draft personalized intros.
      </p>

      {error && (
        <div style={{ padding: '10px 14px', background: 'rgba(248,113,113,0.08)', border: '1px solid var(--danger)', borderRadius: '8px', fontSize: '13px', color: 'var(--danger)', marginBottom: '14px' }}>
          {error}
        </div>
      )}

      {/* About you */}
      <div style={{ marginBottom: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>About you</div>
        <div className="input-row-2" style={{ display: 'flex', gap: '8px' }}>
          <div style={{ flex: 1 }}>
            <label {...lbl}>Your role</label>
            <input {...inp} placeholder="e.g. VP of Sales" value={profile.title} onChange={e => setProfile(p => ({ ...p, title: e.target.value }))} />
          </div>
          <div style={{ flex: 1 }}>
            <label {...lbl}>Your company</label>
            <input {...inp} placeholder="e.g. Acme Corp" value={profile.company} onChange={e => setProfile(p => ({ ...p, company: e.target.value }))} />
          </div>
        </div>
        <div>
          <label {...lbl}>What you sell or offer</label>
          <input {...inp} placeholder="e.g. B2B SaaS for finance teams" value={context.what_i_sell} onChange={e => setContext(p => ({ ...p, what_i_sell: e.target.value }))} />
        </div>
        <div>
          <label {...lbl}>Who you're trying to reach</label>
          <input {...inp} placeholder="e.g. Series B+ fintech startups, enterprise VPs" value={context.icp_description} onChange={e => setContext(p => ({ ...p, icp_description: e.target.value }))} />
        </div>
      </div>

      {/* Target companies */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', marginBottom: '22px' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '10px' }}>
          Target companies <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(up to 3 to start)</span>
        </div>
        {targets.map((t, i) => (
          <input
            key={i}
            {...inp}
            style={{ ...inp.style, marginBottom: i < 2 ? '8px' : 0 }}
            placeholder={`e.g. ${['Salesforce', 'HubSpot', 'Stripe'][i]}`}
            value={t}
            onChange={e => setTarget(i, e.target.value)}
          />
        ))}
      </div>

      <button type="submit" className="btn-primary" style={primaryBtn()} disabled={saving}>
        {saving ? 'Saving…' : 'Set up my agent →'}
      </button>
      <button
        type="button"
        className="btn-ghost"
        style={ghostBtn({ marginTop: '8px' })}
        onClick={() => onDone(0, [])}
        disabled={saving}
      >
        Skip — I'll fill this in later
      </button>
    </form>
  )
}

// ── Step 3: Done ──────────────────────────────────────────────────────────
function StepReady({ targetCount, imported, targets, onGo, onImport }) {
  const hasNetwork = imported > 0
  const firstTarget = targets.find(t => t.trim())

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 0 32px var(--accent-glow)' }}>
        <svg width="28" height="28" viewBox="0 0 18 18" fill="none">
          <circle cx="9" cy="9" r="3" fill="white" />
          <circle cx="9" cy="9" r="7" stroke="white" strokeWidth="1.5" fill="none" />
          <circle cx="9" cy="2" r="1.5" fill="white" />
          <circle cx="9" cy="16" r="1.5" fill="white" />
          <circle cx="2" cy="9" r="1.5" fill="white" />
          <circle cx="16" cy="9" r="1.5" fill="white" />
        </svg>
      </div>

      <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '24px', fontWeight: 700, margin: '0 0 10px' }}>
        {hasNetwork ? 'Your agent is ready' : 'Almost there'}
      </h2>

      {hasNetwork ? (
        <>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 8px', lineHeight: 1.6 }}>
            {targetCount > 0
              ? `Mapped ${imported.toLocaleString()} connections across your network. Your agent is ready to find the fastest paths into ${targetCount === 1 ? firstTarget || 'your target' : `your ${targetCount} target companies`}.`
              : 'Your network is loaded and your agent is set up.'}
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '0 0 28px' }}>
            {firstTarget
              ? `Try: "Who's my warmest contact at ${firstTarget}?"`
              : 'Try: "Who should I reach out to first?" or "Who am I closest to at [company]?"'}
          </p>
          <button className="btn-primary" style={primaryBtn()} onClick={onGo}>
            Ask my agent →
          </button>
        </>
      ) : (
        <>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 20px', lineHeight: 1.6 }}>
            Your agent is configured — but without your LinkedIn network, it can't map paths yet.
            Import your connections to unlock warm introductions.
          </p>
          <div style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '14px 16px',
            marginBottom: '20px',
            fontSize: '13px',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            textAlign: 'left',
          }}>
            <strong style={{ color: 'var(--text-primary)' }}>LinkedIn → Settings &amp; Privacy → Data Privacy</strong>
            <br />Get a copy of your data → Connections → Request archive
          </div>
          <button className="btn-primary" style={primaryBtn()} onClick={onImport}>
            Import my network now
          </button>
          <button className="btn-ghost" style={ghostBtn({ marginTop: '8px' })} onClick={onGo}>
            Skip — explore without my network
          </button>
        </>
      )}
    </div>
  )
}

// ── Main wizard ───────────────────────────────────────────────────────────
export default function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep]             = useState(1)
  const [imported, setImported]     = useState(0)
  const [targetCount, setTargetCount] = useState(0)
  const [savedTargets, setSavedTargets] = useState([])

  function completeOnboarding(firstTarget) {
    localStorage.setItem('onboarding_complete', '1')
    const prompt = firstTarget
      ? `Who are my warmest connections at ${firstTarget}? Give me the best path and a draft intro message.`
      : null
    navigate('/agent', { replace: true, state: prompt ? { prompt } : undefined })
  }

  return (
    <AuthShell step={step} totalSteps={3}>
      {step === 1 && (
        <StepImport
          onDone={(count) => { setImported(count); setStep(2) }}
          onSkip={() => setStep(2)}
        />
      )}
      {step === 2 && (
        <StepTargets
          onDone={(count, targets) => { setTargetCount(count); setSavedTargets(targets); setStep(3) }}
        />
      )}
      {step === 3 && (
        <StepReady
          targetCount={targetCount}
          imported={imported}
          targets={savedTargets}
          onGo={() => completeOnboarding(savedTargets.find(t => t.trim()))}
          onImport={() => setStep(1)}
        />
      )}
    </AuthShell>
  )
}
