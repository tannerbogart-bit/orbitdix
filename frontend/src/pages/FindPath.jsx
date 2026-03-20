import { useState, useMemo, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import DraftMessageModal from '../components/DraftMessageModal'
import PathFlowGraph, { getHopLabel } from '../components/PathFlowGraph'
import UpgradeModal from '../components/UpgradeModal'
import { useToast } from '../components/Toast'
import { api } from '../api/client'

function Avatar({ person, size = 40, highlighted = false }) {
  const initials = ((person.first_name?.[0] || '') + (person.last_name?.[0] || '')).toUpperCase() || '?'
  return (
    <div
      className={`path-node-avatar${highlighted ? ' highlighted' : ''}`}
      style={{ width: size, height: size, fontSize: size * 0.32 }}
    >
      {initials}
    </div>
  )
}

function PersonCard({ person, onSelect, selected }) {
  return (
    <div
      className="card card-hover"
      onClick={() => onSelect(person)}
      style={{
        padding: '14px 16px',
        cursor: 'pointer',
        borderColor: selected ? 'var(--accent)' : undefined,
        background: selected ? 'var(--bg-card-hover)' : undefined,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}
    >
      <Avatar person={person} size={40} highlighted={selected} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
          {person.first_name} {person.last_name}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
          {person.title || '—'}{person.company ? ` · ${person.company}` : ''}
        </div>
      </div>
      {selected && (
        <div
          style={{
            width: '20px', height: '20px', borderRadius: '50%',
            background: 'var(--accent)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 5.5L4.5 8L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      )}
    </div>
  )
}

function PathDetailPanel({ pathPeople, edges, target, onDraftMessage, onReset, onSave, alreadySaved }) {
  if (!pathPeople) return null

  if (pathPeople.length === 0) {
    return (
      <div className="card" style={{ padding: '28px', textAlign: 'center', marginTop: '24px' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>🌑</div>
        <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '18px', fontWeight: 700, margin: '0 0 8px' }}>
          No path found
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 20px' }}>
          These two people aren&apos;t connected in your current network.
        </p>
        <button className="btn-ghost" onClick={onReset}>Try again</button>
      </div>
    )
  }

  const degrees = pathPeople.length - 1

  // Build edge lookup for connection chain
  const edgeMap = {}
  for (const e of edges) {
    const key = `${Math.min(e.from_person_id, e.to_person_id)}-${Math.max(e.from_person_id, e.to_person_id)}`
    edgeMap[key] = e
  }

  return (
    <div className="card" style={{ padding: '24px', marginTop: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '18px', fontWeight: 700, margin: '0 0 4px' }}>
            Path found
          </h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span className="badge badge-accent">{degrees} degree{degrees !== 1 ? 's' : ''}</span>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              {degrees} introduction{degrees !== 1 ? 's' : ''} needed
            </span>
          </div>
        </div>
        <button className="btn-ghost" onClick={onReset} style={{ fontSize: '13px', padding: '7px 14px' }}>
          New search
        </button>
      </div>

      {/* Connection chain */}
      <div style={{ marginBottom: '20px' }}>
        {pathPeople.map((person, i) => {
          const isLast = i === pathPeople.length - 1
          const initials = ((person.first_name?.[0] || '') + (person.last_name?.[0] || '')).toUpperCase() || '?'
          const isEnd = i === 0 || isLast

          // Hop context between this person and the next
          let hopLabel = null
          if (!isLast) {
            const next = pathPeople[i + 1]
            const key  = `${Math.min(person.id, next.id)}-${Math.max(person.id, next.id)}`
            hopLabel = getHopLabel(edgeMap[key], person, next)
          }

          return (
            <div key={person.id}>
              {/* Person row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                  background: isEnd ? 'var(--accent)' : 'var(--accent-dim)',
                  border: `2px solid ${isEnd ? 'var(--accent)' : 'var(--border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '13px',
                  color: isEnd ? '#fff' : 'var(--accent)',
                }}>
                  {initials}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>
                    {person.first_name} {person.last_name}
                    {i === 0 && <span style={{ marginLeft: '8px', fontSize: '11px', background: 'var(--accent-dim)', color: 'var(--accent)', padding: '2px 8px', borderRadius: '20px', fontWeight: 700 }}>You</span>}
                    {isLast && <span style={{ marginLeft: '8px', fontSize: '11px', background: 'rgba(96,165,250,0.15)', color: '#60a5fa', padding: '2px 8px', borderRadius: '20px', fontWeight: 700 }}>Target</span>}
                  </div>
                  {(person.title || person.company) && (
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '1px' }}>
                      {person.title || ''}{person.company ? ` · ${person.company}` : ''}
                    </div>
                  )}
                </div>
              </div>

              {/* Hop connector */}
              {!isLast && (
                <div style={{ display: 'flex', alignItems: 'stretch', margin: '4px 0' }}>
                  <div style={{ width: '40px', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                    <div style={{ width: '2px', background: 'var(--accent)', opacity: 0.3, borderRadius: '1px' }} />
                  </div>
                  <div style={{
                    margin: '4px 0 4px 12px',
                    padding: '5px 12px',
                    background: hopLabel ? 'var(--accent-dim)' : 'var(--bg-input)',
                    border: `1px solid ${hopLabel ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: '20px',
                    fontSize: '12px',
                    color: hopLabel ? 'var(--accent)' : 'var(--text-muted)',
                    fontWeight: hopLabel ? 600 : 400,
                    alignSelf: 'center',
                  }}>
                    {hopLabel || 'connected'}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          className="btn-primary"
          style={{ flex: 1, justifyContent: 'center' }}
          onClick={() => onDraftMessage(target, pathPeople)}
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M1 1h13v9H1zM4 13l3.5-3 3.5 3" stroke="white" strokeWidth="1.25" strokeLinejoin="round" />
          </svg>
          Draft intro message
        </button>
        <button
          className="btn-ghost"
          style={{ fontSize: '14px' }}
          onClick={onSave}
          disabled={alreadySaved}
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M3 2h9a1 1 0 0 1 1 1v9l-6-3-6 3V3a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.25" />
          </svg>
          {alreadySaved ? 'Saved' : 'Save path'}
        </button>
      </div>
    </div>
  )
}

export default function FindPath() {
  const toast    = useToast()
  const location = useLocation()

  const [people, setPeople]         = useState([])
  const [edges, setEdges]           = useState([])
  const [loadingPeople, setLoadingPeople] = useState(true)
  const [query, setQuery]           = useState('')
  const [toPerson, setToPerson]     = useState(location.state?.toPerson || null)
  const [pathPeople, setPathPeople] = useState(null)  // null = not searched yet, [] = no path
  const [searching, setSearching]   = useState(false)
  const [modal, setModal]           = useState(null)
  const [upgradeMsg, setUpgradeMsg] = useState(null)
  const [step, setStep]             = useState('select')
  const [savedPaths, setSavedPaths] = useState(new Set())

  useEffect(() => {
    Promise.all([api.listPeople(), api.listEdges()])
      .then(([pd, ed]) => { setPeople(pd.people || []); setEdges(ed.edges || []) })
      .catch(() => toast?.add('Failed to load contacts', 'error'))
      .finally(() => setLoadingPeople(false))
  }, [])

  const me = people.find(p => p.is_self)
  const others = people.filter(p => !p.is_self)

  const filtered = useMemo(() => {
    if (!query.trim()) return others
    const q = query.toLowerCase()
    return others.filter(p =>
      p.first_name?.toLowerCase().includes(q) ||
      p.last_name?.toLowerCase().includes(q) ||
      (p.company || '').toLowerCase().includes(q) ||
      (p.title || '').toLowerCase().includes(q)
    )
  }, [query, others])

  async function handleFind() {
    if (!toPerson) return
    setSearching(true)
    try {
      const data = await api.findPath(toPerson.id)
      // data.path is an array of person IDs; resolve them to person objects
      const peopleById = Object.fromEntries(people.map(p => [p.id, p]))
      const resolved = (data.path || []).map(id => peopleById[id]).filter(Boolean)
      setPathPeople(resolved)
      setStep('result')
    } catch (err) {
      if (err.message === 'No path found') {
        setPathPeople([])
        setStep('result')
      } else if (err.upgradeRequired) {
        setUpgradeMsg(err.message)
      } else {
        toast?.add('Failed to find path', 'error')
      }
    } finally {
      setSearching(false)
    }
  }

  function handleReset() {
    setToPerson(null)
    setPathPeople(null)
    setQuery('')
    setStep('select')
  }

  async function handleSave() {
    if (!pathPeople?.length) return
    const key = `${me?.id}-${toPerson?.id}`
    if (savedPaths.has(key)) return
    try {
      await api.savePath(pathPeople.map(p => p.id))
      setSavedPaths(prev => new Set([...prev, key]))
      toast?.add(`Path to ${toPerson?.first_name} saved!`, 'success')
    } catch (err) {
      if (err.message === 'Path already saved') {
        setSavedPaths(prev => new Set([...prev, key]))
      } else if (err.upgradeRequired) {
        setUpgradeMsg(err.message)
      } else {
        toast?.add('Failed to save path', 'error')
      }
    }
  }

  const saveKey = `${me?.id}-${toPerson?.id}`

  return (
    <div className="page-pad" style={{ maxWidth: '680px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '26px', fontWeight: 700, margin: '0 0 4px' }}>
          Find a Path
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
          Discover how you&apos;re connected to anyone in your extended network.
        </p>
      </div>

      {step === 'select' && (
        <>
          {/* From (always you) */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
              From
            </div>
            <div className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', borderColor: 'var(--accent)' }}>
              {me ? (
                <>
                  <Avatar person={me} size={38} highlighted />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{me.first_name} {me.last_name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {me.title || '—'}{me.company ? ` · ${me.company}` : ''}
                    </div>
                  </div>
                  <span className="badge badge-accent" style={{ marginLeft: 'auto' }}>You</span>
                </>
              ) : (
                <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Loading…</div>
              )}
            </div>
          </div>

          {/* To */}
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
              To — search your network
            </div>

            {toPerson ? (
              <div className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', borderColor: 'var(--accent)', marginBottom: '16px' }}>
                <Avatar person={toPerson} size={38} highlighted />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>{toPerson.first_name} {toPerson.last_name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {toPerson.title || '—'}{toPerson.company ? ` · ${toPerson.company}` : ''}
                  </div>
                </div>
                <button className="btn-ghost" style={{ fontSize: '12px', padding: '6px 12px' }} onClick={() => setToPerson(null)}>
                  Change
                </button>
              </div>
            ) : (
              <input
                className="input"
                placeholder="Search by name, company, or role…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{ marginBottom: '12px' }}
                autoFocus
              />
            )}

            {!toPerson && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                {loadingPeople ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                    Loading your network…
                  </div>
                ) : filtered.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                    {query ? `No people match "${query}"` : 'No contacts yet. Import from CSV or use the Chrome extension.'}
                  </div>
                ) : (
                  filtered.map(p => (
                    <PersonCard key={p.id} person={p} onSelect={setToPerson} selected={toPerson?.id === p.id} />
                  ))
                )}
              </div>
            )}

            <button
              className="btn-primary"
              disabled={!toPerson || searching}
              style={{ width: '100%', justifyContent: 'center', fontSize: '15px', padding: '12px' }}
              onClick={handleFind}
            >
              {searching ? 'Searching…' : 'Find path'}
            </button>
          </div>
        </>
      )}

      {step === 'result' && (
        <PathDetailPanel
          pathPeople={pathPeople}
          edges={edges}
          target={toPerson}
          onDraftMessage={(target, pathPeople) => setModal({ target, pathPeople, edges })}
          onReset={handleReset}
          onSave={handleSave}
          alreadySaved={savedPaths.has(saveKey)}
        />
      )}

      {modal && (
        <DraftMessageModal
          target={modal.target}
          path={modal.pathPeople}
          edges={modal.edges}
          onClose={() => {
            setModal(null)
            toast?.add(`Message drafted for ${modal.target?.first_name} ${modal.target?.last_name}`, 'success')
          }}
        />
      )}

      {upgradeMsg && (
        <UpgradeModal message={upgradeMsg} onClose={() => setUpgradeMsg(null)} />
      )}
    </div>
  )
}
