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
  { key: 'target_pitches', label: 'TARGET PITCHES' },
]

const RESULT_FIELDS: MissionField[] = [
  { key: 'film_opportunities', label: 'FILM OPPORTUNITIES' },
  { key: 'tv_opportunities', label: 'TV OPPORTUNITIES' },
  { key: 'games', label: 'GAMES' },
  { key: 'ads', label: 'ADS' },
  { key: 'music_supervisors', label: 'MUSIC SUPERVISORS' },
  { key: 'sync_agencies', label: 'SYNC AGENCIES' },
  { key: 'licensing_targets', label: 'LICENSING TARGETS' },
]

export default function SyncPitchTab(props: Props) {
  return (
    <MissionWorkspaceTab
      {...props}
      missionType="sync"
      heading="SYNC PITCH"
      icon="◈"
      accent="cyan"
      description="Licenses this release for film/TV/game/ad sync placement. Blocked until audio analysis (Audio DNA + Sync Intelligence) exists for this release — dispatching then runs the Sync Opportunity Discovery workflow (n8n) for live licensing targets."
      targetMetricsFields={TARGET_METRICS_FIELDS}
      resultFields={RESULT_FIELDS}
    />
  )
}
