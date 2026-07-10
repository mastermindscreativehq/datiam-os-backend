import MissionWorkspaceTab, { type MissionField } from './MissionWorkspaceTab'
import type { MissionExecution, ReleaseMission } from './types'

interface Props {
  mission: ReleaseMission | undefined
  execution: MissionExecution | null
  executionLoading: boolean
  onLoadExecution: (missionId: string) => void
  onUpdateMission: (missionId: string, patch: Record<string, unknown>) => void
  onDispatchMission: (missionId: string) => void
  onRetryMission: (missionId: string) => void
  onCancelMission: (missionId: string) => void
  updatingId: string | null
  canWrite: boolean
}

const TARGET_METRICS_FIELDS: MissionField[] = [
  { key: 'baseline_commercial_score', label: 'BASELINE COMMERCIAL' },
  { key: 'baseline_playlist_score', label: 'BASELINE PLAYLIST' },
  { key: 'baseline_sync_score', label: 'BASELINE SYNC' },
]

const RESULT_FIELDS: MissionField[] = [
  { key: 'spotify_streams', label: 'SPOTIFY STREAMS' },
  { key: 'apple_streams', label: 'APPLE STREAMS' },
  { key: 'youtube', label: 'YOUTUBE' },
  { key: 'tiktok', label: 'TIKTOK' },
  { key: 'instagram', label: 'INSTAGRAM' },
  { key: 'followers', label: 'FOLLOWERS' },
  { key: 'playlist_additions', label: 'PLAYLIST ADDITIONS' },
  { key: 'save_rate', label: 'SAVE RATE' },
  { key: 'listener_growth', label: 'LISTENER GROWTH' },
]

export default function AnalyticsTab(props: Props) {
  return (
    <MissionWorkspaceTab
      {...props}
      missionType="analytics"
      icon="▥"
      heading="ANALYTICS"
      accent="yellow"
      description="Tracks this release's post-release performance against the baseline scores captured at analysis time. Dispatching runs the Cross-Platform Analytics Collection workflow (n8n) once Spotify/YouTube/Instagram/TikTok credentials are connected — comparison against the baseline happens on the DATIAM side, not fabricated here."
      targetMetricsFields={TARGET_METRICS_FIELDS}
      resultFields={RESULT_FIELDS}
    />
  )
}
