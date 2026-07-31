import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { automation, isCriticalError } from '../api/client'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import Modal, { Field, Input, Textarea } from '../components/Modal'
import Toast from '../components/Toast'
import ConfirmModal from '../components/ConfirmModal'
import { useAuthStore } from '../store/authStore'

// ── Helpers ───────────────────────────────────────────────────────────────────

const HEALTH_COLOR: Record<string, string> = {
  healthy:        'text-[#00ff41] border-[#00ff41]/30 bg-[#00ff41]/5',
  warning:        'text-yellow-400 border-yellow-400/30 bg-yellow-400/5',
  degraded:       'text-red-400 border-red-400/30 bg-red-400/5',
  overloaded:     'text-orange-400 border-orange-400/30 bg-orange-400/5',
  not_configured: 'text-gray-500 border-gray-500/30 bg-gray-500/5',
  unreachable:    'text-red-400 border-red-400/30 bg-red-400/5',
}

const N8N_STATUS_COLOR: Record<string, string> = {
  healthy:        'text-[#00ff41]',
  degraded:       'text-yellow-400',
  unreachable:    'text-red-400',
  not_configured: 'text-gray-500',
}

const STATUS_COLOR: Record<string, string> = {
  success: 'text-[#00ff41]',
  failed:  'text-red-400',
  running: 'text-[#00d4ff]',
}

const ALL_CATALOG_EVENTS = [
  'artist.created', 'artist.updated',
  'song.created', 'song.updated',
  'catalog.release.created', 'catalog.release.updated',
  'asset.uploaded', 'credit.updated', 'document.uploaded',
]
const ALL_RELEASE_EVENTS = [
  'release.created', 'release.updated', 'release.published',
  'release.campaign.started', 'release.campaign.completed',
]
const ALL_EVENTS = [...ALL_CATALOG_EVENTS, ...ALL_RELEASE_EVENTS]

const EVENT_BADGE: Record<string, string> = {
  'artist.created':            'bg-purple-500/10 text-purple-400',
  'artist.updated':            'bg-purple-400/10 text-purple-300',
  'song.created':              'bg-[#00ff41]/10 text-[#00ff41]',
  'song.updated':              'bg-[#00ff41]/8 text-[#00ff41]/70',
  'catalog.release.created':   'bg-[#00d4ff]/10 text-[#00d4ff]',
  'catalog.release.updated':   'bg-[#00d4ff]/8 text-[#00d4ff]/70',
  'asset.uploaded':            'bg-orange-500/10 text-orange-400',
  'credit.updated':            'bg-yellow-500/10 text-yellow-400',
  'document.uploaded':         'bg-pink-500/10 text-pink-400',
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
  if (ms < 60_000)   return `${Math.round(ms / 1000)}s ago`
  if (ms < 3600_000)  return `${Math.round(ms / 60_000)}m ago`
  if (ms < 86400_000) return `${Math.round(ms / 3600_000)}h ago`
  return `${Math.round(ms / 86400_000)}d ago`
}

// ── Stat card ──────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color = 'green' }: {
  label: string; value: string | number; sub?: string; color?: string
}) {
  const colors: Record<string, string> = {
    green:  'text-[#00ff41] border-[#00ff41]/15',
    cyan:   'text-[#00d4ff] border-[#00d4ff]/15',
    orange: 'text-orange-400 border-orange-400/15',
    red:    'text-red-400 border-red-400/15',
    purple: 'text-purple-400 border-purple-400/15',
    gray:   'text-gray-500 border-gray-500/15',
  }
  return (
    <div className={`border rounded p-4 ${colors[color] ?? colors.green}`}>
      <div className="text-[10px] font-mono tracking-widest text-gray-500 mb-1">{label}</div>
      <div className="text-2xl font-mono font-bold">{value}</div>
      {sub && <div className="text-[10px] font-mono tracking-widest text-gray-600 mt-1">{sub}</div>}
    </div>
  )
}

// ── N8n Health Panel ───────────────────────────────────────────────────────────

function N8nHealthPanel({ health }: { health: any }) {
  const status = health?.status ?? 'not_configured'
  return (
    <div className="border border-white/5 rounded p-4">
      <div className="text-[10px] font-mono tracking-widest text-gray-500 mb-3">N8N INSTANCE</div>
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 border rounded text-[11px] font-mono tracking-widest mb-3 ${HEALTH_COLOR[status]}`}>
        <span className={`w-1.5 h-1.5 rounded-full bg-current ${status === 'healthy' ? 'animate-pulse' : ''}`} />
        {status.toUpperCase().replace('_', ' ')}
      </div>
      <div className="space-y-1 text-[10px] font-mono">
        <div className="flex gap-2">
          <span className="text-gray-600 w-20 shrink-0">URL</span>
          <span className={`truncate ${N8N_STATUS_COLOR[status]}`}>{health?.url ?? 'NOT SET'}</span>
        </div>
        <div className="flex gap-2">
          <span className="text-gray-600 w-20 shrink-0">SECRET</span>
          <span className={health?.webhook_secret_configured ? 'text-[#00ff41]' : 'text-red-400'}>
            {health?.webhook_secret_configured ? 'CONFIGURED' : 'NOT SET'}
          </span>
        </div>
        {status === 'not_configured' && (
          <p className="text-gray-600 pt-1 leading-relaxed">
            Set N8N_WEBHOOK_BASE_URL in Railway Variables.<br />
            Local: docker compose -f n8n/docker-compose.n8n.yml up -d
          </p>
        )}
        {status === 'unreachable' && health?.error && (
          <p className="text-red-400/70 pt-1 truncate">{health.error}</p>
        )}
      </div>
    </div>
  )
}

// ── DLQ Panel ──────────────────────────────────────────────────────────────────

function DlqPanel({ dlq, onRetry, canWrite }: { dlq: any; onRetry: (id: string) => void; canWrite: boolean }) {
  const total = dlq?.total ?? 0
  const runs  = dlq?.runs  ?? []

  return (
    <div className={`border rounded p-4 ${total > 0 ? 'border-red-500/20' : 'border-white/5'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] font-mono tracking-widest text-gray-500">DEAD-LETTER QUEUE</div>
        {total > 0 && (
          <span className="text-[9px] font-mono px-2 py-0.5 border border-red-500/30 text-red-400 rounded">
            {total} EXHAUSTED
          </span>
        )}
      </div>
      {total === 0 ? (
        <div className="text-[10px] font-mono text-[#00ff41]">QUEUE CLEAR</div>
      ) : (
        <div className="space-y-2">
          {runs.slice(0, 5).map((run: any) => (
            <div key={run.id} className="flex items-center gap-3 text-[10px] font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              <span className="text-gray-300 truncate flex-1">{run.workflow_name}</span>
              <span className="text-gray-600 shrink-0">{fmtAge(run.created_at)}</span>
              {canWrite && (
                <button
                  onClick={() => onRetry(run.id)}
                  className="text-[8px] font-mono px-2 py-0.5 border border-[#00d4ff]/20 text-[#00d4ff]/60 hover:text-[#00d4ff] rounded transition-colors"
                >
                  RETRY
                </button>
              )}
            </div>
          ))}
          {total > 5 && (
            <div className="text-[9px] font-mono text-gray-600">+{total - 5} more in DLQ</div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Workflow card ──────────────────────────────────────────────────────────────

function WorkflowCard({
  wf, onTrigger, onToggle, onDelete, canWrite, canDelete,
}: {
  wf: any; onTrigger: (wf: any) => void; onToggle: (wf: any) => void
  onDelete: (wf: any) => void; canWrite: boolean; canDelete: boolean
}) {
  const sr = wf.total_runs > 0 ? Math.round((wf.success_count / wf.total_runs) * 100) : null
  const avgMs = wf.total_runs > 0 && wf.avg_duration_ms ? Math.round(wf.avg_duration_ms) : null

  return (
    <div className={`border rounded p-4 transition-colors ${wf.is_active ? 'border-[#00ff41]/15 hover:border-[#00ff41]/30' : 'border-white/5 opacity-50'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-1.5 h-1.5 rounded-full ${wf.is_active ? 'bg-[#00ff41] animate-pulse' : 'bg-gray-600'}`} />
            <span className="text-[11px] font-mono font-bold text-gray-200 truncate">{wf.name}</span>
          </div>
          {wf.description && (
            <p className="text-[10px] font-mono text-gray-600 ml-3.5 truncate">{wf.description}</p>
          )}
          {wf.webhook_path && (
            <p className="text-[9px] font-mono text-gray-700 ml-3.5 mt-0.5 truncate">{wf.webhook_path}</p>
          )}
        </div>
        <div className={`text-[9px] font-mono tracking-widest px-2 py-0.5 border rounded ml-2 shrink-0 ${wf.last_run_status ? (STATUS_COLOR[wf.last_run_status] ?? 'text-gray-500') + ' border-current/25' : 'text-gray-600 border-white/5'}`}>
          {wf.last_run_status?.toUpperCase() ?? 'NEVER RUN'}
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mb-3">
        {(wf.event_triggers ?? []).map((ev: string) => (
          <span key={ev} className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${EVENT_BADGE[ev] ?? 'bg-gray-800 text-gray-400'}`}>
            {ev}
          </span>
        ))}
      </div>

      <div className="flex items-center gap-4 mb-3 text-[10px] font-mono text-gray-500">
        <span>RUNS · <span className="text-gray-300">{wf.total_runs}</span></span>
        {sr !== null && (
          <span>SR · <span className={sr >= 80 ? 'text-[#00ff41]' : sr >= 50 ? 'text-yellow-400' : 'text-red-400'}>{sr}%</span></span>
        )}
        {avgMs !== null && (
          <span>LAT · <span className="text-gray-400">{avgMs}ms</span></span>
        )}
        <span>LAST · <span className="text-gray-400">{fmtAge(wf.last_run_at)}</span></span>
      </div>

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

// ── Event throughput badge ─────────────────────────────────────────────────────

function EventBadgeRow({ events, label }: { events: string[]; label: string }) {
  return (
    <div>
      <div className="text-[9px] font-mono tracking-widest text-gray-600 mb-1.5">{label}</div>
      <div className="flex flex-wrap gap-1">
        {events.map(ev => (
          <div key={ev} className={`flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-mono ${EVENT_BADGE[ev] ?? 'bg-gray-800 text-gray-400'}`}>
            <span className="w-1 h-1 rounded-full bg-current shrink-0" />
            {ev}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

const EMPTY_NEW_WF = {
  name: '', description: '', event_triggers: '',
  webhook_path: '/webhook/release-intelligence', n8n_workflow_id: '',
}

type TabKey = 'registry' | 'history' | 'dlq' | 'events'

export default function AutomationDashboard() {
  const { user } = useAuthStore()
  const canWrite  = ['owner', 'admin', 'editor', 'team'].includes(user?.role ?? '')
  const canDelete = ['owner', 'admin'].includes(user?.role ?? '')
  const qc = useQueryClient()

  const [toast,        setToast]        = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [triggerWf,    setTriggerWf]    = useState<any>(null)
  const [triggerEvent, setTriggerEvent] = useState('')
  const [triggerData,  setTriggerData]  = useState('')
  const [deleteWf,     setDeleteWf]     = useState<any>(null)
  const [newWfOpen,    setNewWfOpen]    = useState(false)
  const [newWfForm,    setNewWfForm]    = useState(EMPTY_NEW_WF)
  const [activeTab,    setActiveTab]    = useState<TabKey>('registry')
  const [testEvent,    setTestEvent]    = useState('artist.created')
  const [testOpen,     setTestOpen]     = useState(false)
  const [testResult,   setTestResult]   = useState<any>(null)

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' = 'success') => setToast({ message, type }),
    [],
  )

  // ── Queries ───────────────────────────────────────────────────────────────────

  const { data: statsData, isLoading: statsLoading, error: statsError, refetch: refetchStats } = useQuery({
    queryKey: ['automation-stats'],
    queryFn: async () => {
      try { return (await automation.stats()).data }
      catch (err: any) { if (isCriticalError(err)) throw err; return null }
    },
    refetchInterval: 30_000,
  })

  const { data: healthData } = useQuery({
    queryKey: ['automation-health'],
    queryFn: async () => {
      try { return (await automation.health()).data }
      catch { return null }
    },
    refetchInterval: 60_000,
  })

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['automation-history'],
    queryFn: async () => {
      try { return (await automation.history({ limit: 50 })).data }
      catch { return null }
    },
    refetchInterval: 30_000,
  })

  const { data: dlqData, isLoading: dlqLoading } = useQuery({
    queryKey: ['automation-dlq'],
    queryFn: async () => {
      try { return (await automation.dlq()).data }
      catch { return null }
    },
    refetchInterval: 60_000,
  })

  // ── Mutations ──────────────────────────────────────────────────────────────────

  const triggerMutation = useMutation({
    mutationFn: ({ wfId, event, data }: { wfId: string; event: string; data?: Record<string, unknown> }) =>
      automation.registry.trigger(wfId, { event, data }),
    onSuccess: () => {
      showToast('Workflow triggered')
      qc.invalidateQueries({ queryKey: ['automation-stats'] })
      qc.invalidateQueries({ queryKey: ['automation-history'] })
      setTriggerWf(null)
    },
    onError: (err: any) => showToast(err.response?.data?.message ?? 'Trigger failed', 'error'),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      automation.registry.update(id, { is_active }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['automation-stats'] }); showToast('Workflow updated') },
    onError: (err: any) => showToast(err.response?.data?.message ?? 'Update failed', 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => automation.registry.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['automation-stats'] }); showToast('Workflow deleted'); setDeleteWf(null) },
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
      qc.invalidateQueries({ queryKey: ['automation-dlq'] })
    },
    onError: (err: any) => showToast(err.response?.data?.message ?? 'Retry failed', 'error'),
  })

  const seedMutation = useMutation({
    mutationFn: () => automation.seed(),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['automation-stats'] })
      const d = res.data
      showToast(d?.message ?? 'Workflows seeded')
    },
    onError: (err: any) => showToast(err.response?.data?.message ?? 'Seed failed', 'error'),
  })

  const testMutation = useMutation({
    mutationFn: ({ event, data }: { event: string; data?: Record<string, unknown> }) =>
      automation.test(event, data),
    onSuccess: (res) => {
      setTestResult(res.data)
      qc.invalidateQueries({ queryKey: ['automation-history'] })
      qc.invalidateQueries({ queryKey: ['automation-stats'] })
    },
    onError: (err: any) => {
      setTestResult({ error: err.response?.data?.message ?? 'Test failed' })
      showToast('Test event failed', 'error')
    },
  })

  // ── Handlers ───────────────────────────────────────────────────────────────────

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

  const handleTest = () => {
    setTestResult(null)
    testMutation.mutate({ event: testEvent.trim() })
  }

  // ── Derived data ───────────────────────────────────────────────────────────────

  const stats      = statsData?.overview
  const workflows  = statsData?.workflows ?? []
  const lastRun    = statsData?.lastRun
  const runs       = historyData?.runs ?? []
  const dlq        = dlqData
  const health     = healthData

  const avgLatency = runs.filter((r: any) => r.duration_ms).length > 0
    ? Math.round(runs.filter((r: any) => r.duration_ms).reduce((s: number, r: any) => s + r.duration_ms, 0) / runs.filter((r: any) => r.duration_ms).length)
    : null

  const throughputToday = statsData?.today?.successCount + statsData?.today?.failedCount || 0

  if (statsLoading) return <div className="flex justify-center py-24"><LoadingSpinner text="LOADING AUTOMATION LAYER..." /></div>
  if (statsError)   return <ErrorMessage message="Failed to load automation data" onRetry={() => refetchStats()} />

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-1 h-6 bg-[#00d4ff] rounded-full" />
            <h1 className="text-xl font-bold font-mono text-[#00d4ff] tracking-[0.2em]">AUTOMATION LAYER</h1>
          </div>
          <p className="text-gray-600 text-[11px] font-mono tracking-[0.2em] ml-4">N8N WORKFLOW ORCHESTRATION · DATIAM OS</p>
        </div>
        <div className="flex items-center gap-2">
          {canWrite && (
            <>
              <button
                onClick={() => setTestOpen(true)}
                className="text-[10px] font-mono tracking-widest px-3 py-1.5 border border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/10 rounded transition-colors"
              >
                ⚡ TEST
              </button>
              <button
                onClick={() => seedMutation.mutate()}
                disabled={seedMutation.isPending}
                className="text-[10px] font-mono tracking-widest px-3 py-1.5 border border-[#00ff41]/30 text-[#00ff41] hover:bg-[#00ff41]/10 rounded transition-colors disabled:opacity-40"
              >
                {seedMutation.isPending ? 'SEEDING...' : '⟳ SEED'}
              </button>
              <button
                onClick={() => setNewWfOpen(true)}
                className="text-[10px] font-mono tracking-widest px-4 py-1.5 border border-[#00d4ff]/40 text-[#00d4ff] hover:bg-[#00d4ff]/10 rounded transition-colors"
              >
                + REGISTER
              </button>
            </>
          )}
        </div>
      </div>

      {/* Top stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <StatCard label="WORKFLOWS"    value={stats?.totalWorkflows  ?? 0} color="cyan"   />
        <StatCard label="ACTIVE"       value={stats?.activeWorkflows ?? 0} color="green"  />
        <StatCard label="SUCCESS RATE" value={`${stats?.successRate ?? 100}%`} color={(stats?.successRate ?? 100) >= 80 ? 'green' : 'orange'} />
        <StatCard label="TOTAL RUNS"   value={stats?.totalRuns  ?? 0}       color="cyan"   />
        <StatCard label="FAILED TODAY" value={statsData?.today?.failedCount ?? 0} color={(statsData?.today?.failedCount ?? 0) > 0 ? 'red' : 'green'} />
        <StatCard label="THROUGHPUT"   value={throughputToday}   sub="TODAY"     color="purple" />
        <StatCard label="AVG LATENCY"  value={avgLatency ? `${avgLatency}ms` : '—'} color="cyan" />
      </div>

      {/* Health + N8n + Queue + DLQ row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Queue health */}
        <div className="border border-white/5 rounded p-4">
          <div className="text-[10px] font-mono tracking-widest text-gray-500 mb-3">QUEUE HEALTH</div>
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 border rounded text-[11px] font-mono tracking-widest ${HEALTH_COLOR[stats?.queueHealth ?? 'healthy']}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            {(stats?.queueHealth ?? 'HEALTHY').toUpperCase()}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] font-mono">
            <div>
              <div className="text-gray-600 tracking-widest">OK</div>
              <div className="text-[#00ff41] font-bold">{stats?.successCount ?? 0}</div>
            </div>
            <div>
              <div className="text-gray-600 tracking-widest">FAIL</div>
              <div className="text-red-400 font-bold">{stats?.failedCount ?? 0}</div>
            </div>
            <div>
              <div className="text-gray-600 tracking-widest">RUN</div>
              <div className="text-[#00d4ff] font-bold">{stats?.runningCount ?? 0}</div>
            </div>
          </div>
        </div>

        {/* n8n health */}
        <N8nHealthPanel health={health} />

        {/* Last execution */}
        <div className="border border-white/5 rounded p-4">
          <div className="text-[10px] font-mono tracking-widest text-gray-500 mb-3">LAST EXECUTION</div>
          {lastRun ? (
            <div className="space-y-1.5">
              <div className="text-[11px] font-mono text-gray-200 truncate">{lastRun.workflow_name}</div>
              <div className={`text-[10px] font-mono font-bold ${STATUS_COLOR[lastRun.status] ?? 'text-gray-500'}`}>
                {lastRun.status?.toUpperCase()}
              </div>
              {lastRun.duration_ms && (
                <div className="text-[10px] font-mono text-gray-500">{lastRun.duration_ms}ms</div>
              )}
              <div className="text-[10px] font-mono text-gray-600">{fmtDate(lastRun.created_at)}</div>
              {lastRun.triggered_by_event && (
                <span className={`inline-block text-[9px] font-mono px-1.5 py-0.5 rounded ${EVENT_BADGE[lastRun.triggered_by_event] ?? 'bg-gray-800 text-gray-400'}`}>
                  {lastRun.triggered_by_event}
                </span>
              )}
            </div>
          ) : (
            <div className="text-[10px] font-mono text-gray-600">No executions yet</div>
          )}
        </div>

        {/* DLQ */}
        <DlqPanel
          dlq={dlq}
          canWrite={canWrite}
          onRetry={(id) => retryMutation.mutate(id)}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-white/5">
        {([
          ['registry', `REGISTRY (${workflows.length})`],
          ['history',  'HISTORY'],
          ['dlq',      `DLQ (${dlq?.total ?? 0})`],
          ['events',   'EVENTS'],
        ] as [TabKey, string][]).map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`text-[10px] font-mono tracking-widest pb-3 transition-colors ${activeTab === tab ? 'text-[#00d4ff] border-b border-[#00d4ff]' : 'text-gray-600 hover:text-gray-400'} ${tab === 'dlq' && (dlq?.total ?? 0) > 0 ? 'text-red-400' : ''}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Registry tab ── */}
      {activeTab === 'registry' && (
        <div>
          {workflows.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <div className="text-gray-600 text-[11px] font-mono tracking-widest">NO WORKFLOWS REGISTERED</div>
              {canWrite && (
                <button
                  onClick={() => seedMutation.mutate()}
                  disabled={seedMutation.isPending}
                  className="text-[10px] font-mono tracking-widest px-4 py-2 border border-[#00ff41]/30 text-[#00ff41] hover:bg-[#00ff41]/10 rounded transition-colors disabled:opacity-40"
                >
                  {seedMutation.isPending ? 'SEEDING...' : '⟳ SEED BUILT-IN WORKFLOWS'}
                </button>
              )}
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

      {/* ── History tab ── */}
      {activeTab === 'history' && (
        <div>
          {historyLoading ? (
            <div className="flex justify-center py-8"><LoadingSpinner text="LOADING HISTORY..." /></div>
          ) : runs.length === 0 ? (
            <div className="text-center py-12 text-gray-600 text-[11px] font-mono tracking-widest">NO EXECUTION HISTORY</div>
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
                    <tr key={run.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                      <td className="px-4 py-2.5 text-gray-300 max-w-[140px] truncate">{run.workflow_name}</td>
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

      {/* ── DLQ tab ── */}
      {activeTab === 'dlq' && (
        <div>
          {dlqLoading ? (
            <div className="flex justify-center py-8"><LoadingSpinner text="LOADING DLQ..." /></div>
          ) : !dlq?.total ? (
            <div className="text-center py-12">
              <div className="text-[#00ff41] text-[11px] font-mono tracking-widest">DEAD-LETTER QUEUE IS CLEAR</div>
              <div className="text-gray-600 text-[10px] font-mono mt-1">All workflows completed within retry limits</div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-[10px] font-mono text-red-400/70 tracking-widest">
                {dlq.total} RUN(S) EXHAUSTED ALL RETRIES
              </div>
              <div className="border border-red-500/10 rounded overflow-hidden">
                <table className="w-full text-[10px] font-mono">
                  <thead>
                    <tr className="border-b border-white/5 text-gray-600 tracking-widest">
                      <th className="text-left px-4 py-2">WORKFLOW</th>
                      <th className="text-left px-4 py-2">EVENT</th>
                      <th className="text-left px-4 py-2">ERROR</th>
                      <th className="text-left px-4 py-2">RETRIES</th>
                      <th className="text-left px-4 py-2">TIME</th>
                      {canWrite && <th className="px-4 py-2" />}
                    </tr>
                  </thead>
                  <tbody>
                    {(dlq.runs ?? []).map((run: any) => (
                      <tr key={run.id} className="border-b border-white/[0.03]">
                        <td className="px-4 py-2.5 text-gray-300 max-w-[140px] truncate">{run.workflow_name}</td>
                        <td className="px-4 py-2.5">
                          {run.triggered_by_event
                            ? <span className={`px-1.5 py-0.5 rounded ${EVENT_BADGE[run.triggered_by_event] ?? 'bg-gray-800 text-gray-400'}`}>{run.triggered_by_event}</span>
                            : <span className="text-gray-600">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-red-400/70 max-w-[180px] truncate">{run.error_message ?? '—'}</td>
                        <td className="px-4 py-2.5 text-red-400">{run.retry_count}/{run.max_retries - 1}</td>
                        <td className="px-4 py-2.5 text-gray-600">{fmtAge(run.created_at)}</td>
                        {canWrite && (
                          <td className="px-4 py-2.5">
                            <button
                              onClick={() => retryMutation.mutate(run.id)}
                              disabled={retryMutation.isPending}
                              className="text-[9px] font-mono px-2 py-1 border border-[#00d4ff]/20 text-[#00d4ff]/60 hover:text-[#00d4ff] rounded transition-colors disabled:opacity-30"
                            >
                              RETRY
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Events tab ── */}
      {activeTab === 'events' && (
        <div className="space-y-6">
          <div className="border border-[#00ff41]/10 rounded p-4 space-y-4">
            <EventBadgeRow events={ALL_CATALOG_EVENTS} label="CATALOG & ARTIST EVENTS" />
            <EventBadgeRow events={ALL_RELEASE_EVENTS} label="RELEASE OPERATIONS EVENTS" />
            <p className="text-[10px] font-mono text-gray-600">
              {ALL_EVENTS.length} events registered. Events fire automatically via dispatchEvent() in catalog-engine, artists, releases, and release-intelligence modules.
            </p>
          </div>

          {/* Webhook URL reference */}
          <div className="border border-white/5 rounded p-4">
            <div className="text-[10px] font-mono tracking-widest text-gray-500 mb-3">WEBHOOK ENDPOINTS</div>
            <div className="space-y-2 text-[10px] font-mono">
              {[
                { name: 'catalog-events',       path: '/webhook/catalog-events',       events: ALL_CATALOG_EVENTS },
                { name: 'release-intelligence', path: '/webhook/release-intelligence', events: ALL_RELEASE_EVENTS },
              ].map(wh => (
                <div key={wh.name} className="border border-white/5 rounded p-3">
                  <div className="text-gray-300 mb-1">{wh.name}</div>
                  <div className="text-[#00d4ff]/70 mb-1">
                    {health?.url ? `${health.url}${wh.path}` : `<N8N_WEBHOOK_BASE_URL>${wh.path}`}
                  </div>
                  <div className="text-gray-600">{wh.events.length} events · Header: X-DATIAM-Secret</div>
                </div>
              ))}
            </div>
          </div>

          {/* Retry config */}
          <div className="border border-white/5 rounded p-4">
            <div className="text-[10px] font-mono tracking-widest text-gray-500 mb-3">RETRY CONFIGURATION</div>
            <div className="grid grid-cols-3 gap-4 text-[10px] font-mono">
              <div>
                <div className="text-gray-600">MAX RETRIES</div>
                <div className="text-[#00ff41] font-bold text-sm mt-0.5">3</div>
              </div>
              <div>
                <div className="text-gray-600">BACKOFF</div>
                <div className="text-[#00d4ff] font-bold text-sm mt-0.5">LINEAR</div>
                <div className="text-gray-600">1s · 2s · 3s</div>
              </div>
              <div>
                <div className="text-gray-600">TIMEOUT</div>
                <div className="text-purple-400 font-bold text-sm mt-0.5">8 000ms</div>
                <div className="text-gray-600">per attempt</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Recent failures (always visible when present) ── */}
      {runs.filter((r: any) => r.status === 'failed').length > 0 && activeTab !== 'dlq' && (
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
            <Input value={triggerEvent} onChange={e => setTriggerEvent(e.target.value)} placeholder="e.g. artist.created" />
          </Field>
          <Field label="Payload (JSON)" hint="Optional event data">
            <Textarea value={triggerData} onChange={e => setTriggerData(e.target.value)} placeholder='{"artist_id": "..."}' rows={4} className="font-mono text-[11px]" />
          </Field>
        </div>
      </Modal>

      {/* Test modal */}
      <Modal
        isOpen={testOpen}
        onClose={() => { if (!testMutation.isPending) { setTestOpen(false); setTestResult(null) } }}
        title="TEST EVENT DISPATCH"
        subtitle="FIRE A SAMPLE EVENT TO N8N"
        color="cyan"
        footer={
          <>
            <button onClick={() => { setTestOpen(false); setTestResult(null) }} disabled={testMutation.isPending} className="text-[10px] font-mono tracking-widest px-4 py-2 border border-white/10 text-gray-500 hover:text-gray-400 rounded disabled:opacity-50">CLOSE</button>
            <button onClick={handleTest} disabled={testMutation.isPending || !testEvent.trim()} className="text-[10px] font-mono tracking-widest px-5 py-2 border border-yellow-400/40 text-yellow-400 hover:bg-yellow-400/10 rounded disabled:opacity-50">
              {testMutation.isPending ? 'FIRING...' : '⚡ FIRE TEST'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Event">
            <select
              value={testEvent}
              onChange={e => setTestEvent(e.target.value)}
              className="w-full bg-black border border-white/10 rounded px-3 py-2 text-[11px] font-mono text-gray-200 focus:outline-none focus:border-[#00d4ff]/40"
            >
              <optgroup label="Catalog & Artist">
                {ALL_CATALOG_EVENTS.map(ev => <option key={ev} value={ev}>{ev}</option>)}
              </optgroup>
              <optgroup label="Release Operations">
                {ALL_RELEASE_EVENTS.map(ev => <option key={ev} value={ev}>{ev}</option>)}
              </optgroup>
            </select>
          </Field>
          {testResult && (
            <div className={`border rounded p-3 text-[10px] font-mono ${testResult.error ? 'border-red-500/20 text-red-400' : 'border-[#00ff41]/20 text-[#00ff41]'}`}>
              <div className="mb-1">{testResult.error ? '✗ FAILED' : '✓ DISPATCHED'}</div>
              <pre className="text-gray-400 text-[9px] overflow-auto max-h-32 whitespace-pre-wrap">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </Modal>

      {/* Register workflow modal */}
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
            <Input value={newWfForm.name} onChange={e => setNewWfForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. catalog-events" autoFocus />
          </Field>
          <Field label="Description">
            <Input value={newWfForm.description} onChange={e => setNewWfForm(f => ({ ...f, description: e.target.value }))} placeholder="What does this workflow do?" />
          </Field>
          <Field label="Event Triggers (comma-separated)" required>
            <Input value={newWfForm.event_triggers} onChange={e => setNewWfForm(f => ({ ...f, event_triggers: e.target.value }))} placeholder="artist.created, song.created" />
          </Field>
          <Field label="n8n Webhook Path">
            <Input value={newWfForm.webhook_path} onChange={e => setNewWfForm(f => ({ ...f, webhook_path: e.target.value }))} placeholder="/webhook/my-workflow" />
          </Field>
          <Field label="n8n Workflow ID">
            <Input value={newWfForm.n8n_workflow_id} onChange={e => setNewWfForm(f => ({ ...f, n8n_workflow_id: e.target.value }))} placeholder="Optional — n8n internal ID" />
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
