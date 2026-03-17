import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { mockEdges } from '../data/mockData'
import NetworkGraph from '../components/NetworkGraph'
import AddPersonModal from '../components/AddPersonModal'
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
  const [loading, setLoading]       = useState(true)
  const [query, setQuery]           = useState('')
  const [tab, setTab]               = useState('List')
  const [showAdd, setShowAdd]       = useState(false)
  const [showCSV, setShowCSV]       = useState(false)
  const [editPerson, setEditPerson] = useState(null)
  const [selectedNode, setSelectedNode] = useState(null)

  useEffect(() => {
    api.listPeople()
      .then(data => setPeople(data.people || []))
      .catch(() => toast?.add('Failed to load network', 'error'))
      .finally(() => setLoading(false))
  }, [])

  function refreshPeople() {
    api.listPeople()
      .then(data => setPeople(data.people || []))
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
            {loading ? 'Loading…' : `${others.length.toLocaleString()} people in your extended orbit`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
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
            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                Loading your network…
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                {query ? `No people match "${query}"` : 'No people in your network yet. Import from CSV or use the Chrome extension.'}
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
          <div
            className="card"
            style={{ height: '520px', padding: 0, overflow: 'hidden' }}
          >
            <NetworkGraph
              people={withAvatars}
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
