import { useState } from 'react'
import WidgetCard from '../dashboard/WidgetCard'
import EmptyState from '../EmptyState'
import MissionActionButtons from './MissionActionButtons'
import MissionExecutionStatus from './MissionExecutionStatus'
import type { ReleaseMission, MissionType } from './types'
import { MISSION_TYPE_LABELS, MISSION_STATUS_COLORS, formatDateTime, formatDate } from './format'

interface Props {
  missions: ReleaseMission[]
  onUpdateMission: (missionId: string, patch: Record<string, unknown>) => void
  onDispatchMission: (missionId: string) => void
  onRetryMission: (missionId: string) => void
  onCancelMission: (missionId: string) => void
  updatingId: string | null
  canWrite: boolean
}

const MISSION_ORDER: MissionType[] = ['playlist', 'sync', 'fan_growth', 'content', 'outreach', 'analytics']

function MissionCard({ mission, onUpdateMission, onDispatchMission, onRetryMission, onCancelMission, updatingId, canWrite }: {
  mission: ReleaseMission
  onUpdateMission: Props['onUpdateMission']
  onDispatchMission: Props['onDispatchMission']
  onRetryMission: Props['onRetryMission']
  onCancelMission: Props['onCancelMission']
  updatingId: string | null
  canWrite: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const busy = updatingId === mission.id
  const progress = Math.round(parseFloat(mission.progress_percentage) || 0)
  const statusStyle = MISSION_STATUS_COLORS[mission.status] ?? 'text-gray-500 border-gray-500/25'

  return (
    <div className="border border-[#00ff41]/10 rounded-lg bg-[#0a0a0a] p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[9px] font-mono text-[#00ff41]/50 tracking-widest">{MISSION_TYPE_LABELS[mission.mission_type]}</span>
        <span className={`text-[9px] font-mono px-2 py-0.5 rounded border ${statusStyle}`}>{mission.status.toUpperCase()}</span>
      </div>

      <div className="text-[12px] font-mono text-white/85">{mission.title}</div>

      <div className="space-y-1">
        <div className="h-1.5 bg-white/5 rounded overflow-hidden">
          <div className="h-full bg-[#00ff41]/60" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
        </div>
        <div className="flex justify-between text-[9px] font-mono text-gray-600">
          <span>{progress}% COMPLETE</span>
          <span>PRIORITY {mission.priority}</span>
        </div>
      </div>

      <MissionExecutionStatus mission={mission} />

      <div className="flex justify-between text-[9px] font-mono text-gray-600">
        <span>CREATED {formatDate(mission.created_at)}</span>
        <span>UPDATED {formatDate(mission.updated_at)}</span>
      </div>

      {expanded && (
        <div className="pt-2 border-t border-white/5 space-y-2">
          <p className="text-[10px] font-mono text-white/70 leading-relaxed">{mission.description}</p>
          {mission.due_date && <div className="text-[9px] font-mono text-gray-500">DUE {formatDate(mission.due_date)}</div>}
          {Object.keys(mission.target_metrics ?? {}).length > 0 && (
            <div>
              <div className="text-[9px] font-mono text-gray-600 tracking-widest mb-1">TARGET METRICS</div>
              <pre className="text-[9px] font-mono text-white/60 bg-white/[0.02] rounded p-2 overflow-x-auto">
                {JSON.stringify(mission.target_metrics, null, 2)}
              </pre>
            </div>
          )}
          {Object.keys(mission.mission_params ?? {}).length > 0 && (
            <div>
              <div className="text-[9px] font-mono text-gray-600 tracking-widest mb-1">EXECUTION RESULTS</div>
              <pre className="text-[9px] font-mono text-white/60 bg-white/[0.02] rounded p-2 overflow-x-auto">
                {JSON.stringify(mission.mission_params, null, 2)}
              </pre>
            </div>
          )}
          <div className="text-[9px] font-mono text-gray-600">
            {mission.completed_at ? `COMPLETED ${formatDateTime(mission.completed_at)}` : 'NOT YET COMPLETED'}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <MissionActionButtons
          mission={mission}
          onUpdateMission={onUpdateMission}
          onDispatchMission={onDispatchMission}
          onRetryMission={onRetryMission}
          onCancelMission={onCancelMission}
          busy={busy}
          canWrite={canWrite}
        />
        <button
          onClick={() => setExpanded(v => !v)}
          className="text-[9px] font-mono tracking-widest text-gray-500 hover:text-gray-300 transition-colors"
        >
          {expanded ? 'COLLAPSE ▲' : 'EXPAND ▼'}
        </button>
      </div>
    </div>
  )
}

export default function MissionBoard({ missions, onUpdateMission, onDispatchMission, onRetryMission, onCancelMission, updatingId, canWrite }: Props) {
  if (missions.length === 0) {
    return (
      <WidgetCard title="MISSION BOARD" accent="green">
        <div className="p-2">
          <EmptyState
            icon="⬡"
            title="No missions yet"
            message="Missions are auto-generated the first time analysis completes for this release."
            color="green"
          />
        </div>
      </WidgetCard>
    )
  }

  const byType = new Map(missions.map(m => [m.mission_type, m]))

  return (
    <WidgetCard title="MISSION BOARD" accent="green">
      <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MISSION_ORDER.map(type => {
          const mission = byType.get(type)
          if (!mission) {
            return (
              <div key={type} className="border border-dashed border-gray-800 rounded-lg p-4 flex items-center justify-center text-center">
                <div className="text-[10px] font-mono text-gray-600 tracking-widest">
                  {MISSION_TYPE_LABELS[type]}<br />NOT YET GENERATED
                </div>
              </div>
            )
          }
          return (
            <MissionCard
              key={mission.id}
              mission={mission}
              onUpdateMission={onUpdateMission}
              onDispatchMission={onDispatchMission}
              onRetryMission={onRetryMission}
              onCancelMission={onCancelMission}
              updatingId={updatingId}
              canWrite={canWrite}
            />
          )
        })}
      </div>
    </WidgetCard>
  )
}
