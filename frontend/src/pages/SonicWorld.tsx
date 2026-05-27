import { useState, useEffect, useCallback } from 'react'
import { artists, musicIntelligence, sonicWorld } from '../api/client'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ArtistData  { id: string; stage_name: string }
interface SessionData {
  id: string; name: string; emotion: string; intention: string;
  listener_transformation: string; status: string; created_at: string;
}

interface SWBlueprintFields {
  primary_genre: string; secondary_genre: string; rhythm_influence: string; sonic_fusion_identity: string;
  drum_style: string; percussion_textures: string; bass_character: string; melodic_instruments: string;
  ambient_layers: string; organic_synthetic_ratio: string;
  vocal_texture: string; cadence_energy: string; harmony_behavior: string;
  emotional_intensity: string; vocal_atmosphere: string;
  visual_sonic_atmosphere: string; emotional_weather: string; scene_energy: string; cinematic_references: string;
  bpm: number; groove_behavior: string; movement_energy: string;
  percussion_complexity: string; swing_characteristics: string;
  musical_key: string; scale: string; chord_behavior: string;
  emotional_progression: string; tension_release_behavior: string;
  hook_intensity: string; chant_potential: string; replayability: string;
  anthem_potential: string; crowd_engagement_energy: string;
  cinematic_density: number; spiritual_intensity: number; emotional_rawness: number;
  commercial_accessibility: number; darkness_vs_hope: number;
  underground_vs_mainstream: number; organic_vs_synthetic: number;
  producer_brief: string; coherence_score: string | number;
}

interface ValidationWarning { field: string; issue: string; value?: unknown }
interface ValidationReport {
  is_valid: boolean; warning_count: number; warnings: ValidationWarning[]; checked_at: string;
}

interface SWBlueprint extends SWBlueprintFields {
  id: string; session_id: string; artist_id: string;
  engine_version: string; created_at: string;
  // Stabilization fields
  repaired_generation:  SWBlueprintFields | null;
  raw_generation:       SWBlueprintFields | null;
  validation_report:    ValidationReport | null;
  confidence_score:     string | number | null;
  repair_count:         number | null;
  fallback_used:        boolean | null;
  generation_quality:   'excellent' | 'good' | 'fair' | 'poor' | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EMOTION_COLORS: Record<string, string> = {
  grief: '#64748b', trauma: '#7c3aed', rage: '#ef4444', joy: '#f59e0b',
  melancholy: '#6366f1', euphoria: '#ec4899', anxiety: '#f97316',
  longing: '#06b6d4', triumph: '#00ff41', nostalgia: '#d97706',
  peace: '#10b981', defiance: '#8b5cf6',
}

const QUALITY_COLORS: Record<string, string> = {
  excellent: '#00ff41', good: '#00d4ff', fair: '#eab308', poor: '#ef4444',
}

function coherenceColor(score: number): string {
  if (score >= 0.85) return '#00ff41'
  if (score >= 0.70) return '#00d4ff'
  if (score >= 0.55) return '#eab308'
  return '#ef4444'
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[9px] font-mono text-gray-600 tracking-[0.18em] mb-0.5 uppercase">{label}</div>
      <div className="text-[11px] font-mono text-gray-200 leading-relaxed">{value}</div>
    </div>
  )
}

function Panel({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div
      className="bg-[#080808] rounded-lg p-5 border border-transparent"
      style={{ borderColor: `${color}25`, boxShadow: `inset 0 0 0 1px ${color}18` }}
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-0.5 h-4 rounded-full" style={{ backgroundColor: color }} />
        <div className="text-[10px] font-mono font-bold tracking-[0.25em]" style={{ color }}>{title}</div>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function DensityBar({
  label, value, leftLabel, rightLabel, color,
}: { label: string; value: number; leftLabel: string; rightLabel: string; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[9px] font-mono tracking-[0.15em] text-gray-500 uppercase">{label}</span>
        <span className="text-[10px] font-mono font-bold" style={{ color }}>{value}</span>
      </div>
      <div className="h-1.5 bg-[#111] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, background: `linear-gradient(to right, ${color}88, ${color})` }}
        />
      </div>
      <div className="flex justify-between mt-0.5">
        <span className="text-[8px] font-mono text-gray-700">{leftLabel}</span>
        <span className="text-[8px] font-mono text-gray-700">{rightLabel}</span>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SonicWorld() {
  const [artistList, setArtistList]         = useState<ArtistData[]>([])
  const [sessionList, setSessionList]       = useState<SessionData[]>([])
  const [selectedArtist, setSelectedArtist] = useState('')
  const [selectedSession, setSelectedSession] = useState('')
  const [blueprint, setBlueprint]           = useState<SWBlueprint | null>(null)
  const [loading, setLoading]               = useState(false)
  const [blueprintLoading, setBlueprintLoading] = useState(false)
  const [error, setError]                   = useState('')

  useEffect(() => {
    artists.list().then(r => setArtistList(r.data?.data ?? []))
  }, [])

  useEffect(() => {
    if (!selectedArtist) { setSessionList([]); setSelectedSession(''); setBlueprint(null); return }
    musicIntelligence.listSessions(selectedArtist)
      .then(r => setSessionList(r.data?.data ?? []))
  }, [selectedArtist])

  const fetchExistingBlueprint = useCallback(async (sessionId: string) => {
    if (!sessionId) { setBlueprint(null); return }
    setBlueprintLoading(true)
    try {
      const r = await sonicWorld.getLatestBlueprint(sessionId)
      setBlueprint(r.data?.data ?? null)
    } catch {
      setBlueprint(null)
    } finally {
      setBlueprintLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchExistingBlueprint(selectedSession)
  }, [selectedSession, fetchExistingBlueprint])

  const handleGenerate = async () => {
    if (!selectedSession || !selectedArtist) return
    setLoading(true); setError('')
    try {
      const r = await sonicWorld.generate({ session_id: selectedSession, artist_id: selectedArtist })
      setBlueprint(r.data?.data?.sonic_world_blueprint ?? null)
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e?.message ?? 'Generation failed')
    } finally {
      setLoading(false)
    }
  }

  const selectedSessionData = sessionList.find(s => s.id === selectedSession)
  const coherenceScore      = blueprint ? parseFloat(String(blueprint.coherence_score)) : 0

  // Always render from repaired_generation when available; fall back to flat fields for legacy records
  const bp: SWBlueprintFields = blueprint?.repaired_generation ?? blueprint ?? ({} as SWBlueprintFields)

  const qualityColor = blueprint?.generation_quality
    ? (QUALITY_COLORS[blueprint.generation_quality] ?? '#888')
    : '#888'

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 pb-12">

      {/* Header */}
      <div className="mb-7">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-2 h-2 rounded-full bg-[#00d4ff] animate-pulse" />
          <div className="text-[10px] font-mono text-[#00d4ff]/50 tracking-[0.3em]">DATIAM OS — PHASE 2A</div>
        </div>
        <h1 className="text-2xl font-mono font-bold tracking-[0.2em] text-white mb-0.5">
          SONIC WORLD
        </h1>
        <p className="text-[11px] font-mono text-gray-600 tracking-[0.15em]">
          8-DIMENSIONAL SONIC BLUEPRINT EXPANSION ENGINE
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-8 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-mono text-gray-600 tracking-widest uppercase">Artist</label>
          <select
            value={selectedArtist}
            onChange={e => setSelectedArtist(e.target.value)}
            className="bg-[#0c0c0c] border border-[#00d4ff]/20 text-[11px] font-mono text-gray-300 px-3 py-2 rounded focus:outline-none focus:border-[#00d4ff]/50 min-w-[180px]"
          >
            <option value="">— select artist —</option>
            {artistList.map(a => (
              <option key={a.id} value={a.id}>{a.stage_name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-mono text-gray-600 tracking-widest uppercase">Session</label>
          <select
            value={selectedSession}
            onChange={e => setSelectedSession(e.target.value)}
            disabled={!selectedArtist}
            className="bg-[#0c0c0c] border border-[#00d4ff]/20 text-[11px] font-mono text-gray-300 px-3 py-2 rounded focus:outline-none focus:border-[#00d4ff]/50 min-w-[240px] disabled:opacity-40"
          >
            <option value="">— select session —</option>
            {sessionList.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.emotion})</option>
            ))}
          </select>
        </div>

        <button
          onClick={handleGenerate}
          disabled={!selectedSession || loading}
          className="px-5 py-2 text-[11px] font-mono font-bold tracking-[0.2em] rounded border transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            borderColor: blueprint ? '#00ff41aa' : '#00d4ffaa',
            color:        blueprint ? '#00ff41' : '#00d4ff',
            background:   blueprint ? '#00ff4108' : '#00d4ff08',
          }}
        >
          {loading ? '◈ GENERATING...' : blueprint ? '◉ REGENERATE' : '◉ GENERATE SONIC WORLD'}
        </button>
      </div>

      {/* Session context badge */}
      {selectedSessionData && (
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-[9px] font-mono text-gray-700 tracking-widest">SESSION:</span>
          <span className="text-[9px] font-mono font-bold text-gray-400">{selectedSessionData.name}</span>
          <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold"
            style={{ backgroundColor: `${EMOTION_COLORS[selectedSessionData.emotion] ?? '#444'}22`,
                     color: EMOTION_COLORS[selectedSessionData.emotion] ?? '#aaa' }}>
            {selectedSessionData.emotion.toUpperCase()}
          </span>
          <span className="text-[9px] font-mono text-gray-700">
            {selectedSessionData.intention.replace(/_/g, ' ')} · {selectedSessionData.listener_transformation.replace(/_/g, ' ')}
          </span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-6 p-3 border border-red-500/30 bg-red-500/5 rounded text-[11px] font-mono text-red-400">
          ⊗ {error}
        </div>
      )}

      {/* Empty state */}
      {!selectedSession && !blueprint && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-6xl mb-4 opacity-20">◉</div>
          <div className="text-[11px] font-mono text-gray-600 tracking-widest mb-2">NO SESSION SELECTED</div>
          <div className="text-[10px] font-mono text-gray-700 max-w-sm">
            Select an artist and a Music Intelligence session to generate a Sonic World Blueprint.
            Requires a Phase 1 blueprint to exist for the session.
          </div>
        </div>
      )}

      {blueprintLoading && (
        <div className="flex items-center gap-2 py-8 justify-center">
          <div className="w-1.5 h-1.5 bg-[#00d4ff] rounded-full animate-pulse" />
          <span className="text-[11px] font-mono text-gray-600 tracking-widest">LOADING BLUEPRINT...</span>
        </div>
      )}

      {/* Generate prompt */}
      {selectedSession && !blueprint && !blueprintLoading && !loading && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full border border-[#00d4ff]/20 flex items-center justify-center mb-5">
            <span className="text-2xl text-[#00d4ff]/40">◉</span>
          </div>
          <div className="text-[11px] font-mono text-gray-500 tracking-widest mb-1">NO SONIC WORLD BLUEPRINT</div>
          <div className="text-[10px] font-mono text-gray-700 mb-5">
            Press GENERATE SONIC WORLD to expand this session into 8 sonic dimensions.
          </div>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="px-6 py-2.5 text-[11px] font-mono font-bold tracking-[0.25em] rounded border border-[#00d4ff]/40 text-[#00d4ff] bg-[#00d4ff]/5 hover:bg-[#00d4ff]/10 hover:border-[#00d4ff]/70 transition-all duration-200"
          >
            ◉ GENERATE SONIC WORLD
          </button>
        </div>
      )}

      {/* Blueprint Display — all fields sourced from repaired_generation */}
      {blueprint && !blueprintLoading && (
        <div className="space-y-4">

          {/* Row 1: Genre DNA + Rhythm Intelligence */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel title="GENRE DNA" color="#00d4ff">
              <Field label="Primary Genre"         value={bp.primary_genre} />
              <Field label="Secondary Genre"       value={bp.secondary_genre} />
              <Field label="Rhythm Influence"      value={bp.rhythm_influence} />
              <Field label="Sonic Fusion Identity" value={bp.sonic_fusion_identity} />
            </Panel>

            <Panel title="RHYTHM INTELLIGENCE" color="#00ff41">
              <div className="flex items-center gap-3 mb-1">
                <div className="text-3xl font-mono font-bold text-[#00ff41]">{bp.bpm}</div>
                <div className="text-[9px] font-mono text-gray-600 tracking-widest">BPM</div>
              </div>
              <Field label="Groove Behavior"       value={bp.groove_behavior} />
              <Field label="Movement Energy"       value={bp.movement_energy} />
              <Field label="Percussion Complexity" value={bp.percussion_complexity} />
              <Field label="Swing Characteristics" value={bp.swing_characteristics} />
            </Panel>
          </div>

          {/* Row 2: Harmonic + Cinematic */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel title="HARMONIC EMOTION SYSTEM" color="#a855f7">
              <div className="flex gap-3 mb-1">
                <div>
                  <div className="text-[9px] font-mono text-gray-600 mb-0.5">KEY</div>
                  <div className="text-sm font-mono font-bold text-[#a855f7]">{bp.musical_key}</div>
                </div>
                <div>
                  <div className="text-[9px] font-mono text-gray-600 mb-0.5">SCALE</div>
                  <div className="text-sm font-mono text-gray-300">{bp.scale}</div>
                </div>
              </div>
              <Field label="Chord Behavior"        value={bp.chord_behavior} />
              <Field label="Emotional Progression" value={bp.emotional_progression} />
              <Field label="Tension / Release"     value={bp.tension_release_behavior} />
            </Panel>

            <Panel title="CINEMATIC ENVIRONMENT" color="#f59e0b">
              <Field label="Visual Sonic Atmosphere" value={bp.visual_sonic_atmosphere} />
              <Field label="Emotional Weather"       value={bp.emotional_weather} />
              <Field label="Scene Energy"            value={bp.scene_energy} />
              <Field label="Cinematic References"    value={bp.cinematic_references} />
            </Panel>
          </div>

          {/* Row 3: Instrumentation + Vocal */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel title="INSTRUMENTATION ARCHITECTURE" color="#06b6d4">
              <Field label="Drum Style"          value={bp.drum_style} />
              <Field label="Percussion Textures" value={bp.percussion_textures} />
              <Field label="Bass Character"      value={bp.bass_character} />
              <Field label="Melodic Instruments" value={bp.melodic_instruments} />
              <Field label="Ambient Layers"      value={bp.ambient_layers} />
              <div className="pt-1 border-t border-[#06b6d4]/10">
                <div className="text-[9px] font-mono text-gray-600 tracking-[0.15em] mb-0.5">ORGANIC / SYNTHETIC RATIO</div>
                <div className="text-[11px] font-mono font-bold text-[#06b6d4]">{bp.organic_synthetic_ratio}</div>
              </div>
            </Panel>

            <Panel title="VOCAL ARCHITECTURE" color="#ec4899">
              <Field label="Vocal Texture"       value={bp.vocal_texture} />
              <Field label="Cadence Energy"      value={bp.cadence_energy} />
              <Field label="Harmony Behavior"    value={bp.harmony_behavior} />
              <Field label="Emotional Intensity" value={bp.emotional_intensity} />
              <Field label="Vocal Atmosphere"    value={bp.vocal_atmosphere} />
            </Panel>
          </div>

          {/* Row 4: Hook Strategy */}
          <Panel title="HOOK STRATEGY" color="#eab308">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Hook Intensity"    value={bp.hook_intensity} />
              <Field label="Chant Potential"   value={bp.chant_potential} />
              <Field label="Replayability"     value={bp.replayability} />
              <Field label="Anthem Potential"  value={bp.anthem_potential} />
              <Field label="Crowd Engagement"  value={bp.crowd_engagement_energy} />
            </div>
          </Panel>

          {/* Row 5: Production Density */}
          <Panel title="PRODUCTION DENSITY SYSTEM" color="#8b5cf6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              <DensityBar label="Cinematic Density"         value={bp.cinematic_density}        leftLabel="Minimal"       rightLabel="Epic Orchestra"    color="#a855f7" />
              <DensityBar label="Spiritual Intensity"       value={bp.spiritual_intensity}       leftLabel="Secular"       rightLabel="Deeply Spiritual"  color="#f59e0b" />
              <DensityBar label="Emotional Rawness"         value={bp.emotional_rawness}         leftLabel="Polished"      rightLabel="Completely Raw"    color="#ef4444" />
              <DensityBar label="Commercial Access"         value={bp.commercial_accessibility}  leftLabel="Underground"   rightLabel="Top 40"            color="#00d4ff" />
              <DensityBar label="Darkness vs Hope"          value={bp.darkness_vs_hope}          leftLabel="Pure Darkness" rightLabel="Pure Hope"         color="#10b981" />
              <DensityBar label="Underground vs Mainstream" value={bp.underground_vs_mainstream} leftLabel="Underground"   rightLabel="Mainstream"        color="#06b6d4" />
              <DensityBar label="Organic vs Synthetic"      value={bp.organic_vs_synthetic}      leftLabel="Fully Organic" rightLabel="Fully Synthetic"   color="#ec4899" />
            </div>
          </Panel>

          {/* Row 6: Producer Brief + Coherence + Quality */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Producer Brief */}
            <div className="lg:col-span-2 bg-[#080808] border border-[#00d4ff]/15 rounded-lg p-5"
                 style={{ boxShadow: 'inset 0 0 0 1px #00d4ff0a' }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-0.5 h-4 rounded-full bg-[#00d4ff]" />
                <div className="text-[10px] font-mono font-bold text-[#00d4ff] tracking-[0.25em]">PRODUCER BRIEFING</div>
              </div>
              <p className="text-[12px] font-mono text-gray-300 leading-relaxed">
                {bp.producer_brief}
              </p>
              <div className="mt-4 pt-3 border-t border-[#00d4ff]/10 flex items-center gap-3 flex-wrap">
                <span className="text-[9px] font-mono text-gray-700 tracking-widest">ENGINE</span>
                <span className="text-[9px] font-mono text-gray-600">{blueprint.engine_version}</span>
                <span className="text-[9px] font-mono text-gray-700 tracking-widest ml-2">GENERATED</span>
                <span className="text-[9px] font-mono text-gray-600">
                  {new Date(blueprint.created_at).toLocaleDateString()}
                </span>
                {blueprint.repair_count != null && blueprint.repair_count > 0 && (
                  <>
                    <span className="text-[9px] font-mono text-gray-700 tracking-widest ml-2">REPAIRS</span>
                    <span className="text-[9px] font-mono text-yellow-600">{blueprint.repair_count}</span>
                  </>
                )}
              </div>
            </div>

            {/* Coherence + Quality */}
            <div className="bg-[#080808] border border-[#00ff41]/15 rounded-lg p-5 flex flex-col items-center justify-center gap-3"
                 style={{ boxShadow: 'inset 0 0 0 1px #00ff410a' }}>
              <div className="text-[9px] font-mono text-gray-600 tracking-[0.25em]">COHERENCE SCORE</div>
              <div
                className="text-5xl font-mono font-bold tabular-nums"
                style={{ color: coherenceColor(coherenceScore) }}
              >
                {(coherenceScore * 100).toFixed(0)}
              </div>
              <div className="text-[9px] font-mono text-gray-700">/ 100</div>
              <div className="w-full h-1 bg-[#111] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${coherenceScore * 100}%`,
                    backgroundColor: coherenceColor(coherenceScore),
                  }}
                />
              </div>
              <div className="text-[9px] font-mono text-center"
                   style={{ color: coherenceColor(coherenceScore) }}>
                {coherenceScore >= 0.85 ? 'HIGHLY COHERENT'
                 : coherenceScore >= 0.70 ? 'COHERENT'
                 : coherenceScore >= 0.55 ? 'MODERATE'
                 : 'LOW COHERENCE'}
              </div>

              {/* Generation quality badge */}
              {blueprint.generation_quality && (
                <div className="mt-1 pt-3 border-t border-white/5 w-full text-center">
                  <div className="text-[9px] font-mono text-gray-600 tracking-[0.2em] mb-1">GENERATION QUALITY</div>
                  <div
                    className="text-[10px] font-mono font-bold tracking-[0.15em] uppercase"
                    style={{ color: qualityColor }}
                  >
                    {blueprint.generation_quality}
                  </div>
                  {blueprint.confidence_score != null && (
                    <div className="text-[9px] font-mono text-gray-700 mt-0.5">
                      {(parseFloat(String(blueprint.confidence_score)) * 100).toFixed(0)}% confidence
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
