import type { ReleaseMission } from './types'
import { ACTIVE_MISSION_STATUSES } from './types'

interface Props {
  mission: ReleaseMission
  onUpdateMission: (missionId: string, patch: Record<string, unknown>) => void
  onDispatchMission: (missionId: string) => void
  onRetryMission: (missionId: string) => void
  onCancelMission: (missionId: string) => void
  busy: boolean
  canWrite: boolean
}

// Shared by MissionBoard (all 6 missions at a glance) and each dedicated
// mission tab (single-mission deep dive) — one source of truth for which
// action is legal from which mission.status.
export default function MissionActionButtons({
  mission, onUpdateMission, onDispatchMission, onRetryMission, onCancelMission, busy, canWrite,
}: Props) {
  if (!canWrite) return null
  const isExecuting = ACTIVE_MISSION_STATUSES.includes(mission.status)

  return (
    <div className="flex gap-2 flex-wrap">
      {mission.status === 'pending' && (
        <button
          disabled={busy}
          onClick={() => onDispatchMission(mission.id)}
          className="text-[9px] font-mono tracking-widest px-2.5 py-1 border border-[#00ff41]/40 text-[#00ff41] hover:bg-[#00ff41]/10 rounded transition-colors disabled:opacity-50"
        >
          DISPATCH
        </button>
      )}
      {(mission.status === 'failed' || mission.status === 'cancelled') && (
        <button
          disabled={busy}
          onClick={() => onRetryMission(mission.id)}
          className="text-[9px] font-mono tracking-widest px-2.5 py-1 border border-[#00d4ff]/40 text-[#00d4ff] hover:bg-[#00d4ff]/10 rounded transition-colors disabled:opacity-50"
        >
          RERUN
        </button>
      )}
      {(mission.status === 'active' || mission.status === 'blocked') && (
        <button
          disabled={busy}
          onClick={() => onUpdateMission(mission.id, { status: 'completed', progress_percentage: 100 })}
          className="text-[9px] font-mono tracking-widest px-2.5 py-1 border border-[#00ff41]/40 text-[#00ff41] hover:bg-[#00ff41]/10 rounded transition-colors disabled:opacity-50"
        >
          MARK COMPLETE
        </button>
      )}
      {isExecuting && (
        <button
          disabled={busy}
          onClick={() => onCancelMission(mission.id)}
          className="text-[9px] font-mono tracking-widest px-2.5 py-1 border border-red-400/30 text-red-400/70 hover:bg-red-400/10 rounded transition-colors disabled:opacity-50"
        >
          CANCEL
        </button>
      )}
      {!isExecuting && mission.status !== 'completed' && mission.status !== 'cancelled' && mission.status !== 'failed' && mission.status !== 'pending' && (
        <button
          disabled={busy}
          onClick={() => onUpdateMission(mission.id, { status: 'cancelled' })}
          className="text-[9px] font-mono tracking-widest px-2.5 py-1 border border-red-400/30 text-red-400/70 hover:bg-red-400/10 rounded transition-colors disabled:opacity-50"
        >
          CANCEL
        </button>
      )}
    </div>
  )
}
