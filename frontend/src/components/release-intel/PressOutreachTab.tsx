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
  { key: 'target_contacts', label: 'TARGET CONTACTS' },
]

const RESULT_FIELDS: MissionField[] = [
  { key: 'emails_sent', label: 'EMAILS SENT' },
  { key: 'opens', label: 'OPENS' },
  { key: 'clicks', label: 'CLICKS' },
  { key: 'replies', label: 'REPLIES' },
  { key: 'bounce_rate', label: 'BOUNCE RATE', format: v => (typeof v === 'number' ? `${(v * 100).toFixed(1)}%` : String(v)) },
]

export default function PressOutreachTab(props: Props) {
  return (
    <MissionWorkspaceTab
      {...props}
      missionType="outreach"
      icon="✉"
      heading="PRESS OUTREACH"
      accent="orange"
      description="Identifies and contacts blogs, radio, and curators relevant to this release. Email delivery itself is already fully wired (Resend/SendGrid/SMTP) — dispatching runs the Media Contact Discovery workflow (n8n) for live campaign results."
      targetMetricsFields={TARGET_METRICS_FIELDS}
      resultFields={RESULT_FIELDS}
    />
  )
}
