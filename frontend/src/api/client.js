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
  if (!res.ok) {
    const err = new Error(json.error || `HTTP ${res.status}`)
    if (json.upgrade_required) err.upgradeRequired = true
    throw err
  }
  return json
}

export const api = {
  // Auth
  me: ()                             => req('GET',  '/me'),
  changePassword: (current, next)    => req('POST', '/auth/change-password', { current_password: current, new_password: next }),
  resendVerification: ()             => req('POST', '/auth/resend-verification'),

  // People
  listPeople: ()           => req('GET',    '/people'),
  createPerson: (data)     => req('POST',   '/people', data),
  deletePerson: (id)       => req('DELETE', `/people/${id}`),
  bulkImport: (people)     => req('POST',   '/people/bulk', { people }),
  updatePerson: (id, data) => req('PUT',    `/people/${id}`, data),
  getStats: ()             => req('GET',    '/stats'),

  // Edges
  listEdges: ()            => req('GET',    '/edges'),
  createEdge: (data)       => req('POST',   '/edges', data),
  deleteEdge: (id)         => req('DELETE', `/edges/${id}`),

  // Path finding
  findPath: (toPersonId)   => req('POST', '/intro-path', { to_person_id: toPersonId }),

  // Saved paths
  listSavedPaths: ()       => req('GET',    '/saved-paths'),
  savePath: (pathIds)      => req('POST',   '/saved-paths', { path_ids: pathIds }),
  deleteSavedPath: (id)    => req('DELETE', `/saved-paths/${id}`),

  // Activity
  listActivity: ()         => req('GET', '/activity'),

  // Stats
  recordMessageDrafted: () => req('POST', '/stats/message-drafted'),

  // AI
  draftMessage: (payload) => req('POST', '/draft-message', payload),

  // Billing
  getBillingPlan:  ()     => req('GET',  '/billing/plan'),
  createCheckout:  (plan) => req('POST', '/checkout', {
    plan,
    success_url: `${window.location.origin}/pricing/success`,
    cancel_url:  `${window.location.origin}/pricing`,
  }),
  manageBilling: () => req('POST', '/billing/portal'),
}
