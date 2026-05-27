import { useState, useEffect, useCallback } from 'react'
import { artists, sonicMemory } from '../api/client'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ArtistData { id: string; stage_name: string }

interface SonicPattern {
  artist_id: string
  dominant_emotion: string | null; dominant_key: string | null; dominant_scale: string | null
  dominant_genre: string | null
  avg_bpm: string | null; avg_coherence: string | null
  avg_commercial_accessibility: string | null; avg_spiritual_intensity: string | null
  avg_emotional_rawness: string | null
  total_blueprints_analyzed: number
  emotion_tendencies: Record<string, number> | null
  bpm_distribution: { avg: number; buckets: { label: string; min: number; max: number; count: number }[] } | null
  key_distribution: { key: string; count: number }[] | null
  scale_distribution: { value: string; count: number }[] | null
  commercial_tendencies: { avg: number; high_count: number; mid_count: number; low_count: number } | null
  atmospheric_patterns: { top_atmospheres: { value: string; count: number }[] } | null
  vocal_architecture_trends: { top_vocal_textures: { value: string; count: number }[]; top_cadence_energies: { value: string; count: number }[] } | null
  last_analyzed_at: string
}

interface SonicProfile {
  artist_id: string
  profile_summary: string
  sonic_identity_tags: string[] | null
  dominant_genres: string[] | null
  evolution_stage: string
  strongest_coherence_id: string | null
  highest_emotional_intensity_id: string | null
  highest_commercial_id: string | null
  most_spiritual_id: string | null
  most_replayable_id: string | null
  computed_at: string
}

interface RankedEntry {
  blueprint_id: string; primary_genre: string; bpm: number
  musical_key: string; scale: string; emotion_at_generation: string
  coherence_score: string; emotional_intensity_score: string
  commercial_potential_score: string; spiritual_alignment_score: string
  replayability_score: string; ingested_at: string
}

interface Rankings {
  strongest_coherence: RankedEntry[]
  highest_emotional_intensity: RankedEntry[]
  highest_commercial_potential: RankedEntry[]
  most_spiritually_aligned: RankedEntry[]
  most_replayable: RankedEntry[]
}

interface AnalyticsData {
  total_blueprints: number
  genre_distribution: { value: string; count: number; pct: number }[]
  emotion_distribution: { value: string; count: number; pct: number }[]
  bpm_heatmap: { label: string; min: number; max: number; count: number; pct: number }[]
  coherence_avg: number
  coherence_trend: { position: number; coherence: number; commercial: number; spiritual: number; bpm: number }[]
  quality_breakdown: Record<string, number>
  repair_frequency: { repaired_pct: number; clean_pct: number; avg_repairs: number }
  fallback_frequency: { fallback_pct: number; clean_pct: number }
}

interface TimelineEntry {
  position: number; blueprint_id: string; date: string
  emotion: string; intention: string; genre: string; bpm: number; key: string
  coherence: number; commercial: number; spiritual: number; emotional: number; replayability: number
  bpm_delta: number; coherence_delta: number; commercial_delta: number
}

type Tab = 'profile' | 'analytics' | 'rankings' | 'timeline'

// ─── Colors ───────────────────────────────────────────────────────────────────

const EMOTION_COLORS: Record<string, string> = {
  grief: '#64748b', trauma: '#7c3aed', rage: '#ef4444', joy: '#f59e0b',
  melancholy: '#6366f1', euphoria: '#ec4899', anxiety: '#f97316',
  longing: '#06b6d4', triumph: '#00ff41', nostalgia: '#d97706',
  peace: '#10b981', defiance: '#8b5cf6',
}

const STAGE_COLORS: Record<string, string> = {
  emerging: '#64748b', developing: '#f59e0b', defined: '#00d4ff', mature: '#00ff41',
}

function coherenceColor(v: number) {
  if (v >= 0.85) return '#00ff41'
  if (v >= 0.70) return '#00d4ff'
  if (v >= 0.55) return '#eab308'
  return '#ef4444'
}

function deltaSign(v: number) {
  if (v > 0) return { color: '#00ff41', sign: '▲' }
  if (v < 0) return { color: '#ef4444', sign: '▼' }
  return { color: '#444', sign: '─' }
}

function pct(v: string | number): string {
  return (Number(v) * 100).toFixed(0) + '%'
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Panel({ title, color = '#00d4ff', children }: { title: string; color?: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#080808] rounded-lg p-5 border border-transparent"
      style={{ borderColor: `${color}25`, boxShadow: `inset 0 0 0 1px ${color}18` }}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-0.5 h-4 rounded-full" style={{ backgroundColor: color }} />
        <div className="text-[10px] font-mono font-bold tracking-[0.25em]" style={{ color }}>{title}</div>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pctW = max === 0 ? 0 : Math.min(100, (value / max) * 100)
  return (
    <div>
      <div className="flex justify-between mb-0.5">
        <span className="text-[9px] font-mono text-gray-400 truncate max-w-[60%]">{label}</span>
        <span className="text-[9px] font-mono font-bold" style={{ color }}>{value}</span>
      </div>
      <div className="h-1.5 bg-[#111] rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pctW}%`, background: `linear-gradient(to right, ${color}88, ${color})` }} />
      </div>
    </div>
  )
}

function RankRow({ entry, rank, score, scoreLabel, color }: {
  entry: RankedEntry; rank: number; score: string; scoreLabel: string; color: string
}) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-[#111]">
      <span className="text-[10px] font-mono text-gray-600 w-5 flex-shrink-0">#{rank}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-mono text-gray-200 truncate">{entry.primary_genre}</div>
        <div className="flex gap-2 mt-0.5">
          <span className="text-[8px] font-mono text-gray-600">{entry.bpm} BPM</span>
          <span className="text-[8px] font-mono text-gray-600">{entry.musical_key} {entry.scale}</span>
          <span className="text-[8px] font-mono" style={{ color: EMOTION_COLORS[entry.emotion_at_generation] ?? '#888' }}>
            {entry.emotion_at_generation}
          </span>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="text-[11px] font-mono font-bold" style={{ color }}>{(Number(score) * 100).toFixed(0)}%</div>
        <div className="text-[8px] font-mono text-gray-700">{scoreLabel}</div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SonicMemory() {
  const [artistList, setArtistList]   = useState<ArtistData[]>([])
  const [selectedArtist, setSelectedArtist] = useState('')
  const [activeTab, setActiveTab]     = useState<Tab>('profile')
  const [loading, setLoading]         = useState(false)
  const [analyzing, setAnalyzing]     = useState(false)
  const [error, setError]             = useState('')

  const [profile, setProfile]         = useState<SonicProfile | null>(null)
  const [patterns, setPatterns]       = useState<SonicPattern | null>(null)
  const [analytics, setAnalytics]     = useState<AnalyticsData | null>(null)
  const [rankings, setRankings]       = useState<Rankings | null>(null)
  const [timeline, setTimeline]       = useState<TimelineEntry[]>([])

  useEffect(() => {
    artists.list().then(r => setArtistList(r.data?.data ?? [])).catch(() => {})
  }, [])

  const loadAll = useCallback(async (artistId: string) => {
    setLoading(true)
    setError('')
    try {
      const [profileRes, analyticsRes, rankingsRes, timelineRes] = await Promise.allSettled([
        sonicMemory.getProfile(artistId),
        sonicMemory.getAnalytics(artistId),
        sonicMemory.getRankings(artistId),
        sonicMemory.getTimeline(artistId),
      ])

      if (profileRes.status === 'fulfilled') {
        setProfile(profileRes.value.data?.data?.profile ?? null)
        setPatterns(profileRes.value.data?.data?.patterns ?? null)
      }
      if (analyticsRes.status === 'fulfilled') setAnalytics(analyticsRes.value.data?.data ?? null)
      if (rankingsRes.status === 'fulfilled')  setRankings(rankingsRes.value.data?.data ?? null)
      if (timelineRes.status === 'fulfilled')  setTimeline(timelineRes.value.data?.data ?? [])
    } catch { setError('Failed to load memory data') }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (selectedArtist) loadAll(selectedArtist)
  }, [selectedArtist, loadAll])

  const triggerAnalysis = async () => {
    if (!selectedArtist) return
    setAnalyzing(true)
    setError('')
    try {
      await sonicMemory.analyzePatterns(selectedArtist)
      await loadAll(selectedArtist)
    } catch { setError('Pattern analysis failed') }
    setAnalyzing(false)
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'profile',   label: 'PROFILE'   },
    { id: 'analytics', label: 'ANALYTICS' },
    { id: 'rankings',  label: 'RANKINGS'  },
    { id: 'timeline',  label: 'TIMELINE'  },
  ]

  const noData = !loading && selectedArtist && analytics?.total_blueprints === 0

  return (
    <main className="flex-1 p-8 space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-mono font-bold text-[#00d4ff] tracking-[0.2em]">SONIC MEMORY</h1>
          <p className="text-[11px] font-mono text-gray-600 mt-1 tracking-widest">PHASE 3 · PATTERN INTELLIGENCE · ARTIST EVOLUTION ENGINE</p>
        </div>
        <button
          onClick={triggerAnalysis}
          disabled={!selectedArtist || analyzing}
          className="px-4 py-2 text-[10px] font-mono tracking-[0.2em] border rounded transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ borderColor: '#00d4ff40', color: analyzing ? '#888' : '#00d4ff', background: analyzing ? 'transparent' : '#00d4ff08' }}
        >
          {analyzing ? '◌ ANALYZING...' : '◆ ANALYZE PATTERNS'}
        </button>
      </div>

      {/* Artist Selector */}
      <div className="flex gap-3 items-center">
        <label className="text-[9px] font-mono tracking-[0.2em] text-gray-600 uppercase">Artist</label>
        <select
          value={selectedArtist}
          onChange={e => setSelectedArtist(e.target.value)}
          className="bg-[#0a0a0a] border border-[#00d4ff]/20 text-gray-300 text-[11px] font-mono px-3 py-1.5 rounded focus:outline-none focus:border-[#00d4ff]/50"
        >
          <option value="">— select artist —</option>
          {artistList.map(a => <option key={a.id} value={a.id}>{a.stage_name}</option>)}
        </select>
      </div>

      {error && (
        <div className="text-[11px] font-mono text-red-400 bg-red-500/10 border border-red-500/20 rounded px-4 py-2">{error}</div>
      )}

      {loading && (
        <div className="text-[11px] font-mono text-gray-600 tracking-widest">◌ LOADING MEMORY ENGINE...</div>
      )}

      {noData && (
        <div className="text-[11px] font-mono text-gray-600 bg-[#080808] rounded-lg p-8 text-center border border-[#111]">
          No sonic memory found for this artist.<br />Generate blueprints in Sonic World, then run pattern analysis.
        </div>
      )}

      {!loading && selectedArtist && analytics && analytics.total_blueprints > 0 && (
        <>
          {/* Tab Navigation */}
          <div className="flex gap-0.5">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-4 py-2 text-[10px] font-mono tracking-[0.2em] rounded transition-all duration-150 border ${
                  activeTab === t.id
                    ? 'bg-[#00d4ff]/10 text-[#00d4ff] border-[#00d4ff]/30'
                    : 'text-gray-600 border-transparent hover:text-gray-400 hover:border-[#ffffff]/10'
                }`}
              >{t.label}</button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[9px] font-mono text-gray-700">{analytics.total_blueprints} BLUEPRINTS IN MEMORY</span>
            </div>
          </div>

          {/* ── PROFILE TAB ── */}
          {activeTab === 'profile' && (
            <div className="space-y-5">
              {!profile ? (
                <div className="text-[11px] font-mono text-gray-600 text-center py-8">No profile computed yet — click ANALYZE PATTERNS to build your sonic identity.</div>
              ) : (
                <>
                  {/* Identity Header */}
                  <div className="bg-[#080808] rounded-lg p-5 border border-[#00d4ff]/15">
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <span
                            className="text-[9px] font-mono px-2 py-0.5 rounded border tracking-widest uppercase"
                            style={{ color: STAGE_COLORS[profile.evolution_stage] ?? '#888', borderColor: `${STAGE_COLORS[profile.evolution_stage] ?? '#888'}40` }}
                          >{profile.evolution_stage}</span>
                          <span className="text-[9px] font-mono text-gray-600">sonic evolution stage</span>
                        </div>
                        <p className="text-[11px] font-mono text-gray-300 leading-relaxed">{profile.profile_summary}</p>
                      </div>
                    </div>
                    {/* Identity Tags */}
                    {profile.sonic_identity_tags && profile.sonic_identity_tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        {profile.sonic_identity_tags.map(tag => (
                          <span key={tag} className="text-[8px] font-mono px-2 py-0.5 rounded bg-[#00d4ff]/10 text-[#00d4ff] border border-[#00d4ff]/20 tracking-widest">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Dominant Pattern Stats */}
                  {patterns && (
                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                      {[
                        { label: 'DOMINANT EMOTION', value: patterns.dominant_emotion ?? '—', color: EMOTION_COLORS[patterns.dominant_emotion ?? ''] ?? '#888' },
                        { label: 'DOMINANT KEY', value: patterns.dominant_key ? `${patterns.dominant_key} ${patterns.dominant_scale ?? ''}` : '—', color: '#00d4ff' },
                        { label: 'DOMINANT GENRE', value: patterns.dominant_genre ?? '—', color: '#8b5cf6' },
                        { label: 'AVG BPM', value: patterns.avg_bpm ? Math.round(Number(patterns.avg_bpm)).toString() : '—', color: '#f59e0b' },
                      ].map(s => (
                        <div key={s.label} className="bg-[#080808] rounded-lg p-4 border border-[#ffffff]/5 text-center">
                          <div className="text-[8px] font-mono text-gray-600 tracking-[0.2em] mb-1">{s.label}</div>
                          <div className="text-[13px] font-mono font-bold truncate" style={{ color: s.color }}>{s.value}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Average Scores */}
                  {patterns && (
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <Panel title="AVERAGE DENSITY PROFILE" color="#8b5cf6">
                        {[
                          { label: 'Coherence', value: Number(patterns.avg_coherence ?? 0) * 100, max: 100, color: '#00ff41' },
                          { label: 'Commercial', value: Number(patterns.avg_commercial_accessibility ?? 0), max: 100, color: '#f59e0b' },
                          { label: 'Spiritual', value: Number(patterns.avg_spiritual_intensity ?? 0), max: 100, color: '#8b5cf6' },
                          { label: 'Emotional Rawness', value: Number(patterns.avg_emotional_rawness ?? 0), max: 100, color: '#ef4444' },
                        ].map(s => <Bar key={s.label} label={s.label} value={parseFloat(s.value.toFixed(1))} max={s.max} color={s.color} />)}
                      </Panel>

                      <Panel title="VOCAL ARCHITECTURE TRENDS" color="#06b6d4">
                        {patterns.vocal_architecture_trends?.top_vocal_textures?.slice(0, 4).map(t => (
                          <div key={t.value} className="flex justify-between items-center">
                            <span className="text-[9px] font-mono text-gray-400 truncate max-w-[70%]">{t.value}</span>
                            <span className="text-[9px] font-mono text-[#06b6d4]">{t.count}×</span>
                          </div>
                        )) ?? <span className="text-[9px] font-mono text-gray-700">No data</span>}
                      </Panel>
                    </div>
                  )}

                  {/* Top Blueprints by Dimension */}
                  <Panel title="PINNACLE BLUEPRINTS" color="#00ff41">
                    <div className="space-y-2">
                      {[
                        { label: 'Strongest Coherence',        id: profile.strongest_coherence_id,         color: '#00ff41' },
                        { label: 'Highest Emotional Intensity', id: profile.highest_emotional_intensity_id, color: '#ef4444' },
                        { label: 'Highest Commercial Potential',id: profile.highest_commercial_id,          color: '#f59e0b' },
                        { label: 'Most Spiritually Aligned',   id: profile.most_spiritual_id,              color: '#8b5cf6' },
                        { label: 'Most Replayable',            id: profile.most_replayable_id,             color: '#06b6d4' },
                      ].map(d => (
                        <div key={d.label} className="flex items-center gap-3 py-1.5 border-b border-[#111]">
                          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                          <span className="text-[9px] font-mono text-gray-500 w-44">{d.label}</span>
                          <span className="text-[9px] font-mono text-gray-400 font-mono truncate">
                            {d.id ? d.id.slice(0, 8) + '...' : '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </Panel>
                </>
              )}
            </div>
          )}

          {/* ── ANALYTICS TAB ── */}
          {activeTab === 'analytics' && analytics && (
            <div className="space-y-5">
              {/* Summary Row */}
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {[
                  { label: 'TOTAL BLUEPRINTS', value: analytics.total_blueprints.toString(), color: '#00d4ff' },
                  { label: 'AVG COHERENCE',    value: (analytics.coherence_avg * 100).toFixed(1) + '%', color: coherenceColor(analytics.coherence_avg) },
                  { label: 'REPAIR RATE',      value: analytics.repair_frequency.repaired_pct.toFixed(1) + '%', color: analytics.repair_frequency.repaired_pct > 30 ? '#ef4444' : '#00ff41' },
                  { label: 'FALLBACK RATE',    value: analytics.fallback_frequency.fallback_pct.toFixed(1) + '%', color: analytics.fallback_frequency.fallback_pct > 20 ? '#f59e0b' : '#00ff41' },
                ].map(s => (
                  <div key={s.label} className="bg-[#080808] rounded-lg p-4 border border-[#ffffff]/5 text-center">
                    <div className="text-[8px] font-mono text-gray-600 tracking-[0.2em] mb-1">{s.label}</div>
                    <div className="text-2xl font-mono font-bold" style={{ color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* Genre Distribution */}
                <Panel title="GENRE DISTRIBUTION" color="#8b5cf6">
                  {analytics.genre_distribution.slice(0, 8).map(g => (
                    <Bar key={g.value} label={g.value} value={g.count} max={analytics.genre_distribution[0]?.count ?? 1} color="#8b5cf6" />
                  ))}
                </Panel>

                {/* Emotion Distribution */}
                <Panel title="EMOTIONAL DISTRIBUTION" color="#ec4899">
                  {analytics.emotion_distribution.slice(0, 8).map(e => (
                    <Bar key={e.value} label={e.value} value={e.count} max={analytics.emotion_distribution[0]?.count ?? 1} color={EMOTION_COLORS[e.value] ?? '#ec4899'} />
                  ))}
                </Panel>
              </div>

              {/* BPM Heatmap */}
              <Panel title="BPM HEATMAP" color="#f59e0b">
                <div className="grid grid-cols-6 gap-2">
                  {analytics.bpm_heatmap.map(b => {
                    const intensity = b.pct / 100
                    return (
                      <div key={b.label} className="text-center">
                        <div
                          className="rounded mb-1 transition-all"
                          style={{
                            height: '60px',
                            background: `rgba(245, 158, 11, ${0.1 + intensity * 0.9})`,
                            border: `1px solid rgba(245, 158, 11, ${0.2 + intensity * 0.5})`,
                          }}
                        />
                        <div className="text-[8px] font-mono text-gray-600">{b.label}</div>
                        <div className="text-[9px] font-mono font-bold text-[#f59e0b]">{b.count}</div>
                        <div className="text-[7px] font-mono text-gray-700">{b.pct}%</div>
                      </div>
                    )
                  })}
                </div>
              </Panel>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* Quality Breakdown */}
                <Panel title="GENERATION QUALITY" color="#00ff41">
                  {(['excellent', 'good', 'fair', 'poor'] as const).map(q => {
                    const QCOLORS = { excellent: '#00ff41', good: '#00d4ff', fair: '#eab308', poor: '#ef4444' }
                    const cnt = analytics.quality_breakdown[q] ?? 0
                    const tot = analytics.total_blueprints || 1
                    return <Bar key={q} label={q.toUpperCase()} value={cnt} max={tot} color={QCOLORS[q]} />
                  })}
                </Panel>

                {/* Coherence Trend (sparkline) */}
                <Panel title="RECENT COHERENCE TREND" color="#00ff41">
                  <div className="flex items-end gap-0.5 h-20">
                    {analytics.coherence_trend.map((p, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t transition-all"
                        style={{
                          height: `${p.coherence * 100}%`,
                          background: coherenceColor(p.coherence),
                          opacity: 0.7,
                          minHeight: '2px',
                        }}
                        title={`Position ${p.position}: ${(p.coherence * 100).toFixed(0)}%`}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[8px] font-mono text-gray-700">OLDEST</span>
                    <span className="text-[8px] font-mono text-gray-700">NEWEST</span>
                  </div>
                </Panel>
              </div>
            </div>
          )}

          {/* ── RANKINGS TAB ── */}
          {activeTab === 'rankings' && rankings && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <Panel title="◆ STRONGEST COHERENCE" color="#00ff41">
                  {rankings.strongest_coherence.map((e, i) => (
                    <RankRow key={e.blueprint_id} entry={e} rank={i + 1} score={e.coherence_score} scoreLabel="coherence" color="#00ff41" />
                  ))}
                </Panel>
                <Panel title="◆ HIGHEST EMOTIONAL INTENSITY" color="#ef4444">
                  {rankings.highest_emotional_intensity.map((e, i) => (
                    <RankRow key={e.blueprint_id} entry={e} rank={i + 1} score={e.emotional_intensity_score} scoreLabel="intensity" color="#ef4444" />
                  ))}
                </Panel>
                <Panel title="◆ HIGHEST COMMERCIAL POTENTIAL" color="#f59e0b">
                  {rankings.highest_commercial_potential.map((e, i) => (
                    <RankRow key={e.blueprint_id} entry={e} rank={i + 1} score={e.commercial_potential_score} scoreLabel="commercial" color="#f59e0b" />
                  ))}
                </Panel>
                <Panel title="◆ MOST SPIRITUALLY ALIGNED" color="#8b5cf6">
                  {rankings.most_spiritually_aligned.map((e, i) => (
                    <RankRow key={e.blueprint_id} entry={e} rank={i + 1} score={e.spiritual_alignment_score} scoreLabel="spiritual" color="#8b5cf6" />
                  ))}
                </Panel>
              </div>
              <Panel title="◆ MOST REPLAYABLE" color="#06b6d4">
                <div className="grid grid-cols-1 gap-0 lg:grid-cols-2">
                  <div>
                    {rankings.most_replayable.slice(0, 8).map((e, i) => (
                      <RankRow key={e.blueprint_id} entry={e} rank={i + 1} score={e.replayability_score} scoreLabel="replayability" color="#06b6d4" />
                    ))}
                  </div>
                </div>
              </Panel>
            </div>
          )}

          {/* ── TIMELINE TAB ── */}
          {activeTab === 'timeline' && (
            <div className="space-y-3">
              <div className="text-[9px] font-mono text-gray-600 tracking-widest mb-2">
                EVOLUTION TIMELINE · {timeline.length} BLUEPRINT{timeline.length !== 1 ? 'S' : ''} · CHRONOLOGICAL
              </div>

              {/* Timeline header */}
              <div className="grid font-mono text-[8px] text-gray-700 tracking-widest border-b border-[#111] pb-1"
                style={{ gridTemplateColumns: '2rem 1fr 4rem 4rem 5rem 3rem 3rem 3rem 3rem 3rem' }}>
                <span>#</span><span>GENRE</span><span>BPM</span><span>KEY</span><span>EMOTION</span>
                <span>COH</span><span>COM</span><span>SPI</span><span>ΔCOH</span><span>ΔCOM</span>
              </div>

              <div className="space-y-0 max-h-[600px] overflow-y-auto">
                {[...timeline].reverse().map(entry => {
                  const cohDelta = deltaSign(entry.coherence_delta)
                  const comDelta = deltaSign(entry.commercial_delta)
                  const emotColor = EMOTION_COLORS[entry.emotion] ?? '#888'
                  return (
                    <div
                      key={entry.blueprint_id}
                      className="grid items-center py-1.5 border-b border-[#0f0f0f] hover:bg-[#080808] transition-colors"
                      style={{ gridTemplateColumns: '2rem 1fr 4rem 4rem 5rem 3rem 3rem 3rem 3rem 3rem' }}
                    >
                      <span className="text-[9px] font-mono text-gray-700">{entry.position}</span>
                      <div className="min-w-0">
                        <div className="text-[9px] font-mono text-gray-300 truncate">{entry.genre}</div>
                        <div className="text-[7px] font-mono text-gray-700">{new Date(entry.date).toLocaleDateString()}</div>
                      </div>
                      <span className="text-[9px] font-mono text-gray-400">{entry.bpm}</span>
                      <span className="text-[8px] font-mono text-gray-500">{entry.key}</span>
                      <span className="text-[8px] font-mono truncate" style={{ color: emotColor }}>{entry.emotion}</span>
                      <span className="text-[9px] font-mono font-bold" style={{ color: coherenceColor(entry.coherence) }}>{(entry.coherence * 100).toFixed(0)}%</span>
                      <span className="text-[9px] font-mono text-[#f59e0b]">{entry.commercial}</span>
                      <span className="text-[9px] font-mono text-[#8b5cf6]">{entry.spiritual}</span>
                      <span className="text-[9px] font-mono" style={{ color: cohDelta.color }}>
                        {cohDelta.sign}{entry.coherence_delta !== 0 ? Math.abs(entry.coherence_delta * 100).toFixed(0) : ''}
                      </span>
                      <span className="text-[9px] font-mono" style={{ color: comDelta.color }}>
                        {comDelta.sign}{entry.commercial_delta !== 0 ? Math.abs(entry.commercial_delta) : ''}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Timeline legend */}
              <div className="flex flex-wrap gap-4 pt-2 border-t border-[#111]">
                {[
                  { key: 'COH', label: 'Coherence Score', color: '#00ff41' },
                  { key: 'COM', label: 'Commercial (0–100)', color: '#f59e0b' },
                  { key: 'SPI', label: 'Spiritual (0–100)', color: '#8b5cf6' },
                  { key: 'ΔCOH', label: 'Coherence delta', color: '#888' },
                  { key: 'ΔCOM', label: 'Commercial delta', color: '#888' },
                ].map(l => (
                  <div key={l.key} className="flex items-center gap-1">
                    <span className="text-[8px] font-mono font-bold" style={{ color: l.color }}>{l.key}</span>
                    <span className="text-[8px] font-mono text-gray-700">= {l.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </main>
  )
}
