import WidgetCard from '../dashboard/WidgetCard'
import EmptyState from '../EmptyState'
import MissionActionButtons from './MissionActionButtons'
import MissionExecutionStatus from './MissionExecutionStatus'
import type { MissionExecution, MissionType, ReleaseMission } from './types'
import { MISSION_STATUS_COLORS, formatDate, formatDateTime } from './format'

export interface MissionField {
  key: string
  label: string
  format?: (value: unknown) => string
}

interface Props {
  mission: ReleaseMission | undefined
  missionType: MissionType
  heading: string
  icon: string
  description: string
  accent: 'green' | 'cyan' | 'purple' | 'orange' | 'fuchsia' | 'yellow'
  targetMetricsFields: MissionField[]
  resultFields: MissionField[]
  execution: MissionExecution | null
  executionLoading: boolean
  onLoadExecution: (missionId: string) => void
  onUpdateMission: (missionId: string, patch: Record<string, unknown>) => void
  onDispatchMission: (missionId: string) => void
  onRetryMission: (missionId: string) => void
  onCancelMission: (missionId: string) => void
  updatingId: string | null
  canWrite: boolean
  children?: React.ReactNode
}

function displayValue(value: unknown, format?: (value: unknown) => string): string {
  if (value === null || value === undefined) return '—'
  if (format) return format(value)
  if (Array.isArray(value)) return value.length > 0 ? `${value.length} item(s)` : '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function FieldGrid({ title, fields, source, emptyHint }: { title: string; fields: MissionField[]; source: Record<string, unknown>; emptyHint?: string }) {
  if (fields.length === 0) return null
  return (
    <div>
      <div className="text-[9px] font-mono text-gray-600 tracking-[0.25em] mb-2">{title}</div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {fields.map(f => {
          const value = source[f.key]
          const empty = value === null || value === undefined
          return (
            <div key={f.key} className="border border-white/5 rounded p-2.5 bg-white/[0.015]">
              <div className="text-[9px] font-mono text-gray-600 tracking-widest">{f.label}</div>
              <div className={`text-[12px] font-mono mt-0.5 ${empty ? 'text-gray-600' : 'text-white/85'}`}>
                {displayValue(value, f.format)}
              </div>
            </div>
          )
        })}
      </div>
      {emptyHint && <p className="text-[9px] font-mono text-gray-600 mt-2 leading-relaxed">{emptyHint}</p>}
    </div>
  )
}

export default function MissionWorkspaceTab({
  mission, heading, icon, description, accent, targetMetricsFields, resultFields,
  execution, executionLoading, onLoadExecution,
  onUpdateMission, onDispatchMission, onRetryMission, onCancelMission, updatingId, canWrite, children,
}: Props) {
  if (!mission) {
    return (
      <WidgetCard title={heading} accent={accent}>
        <div className="p-5 space-y-3">
          <p className="text-[11px] font-mono text-gray-500 leading-relaxed">{description}</p>
          <EmptyState
            icon={icon}
            title="Mission not yet generated"
            message="This mission is created automatically the first time Release Intel analysis completes for this release."
            hint="Run analysis from the Overview tab."
            color={accent === 'orange' || accent === 'fuchsia' || accent === 'yellow' ? accent : 'green'}
          />
        </div>
      </WidgetCard>
    )
  }

  const busy = updatingId === mission.id
  const progress = Math.round(parseFloat(mission.progress_percentage) || 0)
  const statusStyle = MISSION_STATUS_COLORS[mission.status] ?? 'text-gray-500 border-gray-500/25'
  const params = (mission.mission_params ?? {}) as {
    last_dispatch?: { execution_id: string | null; estimated_duration_ms: number | null; workflow_version: string | null; correlation_id: string; dispatched_at: string }
    results?: Record<string, unknown>
  }
  const missingCredentials = (params.results?.missing_credentials as string[] | undefined) ?? []

  return (
    <div className="space-y-5">
      <WidgetCard title={heading} accent={accent}>
        <div className="p-5 space-y-5">
          <p className="text-[11px] font-mono text-gray-500 leading-relaxed">{description}</p>

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-3">
              <span className={`text-[9px] font-mono px-2 py-0.5 rounded border ${statusStyle}`}>{mission.status.toUpperCase()}</span>
              <span className="text-[12px] font-mono text-white/85">{mission.title}</span>
            </div>
            <MissionActionButtons
              mission={mission}
              onUpdateMission={onUpdateMission}
              onDispatchMission={onDispatchMission}
              onRetryMission={onRetryMission}
              onCancelMission={onCancelMission}
              busy={busy}
              canWrite={canWrite}
            />
          </div>

          <div className="space-y-1">
            <div className="h-1.5 bg-white/5 rounded overflow-hidden">
              <div className="h-full bg-[#00ff41]/60" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
            </div>
            <div className="flex justify-between text-[9px] font-mono text-gray-600">
              <span>{progress}% COMPLETE</span>
              <span>PRIORITY {mission.priority}{mission.due_date ? ` · DUE ${formatDate(mission.due_date)}` : ''}</span>
            </div>
          </div>

          <MissionExecutionStatus mission={mission} />

          <p className="text-[11px] font-mono text-white/70 leading-relaxed border-t border-white/5 pt-4">{mission.description}</p>

          <FieldGrid title="BASELINE (DATIAM-COMPUTED)" fields={targetMetricsFields} source={mission.target_metrics ?? {}} />

          <div>
            <div className="text-[9px] font-mono text-gray-600 tracking-[0.25em] mb-2">WORKFLOW RESULTS (n8n)</div>
            {!params.results ? (
              <EmptyState
                icon="◇"
                title="No results yet"
                message="Dispatch this mission to run its workflow — real results will appear here once it reports back. Nothing is fabricated in the meantime."
                color="cyan"
              />
            ) : (
              <>
                {missingCredentials.length > 0 && (
                  <div className="border border-orange-400/25 rounded p-3 bg-orange-400/5 mb-3">
                    <div className="text-[9px] font-mono text-orange-400/80 tracking-widest mb-1">WORKFLOW NOT FULLY CONNECTED</div>
                    <p className="text-[10px] font-mono text-orange-300/80 leading-relaxed">
                      Missing credentials: {missingCredentials.join(', ')}. The workflow ran and reported exactly which
                      integrations are required — the fields below are genuinely empty, not hidden.
                    </p>
                  </div>
                )}
                <FieldGrid title="" fields={resultFields} source={params.results} />
              </>
            )}
          </div>

          {params.last_dispatch && (
            <div>
              <div className="text-[9px] font-mono text-gray-600 tracking-[0.25em] mb-2">LAST DISPATCH</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[10px] font-mono">
                <div><span className="text-gray-600">EXECUTION ID</span><div className="text-white/70 break-all">{params.last_dispatch.execution_id ?? '—'}</div></div>
                <div><span className="text-gray-600">WORKFLOW VERSION</span><div className="text-white/70">{params.last_dispatch.workflow_version ?? '—'}</div></div>
                <div><span className="text-gray-600">EST. DURATION</span><div className="text-white/70">{params.last_dispatch.estimated_duration_ms ? `${Math.round(params.last_dispatch.estimated_duration_ms / 1000)}s` : '—'}</div></div>
                <div><span className="text-gray-600">DISPATCHED AT</span><div className="text-white/70">{formatDateTime(params.last_dispatch.dispatched_at)}</div></div>
              </div>
            </div>
          )}

          {children}
        </div>
      </WidgetCard>

      <WidgetCard title="EXECUTION HISTORY" accent="cyan" onRefresh={() => onLoadExecution(mission.id)}>
        <div className="p-5">
          {executionLoading && <div className="flex justify-center py-6"><span className="text-[10px] font-mono text-gray-500 tracking-widest">LOADING…</span></div>}
          {!executionLoading && !execution && (
            <button
              onClick={() => onLoadExecution(mission.id)}
              className="text-[10px] font-mono tracking-widest px-4 py-2 border border-[#00d4ff]/40 text-[#00d4ff] hover:bg-[#00d4ff]/10 rounded transition-colors"
            >
              ▾ LOAD EXECUTION HISTORY
            </button>
          )}
          {!executionLoading && execution && execution.execution_history.length === 0 && (
            <div className="text-[10px] font-mono text-gray-600 tracking-widest">NO DISPATCH RUNS RECORDED YET FOR THIS MISSION</div>
          )}
          {!executionLoading && execution && execution.execution_history.length > 0 && (
            <div className="space-y-2">
              {execution.queue_status && (
                <div className="text-[9px] font-mono text-gray-600 tracking-widest mb-2">QUEUE STATUS: <span className="text-white/70">{execution.queue_status.toUpperCase()}</span></div>
              )}
              {execution.execution_history.map(run => (
                <div key={run.id} className="border border-white/5 rounded p-2.5 bg-white/[0.015] flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-mono text-white/80">{run.workflow_name}</div>
                    {run.error_message && <div className="text-[9px] font-mono text-red-400/80 mt-0.5">{run.error_message}</div>}
                  </div>
                  <div className="text-right text-[9px] font-mono text-gray-600">
                    <div className={run.status === 'success' ? 'text-[#00ff41]' : run.status === 'failed' ? 'text-red-400' : 'text-white/60'}>{run.status.toUpperCase()}</div>
                    <div>{run.duration_ms !== null ? `${run.duration_ms}ms` : '—'} · {formatDateTime(run.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </WidgetCard>
    </div>
  )
}
