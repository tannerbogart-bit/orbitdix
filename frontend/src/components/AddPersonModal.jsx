import { useState } from 'react'
import { api } from '../api/client'
import UpgradeModal from './UpgradeModal'

export default function AddPersonModal({ onAdd, onClose }) {
  const [form, setForm]         = useState({ first_name: '', last_name: '', title: '', company: '' })
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [upgradeMsg, setUpgradeMsg] = useState(null)

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  async function handleSubmit() {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError('First and last name are required.')
      return
    }
    setLoading(true)
    try {
      const data = await api.createPerson(form)
      onAdd(data.person)
      onClose()
    } catch (err) {
      if (err.upgradeRequired) {
        setUpgradeMsg(err.message)
      } else {
        setError(err.message || 'Failed to add person')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '18px', fontWeight: 700, margin: 0 }}>
            Add person
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                First name <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                className="input"
                name="first_name"
                placeholder="Jordan"
                value={form.first_name}
                onChange={handleChange}
                autoFocus
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Last name <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                className="input"
                name="last_name"
                placeholder="Blake"
                value={form.last_name}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Title</label>
            <input className="input" name="title" placeholder="VP of Engineering" value={form.title} onChange={handleChange} />
          </div>

          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Company</label>
            <input className="input" name="company" placeholder="Acme Corp" value={form.company} onChange={handleChange} />
          </div>

          {error && (
            <div style={{
              padding: '10px 14px', background: 'rgba(248,113,113,0.08)',
              border: '1px solid var(--danger)', borderRadius: '8px',
              fontSize: '13px', color: 'var(--danger)',
            }}>
              {error}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button
            className="btn-primary"
            style={{ flex: 1, justifyContent: 'center' }}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Adding…' : 'Add to network'}
          </button>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>

    {upgradeMsg && (
      <UpgradeModal message={upgradeMsg} onClose={() => setUpgradeMsg(null)} />
    )}
    </>
  )
}
