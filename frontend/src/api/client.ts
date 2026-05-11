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
  return config
})

// Auto-redirect on 401 — but NOT for auth/ endpoints
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    const url: string = err.config?.url ?? ''
    const isAuthRoute = url.includes('/auth/')
    if (err.response?.status === 401 && !isAuthRoute) {
      localStorage.removeItem('datiam_token')
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  },
)

export function isCriticalError(err: any): boolean {
  const status = err.response?.status
  return !status || status === 401 || status === 403 || status >= 500
}

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

// ── Activity ─────────────────────────────────────────────────────────────────
export const activity = {
  recent: () => apiClient.get('/activity/recent'),
}

// ── Fan Intelligence ────────────────────────────────────────────────────────
export const fanIntelligence = {
  summary:   () => apiClient.get('/fan-intelligence/summary'),
  topFans:   () => apiClient.get('/fan-intelligence/top-fans'),
  geography: () => apiClient.get('/fan-intelligence/geography'),
}

// ── Artists ─────────────────────────────────────────────────────────────────
export const artists = {
  list: () => apiClient.get('/artist'),
}

// ── Catalog ─────────────────────────────────────────────────────────────────
export const catalog = {
  songs:  () => apiClient.get('/songs'),
  create: (body: Record<string, unknown>) => apiClient.post('/songs', body),
  update: (id: string, body: Record<string, unknown>) => apiClient.patch(`/songs/${id}`, body),
  remove: (id: string) => apiClient.delete(`/songs/${id}`),
}

// ── Releases ────────────────────────────────────────────────────────────────
export const releases = {
  list:   () => apiClient.get('/releases'),
  create: (body: Record<string, unknown>) => apiClient.post('/releases', body),
  update: (id: string, body: Record<string, unknown>) => apiClient.patch(`/releases/${id}`, body),
  remove: (id: string) => apiClient.delete(`/releases/${id}`),
}

// ── Sync Pitches ────────────────────────────────────────────────────────────
export const syncPitches = {
  list:   () => apiClient.get('/sync/pitches'),
  create: (body: Record<string, unknown>) => apiClient.post('/sync/pitches', body),
  update: (id: string, body: Record<string, unknown>) => apiClient.patch(`/sync/pitches/${id}`, body),
  remove: (id: string) => apiClient.delete(`/sync/pitches/${id}`),
}

// ── Royalty Sources ─────────────────────────────────────────────────────────
export const royaltySources = {
  list:   () => apiClient.get('/royalties'),
  create: (body: Record<string, unknown>) => apiClient.post('/royalties', body),
  remove: (id: string) => apiClient.delete(`/royalties/${id}`),
}

// ── Content Ideas ───────────────────────────────────────────────────────────
export const contentIdeas = {
  list:   () => apiClient.get('/content/ideas'),
  create: (body: Record<string, unknown>) => apiClient.post('/content/ideas', body),
  update: (id: string, body: Record<string, unknown>) => apiClient.patch(`/content/ideas/${id}`, body),
  remove: (id: string) => apiClient.delete(`/content/ideas/${id}`),
}

// ── Automation Runs ─────────────────────────────────────────────────────────
export const automationRuns = {
  list:   () => apiClient.get('/automation/runs'),
  create: (body: Record<string, unknown>) => apiClient.post('/automation/runs', body),
  remove: (id: string) => apiClient.delete(`/automation/runs/${id}`),
}
