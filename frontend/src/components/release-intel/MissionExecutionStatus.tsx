import type { ReleaseMission } from './types'
import { ACTIVE_MISSION_STATUSES } from './types'

interface Props {
  mission: ReleaseMission
}

function runtimeSince(startedAt: string | null): string {
  if (!startedAt) return '—'
  const ms = Date.now() - new Date(startedAt).getTime()
  if (ms < 0 || Number.isNaN(ms)) return '—'
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ${s % 60}s`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

// Real Mission Dispatcher columns (migration 0049) — workflow_id, started_at,
// queue_job_id, retry_count, last_error. Shared by MissionBoard and each
// dedicated mission tab so the "is this actually running" story is identical
// everywhere it's shown.
export default function MissionExecutionStatus({ mission }: Props) {
  const isExecuting = ACTIVE_MISSION_STATUSES.includes(mission.status)
  if (!isExecuting && mission.status !== 'failed') return null

  return (
    <div className="border border-white/5 rounded p-2 space-y-1 bg-white/[0.015]">
      <div className="flex justify-between text-[9px] font-mono">
        <span className="text-gray-600">WORKFLOW</span>
        <span className="text-white/70">{mission.workflow_id ? mission.mission_type : '—'}</span>
      </div>
      <div className="flex justify-between text-[9px] font-mono">
        <span className="text-gray-600">RUNTIME</span>
        <span className="text-white/70">{runtimeSince(mission.started_at)}</span>
      </div>
      <div className="flex justify-between text-[9px] font-mono">
        <span className="text-gray-600">QUEUE JOB</span>
        <span className="text-white/70">{mission.queue_job_id ?? 'inline'}</span>
      </div>
      {mission.retry_count > 0 && (
        <div className="flex justify-between text-[9px] font-mono">
          <span className="text-gray-600">RETRIES</span>
          <span className="text-orange-400">{mission.retry_count}</span>
        </div>
      )}
      {mission.last_error && (
        <div className="text-[9px] font-mono text-red-400/80 pt-1 break-words">{mission.last_error}</div>
      )}
    </div>
  )
}
