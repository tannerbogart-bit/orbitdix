// Real API client — proxied through Vite to Flask on :5000
// Swap out mock data calls in components with these when backend is running.

const BASE = '/api'

async function req(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
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

  // Edges
  listEdges: ()            => req('GET',    '/edges'),
  createEdge: (data)       => req('POST',   '/edges', data),
  deleteEdge: (id)         => req('DELETE', `/edges/${id}`),

  // Path finding
  findPath: (fromId, toId) => req('GET', `/path?from=${fromId}&to=${toId}`),
}
