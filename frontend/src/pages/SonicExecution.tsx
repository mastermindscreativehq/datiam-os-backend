import { useEffect, useState, useCallback } from 'react'
import { sonicExecution, artists } from '../api/client'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProductionTask {
  id: string; title: string; description: string; priority: number
  estimated_hours: number; status: 'pending' | 'in_progress' | 'completed'; is_checkpoint: boolean
}

interface Milestone {
  id: string; title: string; description: string; target_day: number; status: string
}

interface ExecutionPlan {
  id: string; category: string; title: string; objective: string
  status: string; completion_score: string; timeline_days: number
  production_tasks: ProductionTask[]; milestones: Milestone[]
  scoring_version: string; algorithm_version: string; created_at: string
}

interface Diagnostic {
  stagnation_detected: boolean; over_density_detected: boolean
  emotional_flatness_detected: boolean; harmonic_repetition_detected: boolean
  weak_transitions_detected: boolean; diagnostic_score: number
  recommendations: { issue: string; severity: string; guidance: string; suggested_action: string }[]
  meta: { blueprints_analyzed: number; avg_bpm: number; avg_coherence: number; dominant_emotion: string; dominant_key: string; version: string }
}

interface SonicEvent {
  id: string; event_type: string; payload: Record<string, unknown>; created_at: string
}

interface PipelineStatus {
  platform_status: Record<string, { ready: boolean; notes: string }>
  status: string; message: string; rl_integration: string; pipeline_version: string
}

interface Artist { id: string; stage_name: string }

const CATEGORIES = ['arrangement', 'vocal', 'instrumentation', 'mix', 'release', 'performance'] as const
type Category = typeof CATEGORIES[number]

const CATEGORY_ICONS: Record<Category, string> = {
  arrangement: '◈', vocal: '◉', instrumentation: '◆', mix: '◎', release: '⬡', performance: '◇'
}

const STATUS_COLORS: Record<string, string> = {
  pending:     'text-gray-500 border-gray-500/30',
  in_progress: 'text-[#00d4ff] border-[#00d4ff]/30',
  completed:   'text-[#00ff41] border-[#00ff41]/30',
  paused:      'text-yellow-400 border-yellow-400/30',
  cancelled:   'text-red-400 border-red-400/30',
}

const SEVERITY_COLORS: Record<string, string> = {
  low:    'text-yellow-400 border-yellow-400/20',
  medium: 'text-orange-400 border-orange-400/20',
  high:   'text-red-400 border-red-400/20',
}

export default function SonicExecution() {
  const [artistList, setArtistList]       = useState<Artist[]>([])
  const [selectedArtist, setSelectedArtist] = useState('')
  const [plans, setPlans]                 = useState<ExecutionPlan[]>([])
  const [diagnostic, setDiagnostic]       = useState<Diagnostic | null>(null)
  const [events, setEvents]               = useState<SonicEvent[]>([])
  const [pipeline, setPipeline]           = useState<PipelineStatus | null>(null)
  const [selectedPlan, setSelectedPlan]   = useState<ExecutionPlan | null>(null)
  const [newCategory, setNewCategory]     = useState<Category>('arrangement')
  const [loading, setLoading]             = useState(false)
  const [diagnosing, setDiagnosing]       = useState(false)
  const [error, setError]                 = useState('')

  useEffect(() => {
    artists.list().then(r => {
      const list = r.data?.data ?? []
      setArtistList(list)
      if (list.length > 0) setSelectedArtist(list[0].id)
    }).catch(() => {})
    sonicExecution.getPipelineStatus().then(r => setPipeline(r.data?.data ?? null)).catch(() => {})
  }, [])

  const loadData = useCallback(async (artistId: string) => {
    if (!artistId) return
    setLoading(true)
    setError('')
    try {
      const [plansRes, eventsRes] = await Promise.allSettled([
        sonicExecution.getPlans(artistId),
        sonicExecution.getEvents(artistId, undefined, 30),
      ])
      if (plansRes.status === 'fulfilled') setPlans(plansRes.value.data?.data ?? [])
      if (eventsRes.status === 'fulfilled') setEvents(eventsRes.value.data?.data?.events ?? [])

      const diagRes = await sonicExecution.getLatestDiagnostic(artistId).catch(() => null)
      if (diagRes) setDiagnostic(diagRes.data?.data ?? null)
    } catch {
      setError('Failed to load execution data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedArtist) loadData(selectedArtist)
  }, [selectedArtist, loadData])

  const handleCreatePlan = async () => {
    if (!selectedArtist) return
    setLoading(true)
    try {
      await sonicExecution.createPlan(selectedArtist, { category: newCategory })
      await loadData(selectedArtist)
    } catch {
      setError('Failed to create execution plan')
    } finally {
      setLoading(false)
    }
  }

  const handleDiagnose = async () => {
    if (!selectedArtist) return
    setDiagnosing(true)
    try {
      const res = await sonicExecution.diagnose(selectedArtist, 10)
      setDiagnostic(res.data?.data ?? null)
      await loadData(selectedArtist)
    } catch {
      setError('Diagnosis failed')
    } finally {
      setDiagnosing(false)
    }
  }

  const handleTaskUpdate = async (planId: string, taskId: string, status: string) => {
    try {
      await sonicExecution.updateTask(planId, taskId, status)
      await loadData(selectedArtist)
      if (selectedPlan?.id === planId) {
        const res = await sonicExecution.getPlanDetails(planId)
        const detail = res.data?.data
        if (detail) setSelectedPlan({ ...detail.plan, milestones: detail.milestones })
      }
    } catch { /* non-fatal */ }
  }

  const handleMilestoneComplete = async (planId: string, milestoneId: string) => {
    try {
      await sonicExecution.completeMilestone(planId, milestoneId)
      await loadData(selectedArtist)
    } catch { /* non-fatal */ }
  }

  const handleEnqueueAnalytics = async () => {
    if (!selectedArtist) return
    try {
      await sonicExecution.enqueueJob(selectedArtist, 'analytics', {})
      await loadData(selectedArtist)
    } catch { /* non-fatal */ }
  }

  const score = selectedPlan ? Number(selectedPlan.completion_score) : 0

  return (
    <div className="min-h-screen bg-[#050505] text-gray-300 font-mono p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-[#00ff41] text-xl">◈</span>
          <h1 className="text-[#00ff41] text-xl font-bold tracking-[0.2em]">EXECUTION ENGINE</h1>
          <span className="text-[10px] text-[#00ff41]/40 tracking-widest border border-[#00ff41]/20 px-2 py-0.5">PHASE 5</span>
        </div>
        <p className="text-gray-600 text-xs tracking-widest">
          PRODUCTION TASK EXECUTION · SESSION DIAGNOSTICS · EVENT BUS · PLATFORM INGESTION
        </p>
      </div>

      {/* Artist Selector */}
      <div className="flex items-center gap-4 mb-8">
        <select
          value={selectedArtist}
          onChange={e => setSelectedArtist(e.target.value)}
          className="bg-[#0c0c0c] border border-[#00ff41]/20 text-[#00ff41] text-xs font-mono px-3 py-2 rounded focus:outline-none focus:border-[#00ff41]/60 tracking-wider"
        >
          {artistList.map(a => <option key={a.id} value={a.id}>{a.stage_name}</option>)}
        </select>
        {loading && <span className="text-[#00d4ff]/60 text-xs animate-pulse tracking-widest">LOADING...</span>}
        {error && <span className="text-red-400 text-xs">{error}</span>}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* ── Left Column: Execution Plans ──────────────────────────────────── */}
        <div className="xl:col-span-2 space-y-6">

          {/* Create Plan */}
          <div className="bg-[#0c0c0c] border border-[#00ff41]/15 rounded p-4">
            <div className="text-[10px] text-[#00ff41]/60 tracking-widest mb-4">◈ CREATE EXECUTION PLAN</div>
            <div className="flex items-center gap-3">
              <div className="flex gap-1 flex-wrap">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setNewCategory(cat)}
                    className={`px-3 py-1.5 text-[10px] font-mono tracking-wider border rounded transition-all ${
                      newCategory === cat
                        ? 'bg-[#00ff41]/10 border-[#00ff41]/40 text-[#00ff41]'
                        : 'border-gray-700/50 text-gray-600 hover:border-gray-600 hover:text-gray-400'
                    }`}
                  >
                    {CATEGORY_ICONS[cat]} {cat.toUpperCase()}
                  </button>
                ))}
              </div>
              <button
                onClick={handleCreatePlan}
                disabled={loading || !selectedArtist}
                className="ml-auto px-4 py-2 text-[10px] font-mono tracking-widest border border-[#00ff41]/30 text-[#00ff41]/70 rounded hover:bg-[#00ff41]/10 hover:border-[#00ff41]/60 hover:text-[#00ff41] disabled:opacity-40 transition-all"
              >
                + INIT PLAN
              </button>
            </div>
          </div>

          {/* Plans List */}
          <div className="space-y-3">
            {plans.length === 0 && !loading && (
              <div className="bg-[#0c0c0c] border border-gray-800 rounded p-6 text-center text-gray-700 text-xs tracking-widest">
                NO EXECUTION PLANS — CREATE ONE ABOVE
              </div>
            )}
            {plans.map(plan => {
              const tasks = plan.production_tasks ?? []
              const completedTasks = tasks.filter((t: ProductionTask) => t.status === 'completed').length
              const pct = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0

              return (
                <div
                  key={plan.id}
                  className={`bg-[#0c0c0c] border rounded p-4 cursor-pointer transition-all ${
                    selectedPlan?.id === plan.id ? 'border-[#00ff41]/40' : 'border-gray-800 hover:border-gray-700'
                  }`}
                  onClick={() => setSelectedPlan(selectedPlan?.id === plan.id ? null : plan)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[#00d4ff] text-sm">{CATEGORY_ICONS[plan.category as Category] ?? '◈'}</span>
                      <div>
                        <div className="text-white text-xs font-bold tracking-wide">{plan.title}</div>
                        <div className="text-gray-600 text-[10px] tracking-wider mt-0.5">{plan.category.toUpperCase()} · {plan.timeline_days}d TIMELINE</div>
                      </div>
                    </div>
                    <span className={`text-[10px] border px-2 py-0.5 rounded tracking-wider ${STATUS_COLORS[plan.status] ?? STATUS_COLORS.pending}`}>
                      {plan.status.toUpperCase()}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-2">
                    <div className="flex justify-between text-[10px] text-gray-600 mb-1">
                      <span>{completedTasks}/{tasks.length} TASKS</span>
                      <span className="text-[#00ff41]/60">{pct}%</span>
                    </div>
                    <div className="h-1 bg-gray-800 rounded">
                      <div
                        className="h-1 bg-[#00ff41] rounded transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 text-[10px] text-gray-700">
                    <span>SCORE: <span className="text-[#00d4ff]/60">{Number(plan.completion_score).toFixed(0)}</span></span>
                    <span>v{plan.scoring_version}</span>
                    <span>{new Date(plan.created_at).toLocaleDateString()}</span>
                  </div>

                  {/* Milestones */}
                  {selectedPlan?.id === plan.id && plan.milestones && (
                    <div className="mt-4 pt-4 border-t border-gray-800">
                      <div className="text-[10px] text-gray-600 tracking-widest mb-2">MILESTONES</div>
                      <div className="space-y-2">
                        {plan.milestones.map((m: Milestone) => (
                          <div key={m.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`w-1.5 h-1.5 rounded-full ${m.status === 'completed' ? 'bg-[#00ff41]' : 'bg-gray-700'}`} />
                              <span className="text-gray-400 text-[10px]">{m.title}</span>
                              <span className="text-gray-700 text-[10px]">Day {m.target_day}</span>
                            </div>
                            {m.status !== 'completed' && (
                              <button
                                onClick={e => { e.stopPropagation(); handleMilestoneComplete(plan.id, m.id) }}
                                className="text-[10px] text-[#00d4ff]/60 hover:text-[#00d4ff] border border-[#00d4ff]/20 hover:border-[#00d4ff]/40 px-2 py-0.5 rounded transition-all"
                              >
                                COMPLETE
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Task list */}
                      <div className="text-[10px] text-gray-600 tracking-widest mt-4 mb-2">PRODUCTION TASKS</div>
                      <div className="space-y-1.5 max-h-64 overflow-y-auto">
                        {tasks.map((t: ProductionTask) => (
                          <div key={t.id} className="flex items-start gap-2 group">
                            <span className={`mt-0.5 text-xs ${t.status === 'completed' ? 'text-[#00ff41]' : t.status === 'in_progress' ? 'text-[#00d4ff]' : 'text-gray-700'}`}>
                              {t.status === 'completed' ? '✓' : t.status === 'in_progress' ? '▶' : '○'}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className={`text-[10px] ${t.status === 'completed' ? 'text-gray-600 line-through' : 'text-gray-400'}`}>
                                {t.title}
                                {t.is_checkpoint && <span className="ml-1 text-[#00d4ff]/40">⊕</span>}
                              </div>
                              <div className="text-[9px] text-gray-700">{t.estimated_hours}h est.</div>
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                              {t.status !== 'in_progress' && t.status !== 'completed' && (
                                <button onClick={e => { e.stopPropagation(); handleTaskUpdate(plan.id, t.id, 'in_progress') }}
                                  className="text-[9px] text-[#00d4ff]/50 hover:text-[#00d4ff] px-1.5 py-0.5 border border-[#00d4ff]/20 rounded">START</button>
                              )}
                              {t.status !== 'completed' && (
                                <button onClick={e => { e.stopPropagation(); handleTaskUpdate(plan.id, t.id, 'completed') }}
                                  className="text-[9px] text-[#00ff41]/50 hover:text-[#00ff41] px-1.5 py-0.5 border border-[#00ff41]/20 rounded">DONE</button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Right Column ──────────────────────────────────────────────────── */}
        <div className="space-y-6">

          {/* Session Mode Diagnostics */}
          <div className="bg-[#0c0c0c] border border-[#00d4ff]/15 rounded p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[10px] text-[#00d4ff]/60 tracking-widest">◉ SESSION MODE</div>
              <button
                onClick={handleDiagnose}
                disabled={diagnosing || !selectedArtist}
                className="text-[10px] font-mono tracking-widest border border-[#00d4ff]/30 text-[#00d4ff]/60 px-3 py-1 rounded hover:bg-[#00d4ff]/10 hover:text-[#00d4ff] disabled:opacity-40 transition-all"
              >
                {diagnosing ? 'SCANNING...' : 'RUN SCAN'}
              </button>
            </div>

            {diagnostic ? (
              <div className="space-y-3">
                {/* Score dial */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`text-3xl font-bold ${diagnostic.diagnostic_score >= 0.8 ? 'text-[#00ff41]' : diagnostic.diagnostic_score >= 0.6 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {(diagnostic.diagnostic_score * 100).toFixed(0)}
                  </div>
                  <div>
                    <div className="text-gray-600 text-[10px] tracking-widest">HEALTH SCORE</div>
                    <div className="text-gray-700 text-[10px]">{diagnostic.meta.blueprints_analyzed} blueprints · BPM {diagnostic.meta.avg_bpm}</div>
                  </div>
                </div>

                {/* Detection flags */}
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { key: 'stagnation_detected',          label: 'STAGNATION' },
                    { key: 'over_density_detected',        label: 'OVER-DENSITY' },
                    { key: 'emotional_flatness_detected',  label: 'FLATNESS' },
                    { key: 'harmonic_repetition_detected', label: 'HARM. REPEAT' },
                    { key: 'weak_transitions_detected',    label: 'WEAK TRANSIT.' },
                  ].map(({ key, label }) => {
                    const detected = diagnostic[key as keyof Diagnostic] as boolean
                    return (
                      <div key={key} className={`flex items-center gap-1.5 px-2 py-1 rounded border text-[9px] tracking-wider ${
                        detected ? 'border-red-500/30 text-red-400 bg-red-500/5' : 'border-gray-800 text-gray-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${detected ? 'bg-red-400' : 'bg-gray-800'}`} />
                        {label}
                      </div>
                    )
                  })}
                </div>

                {/* Recommendations */}
                {diagnostic.recommendations.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {diagnostic.recommendations.map((r, i) => (
                      <div key={i} className={`border rounded p-2 text-[10px] ${SEVERITY_COLORS[r.severity] ?? ''}`}>
                        <div className="font-bold tracking-wider mb-1">{r.issue}</div>
                        <div className="text-gray-500 mb-1 text-[9px]">{r.guidance}</div>
                        <div className="text-[#00d4ff]/60 text-[9px]">→ {r.suggested_action}</div>
                      </div>
                    ))}
                  </div>
                )}

                {diagnostic.recommendations.length === 0 && (
                  <div className="text-[#00ff41]/60 text-[10px] text-center py-2 tracking-widest">SESSION HEALTH OPTIMAL</div>
                )}
              </div>
            ) : (
              <div className="text-gray-700 text-[10px] text-center py-4 tracking-widest">
                RUN A SCAN TO ANALYZE SESSION HEALTH
              </div>
            )}
          </div>

          {/* Event Log */}
          <div className="bg-[#0c0c0c] border border-gray-800 rounded p-4">
            <div className="text-[10px] text-gray-600 tracking-widest mb-3">◆ EVENT LOG</div>
            <div className="space-y-1.5 max-h-52 overflow-y-auto">
              {events.length === 0 && (
                <div className="text-gray-800 text-[10px] text-center py-3">NO EVENTS YET</div>
              )}
              {events.map(ev => (
                <div key={ev.id} className="flex items-start gap-2 text-[9px]">
                  <span className="text-gray-700 shrink-0">{new Date(ev.created_at).toLocaleTimeString()}</span>
                  <span className={`shrink-0 ${
                    ev.event_type.startsWith('blueprint') ? 'text-[#00ff41]/60' :
                    ev.event_type.startsWith('memory') ? 'text-[#00d4ff]/60' :
                    ev.event_type.startsWith('execution') ? 'text-purple-400/60' :
                    ev.event_type.startsWith('session') ? 'text-red-400/60' :
                    'text-gray-600'
                  }`}>{ev.event_type}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-800">
              <button
                onClick={handleEnqueueAnalytics}
                disabled={!selectedArtist}
                className="w-full text-[10px] font-mono tracking-widest border border-[#00d4ff]/20 text-[#00d4ff]/50 py-1.5 rounded hover:bg-[#00d4ff]/5 hover:text-[#00d4ff]/70 disabled:opacity-40 transition-all"
              >
                ⬡ QUEUE ANALYTICS RECALC
              </button>
            </div>
          </div>

          {/* Platform Ingestion */}
          <div className="bg-[#0c0c0c] border border-gray-800 rounded p-4">
            <div className="text-[10px] text-gray-600 tracking-widest mb-3">◇ PLATFORM INGESTION</div>
            {pipeline ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                  <span className="text-yellow-400 text-[10px] tracking-wider">SCAFFOLD READY</span>
                  <span className="text-gray-700 text-[9px]">{pipeline.pipeline_version}</span>
                </div>
                {Object.entries(pipeline.platform_status ?? {}).map(([platform, status]) => (
                  <div key={platform} className="flex items-center justify-between py-1 border-b border-gray-900">
                    <span className="text-gray-500 text-[10px] uppercase tracking-wider">{platform}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 border rounded ${
                      (status as { ready: boolean }).ready
                        ? 'border-[#00ff41]/30 text-[#00ff41]/60'
                        : 'border-gray-700 text-gray-700'
                    }`}>
                      {(status as { ready: boolean }).ready ? 'LIVE' : 'PENDING CREDS'}
                    </span>
                  </div>
                ))}
                <div className="pt-2 text-[9px] text-gray-700 leading-relaxed">
                  {pipeline.rl_integration}
                </div>
              </div>
            ) : (
              <div className="text-gray-800 text-[10px] text-center py-3">LOADING PIPELINE STATUS...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
