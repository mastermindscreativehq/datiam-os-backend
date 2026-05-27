import { useEffect, useState } from 'react'
import StatCard from '../components/StatCard'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import EmptyState from '../components/EmptyState'
import { musicIntelligence, artists as artistsApi, isCriticalError } from '../api/client'

// ── Label / colour maps ───────────────────────────────────────────────────────

const EMOTION_LABELS: Record<string, string> = {
  grief: 'Grief', trauma: 'Trauma', rage: 'Rage', joy: 'Joy',
  melancholy: 'Melancholy', euphoria: 'Euphoria', anxiety: 'Anxiety',
  longing: 'Longing', triumph: 'Triumph', nostalgia: 'Nostalgia',
  peace: 'Peace', defiance: 'Defiance',
}

const INTENTION_LABELS: Record<string, string> = {
  heal_listener: 'Heal the Listener', inspire_action: 'Inspire Action',
  create_nostalgia: 'Create Nostalgia', deliver_message: 'Deliver a Message',
  uplift_spirit: 'Uplift the Spirit', provoke_thought: 'Provoke Thought',
  celebrate_truth: 'Celebrate Truth', process_pain: 'Process Pain',
}

const TRANSFORMATION_LABELS: Record<string, string> = {
  from_pain_to_peace: 'From Pain to Peace',
  from_stagnation_to_momentum: 'From Stagnation to Momentum',
  from_confusion_to_clarity: 'From Confusion to Clarity',
  from_isolation_to_belonging: 'From Isolation to Belonging',
  from_fear_to_courage: 'From Fear to Courage',
  from_grief_to_acceptance: 'From Grief to Acceptance',
  from_doubt_to_conviction: 'From Doubt to Conviction',
  from_chaos_to_order: 'From Chaos to Order',
}

const EMOTION_COLOR: Record<string, string> = {
  grief: 'text-blue-400', trauma: 'text-purple-400', rage: 'text-red-400',
  joy: 'text-[#00ff41]', melancholy: 'text-[#00d4ff]', euphoria: 'text-yellow-300',
  anxiety: 'text-orange-400', longing: 'text-indigo-400', triumph: 'text-[#00ff41]',
  nostalgia: 'text-amber-400', peace: 'text-teal-400', defiance: 'text-rose-400',
}

// ── API response unwrapper ────────────────────────────────────────────────────
// axios response: { data: { success, data: X } }  → unwrap(res.data) → X
function unwrap(serverBody: any): any {
  if (!serverBody) return null
  return serverBody.data ?? serverBody
}

// ── Blueprint panel ───────────────────────────────────────────────────────────

interface BlueprintPanelProps {
  bp: any
  sessionId: string
  onRegenerate: (sessionId: string) => void
  regenerating: boolean
}

function BlueprintPanel({ bp, sessionId, onRegenerate, regenerating }: BlueprintPanelProps) {
  const rows = [
    { label: 'ATMOSPHERE',      value: bp.atmosphere,      accent: 'border-[#00d4ff]/25 bg-[#00d4ff]/5'  },
    { label: 'CADENCE ENERGY',  value: bp.cadence_energy,  accent: 'border-purple-500/25 bg-purple-500/5' },
    { label: 'CHORD DIRECTION', value: bp.chord_direction, accent: 'border-[#00d4ff]/25 bg-[#00d4ff]/5'  },
    { label: 'VOCAL ENERGY',    value: bp.vocal_energy,    accent: 'border-purple-500/25 bg-purple-500/5' },
    { label: 'HOOK INTENSITY',  value: bp.hook_intensity,  accent: 'border-[#00ff41]/20 bg-[#00ff41]/5'  },
  ]

  return (
    <div className="border border-[#00d4ff]/20 rounded-lg bg-[#080808] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-mono tracking-[0.25em] text-[#00d4ff]/50 uppercase">
          Blueprint Output
        </div>
        <button
          onClick={() => onRegenerate(sessionId)}
          disabled={regenerating}
          className="text-[10px] font-mono tracking-wider text-purple-400/70 border border-purple-500/20 rounded px-2.5 py-1 hover:bg-purple-500/10 hover:text-purple-400 hover:border-purple-500/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
        >
          {regenerating ? '⟳ ...' : '⟳ REGENERATE'}
        </button>
      </div>

      {/* BPM · Key · Scale */}
      <div className="grid grid-cols-3 gap-2">
        <div className="border border-[#00ff41]/25 bg-[#00ff41]/5 rounded p-3 text-center">
          <div className="text-[9px] font-mono tracking-[0.15em] text-gray-600 uppercase mb-1">BPM</div>
          <div className="text-3xl font-bold font-mono text-[#00ff41]">{bp.bpm}</div>
        </div>
        <div className="border border-[#00d4ff]/25 bg-[#00d4ff]/5 rounded p-3 text-center">
          <div className="text-[9px] font-mono tracking-[0.15em] text-gray-600 uppercase mb-1">KEY</div>
          <div className="text-sm font-bold font-mono text-[#00d4ff] leading-tight">{bp.musical_key}</div>
        </div>
        <div className="border border-purple-500/25 bg-purple-500/5 rounded p-3 text-center">
          <div className="text-[9px] font-mono tracking-[0.15em] text-gray-600 uppercase mb-1">SCALE</div>
          <div className="text-[11px] font-mono text-purple-400 leading-tight">{bp.scale}</div>
        </div>
      </div>

      {/* Detail rows */}
      <div className="space-y-2">
        {rows.map(({ label, value, accent }) => (
          <div key={label} className={`border ${accent} rounded px-3 py-2.5`}>
            <div className="text-[9px] font-mono tracking-[0.15em] text-gray-600 uppercase mb-0.5">{label}</div>
            <div className="text-[11px] font-mono text-gray-300 leading-relaxed">{value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Emotion distribution bars ─────────────────────────────────────────────────

function EmotionDistribution({ rows }: { rows: Array<{ emotion: string; total: number }> }) {
  if (!rows || rows.length === 0) return null
  const maxVal = Math.max(...rows.map((r) => Number(r.total)), 1)

  return (
    <div className="border border-purple-500/15 rounded-lg bg-[#0d0d0d] p-5 space-y-3">
      {rows.map((row) => {
        const pct = Math.round((Number(row.total) / maxVal) * 100)
        const color = EMOTION_COLOR[row.emotion] ?? 'text-gray-500'
        return (
          <div key={row.emotion} className="flex items-center gap-3">
            <div className={`w-24 text-[11px] font-mono flex-shrink-0 ${color}`}>
              {EMOTION_LABELS[row.emotion] ?? row.emotion}
            </div>
            <div className="flex-1 h-1 bg-[#1a1a1a] rounded overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500/70 to-purple-500/30 rounded transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="w-6 text-right text-gray-700 text-[10px] font-mono flex-shrink-0">
              {row.total}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Select helper ─────────────────────────────────────────────────────────────

function MISelect({
  label, value, onChange, options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: Record<string, string>
}) {
  return (
    <div>
      <div className="text-[9px] font-mono tracking-[0.2em] text-gray-600 uppercase mb-1.5">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#0e0e0e] border border-[#00ff41]/15 text-gray-300 text-[11px] font-mono rounded px-3 py-2.5 focus:outline-none focus:border-purple-500/50 hover:border-[#00ff41]/30 transition-colors appearance-none cursor-pointer"
      >
        {Object.entries(options).map(([k, v]) => (
          <option key={k} value={k} className="bg-[#0e0e0e]">{v}</option>
        ))}
      </select>
    </div>
  )
}

// ── Session row ───────────────────────────────────────────────────────────────

function SessionRow({
  session, onSelect, onDelete, deleting,
}: {
  session: any
  onSelect: (s: any) => void
  onDelete: (id: string) => void
  deleting: boolean
}) {
  const emotionColor = EMOTION_COLOR[session.emotion] ?? 'text-gray-500'
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 border border-[#00ff41]/8 rounded hover:border-[#00d4ff]/20 hover:bg-[#00d4ff]/3 transition-all duration-150 group">
      <button
        onClick={() => onSelect(session)}
        className="flex-1 flex items-center gap-3 text-left min-w-0"
      >
        <div className="w-1 h-1 rounded-full bg-[#00ff41]/30 group-hover:bg-[#00d4ff]/60 transition-colors flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-mono text-gray-400 truncate group-hover:text-gray-200 transition-colors">
            {session.name}
          </div>
          <div className="text-[10px] font-mono text-gray-700 mt-0.5">
            {INTENTION_LABELS[session.intention] ?? session.intention}
            {' · '}
            {new Date(session.created_at).toLocaleDateString()}
          </div>
        </div>
        <div className={`text-[10px] font-mono font-semibold tracking-wider flex-shrink-0 ${emotionColor}`}>
          {EMOTION_LABELS[session.emotion] ?? session.emotion}
        </div>
      </button>
      <button
        onClick={() => onDelete(session.id)}
        disabled={deleting}
        className="flex-shrink-0 text-[10px] font-mono text-gray-700 hover:text-red-500/70 disabled:opacity-30 transition-colors px-1"
        title="Delete session"
      >
        ⊗
      </button>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MusicIntelligence() {
  const [artistId, setArtistId]         = useState('')
  const [dashboard, setDashboard]       = useState<any>(null)
  const [memory, setMemory]             = useState<any>(null)
  const [sessions, setSessions]         = useState<any[]>([])
  const [activeBp, setActiveBp]         = useState<any>(null)
  const [activeSessionId, setActiveSessionId] = useState<string>('')
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState('')
  const [submitting, setSubmitting]     = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [deletingId, setDeletingId]     = useState<string>('')
  const [submitError, setSubmitError]   = useState('')

  const [form, setForm] = useState({
    name: '',
    emotion: 'grief',
    intention: 'heal_listener',
    listener_transformation: 'from_pain_to_peace',
    story: '',
  })

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchAll = async () => {
    setLoading(true)
    setError('')
    try {
      const aRes = await artistsApi.list()
      const artistList: any[] = unwrap(aRes.data) ?? []
      const first = artistList.find((a: any) => a.is_active) ?? artistList[0]
      if (!first) { setLoading(false); return }
      const id: string = first.id
      setArtistId(id)

      // Use allSettled so a missing memory record (null 200) never blocks the page
      const [dRes, sRes, mRes] = await Promise.allSettled([
        musicIntelligence.dashboard(id),
        musicIntelligence.listSessions(id),
        musicIntelligence.memory(id),
      ])

      if (dRes.status === 'fulfilled') setDashboard(unwrap(dRes.value.data))
      if (sRes.status === 'fulfilled') setSessions(unwrap(sRes.value.data) ?? [])
      if (mRes.status === 'fulfilled') setMemory(unwrap(mRes.value.data))
    } catch (err: any) {
      if (isCriticalError(err)) {
        setError(err.response?.data?.error ?? err.message ?? 'Failed to load music intelligence')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!artistId || submitting) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const res = await musicIntelligence.createSession({
        ...form,
        artist_id: artistId,
        story: form.story.trim() || undefined,
      })
      const data = unwrap(res.data)
      setActiveBp(data.blueprint)
      setActiveSessionId(data.session.id)
      setSessions((prev) => [data.session, ...prev])
      setDashboard((prev: any) => prev ? {
        ...prev,
        session_count: (prev.session_count ?? 0) + 1,
        blueprint_count: (prev.blueprint_count ?? 0) + 1,
      } : prev)
      setForm((f) => ({ ...f, name: '', story: '' }))
    } catch (err: any) {
      setSubmitError(err.response?.data?.error ?? err.message ?? 'Failed to generate blueprint')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSelectSession = async (session: any) => {
    try {
      const res = await musicIntelligence.getSession(session.id)
      const data = unwrap(res.data)
      setActiveBp(data.blueprint)
      setActiveSessionId(session.id)
    } catch {
      // non-critical
    }
  }

  const handleRegenerate = async (sessionId: string) => {
    if (regenerating) return
    setRegenerating(true)
    setSubmitError('')
    try {
      const res = await musicIntelligence.regenerateBlueprint(sessionId)
      const data = unwrap(res.data)
      setActiveBp(data.blueprint)
      setDashboard((prev: any) => prev ? {
        ...prev,
        blueprint_count: (prev.blueprint_count ?? 0) + 1,
      } : prev)
    } catch (err: any) {
      setSubmitError(err.response?.data?.error ?? 'Failed to regenerate blueprint')
    } finally {
      setRegenerating(false)
    }
  }

  const handleDelete = async (sessionId: string) => {
    if (!window.confirm('Delete this session and its blueprints?')) return
    setDeletingId(sessionId)
    try {
      await musicIntelligence.deleteSession(sessionId)
      setSessions((prev) => prev.filter((s) => s.id !== sessionId))
      if (activeSessionId === sessionId) {
        setActiveBp(null)
        setActiveSessionId('')
      }
      setDashboard((prev: any) => prev ? {
        ...prev,
        session_count: Math.max((prev.session_count ?? 1) - 1, 0),
      } : prev)
    } catch {
      // silent — session list stays intact; user can retry
    } finally {
      setDeletingId('')
    }
  }

  const field = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }))

  // ── Early states ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <LoadingSpinner text="LOADING INTELLIGENCE ENGINE..." />
      </div>
    )
  }

  if (error) return <ErrorMessage message={error} onRetry={fetchAll} />

  if (!artistId) {
    return (
      <EmptyState
        icon="◆"
        title="No artist profile found"
        message="Create an artist profile first to use the Music Intelligence engine."
        color="cyan"
      />
    )
  }

  const emotionDist: Array<{ emotion: string; total: number }> =
    dashboard?.emotion_distribution ?? []

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-1 h-6 bg-purple-500 rounded-full" />
          <h1 className="text-xl font-bold font-mono text-purple-400 tracking-[0.2em]">
            MUSIC INTELLIGENCE
          </h1>
        </div>
        <p className="text-gray-600 text-[11px] font-mono tracking-[0.2em] ml-4">
          EMOTION-TO-BLUEPRINT ENGINE v1
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Creative Sessions"
          value={dashboard?.session_count ?? 0}
          color="purple"
          icon="◈"
        />
        <StatCard
          label="Blueprints Generated"
          value={dashboard?.blueprint_count ?? 0}
          color="cyan"
          icon="◉"
        />
        <StatCard
          label="Dominant Emotion"
          value={EMOTION_LABELS[memory?.dominant_emotion ?? ''] ?? '—'}
          color="orange"
          icon="◆"
        />
        <StatCard
          label="BPM Range"
          value={
            memory?.avg_bpm_min && memory?.avg_bpm_max
              ? `${memory.avg_bpm_min}–${memory.avg_bpm_max}`
              : '—'
          }
          color="green"
          icon="⬡"
        />
      </div>

      {/* Form + Blueprint — two column */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left — create form */}
        <div className="space-y-4">
          <div className="text-[10px] font-mono tracking-[0.25em] text-purple-400/50 uppercase">
            New Session
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="text-[9px] font-mono tracking-[0.2em] text-gray-600 uppercase mb-1.5">
                Session Name
              </div>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => field('name', e.target.value)}
                placeholder="e.g. Late Night Grief"
                maxLength={200}
                className="w-full bg-[#0e0e0e] border border-[#00ff41]/15 text-gray-300 text-[11px] font-mono rounded px-3 py-2.5 placeholder-gray-700 focus:outline-none focus:border-purple-500/50 hover:border-[#00ff41]/30 transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <MISelect
                label="Emotion"
                value={form.emotion}
                onChange={(v) => field('emotion', v)}
                options={EMOTION_LABELS}
              />
              <MISelect
                label="Intention"
                value={form.intention}
                onChange={(v) => field('intention', v)}
                options={INTENTION_LABELS}
              />
            </div>

            <MISelect
              label="Listener Transformation"
              value={form.listener_transformation}
              onChange={(v) => field('listener_transformation', v)}
              options={TRANSFORMATION_LABELS}
            />

            <div>
              <div className="text-[9px] font-mono tracking-[0.2em] text-gray-600 uppercase mb-1.5">
                Story{' '}
                <span className="text-gray-700 normal-case tracking-normal">
                  (optional — shapes blueprint variance)
                </span>
              </div>
              <textarea
                value={form.story}
                onChange={(e) => field('story', e.target.value)}
                placeholder="What is this song about? The more specific, the more unique the blueprint..."
                maxLength={2000}
                rows={4}
                className="w-full bg-[#0e0e0e] border border-[#00ff41]/15 text-gray-300 text-[11px] font-mono rounded px-3 py-2.5 placeholder-gray-700 focus:outline-none focus:border-purple-500/50 hover:border-[#00ff41]/30 transition-colors resize-none leading-relaxed"
              />
              {form.story.length > 0 && (
                <div className="text-right text-[9px] font-mono text-gray-700 mt-1">
                  {form.story.length}/2000
                </div>
              )}
            </div>

            {submitError && (
              <div className="text-[11px] font-mono text-red-400 border border-red-500/20 rounded px-3 py-2 bg-red-500/5">
                ⊗ {submitError}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !form.name.trim()}
              className="w-full py-3 text-[11px] font-mono tracking-[0.2em] border border-purple-500/35 text-purple-400 rounded hover:bg-purple-500/10 hover:border-purple-500/55 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
            >
              {submitting ? '⟳ GENERATING...' : '◆ GENERATE BLUEPRINT'}
            </button>
          </form>

          {/* Artist memory — preferred keys */}
          {memory && memory.preferred_keys && (memory.preferred_keys as string[]).length > 0 && (
            <div className="border border-[#00ff41]/10 rounded p-4 space-y-2">
              <div className="text-[9px] font-mono tracking-[0.2em] text-[#00ff41]/40 uppercase">
                Artist Memory — Preferred Keys
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(memory.preferred_keys as string[]).slice(0, 8).map((k: string) => (
                  <span
                    key={k}
                    className="text-[10px] font-mono text-[#00ff41]/60 border border-[#00ff41]/15 rounded px-2 py-0.5"
                  >
                    {k}
                  </span>
                ))}
              </div>
              {memory.last_session_at && (
                <div className="text-[9px] font-mono text-gray-700">
                  Last session: {new Date(memory.last_session_at).toLocaleDateString()}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right — blueprint output */}
        <div className="space-y-4">
          <div className="text-[10px] font-mono tracking-[0.25em] text-[#00d4ff]/50 uppercase">
            Blueprint Output
          </div>

          {activeBp ? (
            <BlueprintPanel
              bp={activeBp}
              sessionId={activeSessionId}
              onRegenerate={handleRegenerate}
              regenerating={regenerating}
            />
          ) : (
            <div className="border border-dashed border-[#00d4ff]/12 rounded-lg p-14 flex flex-col items-center justify-center text-center">
              <div className="text-4xl mb-3 text-[#00d4ff]/15">◉</div>
              <div className="text-[11px] font-mono text-gray-700 tracking-wider leading-relaxed">
                Generate a session to see<br />the musical blueprint
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Emotion distribution */}
      {emotionDist.length > 0 && (
        <div className="space-y-3">
          <div className="text-[10px] font-mono tracking-[0.25em] text-purple-400/40 uppercase">
            Emotion Distribution
          </div>
          <EmotionDistribution rows={emotionDist} />
        </div>
      )}

      {/* Session history */}
      <div className="space-y-3">
        <div className="text-[10px] font-mono tracking-[0.25em] text-[#00ff41]/35 uppercase">
          Session History
        </div>

        {sessions.length === 0 ? (
          <EmptyState
            icon="◈"
            title="No sessions yet"
            message="Generate your first blueprint to start building your creative history."
            color="green"
          />
        ) : (
          <div className="space-y-1">
            {sessions.map((s: any) => (
              <SessionRow
                key={s.id}
                session={s}
                onSelect={handleSelectSession}
                onDelete={handleDelete}
                deleting={deletingId === s.id}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
