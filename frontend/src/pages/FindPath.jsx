import { useState, useMemo } from 'react'
import { mockPeople, findPath, getPersonById } from '../data/mockData'
import DraftMessageModal from '../components/DraftMessageModal'
import { useToast } from '../components/Toast'

function Avatar({ person, size = 40, highlighted = false }) {
  return (
    <div
      className={`path-node-avatar${highlighted ? ' highlighted' : ''}`}
      style={{ width: size, height: size, fontSize: size * 0.32 }}
    >
      {person.avatar}
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
          {person.title} · {person.company}
        </div>
        {person.mutual > 0 && (
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {person.mutual} mutual connections
          </div>
        )}
      </div>
      {selected && (
        <div
          style={{
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
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

function PathDetailPanel({ result, pathPeople, target, onDraftMessage, onReset, onSavePath }) {
  if (!result) return null

  const { path, degrees } = result

  if (!path) {
    return (
      <div
        className="card"
        style={{ padding: '28px', textAlign: 'center', marginTop: '24px' }}
      >
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>🌑</div>
        <h3
          style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: '18px',
            fontWeight: 700,
            margin: '0 0 8px',
          }}
        >
          No path found
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 20px' }}>
          These two people aren&apos;t connected in your current network.
        </p>
        <button className="btn-ghost" onClick={onReset}>
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="card" style={{ padding: '24px', marginTop: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h3
            style={{
              fontFamily: 'Syne, sans-serif',
              fontSize: '18px',
              fontWeight: 700,
              margin: '0 0 4px',
            }}
          >
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

      {/* Path chain */}
      <div
        style={{
          background: 'var(--bg-input)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px',
          overflowX: 'auto',
        }}
      >
        <div className="path-chain" style={{ minWidth: 'max-content' }}>
          {pathPeople.map((person, i) => (
            <div key={person.id} style={{ display: 'flex', alignItems: 'center' }}>
              <div className="path-node">
                <Avatar
                  person={person}
                  size={46}
                  highlighted={i === 0 || i === pathPeople.length - 1}
                />
                <div
                  style={{
                    fontSize: '12px',
                    color: i === 0 || i === pathPeople.length - 1
                      ? 'var(--text-primary)'
                      : 'var(--text-secondary)',
                    fontWeight: i === 0 || i === pathPeople.length - 1 ? 600 : 400,
                    maxWidth: '60px',
                    textAlign: 'center',
                    lineHeight: 1.2,
                  }}
                >
                  {person.first_name}
                </div>
              </div>
              {i < pathPeople.length - 1 && (
                <div className="path-edge-line" style={{ minWidth: '32px' }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Intermediaries */}
      {pathPeople.length > 2 && (
        <div style={{ marginBottom: '20px' }}>
          <div
            style={{
              fontSize: '12px',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '10px',
            }}
          >
            Via
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {pathPeople.slice(1, -1).map((person) => (
              <div
                key={person.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  background: 'var(--bg-input)',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                }}
              >
                <Avatar person={person} size={32} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>
                    {person.first_name} {person.last_name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {person.title} · {person.company}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
          onClick={() => onSavePath()}
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M3 2h9a1 1 0 0 1 1 1v9l-6-3-6 3V3a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.25" />
          </svg>
          Save path
        </button>
      </div>
    </div>
  )
}

export default function FindPath() {
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [fromPerson, setFromPerson] = useState(null)
  const [toPerson, setToPerson]     = useState(null)
  const [pathResult, setPathResult] = useState(null)
  const [modal, setModal]           = useState(null)
  const [step, setStep]             = useState('select') // 'select' | 'result'
  const [savedPaths, setSavedPaths] = useState(new Set())

  const me = mockPeople[0] // current user is always first

  const filtered = useMemo(() => {
    if (!query.trim()) return mockPeople.slice(1) // exclude self
    const q = query.toLowerCase()
    return mockPeople
      .slice(1)
      .filter(
        (p) =>
          p.first_name.toLowerCase().includes(q) ||
          p.last_name.toLowerCase().includes(q) ||
          p.company.toLowerCase().includes(q) ||
          p.title.toLowerCase().includes(q)
      )
  }, [query])

  const pathPeople = useMemo(() => {
    if (!pathResult?.path) return []
    return pathResult.path.map((id) => getPersonById(id)).filter(Boolean)
  }, [pathResult])

  function handleFind() {
    if (!toPerson) return
    const result = findPath(me.id, toPerson.id)
    setPathResult(result)
    setStep('result')
  }

  function handleReset() {
    setToPerson(null)
    setPathResult(null)
    setQuery('')
    setStep('select')
  }

  return (
    <div style={{ padding: '32px', maxWidth: '680px' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1
          style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: '26px',
            fontWeight: 700,
            margin: '0 0 4px',
          }}
        >
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
            <div
              style={{
                fontSize: '12px',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '8px',
              }}
            >
              From
            </div>
            <div
              className="card"
              style={{
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                borderColor: 'var(--accent)',
              }}
            >
              <Avatar person={me} size={38} highlighted />
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>
                  {me.first_name} {me.last_name}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {me.title} · {me.company}
                </div>
              </div>
              <span className="badge badge-accent" style={{ marginLeft: 'auto' }}>You</span>
            </div>
          </div>

          {/* To */}
          <div>
            <div
              style={{
                fontSize: '12px',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '8px',
              }}
            >
              To — search your network
            </div>

            {toPerson ? (
              <div
                className="card"
                style={{
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  borderColor: 'var(--accent)',
                  marginBottom: '16px',
                }}
              >
                <Avatar person={toPerson} size={38} highlighted />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>
                    {toPerson.first_name} {toPerson.last_name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {toPerson.title} · {toPerson.company}
                  </div>
                </div>
                <button
                  className="btn-ghost"
                  style={{ fontSize: '12px', padding: '6px 12px' }}
                  onClick={() => setToPerson(null)}
                >
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

            {/* Results list */}
            {!toPerson && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                {filtered.length === 0 ? (
                  <div
                    style={{
                      padding: '24px',
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                      fontSize: '14px',
                    }}
                  >
                    No people found
                  </div>
                ) : (
                  filtered.map((p) => (
                    <PersonCard
                      key={p.id}
                      person={p}
                      onSelect={setToPerson}
                      selected={toPerson?.id === p.id}
                    />
                  ))
                )}
              </div>
            )}

            <button
              className="btn-primary"
              disabled={!toPerson}
              style={{ width: '100%', justifyContent: 'center', fontSize: '15px', padding: '12px' }}
              onClick={handleFind}
            >
              Find path
            </button>
          </div>
        </>
      )}

      {step === 'result' && (
        <PathDetailPanel
          result={pathResult}
          pathPeople={pathPeople}
          target={toPerson}
          onDraftMessage={(target, pathPeople) => setModal({ target, pathPeople })}
          onReset={handleReset}
          onSavePath={() => {
            const key = `${me.id}-${toPerson?.id}`
            if (!savedPaths.has(key)) {
              setSavedPaths((prev) => new Set([...prev, key]))
              toast?.add(`Path to ${toPerson?.first_name} saved!`, 'success')
            } else {
              toast?.add('Path already saved', 'info')
            }
          }}
        />
      )}

      {modal && (
        <DraftMessageModal
          target={modal.target}
          path={modal.pathPeople}
          onClose={() => {
            setModal(null)
            toast?.add(`Message drafted for ${modal.target?.first_name} ${modal.target?.last_name}`, 'success')
          }}
        />
      )}
    </div>
  )
}
