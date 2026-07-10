import WidgetCard from '../dashboard/WidgetCard'
import type { AutomationRun, ReleaseIntelAnalysis, ReleaseMission } from './types'
import { formatDateTime } from './format'

interface AutomationOverview {
  totalWorkflows: number
  activeWorkflows: number
  totalRuns: number
  successCount: number
  failedCount: number
  successRate: number
  queueHealth: 'healthy' | 'warning' | 'degraded' | 'overloaded'
}

interface RegistryEntry {
  id: string
  name: string
  is_active: boolean
  total_runs: number
  success_count: number
  failed_count: number
  last_run_status: string | null
  last_run_at: string | null
}

interface N8nHealth {
  status: 'healthy' | 'degraded' | 'unreachable' | 'not_configured'
  url: string | null
}

export interface MissionWorkflowHealth {
  name: string
  registered: boolean
  is_active: boolean
  health_status: string
  total_runs: number
  success_count: number
  failed_count: number
  avg_runtime_ms: number
  last_dispatch_at: string | null
  throughput_per_hour: number | null
}

export interface MissionsHealth {
  status: 'healthy' | 'degraded'
  workflows: MissionWorkflowHealth[]
  dead_letter_count: number
  queues: Array<{ name: string; status: string; waiting: number; active: number; failed: number }>
}

interface Props {
  analysis: ReleaseIntelAnalysis | null
  missions: ReleaseMission[]
  overview: AutomationOverview | null
  n8nHealth: N8nHealth | null
  registryEntry: RegistryEntry | null
  releaseRuns: AutomationRun[]
  missionsHealth: MissionsHealth | null
}

const HEALTH_COLOR: Record<string, string> = {
  healthy: 'text-[#00ff41]',
  warning: 'text-yellow-400',
  degraded: 'text-red-400',
  overloaded: 'text-red-400',
  unreachable: 'text-red-400',
  not_configured: 'text-gray-500',
}

function Row({ label, status, detail }: { label: string; status: string; detail?: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[#111] last:border-0">
      <span className="text-[10px] font-mono text-gray-500 tracking-widest">{label}</span>
      <div className="text-right">
        <div className={`text-[10px] font-mono ${HEALTH_COLOR[status.toLowerCase()] ?? 'text-white/70'}`}>{status}</div>
        {detail && <div className="text-[9px] font-mono text-gray-600">{detail}</div>}
      </div>
    </div>
  )
}

export default function AutomationStatusPanel({ analysis, missions, overview, n8nHealth, registryEntry, releaseRuns, missionsHealth }: Props) {
  const triggerFired = Boolean(analysis)
  const dispatchEvents = ['release.intel.analyzed', 'release.intel.brief.generated', 'release.intel.mission.created', 'release.intel.failed']
  const runsByEvent = new Map(releaseRuns.map(r => [r.payload?.event, r]))
  const anyMissionExecuting = missions.some(m => ['queued', 'running', 'waiting', 'retrying'].includes(m.status))
  const anyMissionDispatched = missions.some(m => m.status !== 'pending')

  return (
    <WidgetCard title="AUTOMATION STATUS" accent="cyan">
      <div className="p-5 space-y-1">
        <Row
          label="RELEASE TRIGGER"
          status={triggerFired ? 'FIRED' : 'NOT YET FIRED'}
          detail="Fires automatically on release create (inline or via BullMQ, depending on REDIS_URL)"
        />
        <Row
          label="QUEUE"
          status={overview ? overview.queueHealth.toUpperCase() : '—'}
          detail="System-wide automation queue health (automation_runs table)"
        />
        <Row
          label="WORKER"
          status={missions.length > 0 ? 'CONFIRMED' : 'UNCONFIRMED'}
          detail="Inferred from mission creation — no direct worker-process introspection from the frontend"
        />
        <Row
          label="WEBHOOK (n8n)"
          status={n8nHealth ? n8nHealth.status.replace('_', ' ').toUpperCase() : '—'}
          detail={n8nHealth?.url ?? 'N8N_WEBHOOK_BASE_URL not set'}
        />
        <Row
          label="DISPATCH (workflow registry)"
          status={registryEntry ? (registryEntry.is_active ? 'ACTIVE' : 'INACTIVE') : 'NOT SEEDED'}
          detail={registryEntry ? `${registryEntry.success_count}/${registryEntry.total_runs} succeeded · last: ${registryEntry.last_run_status ?? '—'}` : undefined}
        />
        <Row
          label="MISSION CREATION"
          status={missions.length > 0 ? 'CREATED' : 'PENDING'}
          detail={missions.length > 0 ? `${missions.length} missions` : undefined}
        />
        <Row
          label="EXECUTION"
          status={anyMissionExecuting ? 'IN PROGRESS' : anyMissionDispatched ? 'DISPATCHED' : missions.length > 0 ? 'PENDING DISPATCH' : 'NOT CONNECTED'}
          detail="Mission Dispatcher: Mission → BullMQ → Automation Registry → n8n → Executive Brief refresh"
        />

        <div className="pt-3">
          <div className="text-[9px] font-mono text-gray-600 tracking-widest mb-2">RECENT DISPATCH RUNS FOR THIS RELEASE</div>
          {dispatchEvents.map(event => {
            const run = runsByEvent.get(event)
            return (
              <div key={event} className="flex items-center justify-between text-[9px] font-mono py-1">
                <span className="text-gray-500">{event}</span>
                {run ? (
                  <span className={run.status === 'success' ? 'text-[#00ff41]' : 'text-red-400'}>
                    {run.status.toUpperCase()} · {run.duration_ms ?? '—'}ms · {formatDateTime(run.created_at)}
                  </span>
                ) : (
                  <span className="text-gray-700">no run recorded</span>
                )}
              </div>
            )
          })}
        </div>

        {missionsHealth && (
          <div className="pt-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[9px] font-mono text-gray-600 tracking-widest">MISSION WORKFLOWS (SYSTEM-WIDE)</div>
              {missionsHealth.dead_letter_count > 0 && (
                <span className="text-[9px] font-mono text-red-400">{missionsHealth.dead_letter_count} DEAD-LETTERED</span>
              )}
            </div>
            {missionsHealth.workflows.map(wf => (
              <div key={wf.name} className="flex items-center justify-between text-[9px] font-mono py-1">
                <span className="text-gray-500">{wf.name}</span>
                <span className={wf.health_status === 'healthy' ? 'text-[#00ff41]' : wf.health_status === 'degraded' ? 'text-red-400' : 'text-gray-600'}>
                  {wf.registered ? wf.health_status.toUpperCase() : 'NOT SEEDED'} · {wf.success_count}/{wf.total_runs} · avg {wf.avg_runtime_ms}ms
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </WidgetCard>
  )
}
