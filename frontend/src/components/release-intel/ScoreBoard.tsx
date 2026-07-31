import WidgetCard from '../dashboard/WidgetCard'
import type { ReleaseIntelAnalysis, ExecutiveBrief, ReleaseMission } from './types'
import { formatScore, scoreColor } from './format'

interface Props {
  analysis: ReleaseIntelAnalysis | null
  brief: ExecutiveBrief | null
  missions: ReleaseMission[]
}

interface ScoredCard {
  key: string
  label: string
  score: string | number | null
  explanation: string
  dataCompleteness: string | null
}

interface UnscoredCard {
  key: string
  label: string
  missionType: string
}

const SCORED: Array<{ key: 'commercial' | 'playlist' | 'sync'; label: string }> = [
  { key: 'commercial', label: 'COMMERCIAL SCORE' },
  { key: 'playlist', label: 'PLAYLIST SCORE' },
  { key: 'sync', label: 'SYNC SCORE' },
]

const UNSCORED: UnscoredCard[] = [
  { key: 'fan_growth', label: 'FAN GROWTH SCORE', missionType: 'fan_growth' },
  { key: 'content', label: 'CONTENT SCORE', missionType: 'content' },
  { key: 'outreach', label: 'OUTREACH SCORE', missionType: 'outreach' },
  { key: 'analytics', label: 'ANALYTICS SCORE', missionType: 'analytics' },
]

export default function ScoreBoard({ analysis, brief, missions }: Props) {
  const scoredCards: ScoredCard[] = SCORED.map(({ key, label }) => {
    const score = analysis ? (analysis[`${key}_score` as 'commercial_score' | 'playlist_score' | 'sync_score']) : null
    const explanation = brief
      ? (key === 'commercial' ? brief.commercial_outlook : key === 'playlist' ? brief.playlist_outlook : brief.sync_outlook)
      : 'Run analysis to compute this score.'
    return { key, label, score, explanation, dataCompleteness: analysis?.data_completeness ?? null }
  })

  return (
    <WidgetCard title="COMMERCIAL SCORES" accent="cyan">
      <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {scoredCards.map(c => (
          <div key={c.key} className="border border-[#00d4ff]/12 rounded-lg p-4 bg-white/[0.015] space-y-2">
            <div className="text-[9px] font-mono text-gray-500 tracking-widest">{c.label}</div>
            <div className={`text-3xl font-bold font-mono ${scoreColor(c.score)}`}>{formatScore(c.score)}</div>
            <div className="text-[9px] font-mono tracking-widest">
              <span className={c.score !== null ? 'text-[#00ff41]/70' : 'text-gray-600'}>
                {c.score !== null ? 'SCORED' : 'NOT YET SCORED'}
              </span>
            </div>
            <div className="text-[9px] font-mono text-gray-600">
              TREND: N/A — no historical comparison available yet
            </div>
            <div className="text-[9px] font-mono text-gray-600">
              BASIS: {c.dataCompleteness === 'full' ? 'Full audio analysis' : c.dataCompleteness === 'metadata_only' ? 'Metadata-only heuristic' : '—'}
            </div>
            <p className="text-[10px] font-mono text-white/60 leading-relaxed pt-1 border-t border-white/5">
              {c.explanation}
            </p>
          </div>
        ))}

        {UNSCORED.map(c => {
          const mission = missions.find(m => m.mission_type === c.missionType)
          return (
            <div key={c.key} className="border border-gray-800 rounded-lg p-4 bg-white/[0.01] space-y-2 opacity-70">
              <div className="text-[9px] font-mono text-gray-500 tracking-widest">{c.label}</div>
              <div className="text-3xl font-bold font-mono text-gray-600">—</div>
              <div className="text-[9px] font-mono text-gray-600 tracking-widest">NO SCORE COMPUTED</div>
              <div className="text-[9px] font-mono text-gray-600">TREND: N/A</div>
              <div className="text-[9px] font-mono text-gray-600">CONFIDENCE: N/A</div>
              <p className="text-[10px] font-mono text-gray-500 leading-relaxed pt-1 border-t border-white/5">
                {mission
                  ? `The ${c.label.replace(' SCORE', '').toLowerCase()} mission exists (see Mission Board), but Release Orchestrator does not yet compute a dedicated score for this dimension.`
                  : 'No dedicated intelligence engine connected yet.'}
              </p>
            </div>
          )
        })}
      </div>
    </WidgetCard>
  )
}
