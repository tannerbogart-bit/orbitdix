// Real API client — proxied through Vite to Flask on :5000

const BASE = '/api'

function authHeaders(token) {
  const t = token || localStorage.getItem('access_token')
  return t ? { Authorization: `Bearer ${t}` } : {}
}

// Singleton refresh promise — prevents multiple concurrent refresh calls
let _refreshPromise = null

async function _doRefresh() {
  const refreshToken = localStorage.getItem('refresh_token')
  if (!refreshToken) return null
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${refreshToken}` },
    })
    if (!res.ok) {
      localStorage.removeItem('refresh_token')
      return null
    }
    const data = await res.json()
    localStorage.setItem('access_token', data.access_token)
    return data.access_token
  } catch {
    return null
  }
}

async function tryRefresh() {
  if (!_refreshPromise) _refreshPromise = _doRefresh().finally(() => { _refreshPromise = null })
  return _refreshPromise
}

function clearSession() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  window.location.href = '/auth/signin'
}

async function req(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  }
  if (body !== undefined) opts.body = JSON.stringify(body)
  const res = await fetch(BASE + path, opts)
  if (res.status === 204) return null

  // On 401, try a silent token refresh then retry once
  if (res.status === 401 && path !== '/auth/login' && path !== '/auth/refresh') {
    const newToken = await tryRefresh()
    if (newToken) {
      const retry = await fetch(BASE + path, {
        ...opts,
        headers: { 'Content-Type': 'application/json', ...authHeaders(newToken) },
      })
      if (retry.status === 204) return null
      if (retry.status === 401) { clearSession(); return null }
      const retryJson = await retry.json()
      if (!retry.ok) {
        const err = new Error(retryJson.error || `HTTP ${retry.status}`)
        if (retryJson.upgrade_required) err.upgradeRequired = true
        throw err
      }
      return retryJson
    }
    clearSession()
    return null
  }

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
  updateProfile: (data)              => req('PUT',  '/me', data),
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
  createEdge: (data)       => req('POST', '/edges', data),
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

  // Agent
  getAgentContext:       ()       => req('GET',    '/agent/context'),
  saveAgentContext:      (data)   => req('PUT',    '/agent/context', data),
  getTargetAccounts:     ()       => req('GET',    '/agent/targets'),
  addTargetAccount:      (data)   => req('POST',   '/agent/targets', data),
  updateTargetAccount:   (id, d)  => req('PATCH',  `/agent/targets/${id}`, d),
  deleteTargetAccount:   (id)     => req('DELETE', `/agent/targets/${id}`),
  bulkAddTargets:        (names)  => req('POST',   '/agent/targets/bulk', { companies: names }),
  getTargetsIntelligence: ()      => req('GET',    '/targets/intelligence'),
  getAgentHistory:       ()       => req('GET',    '/agent/history'),
  clearAgentHistory:     ()       => req('DELETE', '/agent/history'),
  getAgentSuggestions:   ()       => req('GET',    '/agent/suggestions'),

  // Outreach tracker
  listOutreach:   (status) => req('GET',    '/outreach' + (status ? `?status=${status}` : '')),
  createOutreach: (data)   => req('POST',   '/outreach', data),
  updateOutreach: (id, d)  => req('PATCH',  `/outreach/${id}`, d),
  deleteOutreach: (id)     => req('DELETE', `/outreach/${id}`),

  // Admin (gated server-side by ADMIN_EMAILS)
  adminStats:      ()             => req('GET',    '/admin/stats'),
  adminUsers:      ()             => req('GET',    '/admin/users'),
  adminUser:       (id)           => req('GET',    `/admin/users/${id}`),
  adminSetPlan:    (id, plan, status) => req('PATCH', `/admin/users/${id}/plan`, { plan, subscription_status: status }),
  adminDeleteUser: (id)           => req('DELETE', `/admin/users/${id}`),

  // Billing
  getBillingPlan:  ()     => req('GET',  '/billing/plan'),
  createCheckout:  (plan) => req('POST', '/checkout', {
    plan,
    success_url: `${window.location.origin}/pricing/success`,
    cancel_url:  `${window.location.origin}/pricing`,
  }),
  manageBilling: () => req('POST', '/billing/portal'),
}
