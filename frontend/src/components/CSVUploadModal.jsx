import { useState, useRef } from 'react'
import { api } from '../api/client'

const BATCH_SIZE = 200

// Parse a CSV string into an array of objects using the first row as headers.
function parseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  if (lines.length < 2) return []

  // Simple CSV parser — handles quoted fields
  function parseLine(line) {
    const fields = []
    let field = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { field += '"'; i++ }
        else inQuotes = !inQuotes
      } else if (ch === ',' && !inQuotes) {
        fields.push(field.trim())
        field = ''
      } else {
        field += ch
      }
    }
    fields.push(field.trim())
    return fields
  }

  // LinkedIn CSVs start with a "Note:" preamble line — skip any lines before
  // the real header row (identified by containing "first name" or "last name").
  const HEADER_KEYWORDS = ['first name', 'last name', 'firstname', 'lastname']
  let headerIdx = 0
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const lower = lines[i].toLowerCase()
    if (HEADER_KEYWORDS.some(k => lower.includes(k))) {
      headerIdx = i
      break
    }
  }

  const headers = parseLine(lines[headerIdx]).map(h => h.toLowerCase().replace(/\s+/g, '_'))

  return lines.slice(headerIdx + 1).filter(l => l.trim()).map(line => {
    const values = parseLine(line)
    const row = {}
    headers.forEach((h, i) => { row[h] = values[i] || '' })
    return row
  })
}

// Map a parsed CSV row to the OrbitSix person shape.
// Supports LinkedIn export format and a generic format.
function rowToPerson(row) {
  // LinkedIn format: First Name, Last Name, Email Address, Company, Position
  const firstName   = row['first_name'] || row['firstname'] || ''
  const lastName    = row['last_name']  || row['lastname']  || ''
  const email       = row['email_address'] || row['email'] || ''
  const company     = row['company'] || row['organization'] || ''
  const title       = row['position'] || row['title'] || row['job_title'] || ''
  // LinkedIn exports a "URL" column with the profile URL
  const linkedinUrl = row['url'] || row['linkedin_url'] || row['linkedin'] || ''

  if (!firstName && !lastName && !email) return null

  return {
    first_name:   firstName,
    last_name:    lastName,
    email:        email || undefined,
    company:      company || undefined,
    title:        title || undefined,
    linkedin_url: linkedinUrl || undefined,
  }
}

export default function CSVUploadModal({ onImport, onClose }) {
  const fileInputRef = useRef(null)
  const [rows, setRows]           = useState(null)   // parsed people array
  const [fileName, setFileName]   = useState('')
  const [error, setError]         = useState('')
  const [importing, setImporting] = useState(false)
  const [progress, setProgress]   = useState({ done: 0, total: 0 })
  const [result, setResult]       = useState(null)   // { imported, skipped }

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setRows(null)
    setResult(null)
    setFileName(file.name)

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const parsed = parseCSV(evt.target.result)
        const people = parsed.map(rowToPerson).filter(Boolean)
        if (people.length === 0) {
          setError('No valid people found. Make sure it is a LinkedIn connections CSV or has First Name / Last Name columns.')
          return
        }
        setRows(people)
      } catch {
        setError('Could not parse CSV. Please upload a valid file.')
      }
    }
    reader.readAsText(file)
  }

  async function handleImport() {
    if (!rows || rows.length === 0) return
    setImporting(true)
    setError('')

    let totalImported = 0
    let totalSkipped  = 0
    const batches = []
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      batches.push(rows.slice(i, i + BATCH_SIZE))
    }

    setProgress({ done: 0, total: rows.length })

    try {
      for (let i = 0; i < batches.length; i++) {
        const data = await api.bulkImport(batches[i])
        totalImported += data.imported || 0
        totalSkipped  += data.skipped  || 0
        setProgress({ done: Math.min((i + 1) * BATCH_SIZE, rows.length), total: rows.length })
      }
      setResult({ imported: totalImported, skipped: totalSkipped })
      onImport?.(totalImported)
    } catch (err) {
      setError(err.message || 'Import failed. Is Flask running?')
    } finally {
      setImporting(false)
    }
  }

  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && !importing && onClose()}>
      <div className="modal-box" style={{ maxWidth: '480px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '18px', fontWeight: 700, margin: 0 }}>
            Import from CSV
          </h3>
          {!importing && (
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>

        {!result ? (
          <>
            {/* Instructions */}
            <div style={{ padding: '12px 14px', background: 'var(--bg-input)', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Get your LinkedIn connections CSV:</strong>
              <ol style={{ margin: '8px 0 0', paddingLeft: '18px' }}>
                <li>LinkedIn → Settings &amp; Privacy</li>
                <li>Data privacy → Get a copy of your data</li>
                <li>Select <em>Connections</em> → Request archive</li>
                <li>Download and upload <code>Connections.csv</code> here</li>
              </ol>
            </div>

            {/* File input */}
            <div
              style={{
                border: `2px dashed ${fileName ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: '10px',
                padding: '28px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'border-color 0.15s',
                marginBottom: '14px',
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                style={{ display: 'none' }}
                onChange={handleFile}
              />
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 10px', display: 'block', color: 'var(--accent)' }}>
                <path d="M12 16V8M12 8l-3 3M12 8l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              {fileName ? (
                <div style={{ fontSize: '13px', color: 'var(--accent)', fontWeight: 600 }}>{fileName}</div>
              ) : (
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Click to choose a CSV file</div>
              )}
            </div>

            {/* Preview */}
            {rows && (
              <div style={{ padding: '10px 14px', background: 'rgba(124,110,224,0.08)', border: '1px solid var(--accent)', borderRadius: '8px', marginBottom: '14px', fontSize: '13px', color: 'var(--text-primary)' }}>
                Found <strong>{rows.length.toLocaleString()}</strong> connections ready to import
              </div>
            )}

            {error && (
              <div style={{ padding: '10px 14px', background: 'rgba(248,113,113,0.08)', border: '1px solid var(--danger)', borderRadius: '8px', marginBottom: '14px', fontSize: '13px', color: 'var(--danger)' }}>
                {error}
              </div>
            )}

            {/* Progress bar */}
            {importing && (
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  <span>Importing…</span>
                  <span>{progress.done.toLocaleString()} / {progress.total.toLocaleString()}</span>
                </div>
                <div style={{ height: '6px', background: 'var(--bg-input)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent)', borderRadius: '3px', transition: 'width 0.3s' }} />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <button
                className="btn-primary"
                style={{ flex: 1, justifyContent: 'center', opacity: (!rows || importing) ? 0.5 : 1 }}
                disabled={!rows || importing}
                onClick={handleImport}
              >
                {importing ? 'Importing…' : `Import${rows ? ` ${rows.length.toLocaleString()} people` : ''}`}
              </button>
              <button className="btn-ghost" onClick={onClose} disabled={importing}>
                Cancel
              </button>
            </div>
          </>
        ) : (
          /* Success state */
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(124,110,224,0.12)', border: '2px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M5 12l5 5L19 7" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h4 style={{ fontFamily: 'Syne, sans-serif', fontSize: '17px', fontWeight: 700, margin: '0 0 8px' }}>Import complete</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 20px' }}>
              <strong style={{ color: 'var(--text-primary)' }}>{result.imported.toLocaleString()}</strong> imported &nbsp;·&nbsp;
              <strong style={{ color: 'var(--text-muted)' }}>{result.skipped.toLocaleString()}</strong> skipped (already in network)
            </p>
            <button className="btn-primary" style={{ justifyContent: 'center' }} onClick={onClose}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
