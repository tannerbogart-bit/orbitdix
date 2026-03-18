import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import DraftMessageModal from '../components/DraftMessageModal'
import { useToast } from '../components/Toast'
import { api } from '../api/client'

function PathCard({ path, onRemove, onDraftMessage }) {
  const from = path.from_person
  const to   = path.to_person
  const nodes = path.path_people || []

  return (
    <div className="card card-hover" style={{ padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
            {from?.first_name} → {to?.first_name} {to?.last_name}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {to?.title || '—'}{to?.company ? ` · ${to.company}` : ''}
          </div>
        </div>
        <span className="badge badge-accent">{path.degrees}°</span>
      </div>

      {/* Mini path chain */}
      <div className="path-chain" style={{ marginBottom: '14px' }}>
        {nodes.map((person, i) => {
          const initials = ((person.first_name?.[0] || '') + (person.last_name?.[0] || '')).toUpperCase() || '?'
          return (
            <div key={person.id} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: i === 0 || i === nodes.length - 1 ? 'var(--accent)' : 'var(--accent-dim)',
                border: '1.5px solid var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '11px',
                color: i === 0 || i === nodes.length - 1 ? '#fff' : 'var(--accent)',
                flexShrink: 0,
              }}>
                {initials}
              </div>
              {i < nodes.length - 1 && <div className="path-edge-line" style={{ minWidth: '24px', top: '-6px' }} />}
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          className="btn-primary"
          style={{ fontSize: '12px', padding: '7px 14px' }}
          onClick={() => onDraftMessage(path)}
        >
          Draft message
        </button>
        <button
          className="btn-ghost"
          style={{ fontSize: '12px', padding: '7px 14px', color: 'var(--danger)', borderColor: 'transparent' }}
          onClick={() => onRemove(path.id)}
        >
          Remove
        </button>
      </div>
    </div>
  )
}

export default function SavedPaths() {
  const navigate = useNavigate()
  const toast    = useToast()

  const [paths, setPaths]   = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]   = useState(null)

  useEffect(() => {
    api.listSavedPaths()
      .then(data => setPaths(data.saved_paths || []))
      .catch(() => toast?.add('Failed to load saved paths', 'error'))
      .finally(() => setLoading(false))
  }, [])

  async function handleRemove(id) {
    try {
      await api.deleteSavedPath(id)
      setPaths(prev => prev.filter(p => p.id !== id))
      toast?.add('Path removed', 'info')
    } catch {
      toast?.add('Failed to remove path', 'error')
    }
  }

  function handleDraftMessage(path) {
    setModal({ target: path.to_person, pathPeople: path.path_people })
  }

  if (loading) {
    return (
      <div style={{ padding: '32px' }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '26px', fontWeight: 700, margin: '0 0 4px' }}>Saved Paths</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading…</p>
      </div>
    )
  }

  if (paths.length === 0) {
    return (
      <div style={{ padding: '32px', maxWidth: '600px' }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '26px', fontWeight: 700, margin: '0 0 4px' }}>Saved Paths</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 40px' }}>Save paths to revisit them later.</p>
        <div className="card" style={{ padding: '60px 40px', textAlign: 'center', background: 'linear-gradient(135deg, rgba(124,110,224,0.05) 0%, transparent 100%)', borderStyle: 'dashed' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔗</div>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '20px', fontWeight: 700, margin: '0 0 8px' }}>No saved paths yet</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 24px' }}>Find a path and save it to see it here.</p>
          <button className="btn-primary" onClick={() => navigate('/find-path')}>Find a path</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '32px', maxWidth: '680px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '26px', fontWeight: 700, margin: '0 0 4px' }}>Saved Paths</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
            {paths.length} saved path{paths.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="btn-primary" style={{ fontSize: '13px' }} onClick={() => navigate('/find-path')}>
          Find new path
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {paths.map(p => (
          <PathCard key={p.id} path={p} onRemove={handleRemove} onDraftMessage={handleDraftMessage} />
        ))}
      </div>

      {modal && (
        <DraftMessageModal
          target={modal.target}
          path={modal.pathPeople}
          onClose={() => { toast?.add(`Message drafted for ${modal.target?.first_name}`, 'success'); setModal(null) }}
        />
      )}
    </div>
  )
}
