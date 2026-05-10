import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

export const apiClient = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

// Attach JWT on every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('datiam_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  console.log(`[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, token ? '(auth)' : '(no token)')
  return config
})

// Auto-redirect on 401 — but NOT for auth/ endpoints (those are handled by
// the authStore so a stale verifyToken() response never removes a fresh token).
apiClient.interceptors.response.use(
  (res) => {
    console.log(`[API] ${res.status} ${res.config.url}`, res.data)
    return res
  },
  (err) => {
    console.error(`[API] error ${err.response?.status ?? 'network'} ${err.config?.url}`, err.response?.data ?? err.message)
    const url: string = err.config?.url ?? ''
    const isAuthRoute = url.includes('/auth/')
    if (err.response?.status === 401 && !isAuthRoute) {
      // Only force-navigate for non-auth endpoints (dashboard, catalog, etc.)
      // Auth endpoints return 401 on bad/expired tokens and the store handles them.
      localStorage.removeItem('datiam_token')
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  },
)

// ── Auth ────────────────────────────────────────────────────────────────────
export const auth = {
  login: (email: string, password: string) =>
    apiClient.post('/auth/login', { email, password }),
  me: () => apiClient.get('/auth/me'),
}

// ── Dashboard ───────────────────────────────────────────────────────────────
export const dashboard = {
  overview: () => apiClient.get('/dashboard/overview'),
}

// ── Fan Intelligence ────────────────────────────────────────────────────────
export const fanIntelligence = {
  summary:   () => apiClient.get('/fan-intelligence/summary'),
  topFans:   () => apiClient.get('/fan-intelligence/top-fans'),
  geography: () => apiClient.get('/fan-intelligence/geography'),
}

// ── Catalog ─────────────────────────────────────────────────────────────────
export const catalog = {
  songs: () => apiClient.get('/catalog/songs'),
}

// ── Releases ────────────────────────────────────────────────────────────────
export const releases = {
  list: () => apiClient.get('/releases'),
}

// ── Sync Pitches ────────────────────────────────────────────────────────────
export const syncPitches = {
  list: () => apiClient.get('/sync-pitches'),
}

// ── Royalty Sources ─────────────────────────────────────────────────────────
export const royaltySources = {
  list: () => apiClient.get('/royalty-sources'),
}

// ── Content Ideas ───────────────────────────────────────────────────────────
export const contentIdeas = {
  list: () => apiClient.get('/content-ideas'),
}

// ── Automation Runs ─────────────────────────────────────────────────────────
export const automationRuns = {
  list: () => apiClient.get('/automation-runs'),
}
