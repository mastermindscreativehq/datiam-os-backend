import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { automation, isCriticalError } from '../api/client'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import Modal, { Field, Input, Textarea } from '../components/Modal'
import Toast from '../components/Toast'
import ConfirmModal from '../components/ConfirmModal'
import { useAuthStore } from '../store/authStore'

// ── Helpers ──────────────────────────────────────────────────────────────────

const HEALTH_COLOR: Record<string, string> = {
  healthy:    'text-[#00ff41] border-[#00ff41]/30 bg-[#00ff41]/5',
  warning:    'text-yellow-400 border-yellow-400/30 bg-yellow-400/5',
  degraded:   'text-red-400 border-red-400/30 bg-red-400/5',
  overloaded: 'text-orange-400 border-orange-400/30 bg-orange-400/5',
}

const STATUS_COLOR: Record<string, string> = {
  success:  'text-[#00ff41]',
  failed:   'text-red-400',
  running:  'text-[#00d4ff]',
}

const EVENT_BADGE: Record<string, string> = {
  'release.created':           'bg-[#00ff41]/10 text-[#00ff41]',
  'release.updated':           'bg-[#00d4ff]/10 text-[#00d4ff]',
  'release.published':         'bg-purple-500/10 text-purple-400',
  'release.campaign.started':  'bg-orange-500/10 text-orange-400',
  'release.campaign.completed':'bg-yellow-500/10 text-yellow-400',
}

function fmtDate(d?: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function fmtAge(d?: string | null) {
  if (!d) return '—'
  const ms = Date.now() - new Date(d).getTime()
  if (ms < 60_000)  return `${Math.round(ms / 1000)}s ago`
  if (ms < 3600_000) return `${Math.round(ms / 60_000)}m ago`
  if (ms < 86400_000) return `${Math.round(ms / 3600_000)}h ago`
  return `${Math.round(ms / 86400_000)}d ago`
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color = 'green' }: { label: string; value: string | number; sub?: string; color?: string }) {
  const colors: Record<string, string> = {
    green:  'text-[#00ff41] border-[#00ff41]/15',
    cyan:   'text-[#00d4ff] border-[#00d4ff]/15',
    orange: 'text-orange-400 border-orange-400/15',
    red:    'text-red-400 border-red-400/15',
    purple: 'text-purple-400 border-purple-400/15',
  }
  return (
    <div className={`border rounded p-4 ${colors[color] ?? colors.green}`}>
      <div className="text-[10px] font-mono tracking-widest text-gray-500 mb-1">{label}</div>
      <div className="text-2xl font-mono font-bold">{value}</div>
      {sub && <div className="text-[10px] font-mono tracking-widest text-gray-600 mt-1">{sub}</div>}
    </div>
  )
}

// ── Workflow card ─────────────────────────────────────────────────────────────

function WorkflowCard({
  wf,
  onTrigger,
  onToggle,
  onDelete,
  canWrite,
  canDelete,
}: {
  wf: any
  onTrigger: (wf: any) => void
  onToggle: (wf: any) => void
  onDelete: (wf: any) => void
  canWrite: boolean
  canDelete: boolean
}) {
  const sr = wf.total_runs > 0 ? Math.round((wf.success_count / wf.total_runs) * 100) : null

  return (
    <div className={`border rounded p-4 transition-colors ${wf.is_active ? 'border-[#00ff41]/15 hover:border-[#00ff41]/30' : 'border-white/5 opacity-50'}`}>
      {/* Header row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-1.5 h-1.5 rounded-full ${wf.is_active ? 'bg-[#00ff41] animate-pulse' : 'bg-gray-600'}`} />
            <span className="text-[11px] font-mono font-bold text-gray-200 truncate">{wf.name}</span>
          </div>
          {wf.description && (
            <p className="text-[10px] font-mono text-gray-600 ml-3.5 truncate">{wf.description}</p>
          )}
        </div>
        <div className={`text-[9px] font-mono tracking-widest px-2 py-0.5 border rounded ml-2 shrink-0 ${wf.last_run_status ? (STATUS_COLOR[wf.last_run_status] ?? 'text-gray-500') + ' border-current/25' : 'text-gray-600 border-white/5'}`}>
          {wf.last_run_status?.toUpperCase() ?? 'NEVER RUN'}
        </div>
      </div>

      {/* Event triggers */}
      <div className="flex flex-wrap gap-1 mb-3">
        {(wf.event_triggers ?? []).map((ev: string) => (
          <span key={ev} className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${EVENT_BADGE[ev] ?? 'bg-gray-800 text-gray-400'}`}>
            {ev}
          </span>
        ))}
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 mb-3 text-[10px] font-mono text-gray-500">
        <span>RUNS · <span className="text-gray-300">{wf.total_runs}</span></span>
        {sr !== null && (
          <span>SR · <span className={sr >= 80 ? 'text-[#00ff41]' : sr >= 50 ? 'text-yellow-400' : 'text-red-400'}>{sr}%</span></span>
        )}
        <span>LAST · <span className="text-gray-400">{fmtAge(wf.last_run_at)}</span></span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-white/5">
        {canWrite && wf.is_active && (
          <button
            onClick={() => onTrigger(wf)}
            className="text-[9px] font-mono tracking-widest px-3 py-1 border border-[#00d4ff]/30 text-[#00d4ff] hover:bg-[#00d4ff]/10 rounded transition-colors"
          >
            ▶ TRIGGER
          </button>
        )}
        {canWrite && (
          <button
            onClick={() => onToggle(wf)}
            className="text-[9px] font-mono tracking-widest px-3 py-1 border border-white/10 text-gray-500 hover:text-gray-300 rounded transition-colors"
          >
            {wf.is_active ? 'PAUSE' : 'ACTIVATE'}
          </button>
        )}
        {canDelete && (
          <button
            onClick={() => onDelete(wf)}
            className="ml-auto text-[9px] font-mono tracking-widest px-2 py-1 text-red-500/50 hover:text-red-400 transition-colors"
          >
            DEL
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

const EMPTY_NEW_WF = { name: '', description: '', event_triggers: '', webhook_path: '/webhook/release-intelligence', n8n_workflow_id: '' }

export default function AutomationDashboard() {
  const { user } = useAuthStore()
  const canWrite  = ['owner', 'admin', 'editor', 'team'].includes(user?.role ?? '')
  const canDelete = ['owner', 'admin'].includes(user?.role ?? '')
  const qc = useQueryClient()

  const [toast,       setToast]       = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [triggerWf,   setTriggerWf]   = useState<any>(null)
  const [triggerEvent, setTriggerEvent] = useState('')
  const [triggerData, setTriggerData] = useState('')
  const [deleteWf,    setDeleteWf]    = useState<any>(null)
  const [newWfOpen,   setNewWfOpen]   = useState(false)
  const [newWfForm,   setNewWfForm]   = useState(EMPTY_NEW_WF)
  const [activeTab,   setActiveTab]   = useState<'registry' | 'history'>('registry')

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => setToast({ message, type }), [])

  // ── Queries ──────────────────────────────────────────────────────────────────
  const {
    data: statsData,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['automation-stats'],
    queryFn: async () => {
      try { return (await automation.stats()).data }
      catch (err: any) { if (isCriticalError(err)) throw err; return null }
    },
    refetchInterval: 30_000,
  })

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['automation-history'],
    queryFn: async () => {
      try { return (await automation.history({ limit: 30 })).data }
      catch { return null }
    },
    refetchInterval: 30_000,
  })

  // ── Mutations ────────────────────────────────────────────────────────────────
  const triggerMutation = useMutation({
    mutationFn: ({ wfId, event, data }: { wfId: string; event: string; data?: Record<string, unknown> }) =>
      automation.registry.trigger(wfId, { event, data }),
    onSuccess: () => {
      showToast('Workflow triggered successfully')
      qc.invalidateQueries({ queryKey: ['automation-stats'] })
      qc.invalidateQueries({ queryKey: ['automation-history'] })
      setTriggerWf(null)
    },
    onError: (err: any) => showToast(err.response?.data?.message ?? 'Trigger failed', 'error'),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      automation.registry.update(id, { is_active }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['automation-stats'] })
      showToast('Workflow updated')
    },
    onError: (err: any) => showToast(err.response?.data?.message ?? 'Update failed', 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => automation.registry.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['automation-stats'] })
      showToast('Workflow deleted')
      setDeleteWf(null)
    },
    onError: (err: any) => showToast(err.response?.data?.message ?? 'Delete failed', 'error'),
  })

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => automation.registry.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['automation-stats'] })
      showToast('Workflow registered')
      setNewWfOpen(false)
      setNewWfForm(EMPTY_NEW_WF)
    },
    onError: (err: any) => showToast(err.response?.data?.message ?? 'Create failed', 'error'),
  })

  const retryMutation = useMutation({
    mutationFn: (runId: string) => automation.runs.retry(runId),
    onSuccess: () => {
      showToast('Retry triggered')
      qc.invalidateQueries({ queryKey: ['automation-history'] })
      qc.invalidateQueries({ queryKey: ['automation-stats'] })
    },
    onError: (err: any) => showToast(err.response?.data?.message ?? 'Retry failed', 'error'),
  })

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleTrigger = () => {
    if (!triggerWf || !triggerEvent.trim()) return
    let parsedData: Record<string, unknown> | undefined
    if (triggerData.trim()) {
      try { parsedData = JSON.parse(triggerData) }
      catch { showToast('Data must be valid JSON', 'error'); return }
    }
    triggerMutation.mutate({ wfId: triggerWf.id, event: triggerEvent.trim(), data: parsedData })
  }

  const handleCreate = () => {
    const triggers = newWfForm.event_triggers.split(',').map(s => s.trim()).filter(Boolean)
    if (!newWfForm.name.trim()) { showToast('Name is required', 'error'); return }
    if (!triggers.length)        { showToast('At least one event trigger is required', 'error'); return }
    createMutation.mutate({
      name: newWfForm.name.trim(),
      description: newWfForm.description.trim() || undefined,
      event_triggers: triggers,
      webhook_path: newWfForm.webhook_path.trim() || undefined,
      n8n_workflow_id: newWfForm.n8n_workflow_id.trim() || undefined,
    })
  }

  // ── Data ──────────────────────────────────────────────────────────────────────
  const stats     = statsData?.overview
  const workflows = statsData?.workflows ?? []
  const lastRun   = statsData?.lastRun
  const runs      = historyData?.runs ?? []

  if (statsLoading) {
    return <div className="flex justify-center py-24"><LoadingSpinner text="LOADING AUTOMATION LAYER..." /></div>
  }

  if (statsError) {
    return <ErrorMessage message="Failed to load automation data" onRetry={() => refetchStats()} />
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-1 h-6 bg-[#00d4ff] rounded-full" />
            <h1 className="text-xl font-bold font-mono text-[#00d4ff] tracking-[0.2em]">AUTOMATION LAYER</h1>
          </div>
          <p className="text-gray-600 text-[11px] font-mono tracking-[0.2em] ml-4">N8N WORKFLOW ORCHESTRATION · DATIAM OS</p>
        </div>
        {canWrite && (
          <button
            onClick={() => setNewWfOpen(true)}
            className="text-[10px] font-mono tracking-widest px-4 py-1.5 border border-[#00d4ff]/40 text-[#00d4ff] hover:bg-[#00d4ff]/10 rounded transition-colors"
          >
            + REGISTER WORKFLOW
          </button>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <StatCard label="TOTAL WORKFLOWS"  value={stats?.totalWorkflows  ?? 0} color="cyan"   />
        <StatCard label="ACTIVE"           value={stats?.activeWorkflows ?? 0} color="green"  />
        <StatCard label="SUCCESS RATE"     value={`${stats?.successRate ?? 100}%`} sub="ALL TIME" color={stats?.successRate ?? 100 >= 80 ? 'green' : 'orange'} />
        <StatCard label="FAILED TODAY"     value={statsData?.today?.failedCount ?? 0}   color={statsData?.today?.failedCount > 0 ? 'red' : 'green'} />
        <StatCard label="TOTAL RUNS"       value={stats?.totalRuns  ?? 0} color="cyan"   />
        <StatCard label="RUNNING NOW"      value={stats?.runningCount ?? 0} sub={stats?.runningCount > 0 ? 'IN FLIGHT' : 'IDLE'} color={stats?.runningCount > 0 ? 'cyan' : 'green'} />
      </div>

      {/* Queue health + last run */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Queue health */}
        <div className="border border-white/5 rounded p-4">
          <div className="text-[10px] font-mono tracking-widest text-gray-500 mb-3">QUEUE HEALTH</div>
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 border rounded text-[11px] font-mono tracking-widest ${HEALTH_COLOR[stats?.queueHealth ?? 'healthy']}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            {(stats?.queueHealth ?? 'HEALTHY').toUpperCase()}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3 text-[10px] font-mono">
            <div>
              <div className="text-gray-600 tracking-widest">SUCCESS</div>
              <div className="text-[#00ff41] font-bold text-sm">{stats?.successCount ?? 0}</div>
            </div>
            <div>
              <div className="text-gray-600 tracking-widest">FAILED</div>
              <div className="text-red-400 font-bold text-sm">{stats?.failedCount ?? 0}</div>
            </div>
            <div>
              <div className="text-gray-600 tracking-widest">RUNNING</div>
              <div className="text-[#00d4ff] font-bold text-sm">{stats?.runningCount ?? 0}</div>
            </div>
          </div>
        </div>

        {/* Last run */}
        <div className="border border-white/5 rounded p-4">
          <div className="text-[10px] font-mono tracking-widest text-gray-500 mb-3">LAST EXECUTION</div>
          {lastRun ? (
            <div className="space-y-2">
              <div className="text-[11px] font-mono text-gray-200 truncate">{lastRun.workflow_name}</div>
              <div className={`text-[10px] font-mono ${STATUS_COLOR[lastRun.status] ?? 'text-gray-500'}`}>
                {lastRun.status?.toUpperCase()}
              </div>
              <div className="text-[10px] font-mono text-gray-600">{fmtDate(lastRun.created_at)}</div>
              {lastRun.triggered_by_event && (
                <div className="text-[9px] font-mono text-gray-600">
                  EVENT · {lastRun.triggered_by_event}
                </div>
              )}
            </div>
          ) : (
            <div className="text-[10px] font-mono text-gray-600">No executions yet</div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-white/5 pb-0">
        {(['registry', 'history'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`text-[10px] font-mono tracking-widest pb-3 transition-colors ${activeTab === tab ? 'text-[#00d4ff] border-b border-[#00d4ff]' : 'text-gray-600 hover:text-gray-400'}`}
          >
            {tab === 'registry' ? `WORKFLOW REGISTRY (${workflows.length})` : `EXECUTION HISTORY`}
          </button>
        ))}
      </div>

      {/* Registry tab */}
      {activeTab === 'registry' && (
        <div className="space-y-4">
          {workflows.length === 0 ? (
            <div className="text-center py-12 text-gray-600 text-[11px] font-mono tracking-widest">
              NO WORKFLOWS REGISTERED
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {workflows.map((wf: any) => (
                <WorkflowCard
                  key={wf.id}
                  wf={wf}
                  canWrite={canWrite}
                  canDelete={canDelete}
                  onTrigger={(w) => { setTriggerWf(w); setTriggerEvent(w.event_triggers?.[0] ?? '') }}
                  onToggle={(w) => toggleMutation.mutate({ id: w.id, is_active: !w.is_active })}
                  onDelete={(w) => setDeleteWf(w)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* History tab */}
      {activeTab === 'history' && (
        <div className="space-y-2">
          {historyLoading ? (
            <div className="flex justify-center py-8"><LoadingSpinner text="LOADING HISTORY..." /></div>
          ) : runs.length === 0 ? (
            <div className="text-center py-12 text-gray-600 text-[11px] font-mono tracking-widest">
              NO EXECUTION HISTORY
            </div>
          ) : (
            <div className="border border-white/5 rounded overflow-hidden">
              <table className="w-full text-[10px] font-mono">
                <thead>
                  <tr className="border-b border-white/5 text-gray-600 tracking-widest">
                    <th className="text-left px-4 py-2">WORKFLOW</th>
                    <th className="text-left px-4 py-2">EVENT</th>
                    <th className="text-left px-4 py-2">STATUS</th>
                    <th className="text-left px-4 py-2">SOURCE</th>
                    <th className="text-left px-4 py-2">RETRIES</th>
                    <th className="text-left px-4 py-2">DURATION</th>
                    <th className="text-left px-4 py-2">TIME</th>
                    {canWrite && <th className="px-4 py-2" />}
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run: any) => (
                    <tr key={run.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-2.5 text-gray-300 max-w-[160px] truncate">{run.workflow_name}</td>
                      <td className="px-4 py-2.5">
                        {run.triggered_by_event
                          ? <span className={`px-1.5 py-0.5 rounded ${EVENT_BADGE[run.triggered_by_event] ?? 'bg-gray-800 text-gray-400'}`}>{run.triggered_by_event}</span>
                          : <span className="text-gray-600">—</span>}
                      </td>
                      <td className={`px-4 py-2.5 font-bold ${STATUS_COLOR[run.status] ?? 'text-gray-500'}`}>{run.status?.toUpperCase()}</td>
                      <td className="px-4 py-2.5 text-gray-500 uppercase">{run.source}</td>
                      <td className="px-4 py-2.5 text-gray-500">{run.retry_count > 0 ? run.retry_count : '—'}</td>
                      <td className="px-4 py-2.5 text-gray-500">{run.duration_ms ? `${run.duration_ms}ms` : '—'}</td>
                      <td className="px-4 py-2.5 text-gray-600">{fmtAge(run.created_at)}</td>
                      {canWrite && (
                        <td className="px-4 py-2.5">
                          {run.status === 'failed' && (
                            <button
                              onClick={() => retryMutation.mutate(run.id)}
                              disabled={retryMutation.isPending}
                              className="text-[9px] font-mono tracking-widest px-2 py-1 border border-[#00d4ff]/20 text-[#00d4ff]/60 hover:text-[#00d4ff] hover:border-[#00d4ff]/40 rounded transition-colors disabled:opacity-30"
                            >
                              RETRY
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Failure log section */}
      {runs.filter((r: any) => r.status === 'failed').length > 0 && (
        <div className="border border-red-500/10 rounded p-4">
          <div className="text-[10px] font-mono tracking-widest text-red-400/60 mb-3">RECENT FAILURES</div>
          <div className="space-y-2">
            {runs.filter((r: any) => r.status === 'failed').slice(0, 5).map((run: any) => (
              <div key={run.id} className="flex items-center gap-3 text-[10px] font-mono text-red-400/80">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                <span className="text-gray-300 truncate flex-1">{run.workflow_name}</span>
                {run.error_message && <span className="text-red-400/60 truncate max-w-[200px]">{run.error_message}</span>}
                <span className="text-gray-600 shrink-0">{fmtAge(run.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Release Intelligence event hook info */}
      <div className="border border-[#00ff41]/10 rounded p-4">
        <div className="text-[10px] font-mono tracking-widest text-[#00ff41]/60 mb-3">RELEASE INTELLIGENCE WEBHOOK EVENTS</div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {['release.created', 'release.updated', 'release.published', 'release.campaign.started', 'release.campaign.completed'].map(ev => (
            <div key={ev} className={`flex items-center gap-2 px-3 py-2 rounded text-[10px] font-mono ${EVENT_BADGE[ev] ?? 'bg-gray-800 text-gray-400'}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
              {ev}
            </div>
          ))}
        </div>
        <p className="text-[10px] font-mono text-gray-600 mt-2">
          These events fire automatically when Release Intelligence operations complete. Set N8N_WEBHOOK_BASE_URL to connect.
        </p>
      </div>

      {/* ── Modals ── */}

      {/* Trigger modal */}
      <Modal
        isOpen={!!triggerWf}
        onClose={() => !triggerMutation.isPending && setTriggerWf(null)}
        title="TRIGGER WORKFLOW"
        subtitle={triggerWf?.name?.toUpperCase()}
        color="cyan"
        footer={
          <>
            <button onClick={() => setTriggerWf(null)} disabled={triggerMutation.isPending} className="text-[10px] font-mono tracking-widest px-4 py-2 border border-white/10 text-gray-500 hover:text-gray-400 rounded disabled:opacity-50">CANCEL</button>
            <button onClick={handleTrigger} disabled={triggerMutation.isPending || !triggerEvent.trim()} className="text-[10px] font-mono tracking-widest px-5 py-2 border border-[#00d4ff]/40 text-[#00d4ff] hover:bg-[#00d4ff]/10 rounded disabled:opacity-50">
              {triggerMutation.isPending ? 'FIRING...' : '▶ FIRE'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Event" required>
            <Input value={triggerEvent} onChange={e => setTriggerEvent(e.target.value)} placeholder="e.g. release.created" />
          </Field>
          <Field label="Payload (JSON)" hint="Optional event data">
            <Textarea value={triggerData} onChange={e => setTriggerData(e.target.value)} placeholder='{"release": {"id": "...", "title": "..."}}' rows={4} className="font-mono text-[11px]" />
          </Field>
        </div>
      </Modal>

      {/* Register new workflow modal */}
      <Modal
        isOpen={newWfOpen}
        onClose={() => !createMutation.isPending && setNewWfOpen(false)}
        title="REGISTER WORKFLOW"
        subtitle="ADD N8N WORKFLOW TO REGISTRY"
        color="cyan"
        footer={
          <>
            <button onClick={() => setNewWfOpen(false)} disabled={createMutation.isPending} className="text-[10px] font-mono tracking-widest px-4 py-2 border border-white/10 text-gray-500 hover:text-gray-400 rounded disabled:opacity-50">CANCEL</button>
            <button onClick={handleCreate} disabled={createMutation.isPending} className="text-[10px] font-mono tracking-widest px-5 py-2 border border-[#00d4ff]/40 text-[#00d4ff] hover:bg-[#00d4ff]/10 rounded disabled:opacity-50">
              {createMutation.isPending ? 'SAVING...' : 'REGISTER'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Workflow Name" required>
            <Input
              value={newWfForm.name}
              onChange={e => setNewWfForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. release-campaign-started"
              autoFocus
            />
          </Field>
          <Field label="Description">
            <Input
              value={newWfForm.description}
              onChange={e => setNewWfForm(f => ({ ...f, description: e.target.value }))}
              placeholder="What does this workflow do?"
            />
          </Field>
          <Field label="Event Triggers (comma-separated)" required>
            <Input
              value={newWfForm.event_triggers}
              onChange={e => setNewWfForm(f => ({ ...f, event_triggers: e.target.value }))}
              placeholder="release.created, release.published"
            />
          </Field>
          <Field label="n8n Webhook Path">
            <Input
              value={newWfForm.webhook_path}
              onChange={e => setNewWfForm(f => ({ ...f, webhook_path: e.target.value }))}
              placeholder="/webhook/my-workflow"
            />
          </Field>
          <Field label="n8n Workflow ID">
            <Input
              value={newWfForm.n8n_workflow_id}
              onChange={e => setNewWfForm(f => ({ ...f, n8n_workflow_id: e.target.value }))}
              placeholder="Optional — n8n internal workflow ID"
            />
          </Field>
        </div>
      </Modal>

      {/* Delete confirm */}
      <ConfirmModal
        isOpen={!!deleteWf}
        title="DELETE WORKFLOW"
        message={`Remove "${deleteWf?.name}" from the registry? This cannot be undone.`}
        onConfirm={() => deleteWf && deleteMutation.mutate(deleteWf.id)}
        onCancel={() => setDeleteWf(null)}
        loading={deleteMutation.isPending}
      />

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  )
}
