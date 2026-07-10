// Types mirror the Release Intel Phase 1 backend exactly (migration 0048,
// /api/release-intel) — see backend/src/modules/release-intel/*. Do not add
// fields here that the backend doesn't actually return.

export interface ReleaseRecord {
  id: string
  artist_id: string | null
  release_title: string
  title: string
  release_type: 'single' | 'ep' | 'album'
  type: string
  music_status: 'draft' | 'scheduled' | 'released'
  status: string
  genre: string | null
  release_date: string | null
  cover_art_url: string | null
  description: string | null
  upc: string | null
  distributor: string | null
  spotify_url: string | null
  apple_music_url: string | null
  audiomack_url: string | null
  boomplay_url: string | null
  youtube_url: string | null
  // Release Intelligence v1 (migration 0051)
  deezer_url: string | null
  tidal_url: string | null
  amazon_music_url: string | null
  youtube_music_url: string | null
  soundcloud_url: string | null
  territories: string[] | null
  primary_isrc: string | null
  release_state: string
  created_at: string
  updated_at: string
}

export type ReleaseIntelStatus = 'pending' | 'analyzing' | 'complete' | 'failed'
export type DataCompleteness = 'full' | 'metadata_only'

export interface RecommendedCountry {
  country: string
  score: number
  source: string
}

export interface RecommendedDsp {
  platform: string
  configured: boolean
  priority: 'ready' | 'action_needed'
}

export interface RolloutStrategy {
  phase: string
  recommendation: string
}

export interface RecommendedReleaseWindow {
  earliestSubmission: string | null
  targetReleaseDate: string | null
  leadTimeDays: number | null
  reasoning: string
}

export interface ReleaseIntelAnalysis {
  id: string
  release_id: string
  status: ReleaseIntelStatus
  commercial_score: string | null
  playlist_score: string | null
  sync_score: string | null
  viral_score: string | null
  data_completeness: DataCompleteness
  resolved_audio_upload_id: string | null
  recommended_release_window: RecommendedReleaseWindow | null
  recommended_countries: RecommendedCountry[] | null
  recommended_dsps: RecommendedDsp[] | null
  rollout_strategy: RolloutStrategy | null
  analysis_version: string
  failure_reason: string | null
  analyzed_at: string | null
  created_at: string
  updated_at: string
}

export interface ExecutiveBrief {
  id: string
  release_id: string
  summary: string
  strengths: string[]
  weaknesses: string[]
  commercial_outlook: string
  viral_outlook: string
  sync_outlook: string
  playlist_outlook: string
  audience_recommendations: string[]
  priority_actions: string[]
  risk_assessment: string
  execution_plan_30d: string[]
  used_ai: boolean
  confidence_score: string
  created_at: string
}

export type MissionType = 'playlist' | 'sync' | 'fan_growth' | 'content' | 'outreach' | 'analytics'
export type MissionStatus =
  | 'pending' | 'active' | 'blocked' | 'completed' | 'cancelled'
  // Mission Dispatcher — automation-managed execution states
  | 'queued' | 'running' | 'waiting' | 'failed' | 'retrying'

export interface ReleaseMission {
  id: string
  release_id: string
  artist_id: string | null
  mission_type: MissionType
  title: string
  description: string
  status: MissionStatus
  priority: number
  target_metrics: Record<string, unknown>
  progress_percentage: string
  due_date: string | null
  mission_params: Record<string, unknown>
  created_at: string
  updated_at: string
  completed_at: string | null
  // Mission Dispatcher fields (migration 0049)
  owner: string | null
  started_at: string | null
  workflow_id: string | null
  queue_job_id: string | null
  automation_run_id: string | null
  retry_count: number
  last_error: string | null
}

export const ACTIVE_MISSION_STATUSES: MissionStatus[] = ['queued', 'running', 'waiting', 'retrying']

export interface MissionExecutionRun {
  id: string
  workflow_name: string
  status: string
  duration_ms: number | null
  retry_count: number
  error_message: string | null
  result: { fired?: boolean; response?: Record<string, unknown> | null } | null
  created_at: string
}

export interface MissionExecution {
  mission: ReleaseMission
  execution_history: MissionExecutionRun[]
  queue_status: string | null
}

export interface ActivityEvent {
  id: string
  event_type: string | null
  module: string | null
  title: string
  description: string | null
  severity: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface AutomationRun {
  id: string
  workflow_name: string
  status: string
  triggered_by_event: string | null
  duration_ms: number | null
  created_at: string
  payload: { event?: string; data?: Record<string, unknown> } | null
  error_message: string | null
}

export interface DiagnosticCall {
  label: string
  method: string
  url: string
  status: number | 'error'
  latencyMs: number
  at: string
}

export interface DiagnosticsState {
  calls: DiagnosticCall[]
  lastAnalysisDurationMs: number | null
  errors: string[]
  warnings: string[]
}

export interface ReleaseIntelSnapshot {
  release: ReleaseRecord
  analysis: ReleaseIntelAnalysis | null
  brief: ExecutiveBrief | null
  missions: ReleaseMission[]
}

// Workspace tab keys — the six mission-type tabs reuse MissionType values
// directly so "open this mission's tab" never needs a separate lookup table.
export type ReleaseIntelTabKey = 'overview' | 'intelligence' | 'missions' | MissionType | 'diagnostics'

export interface ReleaseIntelTab {
  key: ReleaseIntelTabKey
  label: string
}

export const RELEASE_INTEL_TABS: ReleaseIntelTab[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'intelligence', label: 'Release Intelligence' },
  { key: 'missions', label: 'Mission Board' },
  { key: 'playlist', label: 'Playlist Pitch' },
  { key: 'sync', label: 'Sync Pitch' },
  { key: 'outreach', label: 'Press Outreach' },
  { key: 'fan_growth', label: 'Fan Growth' },
  { key: 'content', label: 'Content Calendar' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'diagnostics', label: 'Diagnostics' },
]
