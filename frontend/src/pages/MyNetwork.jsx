import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import NetworkGraph, { computeDegreeCounts } from '../components/NetworkGraph'
import AddPersonModal from '../components/AddPersonModal'
import AddEdgeModal from '../components/AddEdgeModal'
import CSVUploadModal from '../components/CSVUploadModal'
import EditPersonModal from '../components/EditPersonModal'
import { useToast } from '../components/Toast'
import { api } from '../api/client'

function PersonRow({ person, onFindPath, onEdit }) {
  return (
    <div
      className="card card-hover"
      style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}
    >
      <div
        style={{
          width: '42px', height: '42px', borderRadius: '50%',
          background: 'var(--accent-dim)', border: '1.5px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px',
          color: 'var(--accent)', flexShrink: 0,
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

      <button
        className="btn-ghost"
        style={{ fontSize: '12px', padding: '6px 12px', flexShrink: 0 }}
        onClick={() => onFindPath(person)}
      >
        Find path
      </button>
      <button
        onClick={() => onEdit(person)}
        title="Edit contact"
        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', flexShrink: 0 }}
      >
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <path d="M10.5 2.5l2 2-8 8H2.5v-2l8-8z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  )
}

const TABS = ['List', 'Graph']

export default function MyNetwork() {
  const navigate  = useNavigate()
  const toast     = useToast()

  const [people, setPeople]         = useState([])
  const [edges, setEdges]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [query, setQuery]           = useState('')
  const [tab, setTab]               = useState('List')
  const [showAdd, setShowAdd]       = useState(false)
  const [showCSV, setShowCSV]       = useState(false)
  const [showEdge, setShowEdge]     = useState(false)
  const [edgePreselect, setEdgePreselect] = useState(null)
  const [editPerson, setEditPerson] = useState(null)
  const [selectedNode, setSelectedNode] = useState(null)

  useEffect(() => {
    Promise.all([api.listPeople(), api.listEdges()])
      .then(([peopleData, edgeData]) => {
        setPeople(peopleData.people || [])
        setEdges(edgeData.edges || [])
      })
      .catch(() => toast?.add('Failed to load network', 'error'))
      .finally(() => setLoading(false))
  }, [])

  function refreshPeople() {
    Promise.all([api.listPeople(), api.listEdges()])
      .then(([peopleData, edgeData]) => {
        setPeople(peopleData.people || [])
        setEdges(edgeData.edges || [])
      })
      .catch(() => {})
  }

  // Compute avatar initials client-side
  const withAvatars = people.map(p => ({
    ...p,
    avatar: ((p.first_name?.[0] || '') + (p.last_name?.[0] || '')).toUpperCase() || '?',
  }))

  const self   = withAvatars.find(p => p.is_self)
  const others = withAvatars.filter(p => !p.is_self)

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
    refreshPeople()
    toast?.add(`${person.first_name} ${person.last_name} added to your network`, 'success')
  }

  function handleSavePerson(updated) {
    setPeople(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p))
    toast?.add('Contact updated', 'success')
  }

  function handleDeletePerson(id) {
    setPeople(prev => prev.filter(p => p.id !== id))
    toast?.add('Contact removed', 'success')
  }

  function handleAddEdge(personA, personB) {
    refreshPeople()
    toast?.add(`Connected ${personA.first_name} and ${personB.first_name}`, 'success')
  }

  function handleNodeClick(person) {
    setSelectedNode(person)
  }

  return (
    <div className="page-pad" style={{ maxWidth: '900px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '26px', fontWeight: 700, margin: '0 0 4px' }}>
            My Network
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
            {loading ? 'Loading…' : `${others.length.toLocaleString()} people in your extended orbit`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn-ghost"
            style={{ fontSize: '13px', padding: '9px 16px' }}
            onClick={() => { setEdgePreselect(null); setShowEdge(true) }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="3" cy="7" r="2" stroke="currentColor" strokeWidth="1.4" />
              <circle cx="11" cy="7" r="2" stroke="currentColor" strokeWidth="1.4" />
              <path d="M5 7h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            Add connection
          </button>
          <button
            className="btn-ghost"
            style={{ fontSize: '13px', padding: '9px 16px' }}
            onClick={() => setShowCSV(true)}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 9V1M4 6l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M1 11h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Import CSV
          </button>
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
      </div>

      {/* Stats row */}
      {(() => {
        const { direct, second, thirdPlus } = computeDegreeCounts(withAvatars, edges)
        return (
          <div className="stats-grid-3" style={{ gap: '12px', marginBottom: '20px' }}>
            {[
              { label: 'Direct',      value: loading ? '…' : direct.toLocaleString()    },
              { label: '2nd degree',  value: loading ? '…' : second.toLocaleString()    },
              { label: '3rd degree+', value: loading ? '…' : thirdPlus.toLocaleString() },
            ].map((s) => (
              <div key={s.label} className="card" style={{ padding: '14px 16px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {s.value}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        )
      })()}

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
            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                Loading your network…
              </div>
            ) : filtered.length === 0 && query ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                No people match &ldquo;{query}&rdquo;
              </div>
            ) : filtered.length === 0 ? (
              <div className="card" style={{ padding: '40px 32px', textAlign: 'center' }}>
                <div style={{ fontSize: '40px', marginBottom: '14px' }}>🌐</div>
                <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '18px', fontWeight: 700, margin: '0 0 8px' }}>
                  Your network is empty
                </h3>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 22px', lineHeight: 1.6, maxWidth: '360px', marginInline: 'auto' }}>
                  Import your LinkedIn connections to start finding paths, getting introductions, and using your AI agent.
                </p>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button className="btn-primary" style={{ fontSize: '14px' }} onClick={() => setShowCSV(true)}>
                    Import from LinkedIn CSV
                  </button>
                  <button className="btn-ghost" style={{ fontSize: '14px' }} onClick={() => setShowAdd(true)}>
                    Add person manually
                  </button>
                </div>
              </div>
            ) : (
              filtered.map((p) => (
                <PersonRow key={p.id} person={p} onFindPath={handleFindPath} onEdit={setEditPerson} />
              ))
            )}
          </div>
        </>
      )}

      {/* Graph tab */}
      {tab === 'Graph' && (
        <div style={{ display: 'grid', gridTemplateColumns: selectedNode ? '1fr 280px' : '1fr', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Graph search */}
            <div style={{ position: 'relative' }}>
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none"
                style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}>
                <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4" />
                <path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              <input
                className="input"
                placeholder="Highlight a person in the graph…"
                style={{ paddingLeft: '34px', fontSize: '13px' }}
                onChange={e => {
                  const q = e.target.value.toLowerCase()
                  const match = q ? withAvatars.find(p =>
                    p.first_name?.toLowerCase().includes(q) || p.last_name?.toLowerCase().includes(q)
                  ) : null
                  if (match) handleNodeClick(match)
                }}
              />
            </div>
            <div
              className="card"
              style={{ height: '520px', padding: 0, overflow: 'hidden' }}
            >
              <NetworkGraph
                people={withAvatars}
                edges={edges}
                highlightedPath={selectedNode ? [selectedNode.id] : []}
                onNodeClick={handleNodeClick}
              />
            </div>
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
                    background: selectedNode.is_self ? 'var(--accent)' : 'var(--accent-dim)',
                    border: '2px solid var(--accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'Syne, sans-serif',
                    fontWeight: 700,
                    fontSize: '15px',
                    color: selectedNode.is_self ? '#fff' : 'var(--accent)',
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

              {!selectedNode.is_self && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button
                    className="btn-primary"
                    style={{ width: '100%', justifyContent: 'center', fontSize: '13px', padding: '9px' }}
                    onClick={() => handleFindPath(selectedNode)}
                  >
                    Find path to {selectedNode.first_name}
                  </button>
                  <button
                    className="btn-ghost"
                    style={{ width: '100%', justifyContent: 'center', fontSize: '13px', padding: '9px' }}
                    onClick={() => { setEdgePreselect(selectedNode); setShowEdge(true) }}
                  >
                    Connect to…
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showEdge && (
        <AddEdgeModal
          people={withAvatars}
          preselect={edgePreselect}
          onAdd={handleAddEdge}
          onClose={() => { setShowEdge(false); setEdgePreselect(null) }}
        />
      )}
      {showAdd && (
        <AddPersonModal
          onAdd={handleAddPerson}
          onClose={() => setShowAdd(false)}
        />
      )}
      {showCSV && (
        <CSVUploadModal
          onImport={(count) => { toast?.add(`${count.toLocaleString()} people imported successfully`, 'success'); refreshPeople() }}
          onClose={() => setShowCSV(false)}
        />
      )}
      {editPerson && (
        <EditPersonModal
          person={editPerson}
          onSave={handleSavePerson}
          onDelete={handleDeletePerson}
          onClose={() => setEditPerson(null)}
        />
      )}
    </div>
  )
}
