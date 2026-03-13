import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { mockPeople, mockEdges } from '../data/mockData'
import NetworkGraph from '../components/NetworkGraph'
import AddPersonModal from '../components/AddPersonModal'
import { useToast } from '../components/Toast'

function PersonRow({ person, onFindPath }) {
  return (
    <div
      className="card card-hover"
      style={{
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
      }}
    >
      <div
        style={{
          width: '42px',
          height: '42px',
          borderRadius: '50%',
          background: 'var(--accent-dim)',
          border: '1.5px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Syne, sans-serif',
          fontWeight: 700,
          fontSize: '14px',
          color: 'var(--accent)',
          flexShrink: 0,
        }}
      >
        {person.avatar}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
          {person.first_name} {person.last_name}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
          {person.title || '—'}{person.company ? ` · ${person.company}` : ''}
        </div>
      </div>

      {person.mutual > 0 && (
        <span
          className="badge"
          style={{
            background: 'var(--bg-input)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border)',
            fontSize: '11px',
          }}
        >
          {person.mutual} mutual
        </span>
      )}

      <button
        className="btn-ghost"
        style={{ fontSize: '12px', padding: '6px 12px', flexShrink: 0 }}
        onClick={() => onFindPath(person)}
      >
        Find path
      </button>
    </div>
  )
}

const TABS = ['List', 'Graph']

export default function MyNetwork() {
  const navigate  = useNavigate()
  const toast     = useToast()

  const [people, setPeople]     = useState(mockPeople)
  const [query, setQuery]       = useState('')
  const [tab, setTab]           = useState('List')
  const [showAdd, setShowAdd]   = useState(false)
  const [selectedNode, setSelectedNode] = useState(null)

  const others = people.slice(1) // exclude self

  const filtered = useMemo(() => {
    if (!query.trim()) return others
    const q = query.toLowerCase()
    return others.filter(
      (p) =>
        p.first_name.toLowerCase().includes(q) ||
        p.last_name.toLowerCase().includes(q) ||
        (p.company || '').toLowerCase().includes(q) ||
        (p.title || '').toLowerCase().includes(q)
    )
  }, [query, others])

  function handleFindPath(person) {
    navigate('/find-path', { state: { toPerson: person } })
  }

  function handleAddPerson(person) {
    setPeople((prev) => [...prev, person])
    toast?.add(`${person.first_name} ${person.last_name} added to your network`, 'success')
  }

  function handleNodeClick(person) {
    setSelectedNode(person)
  }

  return (
    <div style={{ padding: '32px', maxWidth: '900px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '26px', fontWeight: 700, margin: '0 0 4px' }}>
            My Network
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
            {others.length} people in your extended orbit
          </p>
        </div>
        <button
          className="btn-primary"
          style={{ fontSize: '13px', padding: '9px 16px' }}
          onClick={() => setShowAdd(true)}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1v12M1 7h12" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Add person
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Direct',      value: '4'   },
          { label: '2nd degree',  value: '18'  },
          { label: '3rd degree+', value: '290' },
        ].map((s) => (
          <div key={s.label} className="card" style={{ padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {s.value}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: tab === t ? 'var(--accent-dim)' : 'transparent',
              color: tab === t ? 'var(--accent)' : 'var(--text-secondary)',
              border: `1px solid ${tab === t ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: '8px',
              padding: '7px 16px',
              fontSize: '13px',
              fontWeight: tab === t ? 600 : 400,
              cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif',
              transition: 'all 0.15s',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* List tab */}
      {tab === 'List' && (
        <>
          {/* Search */}
          <div style={{ position: 'relative', marginBottom: '14px' }}>
            <svg
              width="16" height="16" viewBox="0 0 16 16" fill="none"
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}
            >
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              className="input"
              placeholder="Search people, companies, roles…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ paddingLeft: '38px' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                {query ? `No people match "${query}"` : 'No people in your network yet.'}
              </div>
            ) : (
              filtered.map((p) => (
                <PersonRow key={p.id} person={p} onFindPath={handleFindPath} />
              ))
            )}
          </div>
        </>
      )}

      {/* Graph tab */}
      {tab === 'Graph' && (
        <div style={{ display: 'grid', gridTemplateColumns: selectedNode ? '1fr 280px' : '1fr', gap: '16px' }}>
          <div
            className="card"
            style={{ height: '520px', padding: 0, overflow: 'hidden' }}
          >
            <NetworkGraph
              people={people}
              edges={mockEdges}
              onNodeClick={handleNodeClick}
            />
          </div>

          {/* Node detail panel */}
          {selectedNode && (
            <div className="card" style={{ padding: '20px', height: 'fit-content' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: selectedNode.id === people[0].id ? 'var(--accent)' : 'var(--accent-dim)',
                    border: '2px solid var(--accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'Syne, sans-serif',
                    fontWeight: 700,
                    fontSize: '15px',
                    color: selectedNode.id === people[0].id ? '#fff' : 'var(--accent)',
                  }}
                >
                  {selectedNode.avatar}
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              <div style={{ fontWeight: 700, fontFamily: 'Syne, sans-serif', fontSize: '16px', marginBottom: '2px' }}>
                {selectedNode.first_name} {selectedNode.last_name}
              </div>
              {selectedNode.title && (
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                  {selectedNode.title}
                </div>
              )}
              {selectedNode.company && (
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                  {selectedNode.company}
                </div>
              )}

              {selectedNode.id !== people[0].id && (
                <button
                  className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center', fontSize: '13px', padding: '9px' }}
                  onClick={() => handleFindPath(selectedNode)}
                >
                  Find path to {selectedNode.first_name}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showAdd && (
        <AddPersonModal
          onAdd={handleAddPerson}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  )
}
