import { useState } from 'react'
import Toast from '../../components/Toast'
import { growth } from '../../api/client'

interface PanelResult {
  text: string
}

function Panel({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="border border-emerald-400/20 rounded overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 bg-emerald-400/5 hover:bg-emerald-400/10 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-emerald-400/60">{icon}</span>
          <span className="text-[11px] font-mono text-emerald-400 tracking-[0.15em]">{title}</span>
        </div>
        <span className="text-emerald-400/40 font-mono text-[11px]">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="p-5">{children}</div>}
    </div>
  )
}

function ResultBlock({ result }: { result: PanelResult | null }) {
  if (!result) return null
  return (
    <pre className="mt-4 p-4 bg-black/40 border border-emerald-400/10 rounded text-[10px] font-mono text-emerald-400/80 whitespace-pre-wrap break-words leading-relaxed max-h-64 overflow-y-auto">
      {result.text}
    </pre>
  )
}

function TextInput({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div>
      <div className="text-[10px] font-mono text-gray-600 tracking-[0.15em] mb-1.5">{label}</div>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent border border-[#00ff41]/15 rounded px-3 py-2 text-[11px] font-mono text-gray-300 placeholder-gray-700 focus:outline-none focus:border-emerald-400/40"
      />
    </div>
  )
}

function RunButton({ onClick, loading, label }: { onClick: () => void; loading: boolean; label: string }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="mt-4 text-[10px] font-mono tracking-widest px-5 py-2 border border-emerald-400/40 text-emerald-400 hover:bg-emerald-400/10 rounded transition-colors disabled:opacity-40"
    >
      {loading ? 'GENERATING...' : label}
    </button>
  )
}

function extractText(data: any): string {
  if (!data) return 'No result'
  if (typeof data === 'string') return data
  for (const key of ['result', 'text', 'caption', 'hashtags', 'schedule', 'report', 'content', 'data']) {
    if (data[key] !== undefined) {
      const v = data[key]
      return typeof v === 'string' ? v : JSON.stringify(v, null, 2)
    }
  }
  return JSON.stringify(data, null, 2)
}

export default function GrowthAI() {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Scorer
  const [scoreContentId, setScoreContentId] = useState('')
  const [scoreLoading,   setScoreLoading]   = useState(false)
  const [scoreResult,    setScoreResult]    = useState<PanelResult | null>(null)

  // Caption
  const [capContentId,  setCapContentId]  = useState('')
  const [capPlatform,   setCapPlatform]   = useState('')
  const [capLoading,    setCapLoading]    = useState(false)
  const [capResult,     setCapResult]     = useState<PanelResult | null>(null)

  // Hashtags
  const [hashContentId, setHashContentId] = useState('')
  const [hashPlatform,  setHashPlatform]  = useState('')
  const [hashLoading,   setHashLoading]   = useState(false)
  const [hashResult,    setHashResult]    = useState<PanelResult | null>(null)

  // Growth Report
  const [reportArtistId, setReportArtistId] = useState('')
  const [reportPeriod,   setReportPeriod]   = useState('last 30 days')
  const [reportLoading,  setReportLoading]  = useState(false)
  const [reportResult,   setReportResult]   = useState<PanelResult | null>(null)

  // Posting Schedule
  const [schedArtistId, setSchedArtistId] = useState('')
  const [schedPlatform, setSchedPlatform] = useState('')
  const [schedLoading,  setSchedLoading]  = useState(false)
  const [schedResult,   setSchedResult]   = useState<PanelResult | null>(null)

  const runScore = async () => {
    if (!scoreContentId.trim()) { setToast({ message: 'Content ID required', type: 'error' }); return }
    setScoreLoading(true); setScoreResult(null)
    try {
      const res = await growth.ai.score({ content_id: scoreContentId.trim() })
      setScoreResult({ text: extractText(res.data) })
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || 'Score failed', type: 'error' })
    } finally { setScoreLoading(false) }
  }

  const runCaption = async () => {
    if (!capContentId.trim()) { setToast({ message: 'Content ID required', type: 'error' }); return }
    setCapLoading(true); setCapResult(null)
    try {
      const res = await growth.ai.caption({ content_id: capContentId.trim(), platform_slug: capPlatform.trim() })
      setCapResult({ text: extractText(res.data) })
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || 'Caption generation failed', type: 'error' })
    } finally { setCapLoading(false) }
  }

  const runHashtags = async () => {
    if (!hashContentId.trim()) { setToast({ message: 'Content ID required', type: 'error' }); return }
    setHashLoading(true); setHashResult(null)
    try {
      const res = await growth.ai.hashtags({ content_id: hashContentId.trim(), platform_slug: hashPlatform.trim() })
      setHashResult({ text: extractText(res.data) })
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || 'Hashtag generation failed', type: 'error' })
    } finally { setHashLoading(false) }
  }

  const runReport = async () => {
    if (!reportArtistId.trim()) { setToast({ message: 'Artist ID required', type: 'error' }); return }
    setReportLoading(true); setReportResult(null)
    try {
      const res = await growth.ai.growthReport({ artist_id: reportArtistId.trim(), period: reportPeriod.trim() })
      setReportResult({ text: extractText(res.data) })
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || 'Report generation failed', type: 'error' })
    } finally { setReportLoading(false) }
  }

  const runSchedule = async () => {
    if (!schedArtistId.trim()) { setToast({ message: 'Artist ID required', type: 'error' }); return }
    setSchedLoading(true); setSchedResult(null)
    try {
      const res = await growth.ai.schedule({ artist_id: schedArtistId.trim(), platform_slug: schedPlatform.trim() })
      setSchedResult({ text: extractText(res.data) })
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || 'Schedule generation failed', type: 'error' })
    } finally { setSchedLoading(false) }
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-1 h-6 bg-emerald-400 rounded-full" />
          <h1 className="text-xl font-bold font-mono text-emerald-400 tracking-[0.2em]">AI STUDIO</h1>
        </div>
        <p className="text-gray-600 text-[11px] font-mono tracking-[0.2em] ml-4">GROWTH OS · AI GENERATION TOOLS</p>
      </div>

      <div className="space-y-4">

        {/* Content Brief Scorer */}
        <Panel title="CONTENT BRIEF SCORER" icon="◇">
          <div className="space-y-3">
            <TextInput label="CONTENT ID" value={scoreContentId} onChange={setScoreContentId} placeholder="Content UUID" />
          </div>
          {scoreLoading && <div className="mt-3 text-[10px] font-mono text-emerald-400/60 tracking-widest animate-pulse">GENERATING...</div>}
          <RunButton onClick={runScore} loading={scoreLoading} label="SCORE CONTENT" />
          <ResultBlock result={scoreResult} />
        </Panel>

        {/* Caption Generator */}
        <Panel title="CAPTION GENERATOR" icon="◈">
          <div className="grid grid-cols-2 gap-3">
            <TextInput label="CONTENT ID" value={capContentId} onChange={setCapContentId} placeholder="Content UUID" />
            <TextInput label="PLATFORM SLUG" value={capPlatform} onChange={setCapPlatform} placeholder="e.g. instagram" />
          </div>
          {capLoading && <div className="mt-3 text-[10px] font-mono text-emerald-400/60 tracking-widest animate-pulse">GENERATING...</div>}
          <RunButton onClick={runCaption} loading={capLoading} label="GENERATE CAPTION" />
          <ResultBlock result={capResult} />
        </Panel>

        {/* Hashtag Generator */}
        <Panel title="HASHTAG GENERATOR" icon="✦">
          <div className="grid grid-cols-2 gap-3">
            <TextInput label="CONTENT ID" value={hashContentId} onChange={setHashContentId} placeholder="Content UUID" />
            <TextInput label="PLATFORM SLUG" value={hashPlatform} onChange={setHashPlatform} placeholder="e.g. tiktok" />
          </div>
          {hashLoading && <div className="mt-3 text-[10px] font-mono text-emerald-400/60 tracking-widest animate-pulse">GENERATING...</div>}
          <RunButton onClick={runHashtags} loading={hashLoading} label="GENERATE HASHTAGS" />
          <ResultBlock result={hashResult} />
        </Panel>

        {/* Growth Report */}
        <Panel title="GROWTH REPORT" icon="◉">
          <div className="grid grid-cols-2 gap-3">
            <TextInput label="ARTIST ID" value={reportArtistId} onChange={setReportArtistId} placeholder="Artist UUID" />
            <TextInput label="PERIOD" value={reportPeriod} onChange={setReportPeriod} placeholder="last 30 days" />
          </div>
          {reportLoading && <div className="mt-3 text-[10px] font-mono text-emerald-400/60 tracking-widest animate-pulse">GENERATING...</div>}
          <RunButton onClick={runReport} loading={reportLoading} label="GENERATE REPORT" />
          <ResultBlock result={reportResult} />
        </Panel>

        {/* Posting Schedule */}
        <Panel title="POSTING SCHEDULE" icon="◆">
          <div className="grid grid-cols-2 gap-3">
            <TextInput label="ARTIST ID" value={schedArtistId} onChange={setSchedArtistId} placeholder="Artist UUID" />
            <TextInput label="PLATFORM SLUG" value={schedPlatform} onChange={setSchedPlatform} placeholder="e.g. instagram" />
          </div>
          {schedLoading && <div className="mt-3 text-[10px] font-mono text-emerald-400/60 tracking-widest animate-pulse">GENERATING...</div>}
          <RunButton onClick={runSchedule} loading={schedLoading} label="GENERATE SCHEDULE" />
          <ResultBlock result={schedResult} />
        </Panel>

        {/* Available via API */}
        <div className="border border-[#00ff41]/10 rounded p-5">
          <div className="text-[10px] font-mono text-gray-600 tracking-[0.2em] mb-3">ALSO AVAILABLE VIA API</div>
          <div className="flex flex-wrap gap-2">
            {['CTA GENERATOR', 'CAMPAIGN BRIEF', 'CAMPAIGN RETROSPECTIVE', 'TREND CONTENT IDEA', 'CONTENT CALENDAR', 'AUDIENCE PERSONA', 'COLLABORATION PITCH', 'RELEASE STRATEGY', 'AI ENRICH'].map(name => (
              <span key={name} className="text-[9px] font-mono tracking-widest px-3 py-1 border border-[#00ff41]/10 text-gray-700 rounded">{name}</span>
            ))}
          </div>
        </div>

      </div>

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  )
}
