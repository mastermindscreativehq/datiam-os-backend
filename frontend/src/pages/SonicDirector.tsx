import { useState, useEffect, useCallback } from 'react'
import { artists, sonicDirector, sonicMemory } from '../api/client'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ArtistData { id: string; stage_name: string }

interface Recommendation {
  id: string
  recommendation_type: string
  title: string
  description: string
  rationale: string
  confidence_score: string
  priority_rank: number
  target_emotion: string | null
  target_bpm_min: number | null
  target_bpm_max: number | null
  target_key: string | null
  target_scale: string | null
  target_genre: string | null
  direction_parameters: Record<string, unknown> | null
  based_on_count: number
  generated_at: string
}

interface DirectorMeta {
  total_blueprints_analyzed: number
  dominant_emotion: string
  dominant_genre: string
  avg_bpm: number
  avg_coherence: number
  coherence_trend: string
  evolution_stage: string
  base_confidence: number
}

interface Mission {
  id: string
  mission_type: string
  title: string
  description: string
  status: string
  start_score: string
  current_score: string
  target_score: string
  progress_percentage: string
  blueprint_count_at_start: number
  created_at: string
  completed_at: string | null
}

interface GapEmotion { emotion: string; count: number; pct: number; severity: string; recommendation: string }
interface GapBpm { label: string; min: number; max: number; count: number; pct: number; severity: string; recommendation: string }
interface GapAtmosphere { keyword: string; count: number; pct: number; severity: string; recommendation: string }
interface HarmonicStagnation {
  dominant_key: string; dominant_key_pct: number
  dominant_scale: string; dominant_scale_pct: number
  keys_used: number; key_diversity_score: number
  unused_keys: string[]; unused_scales: string[]
  stagnation_level: string; recommendation: string
}
interface GapData {
  gap_score: string
  total_blueprints_analyzed: number
  analyzed_at: string
  underexplored_emotions: GapEmotion[] | null
  overused_bpm_ranges: GapBpm[] | null
  repetitive_atmospheres: GapAtmosphere[] | null
  harmonic_stagnation: HarmonicStagnation | null
}

interface SimulationSummary {
  id: string; blueprint_id: string
  overall_release_score: string; commercial_score: string; sync_score: string
  crowd_energy: string; replayability_prediction: string
  emotional_stickiness: string; cinematic_potential: string
  confidence_score: string; simulated_at: string
  primary_genre: string; bpm: number; musical_key: string
}

interface FullSimulation extends SimulationSummary {
  sync_tags: string[] | null
  producer_compatibility: { name: string; style_tags: string[]; compatibility_score: number; match_reason: string }[] | null
  simulation_notes: string
}

interface EvolutionStage {
  label: string; start_idx: number; end_idx: number; count: number
  avg_coherence: number; avg_commercial: number
  dominant_emotion: string; dominant_genre: string
}

interface EvolutionMap {
  timeline: { position: number; date: string; blueprint_id: string; emotion: string; genre: string; bpm: number; key: string; coherence: number; commercial: number }[]
  genre_clusters: { genre: string; count: number; avg_coherence: number; start_idx: number; end_idx: number }[]
  emotional_territory: { emotion: string; count: number; avg_commercial: number; avg_coherence: number; first_seen: number; last_seen: number }[]
  evolution_stages: EvolutionStage[]
}

type Tab = 'director' | 'missions' | 'gaps' | 'simulator' | 'evolution'

// ─── Colors ───────────────────────────────────────────────────────────────────

const EMOTION_COLORS: Record<string, string> = {
  grief: '#64748b', trauma: '#7c3aed', rage: '#ef4444', joy: '#f59e0b',
  melancholy: '#6366f1', euphoria: '#10b981', anxiety: '#f97316', longing: '#8b5cf6',
  triumph: '#00d4ff', nostalgia: '#d97706', peace: '#22c55e', defiance: '#ef4444',
}

const REC_COLORS: Record<string, { bg: string; border: string; text: string; label: string }> = {
  strength:    { bg: '#00ff4110', border: '#00ff41/30', text: '#00ff41', label: 'LEAN IN' },
  exploration: { bg: '#00d4ff10', border: '#00d4ff/30', text: '#00d4ff', label: 'EXPLORE' },
  evolution:   { bg: '#a855f710', border: '#a855f7/30', text: '#a855f7', label: 'EVOLVE' },
  commercial:  { bg: '#f59e0b10', border: '#f59e0b/30', text: '#f59e0b', label: 'COMMERCIAL' },
  signature:   { bg: '#ec489910', border: '#ec4899/30', text: '#ec4899', label: 'SIGNATURE' },
}

const MISSION_COLORS: Record<string, string> = {
  commercial_growth:    '#f59e0b',
  emotional_intensity:  '#ef4444',
  replayability:        '#00d4ff',
  live_performance:     '#00ff41',
  sync_optimization:    '#a855f7',
}

const MISSION_ICONS: Record<string, string> = {
  commercial_growth:    '◆',
  emotional_intensity:  '❤',
  replayability:        '↺',
  live_performance:     '⬡',
  sync_optimization:    '◈',
}

const GAP_SEVERITY_COLORS: Record<string, string> = {
  unexplored:    '#ef4444',
  underexplored: '#f97316',
  sparse:        '#f59e0b',
  explored:      '#00ff41',
  overused:      '#ef4444',
  dominant:      '#f97316',
  moderate:      '#f59e0b',
  underused:     '#00d4ff',
  high:          '#ef4444',
  healthy:       '#00ff41',
}

// ─── Helper Components ────────────────────────────────────────────────────────

function ScoreBar({ value, color = '#00ff41', label }: { value: number | string; color?: string; label?: string }) {
  const v = Math.min(100, Math.max(0, Number(value)))
  return (
    <div className="space-y-1">
      {label && <div className="flex justify-between text-[9px] font-mono text-gray-500 uppercase tracking-widest">
        <span>{label}</span><span style={{ color }}>{v.toFixed(0)}</span>
      </div>}
      <div className="h-1.5 bg-[#111] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${v}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

function ConfidencePip({ score }: { score: number | string }) {
  const v = Math.round(Number(score) * 100)
  const color = v >= 80 ? '#00ff41' : v >= 60 ? '#f59e0b' : '#ef4444'
  return (
    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border" style={{ color, borderColor: `${color}40`, background: `${color}10` }}>
      {v}% CONF
    </span>
  )
}

function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-4xl mb-4 opacity-30">{icon}</div>
      <div className="text-[#00ff41]/30 font-mono text-sm tracking-widest">{message}</div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SonicDirector() {
  const [artistList, setArtistList]         = useState<ArtistData[]>([])
  const [selectedArtist, setSelectedArtist] = useState<string>('')
  const [tab, setTab]                       = useState<Tab>('director')

  // Director state
  const [recs, setRecs]         = useState<Recommendation[]>([])
  const [dirMeta, setDirMeta]   = useState<DirectorMeta | null>(null)
  const [dirLoading, setDirLoading] = useState(false)

  // Missions state
  const [missions, setMissions]         = useState<Mission[]>([])
  const [missionsLoading, setMissionsLoading] = useState(false)

  // Gap analysis state
  const [gapData, setGapData]       = useState<GapData | null>(null)
  const [gapLoading, setGapLoading] = useState(false)

  // Simulator state
  const [simList, setSimList]     = useState<SimulationSummary[]>([])
  const [selectedBp, setSelectedBp] = useState<string>('')
  const [fullSim, setFullSim]     = useState<FullSimulation | null>(null)
  const [simulating, setSimulating] = useState(false)

  // Evolution map state
  const [evoMap, setEvoMap]         = useState<EvolutionMap | null>(null)
  const [evoLoading, setEvoLoading] = useState(false)

  const [error, setError] = useState<string | null>(null)

  // Load artists
  useEffect(() => {
    artists.list().then(r => {
      setArtistList(r.data?.data ?? [])
      const first = r.data?.data?.[0]?.id
      if (first) setSelectedArtist(first)
    }).catch(() => {})
  }, [])

  // When artist changes, load relevant tab data
  const loadDirector = useCallback(async (id: string) => {
    if (!id) return
    try {
      const r = await sonicDirector.getRecommendations(id)
      setRecs(r.data?.data ?? [])
    } catch {}
  }, [])

  const loadMissions = useCallback(async (id: string) => {
    if (!id) return
    setMissionsLoading(true)
    try {
      const r = await sonicDirector.getMissions(id)
      setMissions(r.data?.data ?? [])
    } catch {} finally { setMissionsLoading(false) }
  }, [])

  const loadGaps = useCallback(async (id: string) => {
    if (!id) return
    try {
      const r = await sonicDirector.getGapAnalysis(id)
      setGapData(r.data?.data ?? null)
    } catch {}
  }, [])

  const loadSimulations = useCallback(async (id: string) => {
    if (!id) return
    try {
      const r = await sonicDirector.getArtistSimulations(id)
      setSimList(r.data?.data ?? [])
    } catch {}
  }, [])

  const loadEvolutionMap = useCallback(async (id: string) => {
    if (!id) return
    setEvoLoading(true)
    try {
      const r = await sonicDirector.getEvolutionMap(id)
      setEvoMap(r.data?.data ?? null)
    } catch {} finally { setEvoLoading(false) }
  }, [])

  useEffect(() => {
    if (!selectedArtist) return
    loadDirector(selectedArtist)
    loadMissions(selectedArtist)
    loadGaps(selectedArtist)
    loadSimulations(selectedArtist)
    loadEvolutionMap(selectedArtist)
  }, [selectedArtist])

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleGenerateDirector = async () => {
    if (!selectedArtist) return
    setDirLoading(true); setError(null)
    try {
      const r = await sonicDirector.generate(selectedArtist)
      setRecs(r.data?.data?.recommendations ?? [])
      setDirMeta(r.data?.data?.meta ?? null)
    } catch (e: any) {
      setError(e.response?.data?.error ?? 'Director generation failed')
    } finally { setDirLoading(false) }
  }

  const handleActivateMission = async (type: string) => {
    if (!selectedArtist) return
    try {
      await sonicDirector.activateMission(selectedArtist, type)
      loadMissions(selectedArtist)
    } catch (e: any) { setError(e.response?.data?.error ?? 'Failed to activate mission') }
  }

  const handleUpdateProgress = async () => {
    if (!selectedArtist) return
    try {
      await sonicDirector.updateProgress(selectedArtist)
      loadMissions(selectedArtist)
    } catch (e: any) { setError(e.response?.data?.error ?? 'Failed to update progress') }
  }

  const handleAbandonMission = async (id: string) => {
    try {
      await sonicDirector.abandonMission(id)
      loadMissions(selectedArtist)
    } catch (e: any) { setError(e.response?.data?.error ?? 'Failed to abandon mission') }
  }

  const handleRunGapAnalysis = async () => {
    if (!selectedArtist) return
    setGapLoading(true); setError(null)
    try {
      const r = await sonicDirector.runGapAnalysis(selectedArtist)
      setGapData(r.data?.data ?? null)
    } catch (e: any) { setError(e.response?.data?.error ?? 'Gap analysis failed') }
    finally { setGapLoading(false) }
  }

  const handleSimulate = async () => {
    if (!selectedBp || !selectedArtist) return
    setSimulating(true); setError(null); setFullSim(null)
    try {
      const r = await sonicDirector.simulateRelease(selectedBp, selectedArtist)
      setFullSim(r.data?.data ?? null)
      loadSimulations(selectedArtist)
    } catch (e: any) { setError(e.response?.data?.error ?? 'Simulation failed') }
    finally { setSimulating(false) }
  }

  const handleLoadExistingSim = async (bpId: string) => {
    setSelectedBp(bpId)
    try {
      const r = await sonicDirector.getSimulation(bpId)
      setFullSim(r.data?.data ?? null)
    } catch { setFullSim(null) }
  }

  // ── Render helpers ────────────────────────────────────────────────────────

  const artistName = artistList.find(a => a.id === selectedArtist)?.stage_name ?? ''

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'director',  label: 'DIRECTOR',  icon: '◆' },
    { id: 'missions',  label: 'MISSIONS',  icon: '◎' },
    { id: 'gaps',      label: 'GAP MAP',   icon: '◈' },
    { id: 'simulator', label: 'SIMULATOR', icon: '⬡' },
    { id: 'evolution', label: 'EVOLUTION', icon: '◉' },
  ]

  const MISSION_TYPES = [
    { type: 'commercial_growth',   label: 'Commercial Growth',   desc: 'Target commercial_accessibility 75+' },
    { type: 'emotional_intensity', label: 'Emotional Intensity',  desc: 'Target emotional_rawness 80+' },
    { type: 'replayability',       label: 'Replayability',        desc: 'Target replayability score 70+' },
    { type: 'live_performance',    label: 'Live Performance',      desc: 'Optimize for crowd and stage energy' },
    { type: 'sync_optimization',   label: 'Sync Licensing',        desc: 'Maximize cinematic + commercial score' },
  ]

  return (
    <div className="p-6 space-y-6 max-w-6xl">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[#00ff41] font-mono text-xl font-bold tracking-widest text-glow-green">
            SONIC DIRECTOR
          </h1>
          <p className="text-[#00d4ff]/40 text-[10px] font-mono tracking-[0.2em] mt-1">
            STRATEGIC CREATIVE ENGINE — PHASE 4
          </p>
        </div>
        <select
          value={selectedArtist}
          onChange={e => setSelectedArtist(e.target.value)}
          className="bg-[#0c0c0c] border border-[#00ff41]/20 text-[#00ff41] font-mono text-xs px-3 py-2 rounded focus:outline-none focus:border-[#00ff41]/50"
        >
          <option value="">— SELECT ARTIST —</option>
          {artistList.map(a => (
            <option key={a.id} value={a.id}>{a.stage_name}</option>
          ))}
        </select>
      </div>

      {/* ── Error ───────────────────────────────────────────────────────────── */}
      {error && (
        <div className="border border-red-500/30 bg-red-500/5 rounded p-3 text-red-400 font-mono text-xs">
          ⚠ {error}
        </div>
      )}

      {!selectedArtist ? (
        <EmptyState icon="◆" message="SELECT AN ARTIST TO ACTIVATE SONIC DIRECTOR" />
      ) : (
        <>
          {/* ── Tab Navigation ──────────────────────────────────────────────── */}
          <div className="flex gap-1 border-b border-[#00ff41]/10 pb-0">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2.5 text-[10px] font-mono tracking-[0.15em] transition-all border-b-2 -mb-px ${
                  tab === t.id
                    ? 'text-[#00ff41] border-[#00ff41]'
                    : 'text-gray-600 border-transparent hover:text-[#00d4ff]'
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* ── DIRECTOR TAB ────────────────────────────────────────────────── */}
          {tab === 'director' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-[#00ff41]/50 font-mono text-[10px] tracking-widest">
                  NEXT BEST SONIC DIRECTION — {artistName.toUpperCase()}
                </div>
                <button
                  onClick={handleGenerateDirector}
                  disabled={dirLoading}
                  className="px-4 py-2 text-[10px] font-mono tracking-widest border border-[#00ff41]/30 text-[#00ff41]/70 rounded hover:bg-[#00ff41]/10 hover:text-[#00ff41] hover:border-[#00ff41]/60 transition-all disabled:opacity-40"
                >
                  {dirLoading ? '◌ COMPUTING...' : '◆ GENERATE DIRECTIONS'}
                </button>
              </div>

              {dirMeta && (
                <div className="grid grid-cols-6 gap-2">
                  {[
                    { label: 'BLUEPRINTS', val: dirMeta.total_blueprints_analyzed },
                    { label: 'DOMINANT', val: dirMeta.dominant_emotion?.toUpperCase() },
                    { label: 'GENRE', val: dirMeta.dominant_genre?.split(' ')[0].toUpperCase() },
                    { label: 'AVG BPM', val: dirMeta.avg_bpm },
                    { label: 'TREND', val: dirMeta.coherence_trend?.toUpperCase() },
                    { label: 'STAGE', val: dirMeta.evolution_stage?.toUpperCase() },
                  ].map(({ label, val }) => (
                    <div key={label} className="bg-[#0c0c0c] border border-[#00ff41]/10 rounded p-2 text-center">
                      <div className="text-[8px] font-mono text-[#00ff41]/30 tracking-widest mb-1">{label}</div>
                      <div className="text-[#00d4ff] font-mono text-[11px] font-bold">{val}</div>
                    </div>
                  ))}
                </div>
              )}

              {recs.length === 0 ? (
                <EmptyState icon="◆" message="GENERATE DIRECTOR ANALYSIS TO SEE RECOMMENDATIONS" />
              ) : (
                <div className="space-y-3">
                  {recs.map(rec => {
                    const colors = REC_COLORS[rec.recommendation_type] ?? REC_COLORS['signature']
                    return (
                      <div
                        key={rec.id}
                        className="border rounded-lg p-4 space-y-3"
                        style={{ borderColor: `${colors.text}30`, background: `${colors.text}08` }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2 flex-1">
                            <span
                              className="text-[8px] font-mono px-1.5 py-0.5 rounded border shrink-0"
                              style={{ color: colors.text, borderColor: `${colors.text}40`, background: `${colors.text}15` }}
                            >
                              {colors.label}
                            </span>
                            <span className="font-mono text-[13px] font-semibold" style={{ color: colors.text }}>
                              {rec.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <ConfidencePip score={rec.confidence_score} />
                            <span className="text-[8px] font-mono text-gray-600">#{rec.priority_rank}</span>
                          </div>
                        </div>

                        <p className="text-gray-400 text-[11px] font-mono leading-relaxed">{rec.description}</p>

                        <div className="bg-[#060606] border border-[#ffffff08] rounded p-2.5">
                          <div className="text-[8px] font-mono text-gray-600 tracking-widest mb-1">RATIONALE</div>
                          <p className="text-gray-500 text-[10px] font-mono leading-relaxed">{rec.rationale}</p>
                        </div>

                        <div className="grid grid-cols-3 gap-2 mt-2">
                          {rec.target_emotion && (
                            <div className="bg-[#060606] border border-[#ffffff08] rounded p-2">
                              <div className="text-[8px] font-mono text-gray-600 tracking-widest mb-1">EMOTION</div>
                              <span className="text-[10px] font-mono font-semibold capitalize" style={{ color: EMOTION_COLORS[rec.target_emotion] ?? '#00d4ff' }}>
                                {rec.target_emotion}
                              </span>
                            </div>
                          )}
                          {rec.target_bpm_min !== null && rec.target_bpm_max !== null && (
                            <div className="bg-[#060606] border border-[#ffffff08] rounded p-2">
                              <div className="text-[8px] font-mono text-gray-600 tracking-widest mb-1">BPM RANGE</div>
                              <span className="text-[10px] font-mono text-[#00d4ff]">{rec.target_bpm_min}–{rec.target_bpm_max}</span>
                            </div>
                          )}
                          {rec.target_key && rec.target_scale && (
                            <div className="bg-[#060606] border border-[#ffffff08] rounded p-2">
                              <div className="text-[8px] font-mono text-gray-600 tracking-widest mb-1">HARMONIC</div>
                              <span className="text-[10px] font-mono text-[#00d4ff]">{rec.target_key} {rec.target_scale}</span>
                            </div>
                          )}
                        </div>

                        {rec.direction_parameters && (rec.direction_parameters as any).notes && (
                          <div className="text-[10px] font-mono text-[#00ff41]/40 border-t border-[#ffffff05] pt-2">
                            ◌ {(rec.direction_parameters as any).notes}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── MISSIONS TAB ────────────────────────────────────────────────── */}
          {tab === 'missions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-[#00ff41]/50 font-mono text-[10px] tracking-widest">SONIC MISSIONS — {artistName.toUpperCase()}</div>
                <button
                  onClick={handleUpdateProgress}
                  className="px-3 py-1.5 text-[10px] font-mono tracking-widest border border-[#00d4ff]/30 text-[#00d4ff]/70 rounded hover:bg-[#00d4ff]/10 hover:text-[#00d4ff] transition-all"
                >
                  ↺ SYNC PROGRESS
                </button>
              </div>

              {/* Available missions to activate */}
              <div className="grid grid-cols-5 gap-2">
                {MISSION_TYPES.map(m => {
                  const active = missions.find(ms => ms.mission_type === m.type && ms.status === 'active')
                  const done   = missions.find(ms => ms.mission_type === m.type && ms.status === 'completed')
                  const color  = MISSION_COLORS[m.type] ?? '#00ff41'
                  return (
                    <button
                      key={m.type}
                      onClick={() => !active && !done && handleActivateMission(m.type)}
                      disabled={!!active || !!done}
                      className="border rounded p-2.5 text-left transition-all disabled:opacity-50"
                      style={{ borderColor: `${color}${active ? '50' : '20'}`, background: `${color}${active ? '12' : '05'}` }}
                    >
                      <div className="text-base mb-1" style={{ color }}>{MISSION_ICONS[m.type]}</div>
                      <div className="text-[9px] font-mono font-bold tracking-widest mb-1" style={{ color }}>{m.label.toUpperCase()}</div>
                      <div className="text-[8px] font-mono text-gray-600">{m.desc}</div>
                      {active && <div className="text-[8px] font-mono mt-1" style={{ color }}>● ACTIVE</div>}
                      {done  && <div className="text-[8px] font-mono mt-1 text-[#00ff41]">✓ DONE</div>}
                      {!active && !done && <div className="text-[8px] font-mono mt-1 text-gray-600">+ ACTIVATE</div>}
                    </button>
                  )
                })}
              </div>

              {missionsLoading ? (
                <EmptyState icon="◌" message="LOADING MISSIONS..." />
              ) : missions.length === 0 ? (
                <EmptyState icon="◎" message="NO ACTIVE MISSIONS — ACTIVATE A MISSION ABOVE" />
              ) : (
                <div className="space-y-3">
                  {missions.map(m => {
                    const color   = MISSION_COLORS[m.mission_type] ?? '#00ff41'
                    const pct     = Math.min(100, parseFloat(m.progress_percentage))
                    const current = parseFloat(m.current_score)
                    const target  = parseFloat(m.target_score)
                    const start   = parseFloat(m.start_score)
                    return (
                      <div key={m.id} className="border rounded-lg p-4" style={{ borderColor: `${color}25`, background: `${color}06` }}>
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono text-[12px] font-bold" style={{ color }}>{MISSION_ICONS[m.mission_type]} {m.title}</span>
                              <span
                                className="text-[8px] font-mono px-1.5 py-0.5 rounded border"
                                style={{
                                  color: m.status === 'completed' ? '#00ff41' : m.status === 'abandoned' ? '#ef4444' : color,
                                  borderColor: `${m.status === 'completed' ? '#00ff41' : m.status === 'abandoned' ? '#ef4444' : color}40`,
                                }}
                              >
                                {m.status.toUpperCase()}
                              </span>
                            </div>
                            <p className="text-[10px] font-mono text-gray-500">{m.description}</p>
                          </div>
                          {m.status === 'active' && (
                            <button
                              onClick={() => handleAbandonMission(m.id)}
                              className="text-[9px] font-mono text-red-500/50 hover:text-red-500 border border-red-500/20 hover:border-red-500/50 px-2 py-1 rounded transition-all"
                            >
                              ABANDON
                            </button>
                          )}
                        </div>

                        {/* Progress */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-[9px] font-mono text-gray-600">
                            <span>START: {start.toFixed(1)}</span>
                            <span style={{ color }}>{current.toFixed(1)} / {target.toFixed(0)}</span>
                            <span>{pct.toFixed(0)}%</span>
                          </div>
                          <div className="h-2 bg-[#111] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-1000"
                              style={{ width: `${pct}%`, backgroundColor: color }}
                            />
                          </div>
                        </div>

                        {m.completed_at && (
                          <div className="text-[9px] font-mono text-[#00ff41]/50 mt-2">
                            ✓ COMPLETED {new Date(m.completed_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── GAP ANALYSIS TAB ────────────────────────────────────────────── */}
          {tab === 'gaps' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-[#00ff41]/50 font-mono text-[10px] tracking-widest">SONIC GAP ANALYSIS — {artistName.toUpperCase()}</div>
                <button
                  onClick={handleRunGapAnalysis}
                  disabled={gapLoading}
                  className="px-4 py-2 text-[10px] font-mono tracking-widest border border-[#00d4ff]/30 text-[#00d4ff]/70 rounded hover:bg-[#00d4ff]/10 hover:text-[#00d4ff] transition-all disabled:opacity-40"
                >
                  {gapLoading ? '◌ SCANNING...' : '◈ RUN GAP SCAN'}
                </button>
              </div>

              {!gapData ? (
                <EmptyState icon="◈" message="RUN GAP SCAN TO DETECT CREATIVE BLIND SPOTS" />
              ) : (
                <div className="space-y-5">
                  {/* Gap Score */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-[#0c0c0c] border border-[#00ff41]/10 rounded p-3 text-center">
                      <div className="text-[8px] font-mono text-gray-600 tracking-widest mb-2">GAP SCORE</div>
                      <div
                        className="text-3xl font-mono font-bold"
                        style={{ color: Number(gapData.gap_score) > 50 ? '#ef4444' : Number(gapData.gap_score) > 25 ? '#f59e0b' : '#00ff41' }}
                      >
                        {parseFloat(gapData.gap_score).toFixed(0)}
                      </div>
                      <div className="text-[8px] font-mono text-gray-600 mt-1">/ 100</div>
                    </div>
                    <div className="bg-[#0c0c0c] border border-[#00ff41]/10 rounded p-3 text-center">
                      <div className="text-[8px] font-mono text-gray-600 tracking-widest mb-2">BLUEPRINTS</div>
                      <div className="text-2xl font-mono font-bold text-[#00d4ff]">{gapData.total_blueprints_analyzed}</div>
                      <div className="text-[8px] font-mono text-gray-600 mt-1">ANALYZED</div>
                    </div>
                    <div className="bg-[#0c0c0c] border border-[#00ff41]/10 rounded p-3 text-center">
                      <div className="text-[8px] font-mono text-gray-600 tracking-widest mb-2">LAST SCAN</div>
                      <div className="text-[11px] font-mono text-[#00ff41]/60">{new Date(gapData.analyzed_at).toLocaleDateString()}</div>
                      <div className="text-[8px] font-mono text-gray-600 mt-1">{new Date(gapData.analyzed_at).toLocaleTimeString()}</div>
                    </div>
                  </div>

                  {/* Emotional Zones */}
                  {gapData.underexplored_emotions && (
                    <div>
                      <div className="text-[#00ff41]/50 font-mono text-[10px] tracking-widest mb-2">EMOTIONAL ZONE COVERAGE</div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(gapData.underexplored_emotions as GapEmotion[]).slice(0, 12).map(e => (
                          <div key={e.emotion} className="bg-[#0c0c0c] border border-[#ffffff08] rounded p-2 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: GAP_SEVERITY_COLORS[e.severity] ?? '#555' }} />
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-[9px] font-mono text-gray-400 capitalize">{e.emotion}</span>
                                <span className="text-[8px] font-mono" style={{ color: GAP_SEVERITY_COLORS[e.severity] ?? '#555' }}>
                                  {e.pct.toFixed(0)}%
                                </span>
                              </div>
                              <div className="h-1 bg-[#111] rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${e.pct}%`, backgroundColor: EMOTION_COLORS[e.emotion] ?? '#555' }} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* BPM Ranges */}
                  {gapData.overused_bpm_ranges && (
                    <div>
                      <div className="text-[#00ff41]/50 font-mono text-[10px] tracking-widest mb-2">BPM RANGE DISTRIBUTION</div>
                      <div className="space-y-1.5">
                        {(gapData.overused_bpm_ranges as GapBpm[]).map(b => (
                          <div key={b.label} className="flex items-center gap-3">
                            <div className="text-[9px] font-mono text-gray-500 w-28 shrink-0">{b.label}</div>
                            <div className="flex-1 h-3 bg-[#111] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${b.pct}%`,
                                  backgroundColor: GAP_SEVERITY_COLORS[b.severity] ?? '#555',
                                }}
                              />
                            </div>
                            <div className="text-[9px] font-mono w-8 text-right" style={{ color: GAP_SEVERITY_COLORS[b.severity] ?? '#555' }}>
                              {b.pct.toFixed(0)}%
                            </div>
                            <div className="text-[8px] font-mono text-gray-600 w-20 shrink-0 capitalize">{b.severity}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Harmonic Stagnation */}
                  {gapData.harmonic_stagnation && (
                    <div>
                      <div className="text-[#00ff41]/50 font-mono text-[10px] tracking-widest mb-2">HARMONIC STAGNATION</div>
                      <div className="bg-[#0c0c0c] border border-[#ffffff08] rounded p-3 space-y-2">
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <div className="text-[8px] font-mono text-gray-600 mb-1">DOMINANT KEY</div>
                            <div className="text-[#00d4ff] font-mono text-sm font-bold">{gapData.harmonic_stagnation.dominant_key}</div>
                            <div className="text-[8px] font-mono text-gray-600">{gapData.harmonic_stagnation.dominant_key_pct.toFixed(0)}% of blueprints</div>
                          </div>
                          <div>
                            <div className="text-[8px] font-mono text-gray-600 mb-1">DOMINANT SCALE</div>
                            <div className="text-[#00d4ff] font-mono text-sm font-bold">{gapData.harmonic_stagnation.dominant_scale}</div>
                            <div className="text-[8px] font-mono text-gray-600">{gapData.harmonic_stagnation.dominant_scale_pct.toFixed(0)}% of blueprints</div>
                          </div>
                          <div>
                            <div className="text-[8px] font-mono text-gray-600 mb-1">KEY DIVERSITY</div>
                            <div style={{ color: GAP_SEVERITY_COLORS[gapData.harmonic_stagnation.stagnation_level] ?? '#00ff41' }} className="font-mono text-sm font-bold">
                              {gapData.harmonic_stagnation.keys_used} / 12
                            </div>
                            <div className="text-[8px] font-mono text-gray-600">keys explored</div>
                          </div>
                        </div>
                        <ScoreBar value={gapData.harmonic_stagnation.key_diversity_score} color="#00d4ff" label="KEY DIVERSITY SCORE" />
                        <div className="text-[9px] font-mono text-gray-500 mt-2">◌ {gapData.harmonic_stagnation.recommendation}</div>
                        {gapData.harmonic_stagnation.unused_keys.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {gapData.harmonic_stagnation.unused_keys.map(k => (
                              <span key={k} className="text-[8px] font-mono text-[#00d4ff]/50 border border-[#00d4ff]/15 px-1.5 py-0.5 rounded">{k}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Atmosphere keywords */}
                  {gapData.repetitive_atmospheres && (gapData.repetitive_atmospheres as GapAtmosphere[]).length > 0 && (
                    <div>
                      <div className="text-[#00ff41]/50 font-mono text-[10px] tracking-widest mb-2">ATMOSPHERE KEYWORD REPETITION</div>
                      <div className="flex flex-wrap gap-2">
                        {(gapData.repetitive_atmospheres as GapAtmosphere[]).map(a => (
                          <div
                            key={a.keyword}
                            className="text-[9px] font-mono px-2 py-1 rounded border"
                            style={{
                              color: GAP_SEVERITY_COLORS[a.severity] ?? '#555',
                              borderColor: `${GAP_SEVERITY_COLORS[a.severity] ?? '#555'}40`,
                              background: `${GAP_SEVERITY_COLORS[a.severity] ?? '#555'}10`,
                            }}
                          >
                            {a.keyword} {a.pct.toFixed(0)}%
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── SIMULATOR TAB ───────────────────────────────────────────────── */}
          {tab === 'simulator' && (
            <div className="space-y-4">
              <div className="text-[#00ff41]/50 font-mono text-[10px] tracking-widest">RELEASE SIMULATOR — {artistName.toUpperCase()}</div>

              {/* Blueprint selector — timeline entries are the source of truth */}
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <div className="text-[9px] font-mono text-gray-600 tracking-widest mb-1">SELECT BLUEPRINT TO SIMULATE</div>
                  <select
                    value={selectedBp}
                    onChange={e => { setSelectedBp(e.target.value); setFullSim(null) }}
                    className="w-full bg-[#0c0c0c] border border-[#00d4ff]/20 text-[#00d4ff] font-mono text-xs px-3 py-2 rounded focus:outline-none focus:border-[#00d4ff]/50"
                  >
                    <option value="">— SELECT BLUEPRINT —</option>
                    {/* Timeline entries = all generated blueprints */}
                    {evoMap?.timeline.map((pt, i) => {
                      const simmed = simList.find(s => s.blueprint_id === pt.blueprint_id)
                      return (
                        <option key={pt.blueprint_id} value={pt.blueprint_id}>
                          #{i + 1} {pt.genre} • {pt.bpm} BPM • {pt.key}
                          {simmed ? ` — Score: ${parseFloat(simmed.overall_release_score).toFixed(0)}` : ' — unsimulated'}
                        </option>
                      )
                    })}
                  </select>
                </div>
                <button
                  onClick={handleSimulate}
                  disabled={!selectedBp || simulating}
                  className="px-4 py-2 text-[10px] font-mono tracking-widest border border-[#00d4ff]/30 text-[#00d4ff]/70 rounded hover:bg-[#00d4ff]/10 hover:text-[#00d4ff] transition-all disabled:opacity-40"
                >
                  {simulating ? '◌ SIMULATING...' : '⬡ SIMULATE RELEASE'}
                </button>
                {selectedBp && (
                  <button
                    onClick={() => handleLoadExistingSim(selectedBp)}
                    className="px-3 py-2 text-[10px] font-mono tracking-widest border border-[#ffffff10] text-gray-500 rounded hover:text-gray-300 hover:border-[#ffffff20] transition-all"
                  >
                    LOAD
                  </button>
                )}
              </div>

              {!fullSim && (!evoMap || evoMap.timeline.length === 0) ? (
                <EmptyState icon="⬡" message="GENERATE SONIC BLUEPRINTS FIRST, THEN SIMULATE RELEASES" />
              ) : !fullSim ? (
                <div className="space-y-2">
                  {simList.length > 0 && (
                    <>
                      <div className="text-[#00ff41]/30 font-mono text-[9px] tracking-widest mb-2">COMPLETED SIMULATIONS</div>
                      {simList.map(s => (
                        <button
                          key={s.id}
                          onClick={() => handleLoadExistingSim(s.blueprint_id)}
                          className="w-full border border-[#ffffff08] rounded p-3 text-left hover:border-[#00d4ff]/20 hover:bg-[#00d4ff]/5 transition-all"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-mono text-[11px] text-gray-300">{s.primary_genre} — {s.bpm} BPM — {s.musical_key}</span>
                            <span className="font-mono text-[11px]" style={{ color: Number(s.overall_release_score) > 70 ? '#00ff41' : '#f59e0b' }}>
                              {parseFloat(s.overall_release_score).toFixed(0)} ORS
                            </span>
                          </div>
                        </button>
                      ))}
                    </>
                  )}
                  {simList.length === 0 && (
                    <div className="text-[#00d4ff]/30 font-mono text-[10px] text-center py-6">
                      SELECT A BLUEPRINT ABOVE AND CLICK SIMULATE RELEASE
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Overall score */}
                  <div className="bg-[#0c0c0c] border border-[#00d4ff]/20 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-[8px] font-mono text-gray-600 tracking-widest">OVERALL RELEASE SCORE</div>
                        <div className="text-4xl font-mono font-bold text-[#00d4ff] mt-1">
                          {parseFloat(fullSim.overall_release_score).toFixed(1)}
                        </div>
                      </div>
                      <ConfidencePip score={fullSim.confidence_score} />
                    </div>
                    <p className="text-[10px] font-mono text-gray-400">{fullSim.simulation_notes}</p>
                  </div>

                  {/* Six score meters */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'COMMERCIAL SCORE',     val: fullSim.commercial_score,        color: '#f59e0b' },
                      { label: 'SYNC SCORE',           val: fullSim.sync_score,              color: '#a855f7' },
                      { label: 'CROWD ENERGY',         val: fullSim.crowd_energy,            color: '#00ff41' },
                      { label: 'REPLAYABILITY',        val: fullSim.replayability_prediction, color: '#00d4ff' },
                      { label: 'EMOTIONAL STICKINESS', val: fullSim.emotional_stickiness,    color: '#ef4444' },
                      { label: 'CINEMATIC POTENTIAL',  val: fullSim.cinematic_potential,     color: '#6366f1' },
                    ].map(({ label, val, color }) => (
                      <div key={label} className="bg-[#0c0c0c] border border-[#ffffff08] rounded p-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[9px] font-mono text-gray-500 tracking-widest">{label}</span>
                          <span className="text-base font-mono font-bold" style={{ color }}>{parseFloat(val).toFixed(0)}</span>
                        </div>
                        <ScoreBar value={val} color={color} />
                      </div>
                    ))}
                  </div>

                  {/* Sync tags */}
                  {fullSim.sync_tags && fullSim.sync_tags.length > 0 && (
                    <div>
                      <div className="text-[#00ff41]/50 font-mono text-[10px] tracking-widest mb-2">SYNC / SOUNDTRACK COMPATIBILITY TAGS</div>
                      <div className="flex flex-wrap gap-2">
                        {fullSim.sync_tags.map(tag => (
                          <span key={tag} className="text-[9px] font-mono text-[#a855f7] border border-[#a855f7]/25 bg-[#a855f7]/8 px-2 py-1 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Producer compatibility */}
                  {fullSim.producer_compatibility && fullSim.producer_compatibility.length > 0 && (
                    <div>
                      <div className="text-[#00ff41]/50 font-mono text-[10px] tracking-widest mb-2">PRODUCER COMPATIBILITY</div>
                      <div className="grid grid-cols-2 gap-2">
                        {fullSim.producer_compatibility.map(p => (
                          <div key={p.name} className="bg-[#0c0c0c] border border-[#ffffff08] rounded p-3">
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-mono text-[11px] text-gray-300">{p.name}</span>
                              <span
                                className="text-[10px] font-mono font-bold"
                                style={{ color: p.compatibility_score > 70 ? '#00ff41' : p.compatibility_score > 45 ? '#f59e0b' : '#ef4444' }}
                              >
                                {p.compatibility_score}%
                              </span>
                            </div>
                            <ScoreBar value={p.compatibility_score} color={p.compatibility_score > 70 ? '#00ff41' : '#f59e0b'} />
                            <div className="text-[8px] font-mono text-gray-600 mt-2">{p.match_reason}</div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {p.style_tags.slice(0, 3).map(t => (
                                <span key={t} className="text-[7px] font-mono text-gray-600 border border-[#ffffff08] px-1 py-0.5 rounded">{t}</span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── EVOLUTION MAP TAB ───────────────────────────────────────────── */}
          {tab === 'evolution' && (
            <div className="space-y-4">
              <div className="text-[#00ff41]/50 font-mono text-[10px] tracking-widest">ARTIST EVOLUTION MAP — {artistName.toUpperCase()}</div>

              {evoLoading ? (
                <EmptyState icon="◉" message="COMPUTING EVOLUTION MAP..." />
              ) : !evoMap || evoMap.timeline.length === 0 ? (
                <EmptyState icon="◉" message="GENERATE SONIC BLUEPRINTS TO BUILD YOUR EVOLUTION MAP" />
              ) : (
                <div className="space-y-5">

                  {/* Evolution Stages */}
                  {evoMap.evolution_stages && evoMap.evolution_stages.length > 0 && (
                    <div>
                      <div className="text-[#00ff41]/40 font-mono text-[9px] tracking-widest mb-2">EVOLUTION STAGES</div>
                      <div className="flex gap-2">
                        {(evoMap.evolution_stages as EvolutionStage[]).map((s, i) => {
                          const colors = ['#00ff41','#00d4ff','#f59e0b','#a855f7']
                          const c = colors[i] ?? '#00ff41'
                          return (
                            <div key={s.label} className="flex-1 border rounded p-3" style={{ borderColor: `${c}25`, background: `${c}08` }}>
                              <div className="text-[8px] font-mono tracking-widest mb-1" style={{ color: c }}>{s.label.toUpperCase()}</div>
                              <div className="text-[10px] font-mono text-gray-400 space-y-1">
                                <div>Blueprints {s.start_idx}–{s.end_idx} ({s.count} total)</div>
                                <div className="text-gray-500 capitalize">{s.dominant_emotion} · {s.dominant_genre?.split(' ')[0]}</div>
                                <div className="text-[8px]">Coherence: <span style={{ color: c }}>{(s.avg_coherence * 100).toFixed(0)}%</span></div>
                                <div className="text-[8px]">Commercial: <span style={{ color: c }}>{s.avg_commercial?.toFixed(0)}</span></div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Emotional Territory */}
                  {evoMap.emotional_territory && evoMap.emotional_territory.length > 0 && (
                    <div>
                      <div className="text-[#00ff41]/40 font-mono text-[9px] tracking-widest mb-2">EMOTIONAL TERRITORY MAP</div>
                      <div className="grid grid-cols-3 gap-2">
                        {evoMap.emotional_territory.slice(0, 12).map(e => {
                          const c = EMOTION_COLORS[e.emotion] ?? '#555'
                          const total = evoMap.timeline.length
                          const pct   = total > 0 ? (e.count / total) * 100 : 0
                          return (
                            <div key={e.emotion} className="bg-[#0c0c0c] border border-[#ffffff08] rounded p-2.5">
                              <div className="flex justify-between items-center mb-1.5">
                                <span className="text-[10px] font-mono font-bold capitalize" style={{ color: c }}>{e.emotion}</span>
                                <span className="text-[9px] font-mono text-gray-500">{e.count}x</span>
                              </div>
                              <div className="h-1 bg-[#111] rounded-full mb-1.5 overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: c }} />
                              </div>
                              <div className="grid grid-cols-2 gap-1 text-[8px] font-mono text-gray-600">
                                <span>Comm: <span className="text-gray-400">{e.avg_commercial.toFixed(0)}</span></span>
                                <span>Coh: <span className="text-gray-400">{(e.avg_coherence * 100).toFixed(0)}%</span></span>
                                <span>First: #{e.first_seen}</span>
                                <span>Last: #{e.last_seen}</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Genre Clusters */}
                  {evoMap.genre_clusters && evoMap.genre_clusters.length > 0 && (
                    <div>
                      <div className="text-[#00ff41]/40 font-mono text-[9px] tracking-widest mb-2">GENRE CLUSTER TRAJECTORY</div>
                      <div className="flex gap-1 flex-wrap">
                        {evoMap.genre_clusters.map((c, i) => (
                          <div
                            key={`${c.genre}-${i}`}
                            className="border rounded px-2 py-1.5 text-center"
                            style={{
                              borderColor: `#00d4ff${Math.round(Math.max(0.15, c.avg_coherence) * 255).toString(16).padStart(2, '0')}`,
                              background: `#00d4ff08`,
                              minWidth: `${Math.max(50, c.count * 20)}px`,
                            }}
                          >
                            <div className="text-[8px] font-mono text-[#00d4ff] font-bold truncate">{c.genre?.split(' ')[0]}</div>
                            <div className="text-[7px] font-mono text-gray-600">{c.count} bp</div>
                            <div className="text-[7px] font-mono text-gray-600">c: {(c.avg_coherence * 100).toFixed(0)}%</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Coherence timeline sparkline */}
                  {evoMap.timeline.length > 1 && (
                    <div>
                      <div className="text-[#00ff41]/40 font-mono text-[9px] tracking-widest mb-2">COHERENCE TRAJECTORY</div>
                      <div className="bg-[#0c0c0c] border border-[#ffffff08] rounded p-3">
                        <div className="flex items-end gap-0.5 h-12">
                          {evoMap.timeline.map((pt, i) => {
                            const h = Math.round(pt.coherence * 100)
                            const c = h >= 85 ? '#00ff41' : h >= 70 ? '#f59e0b' : '#ef4444'
                            return (
                              <div
                                key={i}
                                className="flex-1 rounded-t transition-all"
                                style={{ height: `${h}%`, backgroundColor: c, opacity: 0.8 }}
                                title={`#${pt.position}: ${pt.emotion} ${pt.genre} — ${h}%`}
                              />
                            )
                          })}
                        </div>
                        <div className="flex justify-between text-[8px] font-mono text-gray-600 mt-1">
                          <span>#1</span>
                          <span>BLUEPRINT SEQUENCE</span>
                          <span>#{evoMap.timeline.length}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
