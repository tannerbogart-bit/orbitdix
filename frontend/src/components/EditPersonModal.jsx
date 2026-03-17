import { useState } from 'react'
import { api } from '../api/client'

export default function EditPersonModal({ person, onSave, onDelete, onClose }) {
  const [form, setForm] = useState({
    first_name:   person.first_name   || '',
    last_name:    person.last_name    || '',
    title:        person.title        || '',
    company:      person.company      || '',
    email:        person.email        || '',
    linkedin_url: person.linkedin_url || '',
  })
  const [saving,  setSaving]  = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState('')

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  async function handleSave() {
    if (!form.first_name.trim()) { setError('First name is required.'); return }
    setSaving(true)
    setError('')
    try {
      const data = await api.updatePerson(person.id, form)
      onSave(data.person)
      onClose()
    } catch (err) {
      setError(err.message || 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await api.deletePerson(person.id)
      onDelete(person.id)
      onClose()
    } catch (err) {
      setError(err.message || 'Delete failed.')
      setDeleting(false)
    }
  }

  const field = (label, name, placeholder, required) => (
    <div>
      <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
        {label}{required && <span style={{ color: 'var(--danger)' }}> *</span>}
      </label>
      <input
        className="input"
        name={name}
        placeholder={placeholder}
        value={form[name]}
        onChange={handleChange}
      />
    </div>
  )

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '18px', fontWeight: 700, margin: 0 }}>
            Edit contact
          </h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {field('First name', 'first_name', 'Jordan', true)}
            {field('Last name',  'last_name',  'Blake')}
          </div>
          {field('Title',        'title',        'VP of Engineering')}
          {field('Company',      'company',      'Acme Corp')}
          {field('Email',        'email',        'jordan@acme.com')}
          {field('LinkedIn URL', 'linkedin_url', 'https://linkedin.com/in/...')}

          {error && (
            <div style={{ padding: '10px 14px', background: 'rgba(248,113,113,0.08)', border: '1px solid var(--danger)', borderRadius: '8px', fontSize: '13px', color: 'var(--danger)' }}>
              {error}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button
            className="btn-primary"
            style={{ flex: 1, justifyContent: 'center', opacity: saving ? 0.6 : 1 }}
            disabled={saving}
            onClick={handleSave}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          <button className="btn-ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
        </div>

        {/* Delete zone */}
        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              style={{ background: 'transparent', border: 'none', color: 'var(--danger)', fontSize: '13px', cursor: 'pointer', padding: 0 }}
            >
              Remove from network
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Are you sure?</span>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{ background: 'transparent', border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: '6px', padding: '4px 12px', fontSize: '13px', cursor: 'pointer', opacity: deleting ? 0.6 : 1 }}
              >
                {deleting ? 'Removing…' : 'Yes, remove'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '13px', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
