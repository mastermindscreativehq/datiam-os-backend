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
  { key: 'suitability_score', label: 'SUITABILITY SCORE' },
  { key: 'target_playlist_adds', label: 'TARGET PLAYLIST ADDS' },
]

const RESULT_FIELDS: MissionField[] = [
  { key: 'playlists_found', label: 'PLAYLISTS FOUND' },
  { key: 'editorial_opportunities', label: 'EDITORIAL OPPORTUNITIES' },
  { key: 'curator_contacts', label: 'CURATOR CONTACTS' },
  { key: 'priority_playlists', label: 'PRIORITY PLAYLISTS' },
  { key: 'genre_matching', label: 'GENRE MATCHING' },
  { key: 'acceptance_probability', label: 'ACCEPTANCE PROBABILITY' },
]

export default function PlaylistPitchTab(props: Props) {
  return (
    <MissionWorkspaceTab
      {...props}
      missionType="playlist"
      heading="PLAYLIST PITCH"
      icon="◎"
      accent="green"
      description="Pitches this release to editorial and independent playlist curators. DATIAM computes a baseline suitability estimate from genre/audio signals immediately; dispatching this mission runs the Playlist Discovery workflow (n8n) for live curator/editorial results."
      targetMetricsFields={TARGET_METRICS_FIELDS}
      resultFields={RESULT_FIELDS}
    />
  )
}
