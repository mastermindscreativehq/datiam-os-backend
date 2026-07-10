import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

console.log('[API] base URL:', BASE)

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
  recent: (params?: { entityType?: string; entityId?: string; limit?: number }) =>
    apiClient.get('/activity/recent', { params }),
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
  getById:         (id: string) => apiClient.get(`/releases/${id}`),
  create:          (body: Record<string, unknown>) => apiClient.post('/releases', body),
  update:          (id: string, body: Record<string, unknown>) => apiClient.patch(`/releases/${id}`, body),
  remove:          (id: string) => apiClient.delete(`/releases/${id}`),
  getChecklist:    (id: string) => apiClient.get(`/releases/${id}/checklist`),
  updateChecklist: (id: string, body: Record<string, unknown>) => apiClient.patch(`/releases/${id}/checklist`, body),
  getState:        (id: string) => apiClient.get(`/releases/${id}/state`),
}

// ── Release Intel (Phase 1 orchestration layer — /api/release-intel) ────────
// Distinct from the older `release-intelligence` module above (migration 0035).
export const releaseIntel = {
  getSnapshot:   (releaseId: string) => apiClient.get(`/release-intel/${releaseId}`),
  analyze:       (releaseId: string, force = false) =>
    apiClient.post(`/release-intel/${releaseId}/analyze`, { force }, { timeout: 60_000 }),
  getBrief:      (releaseId: string, history = false) =>
    apiClient.get(`/release-intel/${releaseId}/brief`, { params: history ? { history: 'true' } : {} }),
  getMissions:   (releaseId: string) => apiClient.get(`/release-intel/${releaseId}/missions`),
  updateMission: (missionId: string, body: Record<string, unknown>) =>
    apiClient.patch(`/release-intel/missions/${missionId}`, body),
  dispatchMission: (missionId: string) => apiClient.post(`/release-intel/missions/${missionId}/dispatch`),
  retryMission:    (missionId: string) => apiClient.post(`/release-intel/missions/${missionId}/retry`),
  cancelMission:   (missionId: string) => apiClient.post(`/release-intel/missions/${missionId}/cancel`),
  getMissionExecution: (missionId: string) => apiClient.get(`/release-intel/missions/${missionId}/execution`),
}

// ── Artist Intelligence (migration 0051 — /api/artist-intelligence) ─────────
export const artistIntelligence = {
  create: (body: Record<string, unknown>) => apiClient.post('/artist-intelligence', body),
  get:    (id: string) => apiClient.get(`/artist-intelligence/${id}`),
  update: (id: string, body: Record<string, unknown>) => apiClient.patch(`/artist-intelligence/${id}`, body),
  dispatchAutomation: (id: string, category: string, body: Record<string, unknown> = {}) =>
    apiClient.post(`/artist-intelligence/${id}/automation/${category}`, body),
}

// ── Music Links Hub (migration 0051 — /api/music-links) ─────────────────────
export const musicLinks = {
  list:      (params: Record<string, unknown> = {}) => apiClient.get('/music-links', { params }),
  byArtist:  (artistId: string)  => apiClient.get(`/music-links/artist/${artistId}`),
  byRelease: (releaseId: string) => apiClient.get(`/music-links/release/${releaseId}`),
  create:    (body: Record<string, unknown>) => apiClient.post('/music-links', body),
  update:    (id: string, body: Record<string, unknown>) => apiClient.patch(`/music-links/${id}`, body),
  remove:    (id: string) => apiClient.delete(`/music-links/${id}`),
  reorder:   (body: Array<{ id: string; display_order: number }>) => apiClient.patch('/music-links/reorder', body),
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

// ── Sonic Memory Engine (Phase 3) ────────────────────────────────────────────
export const sonicMemory = {
  // Preferences
  recordPreference:        (body: { blueprint_id: string; artist_id: string; preference_type: string; metadata?: Record<string, unknown> }) =>
                             apiClient.post('/sonic-world/preferences', body),
  removePreference:        (id: string) =>
                             apiClient.delete(`/sonic-world/preferences/${id}`),
  getBlueprintPreferences: (blueprintId: string) =>
                             apiClient.get(`/sonic-world/preferences/blueprint/${blueprintId}`),
  getArtistPreferences:    (artistId: string) =>
                             apiClient.get(`/sonic-world/preferences/artist/${artistId}`),
  // Pattern analysis
  analyzePatterns:         (artistId: string) =>
                             apiClient.post(`/sonic-world/patterns/${artistId}/analyze`),
  getPatterns:             (artistId: string) =>
                             apiClient.get(`/sonic-world/patterns/${artistId}`),
  // Artist profile
  getProfile:              (artistId: string) =>
                             apiClient.get(`/sonic-world/profile/${artistId}`),
  // Rankings
  getRankings:             (artistId: string) =>
                             apiClient.get(`/sonic-world/rankings/${artistId}`),
  // Analytics & timeline
  getAnalytics:            (artistId: string) =>
                             apiClient.get(`/sonic-world/analytics/${artistId}`),
  getTimeline:             (artistId: string) =>
                             apiClient.get(`/sonic-world/timeline/${artistId}`),
}

// ── Sonic Director Engine (Phase 4) ─────────────────────────────────────────
export const sonicDirector = {
  // Director recommendations
  generate:             (artistId: string) =>
                          apiClient.post(`/sonic-world/director/${artistId}/generate`),
  getRecommendations:   (artistId: string) =>
                          apiClient.get(`/sonic-world/director/${artistId}`),
  getEvolutionMap:      (artistId: string) =>
                          apiClient.get(`/sonic-world/evolution-map/${artistId}`),
  // Missions
  activateMission:      (artistId: string, mission_type: string) =>
                          apiClient.post(`/sonic-world/missions/${artistId}/activate`, { mission_type }),
  getMissions:          (artistId: string) =>
                          apiClient.get(`/sonic-world/missions/${artistId}`),
  updateProgress:       (artistId: string) =>
                          apiClient.post(`/sonic-world/missions/${artistId}/progress`),
  abandonMission:       (missionId: string) =>
                          apiClient.delete(`/sonic-world/missions/${missionId}/abandon`),
  // Gap analysis
  runGapAnalysis:       (artistId: string) =>
                          apiClient.post(`/sonic-world/gap-analysis/${artistId}/run`),
  getGapAnalysis:       (artistId: string) =>
                          apiClient.get(`/sonic-world/gap-analysis/${artistId}`),
  // Release simulator
  simulateRelease:      (blueprintId: string, artist_id: string) =>
                          apiClient.post(`/sonic-world/simulate/${blueprintId}`, { artist_id }),
  getSimulation:        (blueprintId: string) =>
                          apiClient.get(`/sonic-world/simulate/${blueprintId}`),
  getArtistSimulations: (artistId: string) =>
                          apiClient.get(`/sonic-world/simulations/${artistId}`),
}

// ── Sonic Execution Engine (Phase 5) ────────────────────────────────────────
export const sonicExecution = {
  // Execution Plans
  createPlan:          (artistId: string, body: Record<string, unknown>) =>
                         apiClient.post(`/sonic-world/execution/${artistId}/plans`, body),
  acceptRecommendation:(artistId: string, recommendation_id: string, category: string) =>
                         apiClient.post(`/sonic-world/execution/${artistId}/accept-recommendation`, { recommendation_id, category }),
  getPlans:            (artistId: string) =>
                         apiClient.get(`/sonic-world/execution/${artistId}/plans`),
  getPlanDetails:      (planId: string) =>
                         apiClient.get(`/sonic-world/execution/plans/${planId}`),
  updatePlanStatus:    (planId: string, status: string) =>
                         apiClient.patch(`/sonic-world/execution/plans/${planId}/status`, { status }),
  updateTask:          (planId: string, task_id: string, status: string) =>
                         apiClient.patch(`/sonic-world/execution/plans/${planId}/tasks`, { task_id, status }),
  completeMilestone:   (planId: string, milestoneId: string) =>
                         apiClient.post(`/sonic-world/execution/plans/${planId}/milestones/${milestoneId}/complete`),
  addCheckpoint:       (planId: string, notes: string, data_snapshot?: Record<string, unknown>) =>
                         apiClient.post(`/sonic-world/execution/plans/${planId}/checkpoints`, { notes, data_snapshot }),

  // Session Mode
  diagnose:            (artistId: string, window?: number, session_id?: string) =>
                         apiClient.post(`/sonic-world/session-mode/${artistId}/diagnose`, {}, { params: { window, session_id } }),
  getLatestDiagnostic: (artistId: string) =>
                         apiClient.get(`/sonic-world/session-mode/${artistId}/latest`),
  getDiagnosticHistory:(artistId: string, limit?: number) =>
                         apiClient.get(`/sonic-world/session-mode/${artistId}/history`, { params: { limit } }),

  // Event Bus
  getEvents:           (artistId: string, event_type?: string, limit?: number) =>
                         apiClient.get(`/sonic-world/events/${artistId}`, { params: { event_type, limit } }),

  // Queue Management
  enqueueJob:          (artistId: string, job_type: string, payload: Record<string, unknown>) =>
                         apiClient.post(`/sonic-world/queue/${artistId}/enqueue`, { job_type, payload }),
  getQueueJobs:        (artistId: string, limit?: number) =>
                         apiClient.get(`/sonic-world/queue/${artistId}/jobs`, { params: { limit } }),

  // Platform Ingestion
  getPipelineStatus:   () =>
                         apiClient.get('/sonic-world/platform/pipeline-status'),
  ingestSignal:        (artistId: string, body: Record<string, unknown>) =>
                         apiClient.post(`/sonic-world/platform/${artistId}/signals`, body),
  getSignals:          (artistId: string, params?: Record<string, unknown>) =>
                         apiClient.get(`/sonic-world/platform/${artistId}/signals`, { params }),
  getPlatformSummary:  (artistId: string) =>
                         apiClient.get(`/sonic-world/platform/${artistId}/summary`),
}

// ── Audio Pipeline (Phase 6) ─────────────────────────────────────────────────
export const audio = {
  upload: (formData: FormData, onProgress?: (pct: number) => void) =>
    apiClient.post('/audio/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 600_000, // 10 min for large files
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded * 100) / e.total))
      },
    }),
  process:     (upload_id: string) => apiClient.post('/audio/process', { upload_id }),
  list:        (artist_id: string, limit = 20) =>
                 apiClient.get('/audio', { params: { artist_id, limit } }),
  getById:     (id: string) => apiClient.get(`/audio/${id}`),
  getAnalysis: (id: string) => apiClient.get(`/audio/${id}/analysis`),
  uploadStem:  (formData: FormData) =>
                 apiClient.post('/audio/stems', formData, {
                   headers: { 'Content-Type': 'multipart/form-data' },
                   timeout: 300_000,
                 }),
}

// ── Energy Intelligence (Phase 8) ───────────────────────────────────────────
export const energy = {
  analyze: (upload_id: string) =>
    apiClient.post('/energy/analyze', { upload_id }, { timeout: 60_000 }),
  get: (upload_id: string) =>
    apiClient.get(`/energy/${upload_id}`, { timeout: 30_000 }),
}

// ── Audio DNA Engine (Phase 1 Intelligence) ─────────────────────────────────
export const audioDna = {
  analyze:  (upload_id: string) =>
    apiClient.post('/audio-dna/analyze', { upload_id }, { timeout: 60_000 }),
  get:      (upload_id: string) =>
    apiClient.get(`/audio-dna/${upload_id}`, { timeout: 30_000 }),
  byArtist: (artist_id: string, limit = 50) =>
    apiClient.get(`/audio-dna/artist/${artist_id}`, { params: { limit }, timeout: 30_000 }),
}

// ── Sync Intelligence Engine (Phase 1 Intelligence) ──────────────────────────
export const syncIntelligence = {
  analyze:       (upload_id: string) =>
    apiClient.post('/sync-intelligence/analyze', { upload_id }, { timeout: 60_000 }),
  get:           (upload_id: string) =>
    apiClient.get(`/sync-intelligence/${upload_id}`, { timeout: 30_000 }),
  byArtist:      (artist_id: string, limit = 50) =>
    apiClient.get(`/sync-intelligence/artist/${artist_id}`, { params: { limit }, timeout: 30_000 }),
  opportunities: (artist_id: string, min_score = 60, limit = 10) =>
    apiClient.get(`/sync-intelligence/artist/${artist_id}/opportunities`, {
      params: { min_score, limit }, timeout: 30_000,
    }),
}

// ── Commercial Intelligence Engine (DATIAM OS v4) ────────────────────────────
export const commercialIntelligence = {
  get:      (upload_id: string) =>
    apiClient.get(`/commercial-intelligence/${upload_id}`, { timeout: 45_000 }),
  byArtist: (artist_id: string, limit = 10) =>
    apiClient.get(`/commercial-intelligence/artist/${artist_id}`, { params: { limit }, timeout: 60_000 }),
}

// ── Monitoring & Diagnostics ─────────────────────────────────────────────────
export const monitoring = {
  status:          () => apiClient.get('/monitoring/status'),
  history:         () => apiClient.get('/monitoring/history'),
  incidents:       () => apiClient.get('/monitoring/incidents'),
  resolveIncident: (id: string) => apiClient.post(`/monitoring/incidents/${id}/resolve`),
  // Release Intel Mission Dispatcher — BullMQ queue depth, workflow registry
  // health, and n8n health for the 6 mission-type workflows.
  missions:        () => apiClient.get('/monitoring/missions'),
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

// ── Outreach Intelligence ─────────────────────────────────────────────────────
export const outreach = {
  createCampaign: (body: Record<string, unknown>) => apiClient.post('/outreach/create-campaign', body),
  listCampaigns:  () => apiClient.get('/outreach/campaigns'),
}

// ── Reply Intelligence ────────────────────────────────────────────────────────
export const replies = {
  ingest:   (body: Record<string, unknown>) => apiClient.post('/replies/ingest', body),
  list:     ()         => apiClient.get('/replies/logs'),
  getById:  (id: string) => apiClient.get(`/replies/${id}`),
}

// ── Meeting Intelligence ──────────────────────────────────────────────────────
export const meetings = {
  create:       (body: Record<string, unknown>) => apiClient.post('/meetings', body),
  list:         ()         => apiClient.get('/meetings'),
  getById:      (id: string) => apiClient.get(`/meetings/${id}`),
  updateStatus: (id: string, status: string)   => apiClient.patch(`/meetings/${id}/status`, { status }),
  updateNotes:  (id: string, notes: string)    => apiClient.patch(`/meetings/${id}/notes`, { notes }),
  analytics:    ()         => apiClient.get('/meetings/analytics'),
}

// ── Deal Intelligence ─────────────────────────────────────────────────────────
export const deals = {
  create:       (body: Record<string, unknown>) => apiClient.post('/deals/create', body),
  list:         (limit = 100) => apiClient.get('/deals', { params: { limit } }),
  getById:      (id: string)  => apiClient.get(`/deals/${id}`),
  update:       (id: string, body: Record<string, unknown>) => apiClient.patch(`/deals/${id}`, body),
  updateStage:  (id: string, stage: string)  => apiClient.patch(`/deals/${id}/stage`, { stage }),
  updateStatus: (id: string, status: string) => apiClient.patch(`/deals/${id}/status`, { status }),
  analytics:    ()            => apiClient.get('/deals/analytics'),
}

// ── Contract Intelligence ─────────────────────────────────────────────────────
export const contracts = {
  create:       (body: Record<string, unknown>) => apiClient.post('/contracts/create', body),
  send:         (contract_id: string)          => apiClient.post('/contracts/send', { contract_id }),
  list:         ()          => apiClient.get('/contracts'),
  getById:      (id: string) => apiClient.get(`/contracts/${id}`),
  updateStatus: (id: string, status: string)   => apiClient.patch(`/contracts/${id}/status`, { status }),
  analytics:    ()          => apiClient.get('/contracts/analytics'),
}

// ── Payment Intelligence ──────────────────────────────────────────────────────
export const payments = {
  create:        (body: Record<string, unknown>) => apiClient.post('/payments/create', body),
  sendInvoice:   (payment_id: string)           => apiClient.post('/payments/send-invoice', { payment_id }),
  recordPayment: (body: Record<string, unknown>) => apiClient.post('/payments/record-payment', body),
  list:          ()           => apiClient.get('/payments'),
  getById:       (id: string)  => apiClient.get(`/payments/${id}`),
  updateStatus:  (id: string, status: string)    => apiClient.patch(`/payments/${id}/status`, { status }),
  analytics:     ()           => apiClient.get('/payments/analytics'),
}

// ── Mission Control ───────────────────────────────────────────────────────────
export const missionControl = {
  brief:  () => apiClient.get('/mission-control/brief'),
  search: (q: string, limit = 20) =>
    apiClient.get('/mission-control/search', { params: { q, limit } }),
}

// ── Automation Layer ──────────────────────────────────────────────────────────
export const automation = {
  // Stats / dashboard
  stats:  () => apiClient.get('/automation/stats'),
  events: () => apiClient.get('/automation/events'),
  health: () => apiClient.get('/automation/health'),
  report: () => apiClient.get('/automation/report'),

  // Run history (paginated)
  history: (params?: { status?: string; source?: string; event?: string; limit?: number; offset?: number }) =>
    apiClient.get('/automation/history', { params }),

  // Dead-letter queue
  dlq: () => apiClient.get('/automation/dlq'),

  // Workflow Registry
  registry: {
    list:    ()                                         => apiClient.get('/automation/registry'),
    get:     (id: string)                               => apiClient.get(`/automation/registry/${id}`),
    create:  (body: Record<string, unknown>)            => apiClient.post('/automation/registry', body),
    update:  (id: string, body: Record<string, unknown>) => apiClient.patch(`/automation/registry/${id}`, body),
    remove:  (id: string)                               => apiClient.delete(`/automation/registry/${id}`),
    trigger: (id: string, body: { event: string; data?: Record<string, unknown> }) =>
      apiClient.post(`/automation/registry/${id}/trigger`, body),
  },

  // Inbound runs (legacy + CRUD)
  runs: {
    list:   ()                                          => apiClient.get('/automation/runs'),
    create: (body: Record<string, unknown>)             => apiClient.post('/automation/runs', body),
    update: (id: string, body: Record<string, unknown>) => apiClient.patch(`/automation/runs/${id}`, body),
    remove: (id: string)                                => apiClient.delete(`/automation/runs/${id}`),
    retry:  (id: string)                                => apiClient.post(`/automation/runs/${id}/retry`),
  },

  // Dispatch an event to all matching workflows
  dispatch: (event: string, data?: Record<string, unknown>) =>
    apiClient.post('/automation/dispatch', { event, data }),

  // Seed the workflow registry with built-in workflows
  seed: () => apiClient.post('/automation/seed', {}),

  // Fire a test event
  test: (event: string, data?: Record<string, unknown>) =>
    apiClient.post('/automation/test', { event, data }),
}

// ── Growth OS ────────────────────────────────────────────────────────────────
export const growth = {
  content: {
    list:   (params?: Record<string, unknown>) => apiClient.get('/growth/content', { params }),
    create: (body: Record<string, unknown>)    => apiClient.post('/growth/content', body),
    update: (id: string, body: Record<string, unknown>) => apiClient.patch(`/growth/content/${id}`, body),
    remove: (id: string)                        => apiClient.delete(`/growth/content/${id}`),
  },
  campaigns: {
    list:         (params?: Record<string, unknown>) => apiClient.get('/growth/campaigns', { params }),
    create:       (body: Record<string, unknown>)    => apiClient.post('/growth/campaigns', body),
    update:       (id: string, body: Record<string, unknown>) => apiClient.patch(`/growth/campaigns/${id}`, body),
    remove:       (id: string)                        => apiClient.delete(`/growth/campaigns/${id}`),
    advanceStage: (id: string)                        => apiClient.post(`/growth/campaigns/${id}/advance-stage`),
    performance:  (id: string)                        => apiClient.get(`/growth/campaigns/${id}/performance`),
    tasks:        (id: string)                        => apiClient.get(`/growth/campaigns/${id}/tasks`),
    createTask:   (id: string, body: Record<string, unknown>) => apiClient.post(`/growth/campaigns/${id}/tasks`, body),
  },
  social: {
    list:      (params?: Record<string, unknown>) => apiClient.get('/growth/social/accounts', { params }),
    create:    (body: Record<string, unknown>)    => apiClient.post('/growth/social/accounts', body),
    update:    (id: string, body: Record<string, unknown>) => apiClient.patch(`/growth/social/accounts/${id}`, body),
    remove:    (id: string)                        => apiClient.delete(`/growth/social/accounts/${id}`),
    platforms: ()                                  => apiClient.get('/growth/social/platforms'),
    countries: ()                                  => apiClient.get('/growth/social/countries'),
  },
  publishing: {
    scheduled: (params?: Record<string, unknown>) => apiClient.get('/growth/publishing/scheduled', { params }),
    schedule:  (body: Record<string, unknown>)    => apiClient.post('/growth/publishing/schedule', body),
    cancel:    (id: string)                        => apiClient.post(`/growth/publishing/${id}/cancel`),
    published: (params?: Record<string, unknown>) => apiClient.get('/growth/publishing/published', { params }),
  },
  analytics: {
    overview:   (artistId: string, days?: number) => apiClient.get('/growth/analytics/overview',   { params: { artist_id: artistId, days } }),
    byPlatform: (artistId: string, days?: number) => apiClient.get('/growth/analytics/by-platform', { params: { artist_id: artistId, days } }),
    topContent: (artistId: string, limit?: number) => apiClient.get('/growth/analytics/top-content', { params: { artist_id: artistId, limit } }),
  },
  trends: {
    list:   (params?: Record<string, unknown>) => apiClient.get('/growth/trends', { params }),
    create: (body: Record<string, unknown>)    => apiClient.post('/growth/trends', body),
    expire: (id: string)                        => apiClient.post(`/growth/trends/${id}/expire`),
  },
  crm: {
    groups:  ()                                          => apiClient.get('/growth/crm/groups'),
    createGroup: (body: Record<string, unknown>)         => apiClient.post('/growth/crm/groups', body),
    members: (groupId: string)                           => apiClient.get(`/growth/crm/groups/${groupId}/members`),
    addMember: (groupId: string, body: Record<string, unknown>) => apiClient.post(`/growth/crm/groups/${groupId}/members`, body),
  },
  notifications: {
    list:        (params?: Record<string, unknown>) => apiClient.get('/growth/notifications', { params }),
    unreadCount: ()                                  => apiClient.get('/growth/notifications/unread-count'),
    markRead:    (id: string)                        => apiClient.post(`/growth/notifications/${id}/read`),
    markAllRead: ()                                  => apiClient.post('/growth/notifications/read-all'),
    dismiss:     (id: string)                        => apiClient.post(`/growth/notifications/${id}/dismiss`),
  },
  ai: {
    caption:      (body: Record<string, unknown>) => apiClient.post('/growth/ai/caption',              body, { timeout: 60_000 }),
    hashtags:     (body: Record<string, unknown>) => apiClient.post('/growth/ai/hashtags',             body, { timeout: 60_000 }),
    cta:          (body: Record<string, unknown>) => apiClient.post('/growth/ai/cta',                  body, { timeout: 60_000 }),
    brief:        (body: Record<string, unknown>) => apiClient.post('/growth/ai/campaign-brief',       body, { timeout: 60_000 }),
    retrospective:(body: Record<string, unknown>) => apiClient.post('/growth/ai/campaign-retrospective',body,{ timeout: 60_000 }),
    trendIdea:    (body: Record<string, unknown>) => apiClient.post('/growth/ai/trend-content-idea',   body, { timeout: 60_000 }),
    growthReport: (body: Record<string, unknown>) => apiClient.post('/growth/ai/growth-report',        body, { timeout: 60_000 }),
    schedule:     (body: Record<string, unknown>) => apiClient.post('/growth/ai/posting-schedule',     body, { timeout: 60_000 }),
    calendar:     (body: Record<string, unknown>) => apiClient.post('/growth/ai/content-calendar',     body, { timeout: 90_000 }),
    persona:      (body: Record<string, unknown>) => apiClient.post('/growth/ai/audience-persona',     body, { timeout: 60_000 }),
    pitch:        (body: Record<string, unknown>) => apiClient.post('/growth/ai/collaboration-pitch',  body, { timeout: 60_000 }),
    score:        (body: Record<string, unknown>) => apiClient.post('/growth/ai/score-content',        body, { timeout: 60_000 }),
    strategy:     (body: Record<string, unknown>) => apiClient.post('/growth/ai/release-strategy',     body, { timeout: 60_000 }),
    enrich:       (body: Record<string, unknown>) => apiClient.post('/growth/ai/enrich-content',       body, { timeout: 90_000 }),
  },
}

