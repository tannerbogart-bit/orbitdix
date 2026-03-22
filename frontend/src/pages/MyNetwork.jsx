import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import NetworkGraph from '../components/NetworkGraph'
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
      style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px', cursor: person.is_self ? 'default' : 'pointer' }}
      onClick={(e) => { if (!person.is_self && !e.defaultPrevented) onFindPath(person) }}
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

      {!person.is_self && (
        <button
          className="btn-ghost"
          style={{ fontSize: '12px', padding: '6px 12px', flexShrink: 0 }}
          onClick={(e) => { e.preventDefault(); onFindPath(person) }}
        >
          Find path
        </button>
      )}
      <button
        onClick={(e) => { e.preventDefault(); onEdit(person) }}
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

function GraphSearch({ people, onSelect }) {
  const [q, setQ] = useState('')
  const matches = q.trim()
    ? people.filter(p =>
        `${p.first_name} ${p.last_name}`.toLowerCase().includes(q.toLowerCase()) ||
        (p.company || '').toLowerCase().includes(q.toLowerCase())
      ).slice(0, 8)
    : []

  return (
    <div style={{ position: 'relative' }}>
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none"
        style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none', zIndex: 1 }}>
        <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4" />
        <path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      <input
        className="input"
        placeholder="Search and highlight in graph…"
        value={q}
        onChange={e => setQ(e.target.value)}
        style={{ paddingLeft: '34px', fontSize: '13px' }}
      />
      {matches.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: '10px', zIndex: 20, overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          {matches.map(p => (
            <button
              key={p.id}
              onClick={() => { onSelect(p); setQ('') }}
              style={{
                width: '100%', textAlign: 'left', background: 'none', border: 'none',
                padding: '9px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px',
                fontFamily: 'DM Sans, sans-serif', borderBottom: '1px solid var(--border)',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <div style={{
                width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0,
                background: p.is_self ? 'var(--accent)' : 'var(--accent-dim)',
                border: '1.5px solid var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '11px',
                color: p.is_self ? '#fff' : 'var(--accent)',
              }}>
                {p.avatar}
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {p.first_name} {p.last_name}
                </div>
                {p.company && (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.company}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const TABS = ['List', 'Graph']

const PAGE_SIZE = 50

export default function MyNetwork() {
  const navigate  = useNavigate()
  const toast     = useToast()

  const [people, setPeople]         = useState([])
  const [edges, setEdges]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [query, setQuery]           = useState('')
  const [companyFilter, setCompanyFilter] = useState('')
  const [sortBy, setSortBy]         = useState('name_asc')
  const [page, setPage]             = useState(1)
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

  // Sorted unique companies for the filter dropdown (by frequency)
  const companies = useMemo(() => {
    const counts = {}
    others.forEach(p => { if (p.company) counts[p.company] = (counts[p.company] || 0) + 1 })
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([c]) => c)
  }, [others])

  const filtered = useMemo(() => {
    // Include self in search results so you can find yourself by name
    let list = query.trim() ? withAvatars : others
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(p =>
        (p.first_name || '').toLowerCase().includes(q) ||
        (p.last_name  || '').toLowerCase().includes(q) ||
        (p.company    || '').toLowerCase().includes(q) ||
        (p.title      || '').toLowerCase().includes(q)
      )
    }
    if (companyFilter) {
      list = list.filter(p => p.company === companyFilter)
    }
    if (sortBy === 'name_asc')  list = [...list].sort((a, b) => (a.first_name || '').localeCompare(b.first_name || ''))
    if (sortBy === 'name_desc') list = [...list].sort((a, b) => (b.first_name || '').localeCompare(a.first_name || ''))
    if (sortBy === 'company')   list = [...list].sort((a, b) => (a.company || 'zzz').localeCompare(b.company || 'zzz'))
    if (sortBy === 'recent')    list = [...list].sort((a, b) => (b.id - a.id))
    return list
  }, [query, companyFilter, sortBy, others, withAvatars])

  const paginated  = filtered.slice(0, page * PAGE_SIZE)
  const hasMore    = paginated.length < filtered.length

  // Reset pagination when filters change
  useEffect(() => { setPage(1) }, [query, companyFilter, sortBy])

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
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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
        const companies = new Set(others.map(p => p.company).filter(Boolean))
        return (
          <div className="stats-grid-3" style={{ gap: '12px', marginBottom: '20px' }}>
            {[
              { label: 'People',     value: loading ? '…' : others.length.toLocaleString() },
              { label: 'Companies',  value: loading ? '…' : companies.size.toLocaleString() },
              { label: 'Connections', value: loading ? '…' : edges.length.toLocaleString() },
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
          {/* Filter bar */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ position: 'relative', flex: '1', minWidth: '180px' }}>
              <svg
                width="15" height="15" viewBox="0 0 16 16" fill="none"
                style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}
              >
                <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <input
                className="input"
                placeholder="Search by name, title…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{ paddingLeft: '34px' }}
              />
            </div>

            {/* Company filter */}
            {companies.length > 0 && (
              <select
                value={companyFilter}
                onChange={e => setCompanyFilter(e.target.value)}
                style={{
                  background: 'var(--bg-input)',
                  border: `1px solid ${companyFilter ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: '8px',
                  color: companyFilter ? 'var(--accent)' : 'var(--text-secondary)',
                  fontSize: '13px',
                  padding: '0 12px',
                  height: '40px',
                  cursor: 'pointer',
                  fontFamily: 'DM Sans, sans-serif',
                  minWidth: '140px',
                  maxWidth: '200px',
                }}
              >
                <option value="">All companies</option>
                {companies.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}

            {/* Sort */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                color: 'var(--text-secondary)',
                fontSize: '13px',
                padding: '0 12px',
                height: '40px',
                cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              <option value="name_asc">A → Z</option>
              <option value="name_desc">Z → A</option>
              <option value="company">By company</option>
              <option value="recent">Recently added</option>
            </select>

            {/* Clear filters */}
            {(query || companyFilter) && (
              <button
                className="btn-ghost"
                style={{ fontSize: '12px', padding: '0 12px', height: '40px', whiteSpace: 'nowrap' }}
                onClick={() => { setQuery(''); setCompanyFilter('') }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Result count when filtering */}
          {(query || companyFilter) && !loading && (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
              {filtered.length.toLocaleString()} result{filtered.length !== 1 ? 's' : ''}
              {companyFilter && ` at ${companyFilter}`}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                Loading your network…
              </div>
            ) : filtered.length === 0 && (query || companyFilter) ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                No people match your filters
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
              <>
                {paginated.map((p) => (
                  <PersonRow key={p.id} person={p} onFindPath={handleFindPath} onEdit={setEditPerson} />
                ))}
                {hasMore && (
                  <button
                    className="btn-ghost"
                    style={{ width: '100%', justifyContent: 'center', fontSize: '13px', marginTop: '6px' }}
                    onClick={() => setPage(pg => pg + 1)}
                  >
                    Show more ({(filtered.length - paginated.length).toLocaleString()} remaining)
                  </button>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Graph tab */}
      {tab === 'Graph' && (
        <div style={{ display: 'grid', gridTemplateColumns: selectedNode ? '1fr 280px' : '1fr', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Graph search with dropdown results */}
            <GraphSearch people={withAvatars} onSelect={handleNodeClick} />
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
