import { useState } from 'react'
import type { ReleaseRecord, ReleaseIntelAnalysis } from './types'
import { formatDateTime, ANALYSIS_STATUS_COLORS } from './format'

interface Props {
  releases: ReleaseRecord[]
  selectedId: string
  onSelect: (id: string) => void
  analysis: ReleaseIntelAnalysis | null
  onRefresh: () => void
  refreshing: boolean
  onAnalyze: (force: boolean) => void
  analyzing: boolean
  canWrite: boolean
}

export default function ReleaseSelectorBar({
  releases, selectedId, onSelect, analysis, onRefresh, refreshing, onAnalyze, analyzing, canWrite,
}: Props) {
  const [search, setSearch] = useState('')

  const filtered = search.trim()
    ? releases.filter(r => r.title.toLowerCase().includes(search.trim().toLowerCase()))
    : releases

  const statusColor = analysis ? ANALYSIS_STATUS_COLORS[analysis.status] ?? 'text-gray-500' : 'text-gray-600'
  const statusLabel = analysis ? analysis.status.toUpperCase() : 'NOT ANALYZED'

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-1 h-6 bg-[#00ff41] rounded-full" />
            <h1 className="text-xl font-bold font-mono text-[#00ff41] tracking-[0.2em] text-glow-green">RELEASE ORCHESTRATOR</h1>
          </div>
          <p className="text-gray-600 text-[11px] font-mono tracking-[0.2em] ml-4">
            OPERATIONAL COMMAND CENTER · MISSION CONTROL FOR RELEASES
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-2 border border-current/25 rounded px-3 py-1.5 ${statusColor}`}>
            <div className={`w-1.5 h-1.5 rounded-full bg-current ${analysis?.status === 'analyzing' ? 'animate-pulse' : ''}`} />
            <span className="text-[10px] font-mono tracking-widest">{statusLabel}</span>
          </div>
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="text-[10px] font-mono tracking-widest px-4 py-1.5 border border-[#00d4ff]/40 text-[#00d4ff] hover:bg-[#00d4ff]/10 rounded transition-colors disabled:opacity-50"
          >
            {refreshing ? 'REFRESHING…' : '↻ REFRESH'}
          </button>
          {canWrite && (
            <button
              onClick={() => onAnalyze(analysis?.status === 'complete')}
              disabled={analyzing || !selectedId}
              className="text-[10px] font-mono tracking-widest px-4 py-1.5 border border-[#00ff41]/40 text-[#00ff41] hover:bg-[#00ff41]/10 rounded transition-colors disabled:opacity-50"
            >
              {analyzing ? 'ANALYZING…' : analysis?.status === 'complete' ? 'RE-RUN ANALYSIS' : 'RUN ANALYSIS'}
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search releases…"
          className="bg-[#0a0a0a] border border-[#00ff41]/15 text-gray-200 text-[11px] font-mono rounded px-3 py-2 w-56 focus:outline-none focus:border-[#00ff41]/50 placeholder:text-gray-600"
        />
        <select
          value={selectedId}
          onChange={e => onSelect(e.target.value)}
          className="bg-[#0a0a0a] border border-[#00ff41]/15 text-gray-200 text-[11px] font-mono rounded px-3 py-2 flex-1 min-w-[240px] focus:outline-none focus:border-[#00ff41]/50"
        >
          <option value="">Select a release…</option>
          {filtered.map(r => (
            <option key={r.id} value={r.id}>
              {r.title} · {r.release_type.toUpperCase()} · {r.music_status.toUpperCase()}
            </option>
          ))}
        </select>
        <div className="text-[9px] font-mono text-gray-600 tracking-widest">
          LAST ANALYSIS: <span className="text-gray-400">{formatDateTime(analysis?.analyzed_at)}</span>
        </div>
      </div>
    </div>
  )
}
