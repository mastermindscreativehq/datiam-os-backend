import { useState, useEffect, useCallback, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { artists as artistsApi, audio, energy as energyApi, audioDna as audioDnaApi, syncIntelligence as syncIntelligenceApi } from '../api/client'
import LoadingSpinner from '../components/LoadingSpinner'

// ─── Audio Pipeline Types ─────────────────────────────────────────────────────

interface Artist { id: string; stage_name: string }

interface Upload {
  id: string
  session_id: string
  artist_id: string
  file_name: string
  file_size: number
  mime_type: string
  storage_url: string | null
  duration_seconds: string | null
  status: string
  created_at: string
}

interface EmotionalProfile {
  primary_emotion: string
  secondary_emotion: string
  intensity: number
  valence: number
  arousal: number
}

interface Analysis {
  id: string
  upload_id: string
  bpm: string | null
  duration_seconds: string | null
  loudness_lufs: string | null
  peak_db: string | null
  sample_rate: number | null
  bit_rate: number | null
  channels: number | null
  format: string | null
  emotional_profile: EmotionalProfile | null
  cinematic_score: string | null
  sync_categories: string[] | null
  genre_confidence: Record<string, number> | null
  vocal_intensity: string | null
  replay_score: string | null
  trailer_suitability: string | null
  ai_notes: string | null
}

interface WaveformData { waveform_data: number[]; duration_seconds: string }

interface Job {
  id: string
  job_type: string
  status: string
  error: string | null
  created_at: string
  completed_at: string | null
}

interface UploadDetail {
  upload: Upload
  analysis: Analysis | null
  waveform: WaveformData | null
  jobs: Job[]
}

// ─── Energy Intelligence Types ────────────────────────────────────────────────

interface EnergyIntelligence {
  energyArc: string
  peakMoment: string
  dropStrength: number
  energyVolatility: number
  tensionCurve: string
  replayRetention: number
}

interface EnergyCurvePoint { t: number; rms: number; sc: number }

interface EnergySection {
  sectionType: string
  sectionIndex: number
  startTime: number
  endTime: number
  duration: number
  energyScore: number
  tensionScore: number
  avgRms: number
  avgSpectralCentroid: number
  peakRms: number
  avgSpectralFlux: number
  avgZcr: number
}

type EnergyStatus = 'not_started' | 'pending' | 'processing' | 'completed' | 'failed'

interface EnergyData {
  status: EnergyStatus
  intelligence: EnergyIntelligence | null
  energyCurve: EnergyCurvePoint[]
  sections: EnergySection[]
}

type DnaStatus = 'not_started' | 'pending' | 'processing' | 'completed' | 'failed'
type SyncStatus = 'not_started' | 'pending' | 'processing' | 'completed' | 'failed'

interface DnaData { status: DnaStatus }
interface SyncData { status: SyncStatus }

// ─── Waveform Canvas ──────────────────────────────────────────────────────────

function WaveformCanvas({ data }: { data: number[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !data.length) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width, height } = canvas
    const midY = height / 2
    const barWidth = width / data.length

    ctx.clearRect(0, 0, width, height)

    ctx.fillStyle = '#00ff4110'
    ctx.fillRect(0, midY - 0.5, width, 1)

    data.forEach((amp, i) => {
      const barH = Math.max(1, amp * midY * 0.88)
      const x = i * barWidth
      const grad = ctx.createLinearGradient(x, midY - barH, x, midY + barH)
      grad.addColorStop(0, '#00ff41cc')
      grad.addColorStop(0.5, '#00d4ffcc')
      grad.addColorStop(1, '#00ff41cc')
      ctx.fillStyle = grad
      ctx.fillRect(x, midY - barH, Math.max(1, barWidth - 0.5), barH * 2)
    })
  }, [data])

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={80}
      className="w-full rounded"
      style={{ background: '#050505', display: 'block' }}
    />
  )
}

// ─── Energy Curve Chart ───────────────────────────────────────────────────────

function EnergyCurveChart({ curve, peakMoment }: { curve: EnergyCurvePoint[]; peakMoment: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || curve.length < 2) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvas.width
    const H = canvas.height
    const pad = { l: 0, r: 0, t: 6, b: 6 }
    const plotW = W - pad.l - pad.r
    const plotH = H - pad.t - pad.b
    const maxT = curve[curve.length - 1].t || 1

    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = '#050505'
    ctx.fillRect(0, 0, W, H)

    // Subtle grid lines
    ctx.strokeStyle = '#ffffff06'
    ctx.lineWidth = 1
    for (let i = 1; i < 4; i++) {
      const y = pad.t + (plotH * i) / 4
      ctx.beginPath()
      ctx.moveTo(pad.l, y)
      ctx.lineTo(pad.l + plotW, y)
      ctx.stroke()
    }

    const toX = (t: number) => pad.l + (t / maxT) * plotW
    const toY = (rms: number) => pad.t + plotH - rms * plotH

    // Filled area
    const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + plotH)
    grad.addColorStop(0, '#00ff4135')
    grad.addColorStop(1, '#00ff4105')

    ctx.beginPath()
    curve.forEach((pt, i) => {
      const x = toX(pt.t)
      const y = toY(pt.rms)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.lineTo(toX(curve[curve.length - 1].t), pad.t + plotH)
    ctx.lineTo(toX(curve[0].t), pad.t + plotH)
    ctx.closePath()
    ctx.fillStyle = grad
    ctx.fill()

    // Curve line
    ctx.beginPath()
    curve.forEach((pt, i) => {
      const x = toX(pt.t)
      const y = toY(pt.rms)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.strokeStyle = '#00ff41'
    ctx.lineWidth = 1.5
    ctx.stroke()

    // Peak moment marker
    const parts = peakMoment.split(':').map(Number)
    const peakSeconds = (parts[0] ?? 0) * 60 + (parts[1] ?? 0)
    if (peakSeconds > 0 && peakSeconds < maxT) {
      const px = toX(peakSeconds)
      ctx.save()
      ctx.setLineDash([3, 3])
      ctx.strokeStyle = '#00d4ff60'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(px, pad.t)
      ctx.lineTo(px, pad.t + plotH)
      ctx.stroke()
      ctx.restore()

      ctx.fillStyle = '#00d4ff'
      ctx.font = '9px monospace'
      ctx.fillText('PEAK', Math.min(px + 3, W - 36), pad.t + 10)
    }
  }, [curve, peakMoment])

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={96}
      className="w-full rounded"
      style={{ background: '#050505', display: 'block' }}
    />
  )
}

// ─── Section Timeline ─────────────────────────────────────────────────────────

const SECTION_STYLE: Record<string, { color: string }> = {
  intro:      { color: '#6366f1' },
  verse:      { color: '#10b981' },
  pre_chorus: { color: '#f59e0b' },
  chorus:     { color: '#00d4ff' },
  bridge:     { color: '#a855f7' },
  outro:      { color: '#64748b' },
}

function SectionTimeline({ sections }: { sections: EnergySection[] }) {
  if (!sections.length) return null
  const totalDuration = sections[sections.length - 1].endTime || 1

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.round(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-2">
      {/* Bar */}
      <div className="flex h-7 rounded overflow-hidden gap-[1px]">
        {sections.map((s) => {
          const pct = (s.duration / totalDuration) * 100
          const style = SECTION_STYLE[s.sectionType] ?? { color: '#64748b' }
          const label = s.sectionType.replace('_', ' ').toUpperCase()
          return (
            <div
              key={`${s.sectionType}-${s.sectionIndex}`}
              title={`${label} ${fmtTime(s.startTime)}–${fmtTime(s.endTime)}`}
              className="flex items-center justify-center overflow-hidden text-[8px] font-mono tracking-wider shrink-0"
              style={{
                width: `${pct}%`,
                background: style.color + '18',
                borderTop: `2px solid ${style.color}60`,
                color: style.color + 'cc',
              }}
            >
              {pct > 7 ? label.substring(0, 4) : ''}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {sections.map((s) => {
          const style = SECTION_STYLE[s.sectionType] ?? { color: '#64748b' }
          return (
            <div
              key={`${s.sectionType}-${s.sectionIndex}-leg`}
              className="flex items-center gap-1.5 text-[9px] font-mono"
            >
              <div className="w-1.5 h-1.5 rounded-sm" style={{ background: style.color }} />
              <span style={{ color: style.color + 'cc' }}>
                {s.sectionType.replace('_', ' ').toUpperCase()} {fmtTime(s.startTime)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Score Bar ────────────────────────────────────────────────────────────────

function ScoreBar({ label, value, color = '#00ff41' }: { label: string; value: number; color?: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] font-mono">
        <span className="text-gray-500 tracking-wider uppercase">{label}</span>
        <span style={{ color }}>{Math.round(value)}</span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
    </div>
  )
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending:    { label: 'PENDING',    cls: 'text-gray-500 border-gray-500/30 bg-gray-500/5' },
    queued:     { label: 'QUEUED',     cls: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/5' },
    processing: { label: 'PROCESSING', cls: 'text-[#00d4ff] border-[#00d4ff]/30 bg-[#00d4ff]/5' },
    analyzed:   { label: 'ANALYZED',   cls: 'text-[#00ff41] border-[#00ff41]/30 bg-[#00ff41]/5' },
    failed:     { label: 'FAILED',     cls: 'text-red-400 border-red-400/30 bg-red-400/5' },
  }
  const { label, cls } = map[status] ?? map['pending']
  return (
    <span className={`text-[10px] font-mono tracking-widest px-2 py-0.5 border rounded ${cls}`}>
      {label}
    </span>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtBytes = (b: number) =>
  b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${(b / 1024).toFixed(0)} KB`

const fmtDuration = (s: string | null) => {
  if (!s) return '—'
  const n = parseFloat(s)
  const m = Math.floor(n / 60)
  const sec = Math.round(n % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

const fmtScore = (v: string | null) => (v ? parseFloat(v).toFixed(1) : '—')

// ─── Energy Arc / Tension Curve label helpers ─────────────────────────────────

const ARC_STYLE: Record<string, { label: string; color: string }> = {
  slow_burn:    { label: 'SLOW BURN',    color: '#6366f1' },
  explosive:    { label: 'EXPLOSIVE',    color: '#ef4444' },
  steady:       { label: 'STEADY',       color: '#10b981' },
  rollercoaster:{ label: 'ROLLERCOASTER',color: '#a855f7' },
  plateau:      { label: 'PLATEAU',      color: '#64748b' },
}

const TENSION_STYLE: Record<string, { label: string; color: string }> = {
  ascending:  { label: 'ASCENDING',  color: '#00ff41' },
  descending: { label: 'DESCENDING', color: '#f59e0b' },
  plateau:    { label: 'PLATEAU',    color: '#64748b' },
  wave:       { label: 'WAVE',       color: '#a855f7' },
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AudioUpload() {
  const [artistList, setArtistList]         = useState<Artist[]>([])
  const [selectedArtist, setSelectedArtist] = useState('')
  const [uploads, setUploads]               = useState<Upload[]>([])
  const [expandedId, setExpandedId]         = useState<string | null>(null)
  const [detail, setDetail]                 = useState<Record<string, UploadDetail>>({})
  const [uploading, setUploading]           = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError]       = useState<string | null>(null)
  const [loadingUploads, setLoadingUploads] = useState(false)
  const [pollingIds, setPollingIds]         = useState<Set<string>>(new Set())
  const pollingRef                          = useRef<Record<string, ReturnType<typeof setInterval>>>({})

  // Energy state
  const [energyData, setEnergyData]           = useState<Record<string, EnergyData>>({})
  const [energyPollingIds, setEnergyPollingIds] = useState<Set<string>>(new Set())
  const energyPollingRef                        = useRef<Record<string, ReturnType<typeof setInterval>>>({})
  const energyTriggeredRef                      = useRef<Set<string>>(new Set())

  // DNA state
  const [dnaData, setDnaData]             = useState<Record<string, DnaData>>({})
  const [dnaPollingIds, setDnaPollingIds] = useState<Set<string>>(new Set())
  const dnaPollingRef                     = useRef<Record<string, ReturnType<typeof setInterval>>>({})
  const dnaCheckedRef                     = useRef<Set<string>>(new Set())

  // Sync state
  const [syncData, setSyncData]             = useState<Record<string, SyncData>>({})
  const [syncPollingIds, setSyncPollingIds] = useState<Set<string>>(new Set())
  const syncPollingRef                      = useRef<Record<string, ReturnType<typeof setInterval>>>({})
  const syncCheckedRef                      = useRef<Set<string>>(new Set())

  // ── Load artists ─────────────────────────────────────────────────────────────
  useEffect(() => {
    artistsApi.list().then((r) => {
      const data = (r.data?.data ?? []) as Artist[]
      setArtistList(data)
      if (data.length === 1) setSelectedArtist(data[0].id)
    }).catch(() => {})
  }, [])

  // ── Load uploads when artist changes ─────────────────────────────────────────
  useEffect(() => {
    if (!selectedArtist) return
    setLoadingUploads(true)
    audio.list(selectedArtist)
      .then((r) => setUploads((r.data?.data ?? []) as Upload[]))
      .catch(() => {})
      .finally(() => setLoadingUploads(false))
  }, [selectedArtist])

  // ── Energy polling ───────────────────────────────────────────────────────────
  const startEnergyPolling = useCallback((uploadId: string) => {
    if (energyPollingRef.current[uploadId]) return
    energyPollingRef.current[uploadId] = setInterval(async () => {
      try {
        console.log('polling energy status', { uploadId })
        const r = await energyApi.get(uploadId)
        const res = r.data
        console.log('energy response', { uploadId, status: res.status, hasData: !!res.data })
        const ed: EnergyData = {
          status: res.status as EnergyStatus,
          intelligence: res.data?.intelligence ?? null,
          energyCurve: res.data?.energyCurve ?? [],
          sections: res.data?.sections ?? [],
        }
        setEnergyData((prev) => ({ ...prev, [uploadId]: ed }))
        if (res.status === 'completed' || res.status === 'failed') {
          clearInterval(energyPollingRef.current[uploadId])
          delete energyPollingRef.current[uploadId]
          setEnergyPollingIds((prev) => { const s = new Set(prev); s.delete(uploadId); return s })
        }
      } catch (err) {
        console.error('[EnergyPolling] poll error', { uploadId, err })
      }
    }, 3000)
    setEnergyPollingIds((prev) => new Set(prev).add(uploadId))
  }, [])

  // ── Trigger energy analysis for a completed audio upload ─────────────────────
  const triggerEnergyAnalysis = useCallback(async (uploadId: string) => {
    if (energyTriggeredRef.current.has(uploadId)) return
    energyTriggeredRef.current.add(uploadId)

    // Optimistically show loading
    setEnergyData((prev) => ({
      ...prev,
      [uploadId]: { status: 'pending', intelligence: null, energyCurve: [], sections: [] },
    }))

    try {
      console.log('polling energy status', { uploadId, phase: 'initial-check' })
      const r = await energyApi.get(uploadId)
      const res = r.data
      console.log('energy response', { uploadId, status: res.status, hasData: !!res.data })

      if (res.status === 'completed') {
        setEnergyData((prev) => ({
          ...prev,
          [uploadId]: {
            status: 'completed',
            intelligence: res.data?.intelligence ?? null,
            energyCurve: res.data?.energyCurve ?? [],
            sections: res.data?.sections ?? [],
          },
        }))
        return
      }

      if (res.status === 'pending' || res.status === 'processing') {
        setEnergyData((prev) => ({
          ...prev,
          [uploadId]: { status: res.status as EnergyStatus, intelligence: null, energyCurve: [], sections: [] },
        }))
        startEnergyPolling(uploadId)
        return
      }

      // not_started or failed — enqueue
      console.log('energy response', { uploadId, action: 'enqueueing', prevStatus: res.status })
      await energyApi.analyze(uploadId)
      setEnergyData((prev) => ({
        ...prev,
        [uploadId]: { status: 'pending', intelligence: null, energyCurve: [], sections: [] },
      }))
      startEnergyPolling(uploadId)
    } catch (err) {
      const axiosErr = err as { code?: string; message?: string; response?: { status?: number; data?: unknown } }
      console.error('[EnergyAnalysis] trigger failed', {
        uploadId,
        code: axiosErr.code,
        message: axiosErr.message,
        httpStatus: axiosErr.response?.status,
        responseData: axiosErr.response?.data,
      })
      energyTriggeredRef.current.delete(uploadId)
      setEnergyData((prev) => ({
        ...prev,
        [uploadId]: { status: 'failed', intelligence: null, energyCurve: [], sections: [] },
      }))
    }
  }, [startEnergyPolling])

  // ── DNA polling ──────────────────────────────────────────────────────────────
  const startDnaPolling = useCallback((uploadId: string) => {
    if (dnaPollingRef.current[uploadId]) return
    dnaPollingRef.current[uploadId] = setInterval(async () => {
      try {
        const r = await audioDnaApi.get(uploadId)
        const status = r.data?.status as DnaStatus
        setDnaData((prev) => ({ ...prev, [uploadId]: { status: status ?? 'pending' } }))
        if (status === 'completed' || status === 'failed') {
          clearInterval(dnaPollingRef.current[uploadId])
          delete dnaPollingRef.current[uploadId]
          setDnaPollingIds((prev) => { const s = new Set(prev); s.delete(uploadId); return s })
        }
      } catch { /* silent */ }
    }, 3000)
    setDnaPollingIds((prev) => new Set(prev).add(uploadId))
  }, [])

  const triggerDnaAnalysis = useCallback(async (uploadId: string) => {
    setDnaData((prev) => ({ ...prev, [uploadId]: { status: 'pending' } }))
    try {
      await audioDnaApi.analyze(uploadId)
      startDnaPolling(uploadId)
    } catch {
      setDnaData((prev) => ({ ...prev, [uploadId]: { status: 'failed' } }))
    }
  }, [startDnaPolling])

  // ── Sync polling ──────────────────────────────────────────────────────────────
  const startSyncPolling = useCallback((uploadId: string) => {
    if (syncPollingRef.current[uploadId]) return
    syncPollingRef.current[uploadId] = setInterval(async () => {
      try {
        const r = await syncIntelligenceApi.get(uploadId)
        const status = r.data?.status as SyncStatus
        setSyncData((prev) => ({ ...prev, [uploadId]: { status: status ?? 'pending' } }))
        if (status === 'completed' || status === 'failed') {
          clearInterval(syncPollingRef.current[uploadId])
          delete syncPollingRef.current[uploadId]
          setSyncPollingIds((prev) => { const s = new Set(prev); s.delete(uploadId); return s })
        }
      } catch { /* silent */ }
    }, 3000)
    setSyncPollingIds((prev) => new Set(prev).add(uploadId))
  }, [])

  const triggerSyncAnalysis = useCallback(async (uploadId: string) => {
    setSyncData((prev) => ({ ...prev, [uploadId]: { status: 'pending' } }))
    try {
      await syncIntelligenceApi.analyze(uploadId)
      startSyncPolling(uploadId)
    } catch {
      setSyncData((prev) => ({ ...prev, [uploadId]: { status: 'failed' } }))
    }
  }, [startSyncPolling])

  // ── Audio polling ─────────────────────────────────────────────────────────────
  const startPolling = useCallback((uploadId: string) => {
    if (pollingRef.current[uploadId]) return
    pollingRef.current[uploadId] = setInterval(async () => {
      try {
        const r = await audio.getAnalysis(uploadId)
        const d = r.data?.data as UploadDetail
        console.log('job id', { uploadId, audioStatus: d.upload.status, jobCount: d.jobs.length })
        setDetail((prev) => ({ ...prev, [uploadId]: d }))
        setUploads((prev) =>
          prev.map((u) => (u.id === uploadId ? { ...u, status: d.upload.status } : u)),
        )
        if (d.upload.status === 'analyzed' || d.upload.status === 'failed') {
          clearInterval(pollingRef.current[uploadId])
          delete pollingRef.current[uploadId]
          setPollingIds((prev) => { const s = new Set(prev); s.delete(uploadId); return s })

          // Auto-trigger energy analysis when audio processing is done
          if (d.upload.status === 'analyzed') {
            triggerEnergyAnalysis(uploadId)
          }
        }
      } catch (err) {
        console.error('[AudioPolling] poll error', { uploadId, err })
      }
    }, 3000)
    setPollingIds((prev) => new Set(prev).add(uploadId))
  }, [triggerEnergyAnalysis])

  // Cleanup pollers on unmount
  useEffect(() => {
    return () => {
      Object.values(pollingRef.current).forEach(clearInterval)
      Object.values(energyPollingRef.current).forEach(clearInterval)
      Object.values(dnaPollingRef.current).forEach(clearInterval)
      Object.values(syncPollingRef.current).forEach(clearInterval)
    }
  }, [])

  // ── Expand an upload and fetch details ───────────────────────────────────────
  const handleExpand = useCallback(async (uploadId: string) => {
    if (expandedId === uploadId) { setExpandedId(null); return }
    setExpandedId(uploadId)

    // Load audio detail if not yet cached
    if (!detail[uploadId]) {
      try {
        const r = await audio.getAnalysis(uploadId)
        const d = r.data?.data as UploadDetail
        setDetail((prev) => ({ ...prev, [uploadId]: d }))

        // Auto-trigger energy for already-analyzed uploads
        if (d.upload.status === 'analyzed' && !energyTriggeredRef.current.has(uploadId)) {
          triggerEnergyAnalysis(uploadId)
        }
      } catch { /* non-fatal */ }
    } else {
      // Detail cached — check if we should start energy
      const d = detail[uploadId]
      if (d.upload.status === 'analyzed' && !energyTriggeredRef.current.has(uploadId)) {
        triggerEnergyAnalysis(uploadId)
      }
    }

    // Probe existing DNA status so the button reflects reality on first expand
    if (!dnaCheckedRef.current.has(uploadId)) {
      dnaCheckedRef.current.add(uploadId)
      audioDnaApi.get(uploadId).then((r) => {
        const status = r.data?.status as DnaStatus
        if (status && status !== 'not_started') {
          setDnaData((prev) => ({ ...prev, [uploadId]: { status } }))
          if (status === 'pending' || status === 'processing') startDnaPolling(uploadId)
        }
      }).catch(() => {})
    }

    // Probe existing Sync status
    if (!syncCheckedRef.current.has(uploadId)) {
      syncCheckedRef.current.add(uploadId)
      syncIntelligenceApi.get(uploadId).then((r) => {
        const status = r.data?.status as SyncStatus
        if (status && status !== 'not_started') {
          setSyncData((prev) => ({ ...prev, [uploadId]: { status } }))
          if (status === 'pending' || status === 'processing') startSyncPolling(uploadId)
        }
      }).catch(() => {})
    }
  }, [expandedId, detail, triggerEnergyAnalysis, startDnaPolling, startSyncPolling])

  // ── Dropzone ──────────────────────────────────────────────────────────────────
  const onDrop = useCallback(async (accepted: File[]) => {
    if (!accepted.length) return
    if (!selectedArtist) { setUploadError('Select an artist first'); return }

    const file = accepted[0]
    console.log('file selected', { name: file.name, size: file.size, type: file.type })
    setUploadError(null)
    setUploading(true)
    setUploadProgress(0)
    console.log('upload started', { artistId: selectedArtist })

    try {
      const form = new FormData()
      form.append('file', file)
      form.append('artist_id', selectedArtist)

      console.log('sending upload request', { endpoint: '/api/audio/upload', artistId: selectedArtist, fileName: file.name })
      const result = await audio.upload(form, (pct) => setUploadProgress(pct))
      console.log('upload response', { status: result.status, data: result.data })
      const newUpload = result.data?.data as { upload_id: string; session_id: string; status: string; file_name: string; file_size: number; storage_url: string }
      console.log('job id', { uploadId: newUpload.upload_id, uploadStatus: newUpload.status })

      const placeholder: Upload = {
        id: newUpload.upload_id,
        session_id: newUpload.session_id,
        artist_id: selectedArtist,
        file_name: newUpload.file_name,
        file_size: newUpload.file_size,
        mime_type: file.type,
        storage_url: newUpload.storage_url,
        duration_seconds: null,
        status: newUpload.status,
        created_at: new Date().toISOString(),
      }
      setUploads((prev) => [placeholder, ...prev])
      setExpandedId(newUpload.upload_id)
      startPolling(newUpload.upload_id)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Upload failed'
      setUploadError(msg)
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }, [selectedArtist, startPolling])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/wav':  ['.wav'],
      'audio/mpeg': ['.mp3'],
      'audio/flac': ['.flac'],
      'audio/aac':  ['.aac'],
      'audio/ogg':  ['.ogg'],
    },
    maxSize: 500 * 1024 * 1024,
    multiple: false,
    disabled: uploading || !selectedArtist,
  })

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6 font-mono">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[#00ff41] text-xl tracking-[0.3em] font-bold text-glow-green">
            AUDIO PIPELINE
          </h1>
          <p className="text-gray-600 text-[11px] tracking-[0.2em] mt-1">
            WAV · MP3 · FLAC · AAC · OGG — MAX 500MB
          </p>
        </div>
        <div className="text-[10px] text-[#00d4ff]/40 tracking-widest border border-[#00d4ff]/15 px-3 py-1.5 rounded">
          PHASE 6 — ACTIVE
        </div>
      </div>

      {/* Artist Selector */}
      <div className="bg-[#0a0a0a] border border-[#00ff41]/15 rounded p-4">
        <label className="block text-[10px] text-[#00ff41]/60 tracking-[0.2em] mb-2 uppercase">
          Select Artist
        </label>
        <select
          value={selectedArtist}
          onChange={(e) => setSelectedArtist(e.target.value)}
          className="w-full bg-black border border-[#00ff41]/20 rounded px-3 py-2 text-[12px] text-[#00ff41] font-mono tracking-wider focus:outline-none focus:border-[#00ff41]/50"
        >
          <option value="">— choose artist —</option>
          {artistList.map((a) => (
            <option key={a.id} value={a.id}>{a.stage_name}</option>
          ))}
        </select>
      </div>

      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-10 text-center transition-all duration-200 cursor-pointer
          ${isDragActive
            ? 'border-[#00ff41] bg-[#00ff41]/5'
            : !selectedArtist
            ? 'border-gray-800 opacity-40 cursor-not-allowed'
            : 'border-[#00ff41]/25 hover:border-[#00ff41]/60 hover:bg-[#00ff41]/3'
          }`}
      >
        <input {...getInputProps()} />

        {uploading ? (
          <div className="space-y-4">
            <div className="text-[#00d4ff] text-[11px] tracking-[0.3em] animate-pulse">
              UPLOADING...
            </div>
            <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-[#00d4ff] rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <div className="text-[#00d4ff]/60 text-[11px]">{uploadProgress}%</div>
          </div>
        ) : isDragActive ? (
          <div className="space-y-2">
            <div className="text-4xl text-[#00ff41]">◎</div>
            <div className="text-[#00ff41] text-[11px] tracking-[0.3em]">DROP TO UPLOAD</div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-3xl text-[#00ff41]/40">⬆</div>
            <div className="text-gray-500 text-[11px] tracking-[0.2em]">
              {selectedArtist ? 'DRAG & DROP OR CLICK TO SELECT' : 'SELECT AN ARTIST TO ENABLE UPLOAD'}
            </div>
            <div className="text-gray-700 text-[10px] tracking-wider">
              WAV · MP3 · FLAC · AAC · OGG
            </div>
          </div>
        )}
      </div>

      {uploadError && (
        <div className="border border-red-500/30 bg-red-500/5 rounded px-4 py-2 text-red-400 text-[11px] tracking-wider">
          ⊗ {uploadError}
        </div>
      )}

      {/* Uploads List */}
      {selectedArtist && (
        <div className="space-y-2">
          <div className="text-[10px] text-[#00ff41]/40 tracking-[0.3em] uppercase px-1">
            Upload History
          </div>

          {loadingUploads ? (
            <div className="flex justify-center py-8"><LoadingSpinner /></div>
          ) : uploads.length === 0 ? (
            <div className="border border-white/5 rounded p-6 text-center text-gray-700 text-[11px] tracking-wider">
              NO UPLOADS YET
            </div>
          ) : (
            uploads.map((upload) => (
              <UploadRow
                key={upload.id}
                upload={upload}
                expanded={expandedId === upload.id}
                detail={detail[upload.id] ?? null}
                polling={pollingIds.has(upload.id)}
                energyData={energyData[upload.id] ?? null}
                energyPolling={energyPollingIds.has(upload.id)}
                dnaData={dnaData[upload.id] ?? null}
                dnaPolling={dnaPollingIds.has(upload.id)}
                syncData={syncData[upload.id] ?? null}
                syncPolling={syncPollingIds.has(upload.id)}
                onToggle={() => handleExpand(upload.id)}
                onTriggerDna={() => triggerDnaAnalysis(upload.id)}
                onTriggerSync={() => triggerSyncAnalysis(upload.id)}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ─── Upload Row ───────────────────────────────────────────────────────────────

function UploadRow({
  upload, expanded, detail, polling, energyData, energyPolling,
  dnaData, dnaPolling, syncData, syncPolling,
  onToggle, onTriggerDna, onTriggerSync,
}: {
  upload: Upload
  expanded: boolean
  detail: UploadDetail | null
  polling: boolean
  energyData: EnergyData | null
  energyPolling: boolean
  dnaData: DnaData | null
  dnaPolling: boolean
  syncData: SyncData | null
  syncPolling: boolean
  onToggle: () => void
  onTriggerDna: () => void
  onTriggerSync: () => void
}) {
  return (
    <div className="border border-[#00ff41]/10 rounded overflow-hidden">
      {/* Row header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-4 py-3 bg-[#0a0a0a] hover:bg-[#0f0f0f] transition-colors text-left"
      >
        <span className="text-[#00ff41]/40 text-[11px]">◎</span>
        <span className="flex-1 text-[11px] text-gray-300 tracking-wider truncate">
          {upload.file_name}
        </span>
        <span className="text-[10px] text-gray-600 shrink-0">{fmtBytes(upload.file_size)}</span>
        {polling && (
          <span className="text-[#00d4ff] text-[10px] animate-pulse tracking-widest shrink-0">
            ◌ PROCESSING
          </span>
        )}
        <StatusBadge status={upload.status} />
        <span className="text-gray-700 text-[11px]">{expanded ? '▲' : '▼'}</span>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-[#00ff41]/10 bg-black px-4 py-4 space-y-5">
          {!detail ? (
            <div className="flex justify-center py-6"><LoadingSpinner /></div>
          ) : (
            <>
              {/* Waveform */}
              {detail.waveform && Array.isArray(detail.waveform.waveform_data) && detail.waveform.waveform_data.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] text-[#00ff41]/40 tracking-[0.2em] uppercase">Waveform</div>
                  <WaveformCanvas data={detail.waveform.waveform_data} />
                  <div className="text-[10px] text-gray-700 text-right">
                    {fmtDuration(detail.waveform.duration_seconds)}
                  </div>
                </div>
              )}

              {/* Technical Metadata */}
              {detail.analysis && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <MetaCard label="BPM" value={fmtScore(detail.analysis.bpm)} color="#00ff41" />
                  <MetaCard label="Duration" value={fmtDuration(detail.analysis.duration_seconds)} color="#00d4ff" />
                  <MetaCard label="Loudness" value={detail.analysis.loudness_lufs ? `${parseFloat(detail.analysis.loudness_lufs).toFixed(1)} LUFS` : '—'} color="#00d4ff" />
                  <MetaCard label="Peak" value={detail.analysis.peak_db ? `${parseFloat(detail.analysis.peak_db).toFixed(1)} dB` : '—'} color="#00d4ff" />
                  <MetaCard label="Sample Rate" value={detail.analysis.sample_rate ? `${detail.analysis.sample_rate} Hz` : '—'} color="#6366f1" />
                  <MetaCard label="Channels" value={detail.analysis.channels?.toString() ?? '—'} color="#6366f1" />
                  <MetaCard label="Format" value={detail.analysis.format?.toUpperCase() ?? '—'} color="#6366f1" />
                  <MetaCard label="Bit Rate" value={detail.analysis.bit_rate ? `${Math.round(detail.analysis.bit_rate / 1000)} kbps` : '—'} color="#6366f1" />
                </div>
              )}

              {/* AI Analysis */}
              {detail.analysis && (detail.analysis.cinematic_score || detail.analysis.emotional_profile) && (
                <div className="space-y-4">
                  <div className="text-[10px] text-[#00ff41]/40 tracking-[0.2em] uppercase">
                    AI Sonic Analysis
                  </div>

                  {detail.analysis.ai_notes && (
                    <div className="border border-[#00d4ff]/15 bg-[#00d4ff]/3 rounded p-3 text-[11px] text-[#00d4ff]/80 leading-relaxed tracking-wider">
                      {detail.analysis.ai_notes}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Score bars */}
                    <div className="space-y-3">
                      {detail.analysis.cinematic_score && (
                        <ScoreBar label="Cinematic Score" value={parseFloat(detail.analysis.cinematic_score)} color="#00d4ff" />
                      )}
                      {detail.analysis.trailer_suitability && (
                        <ScoreBar label="Trailer Suitability" value={parseFloat(detail.analysis.trailer_suitability)} color="#a855f7" />
                      )}
                      {detail.analysis.replay_score && (
                        <ScoreBar label="Replay Score" value={parseFloat(detail.analysis.replay_score)} color="#00ff41" />
                      )}
                      {detail.analysis.vocal_intensity && (
                        <ScoreBar label="Vocal Intensity" value={parseFloat(detail.analysis.vocal_intensity)} color="#f59e0b" />
                      )}
                    </div>

                    {/* Emotional profile */}
                    {detail.analysis.emotional_profile && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <MetaCard
                            label="Primary Emotion"
                            value={detail.analysis.emotional_profile.primary_emotion.toUpperCase()}
                            color="#ec4899"
                          />
                          <MetaCard
                            label="Secondary"
                            value={detail.analysis.emotional_profile.secondary_emotion.toUpperCase()}
                            color="#ec4899"
                          />
                        </div>
                        <ScoreBar label="Valence" value={detail.analysis.emotional_profile.valence} color="#10b981" />
                        <ScoreBar label="Arousal" value={detail.analysis.emotional_profile.arousal} color="#f97316" />
                        <ScoreBar label="Intensity" value={detail.analysis.emotional_profile.intensity} color="#ef4444" />
                      </div>
                    )}
                  </div>

                  {/* Sync Categories */}
                  {detail.analysis.sync_categories && detail.analysis.sync_categories.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[10px] text-gray-600 tracking-wider uppercase">Sync Categories</div>
                      <div className="flex flex-wrap gap-2">
                        {detail.analysis.sync_categories.map((cat) => (
                          <span
                            key={cat}
                            className="text-[10px] font-mono tracking-wider px-2 py-1 border border-[#00ff41]/20 bg-[#00ff41]/5 text-[#00ff41]/70 rounded"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Genre Confidence */}
                  {detail.analysis.genre_confidence && Object.keys(detail.analysis.genre_confidence).length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[10px] text-gray-600 tracking-wider uppercase">Genre Confidence</div>
                      <div className="space-y-1.5">
                        {Object.entries(detail.analysis.genre_confidence)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 5)
                          .map(([genre, conf]) => (
                            <div key={genre} className="flex items-center gap-3">
                              <span className="text-[10px] text-gray-500 w-28 truncate tracking-wider capitalize">
                                {genre}
                              </span>
                              <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-[#00d4ff]"
                                  style={{ width: `${conf * 100}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-[#00d4ff] w-8 text-right">
                                {Math.round(conf * 100)}%
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Job Status */}
              {detail.jobs.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] text-gray-700 tracking-[0.2em] uppercase">Processing Jobs</div>
                  {detail.jobs.map((job) => (
                    <div
                      key={job.id}
                      className="flex items-center gap-3 text-[10px] border border-white/5 rounded px-3 py-2"
                    >
                      <span className="text-gray-600 uppercase tracking-wider w-24">{job.job_type}</span>
                      <StatusBadge status={job.status} />
                      {job.error && (
                        <span className="text-red-400 truncate flex-1 tracking-wider">{job.error}</span>
                      )}
                      <span className="text-gray-700 ml-auto shrink-0">
                        {job.completed_at
                          ? new Date(job.completed_at).toLocaleTimeString()
                          : new Date(job.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* No analysis yet */}
              {!detail.analysis && upload.status !== 'failed' && (
                <div className="text-center py-4 text-gray-700 text-[11px] tracking-widest">
                  {upload.status === 'analyzed' ? 'ANALYSIS DATA NOT FOUND' : 'WAITING FOR ANALYSIS...'}
                </div>
              )}

              {upload.status === 'failed' && (
                <div className="border border-red-500/25 bg-red-500/5 rounded p-3 text-red-400 text-[11px] tracking-wider">
                  ⊗ Processing failed. Check job logs above.
                </div>
              )}

              {/* ── ENERGY INTELLIGENCE ────────────────────────────────────── */}
              {upload.status === 'analyzed' && (
                <EnergyIntelligenceSection
                  energyData={energyData}
                  energyPolling={energyPolling}
                />
              )}

              {/* ── INTELLIGENCE ACTIONS ───────────────────────────────────── */}
              {upload.status === 'analyzed' && (
                <IntelligenceActions
                  dnaData={dnaData}
                  dnaPolling={dnaPolling}
                  syncData={syncData}
                  syncPolling={syncPolling}
                  onTriggerDna={onTriggerDna}
                  onTriggerSync={onTriggerSync}
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Intelligence Actions ─────────────────────────────────────────────────────

function IntelligenceActions({
  dnaData, dnaPolling, syncData, syncPolling, onTriggerDna, onTriggerSync,
}: {
  dnaData: DnaData | null
  dnaPolling: boolean
  syncData: SyncData | null
  syncPolling: boolean
  onTriggerDna: () => void
  onTriggerSync: () => void
}) {
  const dnaRunning  = dnaPolling  || dnaData?.status  === 'pending' || dnaData?.status  === 'processing'
  const syncRunning = syncPolling || syncData?.status === 'pending' || syncData?.status === 'processing'

  return (
    <div className="border-t border-[#00ff41]/10 pt-4 space-y-3">
      <div className="text-[10px] text-[#00ff41]/40 tracking-[0.2em] uppercase">
        Intelligence Engines
      </div>
      <div className="flex flex-wrap gap-3">

        {/* DNA */}
        {dnaRunning ? (
          <span className="text-[10px] font-mono tracking-widest text-[#00d4ff] animate-pulse px-4 py-2 border border-[#00d4ff]/20 rounded">
            ◌ DNA ANALYZING...
          </span>
        ) : dnaData?.status === 'completed' ? (
          <span className="text-[10px] font-mono tracking-widest text-[#00ff41] px-4 py-2 border border-[#00ff41]/20 bg-[#00ff41]/5 rounded">
            ✓ DNA COMPLETE
          </span>
        ) : (
          <button
            onClick={onTriggerDna}
            className="text-[10px] font-mono tracking-widest px-4 py-2 border border-[#00d4ff]/30 bg-[#00d4ff]/5 text-[#00d4ff] rounded hover:bg-[#00d4ff]/10 hover:border-[#00d4ff]/50 transition-all"
          >
            ◎ ANALYZE DNA
          </button>
        )}

        {/* Sync — only available after DNA completes */}
        {dnaData?.status === 'completed' && (
          syncRunning ? (
            <span className="text-[10px] font-mono tracking-widest text-[#a855f7] animate-pulse px-4 py-2 border border-[#a855f7]/20 rounded">
              ◌ SYNC ANALYZING...
            </span>
          ) : syncData?.status === 'completed' ? (
            <span className="text-[10px] font-mono tracking-widest text-[#a855f7] px-4 py-2 border border-[#a855f7]/20 bg-[#a855f7]/5 rounded">
              ✓ SYNC COMPLETE
            </span>
          ) : (
            <button
              onClick={onTriggerSync}
              className="text-[10px] font-mono tracking-widest px-4 py-2 border border-[#a855f7]/30 bg-[#a855f7]/5 text-[#a855f7] rounded hover:bg-[#a855f7]/10 hover:border-[#a855f7]/50 transition-all"
            >
              ◈ ANALYZE SYNC
            </button>
          )
        )}
      </div>
    </div>
  )
}

// ─── Energy Intelligence Section ──────────────────────────────────────────────

function EnergyIntelligenceSection({
  energyData,
  energyPolling,
}: {
  energyData: EnergyData | null
  energyPolling: boolean
}) {
  const isLoading = energyPolling
    || energyData?.status === 'pending'
    || energyData?.status === 'processing'

  return (
    <div className="border-t border-[#00d4ff]/10 pt-5 space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="text-[10px] text-[#00d4ff] tracking-[0.3em] uppercase font-bold">
          Energy Intelligence
        </div>
        <div className="text-[9px] text-[#00d4ff]/30 tracking-widest border border-[#00d4ff]/10 px-2 py-0.5 rounded">
          PHASE 7
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center gap-3 py-4">
          <div className="text-[#00d4ff] text-[10px] animate-pulse tracking-[0.3em]">
            ◌ ANALYZING ENERGY...
          </div>
        </div>
      )}

      {/* Failure state */}
      {!isLoading && energyData?.status === 'failed' && (
        <div className="border border-red-500/25 bg-red-500/5 rounded p-3 text-red-400 text-[11px] tracking-wider">
          ⊗ Energy analysis failed. The audio file could not be processed.
        </div>
      )}

      {/* Completed state */}
      {!isLoading && energyData?.status === 'completed' && energyData.intelligence && (
        <div className="space-y-5">
          {/* Intelligence metrics */}
          <div className="space-y-4">
            {/* Arc + Tension badges + Peak */}
            <div className="grid grid-cols-3 gap-3">
              <EnergyBadgeCard
                label="Energy Arc"
                value={(ARC_STYLE[energyData.intelligence.energyArc ?? ''] ?? { label: (energyData.intelligence.energyArc ?? 'unknown').toUpperCase(), color: '#64748b' }).label}
                color={(ARC_STYLE[energyData.intelligence.energyArc ?? ''] ?? { color: '#64748b' }).color}
              />
              <EnergyBadgeCard
                label="Peak Moment"
                value={energyData.intelligence.peakMoment ?? '—'}
                color="#00d4ff"
              />
              <EnergyBadgeCard
                label="Tension Curve"
                value={(TENSION_STYLE[energyData.intelligence.tensionCurve ?? ''] ?? { label: (energyData.intelligence.tensionCurve ?? 'unknown').toUpperCase(), color: '#64748b' }).label}
                color={(TENSION_STYLE[energyData.intelligence.tensionCurve ?? ''] ?? { color: '#64748b' }).color}
              />
            </div>

            {/* Score bars */}
            <div className="space-y-2.5">
              <ScoreBar label="Drop Strength"     value={energyData.intelligence.dropStrength}    color="#ef4444" />
              <ScoreBar label="Energy Volatility" value={energyData.intelligence.energyVolatility} color="#a855f7" />
              <ScoreBar label="Replay Retention"  value={energyData.intelligence.replayRetention}  color="#00ff41" />
            </div>
          </div>

          {/* Energy Curve chart */}
          {energyData.energyCurve.length > 1 && (
            <div className="space-y-2">
              <div className="text-[10px] text-[#00d4ff]/40 tracking-[0.2em] uppercase">Energy Curve</div>
              <EnergyCurveChart
                curve={energyData.energyCurve}
                peakMoment={energyData.intelligence.peakMoment}
              />
              <div className="flex justify-between text-[9px] text-gray-700">
                <span>0:00</span>
                <span className="text-[#00ff41]/40">RMS Energy over Time</span>
                <span>
                  {(() => {
                    const last = energyData.energyCurve[energyData.energyCurve.length - 1]?.t ?? 0
                    const m = Math.floor(last / 60)
                    const s = Math.round(last % 60)
                    return `${m}:${s.toString().padStart(2, '0')}`
                  })()}
                </span>
              </div>
            </div>
          )}

          {/* Section Timeline */}
          {energyData.sections.length > 0 && (
            <div className="space-y-2">
              <div className="text-[10px] text-[#00d4ff]/40 tracking-[0.2em] uppercase">
                Section Timeline
              </div>
              <SectionTimeline sections={energyData.sections} />
            </div>
          )}
        </div>
      )}

      {/* Not yet triggered or job not yet picked up */}
      {!isLoading && (!energyData || energyData.status === 'not_started') && (
        <div className="text-center py-3 text-gray-700 text-[10px] tracking-widest">
          WAITING TO START...
        </div>
      )}
    </div>
  )
}

// ─── Energy Badge Card ────────────────────────────────────────────────────────

function EnergyBadgeCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="border border-white/5 bg-white/2 rounded p-3 space-y-1.5">
      <div className="text-[9px] text-gray-600 tracking-[0.2em] uppercase">{label}</div>
      <div
        className="text-[11px] font-bold tracking-wider leading-tight"
        style={{ color }}
      >
        {value}
      </div>
    </div>
  )
}

// ─── MetaCard ─────────────────────────────────────────────────────────────────

function MetaCard({ label, value, color = '#00ff41' }: { label: string; value: string; color?: string }) {
  return (
    <div className="border border-white/5 bg-white/2 rounded p-3 space-y-1">
      <div className="text-[9px] text-gray-600 tracking-[0.2em] uppercase">{label}</div>
      <div className="text-[13px] font-bold tracking-wider" style={{ color }}>{value}</div>
    </div>
  )
}
