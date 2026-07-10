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
  { key: 'current_fan_count', label: 'CURRENT FAN COUNT' },
  { key: 'target_fan_count', label: 'TARGET FAN COUNT' },
]

const RESULT_FIELDS: MissionField[] = [
  { key: 'audience_growth', label: 'AUDIENCE GROWTH' },
  { key: 'top_countries', label: 'TOP COUNTRIES' },
  { key: 'top_cities', label: 'TOP CITIES' },
  { key: 'follower_velocity', label: 'FOLLOWER VELOCITY' },
  { key: 'fan_overlap', label: 'FAN OVERLAP' },
  { key: 'growth_prediction', label: 'GROWTH PREDICTION' },
]

export default function FanGrowthTab(props: Props) {
  return (
    <MissionWorkspaceTab
      {...props}
      missionType="fan_growth"
      icon="△"
      heading="FAN GROWTH"
      accent="fuchsia"
      description="Grows the fan base tied to this release cycle. DATIAM tracks the current fan count directly; dispatching runs the Fan Audience Growth Analysis workflow (n8n) against Spotify/YouTube/Instagram/TikTok once those platform credentials are connected."
      targetMetricsFields={TARGET_METRICS_FIELDS}
      resultFields={RESULT_FIELDS}
    />
  )
}
