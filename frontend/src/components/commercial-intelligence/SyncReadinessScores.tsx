import { useState } from 'react'

interface ReadinessFactor {
  factor: string
  points: number
  direction: 'positive' | 'negative'
}

interface SyncReadinessScore {
  key: string
  label: string
  score: number
  description: string
  factors: ReadinessFactor[]
}

interface SyncReadinessScoresData {
  hookStrength: SyncReadinessScore
  energyCurve: SyncReadinessScore
  vocalClarity: SyncReadinessScore
  instrumentalValue: SyncReadinessScore
  replayValue: SyncReadinessScore
  brandSuitability: SyncReadinessScore
  overallReadiness: number
}

interface Props {
  scores: SyncReadinessScoresData
}

function scoreColor(s: number) {
  return s >= 75 ? 'text-cyan-400' : s >= 60 ? 'text-green-400' : s >= 45 ? 'text-yellow-400' : s >= 30 ? 'text-orange-400' : 'text-red-400'
}
function barColor(s: number) {
  return s >= 75 ? 'bg-cyan-500' : s >= 60 ? 'bg-green-500' : s >= 45 ? 'bg-yellow-500' : s >= 30 ? 'bg-orange-500' : 'bg-red-500'
}

function ScoreCard({ sc, expanded, onToggle }: { sc: SyncReadinessScore; expanded: boolean; onToggle: () => void }) {
  const pos = sc.factors.filter(f => f.direction === 'positive')
  const neg = sc.factors.filter(f => f.direction === 'negative')

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-gray-700 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-mono text-gray-300 font-medium">{sc.label}</span>
        <span className={`text-xl font-bold font-mono ${scoreColor(sc.score)}`}>{sc.score}</span>
      </div>

      <div className="relative h-1.5 bg-gray-800 rounded-full mb-3">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ${barColor(sc.score)}`}
          style={{ width: `${sc.score}%` }}
        />
      </div>

      <p className="text-[10px] text-gray-600 leading-relaxed mb-2">{sc.description}</p>

      {sc.factors.length > 0 && (
        <button
          onClick={onToggle}
          className="text-[9px] font-mono text-gray-600 hover:text-gray-400 transition-colors tracking-wider uppercase"
        >
          {expanded ? '▲ Hide' : '▼ Why This Score'}
        </button>
      )}

      {expanded && (
        <div className="mt-3 space-y-1.5 border-t border-gray-800 pt-3">
          {pos.map((f, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-green-500 text-[10px] font-mono flex-shrink-0">+{f.points}</span>
              <span className="text-[10px] text-gray-400 leading-tight">{f.factor}</span>
            </div>
          ))}
          {neg.map((f, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-red-500 text-[10px] font-mono flex-shrink-0">{f.points}</span>
              <span className="text-[10px] text-gray-500 leading-tight">{f.factor}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function SyncReadinessScores({ scores }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const cards: SyncReadinessScore[] = [
    scores.hookStrength,
    scores.energyCurve,
    scores.vocalClarity,
    scores.instrumentalValue,
    scores.replayValue,
    scores.brandSuitability,
  ]

  const toggle = (key: string) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }))

  const overall = scores.overallReadiness

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[9px] font-mono text-gray-600 uppercase tracking-widest mb-1">Sync Readiness Engine™</div>
          <p className="text-xs text-gray-500">Six dimensions of commercial readiness — every score explained.</p>
        </div>
        <div className="text-center bg-gray-900 border border-gray-800 rounded-lg px-4 py-3">
          <div className="text-[9px] font-mono text-gray-600 uppercase tracking-wider mb-1">Overall Readiness</div>
          <span className={`text-3xl font-bold font-mono ${scoreColor(overall)}`}>{overall}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map(card => (
          <ScoreCard
            key={card.key}
            sc={card}
            expanded={!!expanded[card.key]}
            onToggle={() => toggle(card.key)}
          />
        ))}
      </div>
    </div>
  )
}
