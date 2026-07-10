import { Link } from 'react-router-dom'
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
  { key: 'seeded_content_ideas', label: 'SEEDED CONTENT IDEAS' },
]

const RESULT_FIELDS: MissionField[] = [
  { key: 'content_ideas', label: 'CONTENT IDEAS' },
  { key: 'release_calendar', label: 'RELEASE CALENDAR' },
  { key: 'posting_schedule', label: 'POSTING SCHEDULE' },
  { key: 'captions', label: 'CAPTIONS' },
  { key: 'hooks', label: 'HOOKS' },
  { key: 'hashtags', label: 'HASHTAGS' },
  { key: 'campaign_timeline', label: 'CAMPAIGN TIMELINE' },
]

export default function ContentCalendarTab(props: Props) {
  return (
    <MissionWorkspaceTab
      {...props}
      missionType="content"
      icon="▤"
      heading="CONTENT CALENDAR"
      accent="purple"
      description="Seeds a content calendar (teaser/announcement/hook clip) for the pre-release, release-day, and post-release windows. Real content_ideas rows are created via the Content Vault the moment analysis completes — dispatching this mission expands that into a full AI-generated calendar (n8n) once credentials are connected."
      targetMetricsFields={TARGET_METRICS_FIELDS}
      resultFields={RESULT_FIELDS}
    >
      {props.mission && (
        <div className="border-t border-white/5 pt-4">
          <Link
            to="/content-ideas"
            className="text-[10px] font-mono tracking-widest text-purple-400/70 hover:text-purple-400 transition-colors"
          >
            VIEW SEEDED CONTENT IDEAS →
          </Link>
        </div>
      )}
    </MissionWorkspaceTab>
  )
}
