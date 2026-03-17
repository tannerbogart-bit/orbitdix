// Real API client — proxied through Vite to Flask on :5000

const BASE = '/api'

function authHeaders() {
  const token = localStorage.getItem('access_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function req(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  }
  if (body !== undefined) opts.body = JSON.stringify(body)
  const res = await fetch(BASE + path, opts)
  if (res.status === 204) return null
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`)
  return json
}

export const api = {
  // People
  listPeople: ()           => req('GET',    '/people'),
  createPerson: (data)     => req('POST',   '/people', data),
  deletePerson: (id)       => req('DELETE', `/people/${id}`),
  bulkImport: (people)     => req('POST',   '/people/bulk', { people }),
  updatePerson: (id, data) => req('PUT',    `/people/${id}`, data),
  deletePerson: (id)       => req('DELETE', `/people/${id}`),
  getStats: ()             => req('GET',    '/stats'),

  // Edges
  listEdges: ()            => req('GET',    '/edges'),
  createEdge: (data)       => req('POST',   '/edges', data),
  deleteEdge: (id)         => req('DELETE', `/edges/${id}`),

  // Path finding
  findPath: (fromId, toId) => req('GET', `/path?from=${fromId}&to=${toId}`),
}
