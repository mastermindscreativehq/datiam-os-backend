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

// Log errors and auto-redirect on 401 — but NOT for auth/ endpoints
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    const url: string = err.config?.url ?? ''
    const method: string = (err.config?.method ?? 'UNKNOWN').toUpperCase()
    const status: number | undefined = err.response?.status
    const requestId: string | null = err.response?.headers?.['x-request-id'] ?? null

    // Safe body — never log raw response that might contain tokens
    const safeBody = (() => {
      try {
        const data = err.response?.data
        if (!data || typeof data !== 'object') return null
        const { success, error, code, message } = data as Record<string, unknown>
        return { success, error, code, message }
      } catch {
        return null
      }
    })()

    console.error('[API Error]', { url, method, status, requestId, body: safeBody })

    const isAuthRoute = url.includes('/auth/')
    if (status === 401 && !isAuthRoute) {
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
  stats:  () => apiClient.get('/activity/stats'),
}

// ── Fan Intelligence ────────────────────────────────────────────────────────
export const fanIntelligence = {
  summary:   () => apiClient.get('/fan-intelligence/summary'),
  topFans:   () => apiClient.get('/fan-intelligence/top-fans'),
  geography: () => apiClient.get('/fan-intelligence/geography'),
}

// ── Artists ─────────────────────────────────────────────────────────────────
export const artists = {
  list:   () => apiClient.get('/artists'),
  create: (body: Record<string, unknown>) => apiClient.post('/artists', body),
  update: (id: string, body: Record<string, unknown>) => apiClient.patch(`/artists/${id}`, body),
  remove: (id: string) => apiClient.delete(`/artists/${id}`),
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
  list:            () => apiClient.get('/releases'),
  create:          (body: Record<string, unknown>) => apiClient.post('/releases', body),
  update:          (id: string, body: Record<string, unknown>) => apiClient.patch(`/releases/${id}`, body),
  remove:          (id: string) => apiClient.delete(`/releases/${id}`),
  getChecklist:    (id: string) => apiClient.get(`/releases/${id}/checklist`),
  updateChecklist: (id: string, body: Record<string, unknown>) => apiClient.patch(`/releases/${id}/checklist`, body),
  getState:        (id: string) => apiClient.get(`/releases/${id}/state`),
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

// ── Sonic World Engine ───────────────────────────────────────────────────────
export const sonicWorld = {
  generate:             (body: { session_id: string; artist_id: string }) =>
                          apiClient.post('/sonic-world/generate', body),
  getLatestBlueprint:   (sessionId: string) =>
                          apiClient.get(`/sonic-world/blueprints/${sessionId}`),
  getBlueprintHistory:  (sessionId: string) =>
                          apiClient.get(`/sonic-world/blueprints/${sessionId}/history`),
  dashboard:            (artistId?: string) =>
                          apiClient.get('/sonic-world/dashboard', { params: artistId ? { artist_id: artistId } : {} }),
}

// ── Music Intelligence ───────────────────────────────────────────────────────
export const musicIntelligence = {
  dashboard:           (artistId?: string) => apiClient.get('/music-intelligence/dashboard', { params: artistId ? { artist_id: artistId } : {} }),
  memory:              (artistId: string)  => apiClient.get('/music-intelligence/memory', { params: { artist_id: artistId } }),
  listSessions:        (artistId?: string) => apiClient.get('/music-intelligence/sessions', { params: artistId ? { artist_id: artistId } : {} }),
  createSession:       (body: Record<string, unknown>) => apiClient.post('/music-intelligence/sessions', body),
  getSession:          (id: string)        => apiClient.get(`/music-intelligence/sessions/${id}`),
  updateSession:       (id: string, body: Record<string, unknown>) => apiClient.patch(`/music-intelligence/sessions/${id}`, body),
  deleteSession:       (id: string)        => apiClient.delete(`/music-intelligence/sessions/${id}`),
  regenerateBlueprint: (id: string)        => apiClient.post(`/music-intelligence/sessions/${id}/blueprint`),
}
