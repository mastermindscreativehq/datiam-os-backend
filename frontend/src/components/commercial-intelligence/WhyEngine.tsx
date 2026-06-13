import { useState } from 'react'

interface ScoreFactor {
  label: string
  description: string
  impact: 'positive' | 'negative'
  strength: 'strong' | 'moderate' | 'weak'
}

interface WhyScore {
  category: string
  label: string
  score: number
  confidence: number
  positiveFactors: ScoreFactor[]
  negativeFactors: ScoreFactor[]
  confidenceLabel: string
}

interface WhyEngineProps {
  whyScores: WhyScore[]
}

const CATEGORY_ICONS: Record<string, string> = {
  film_trailer: '🎬', netflix_drama: '🎭', documentary: '🎞️', sports_content: '⚡',
  gaming: '🎮', fashion: '👗', luxury_brands: '💎', travel_campaigns: '✈️',
  commercial_ads: '📺', social_content: '📱',
}

const STRENGTH_COLORS = {
  strong:   'text-emerald-400',
  moderate: 'text-yellow-400',
  weak:     'text-gray-400',
}

function scoreColor(score: number): string {
  if (score >= 75) return 'text-cyan-400'
  if (score >= 55) return 'text-green-400'
  if (score >= 35) return 'text-yellow-400'
  return 'text-orange-400'
}

function scoreBg(score: number): string {
  if (score >= 75) return 'bg-cyan-500'
  if (score >= 55) return 'bg-green-500'
  if (score >= 35) return 'bg-yellow-500'
  return 'bg-orange-500'
}

function FactorRow({ factor }: { factor: ScoreFactor }) {
  const isPositive = factor.impact === 'positive'
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <span className={`mt-0.5 flex-shrink-0 text-sm font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
        {isPositive ? '✓' : '✗'}
      </span>
      <div className="flex-1 min-w-0">
        <div className={`text-xs font-medium ${isPositive ? 'text-gray-200' : 'text-gray-300'} flex items-center gap-2`}>
          {factor.label}
          <span className={`text-[9px] font-mono uppercase ${STRENGTH_COLORS[factor.strength]}`}>
            {factor.strength}
          </span>
        </div>
        <div className="text-[11px] text-gray-500 leading-relaxed mt-0.5">{factor.description}</div>
      </div>
    </div>
  )
}

function WhyCard({ ws }: { ws: WhyScore }) {
  const [open, setOpen] = useState(false)
  const barW = `${ws.score}%`
  const confW = `${ws.confidence}%`

  return (
    <div className="bg-[#0f0f0f] border border-gray-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 p-4 hover:bg-gray-800/30 transition-colors text-left"
      >
        <span className="text-lg w-6 flex-shrink-0">{CATEGORY_ICONS[ws.category] ?? '🎵'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-medium text-gray-200 truncate">{ws.label}</span>
            <span className={`text-lg font-bold font-mono ml-3 flex-shrink-0 ${scoreColor(ws.score)}`}>
              {ws.score}<span className="text-xs text-gray-500">/100</span>
            </span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-1.5 relative">
            <div
              className={`h-1.5 rounded-full transition-all duration-700 ${scoreBg(ws.score)}`}
              style={{ width: barW }}
            />
            <div
              className="absolute top-0 h-1.5 bg-white/10 rounded-full"
              style={{ width: confW }}
            />
          </div>
        </div>
        <span className={`ml-2 text-[10px] font-mono ${open ? 'text-cyan-400' : 'text-gray-600'} flex-shrink-0`}>
          {open ? '▲ HIDE' : '▼ WHY'}
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-gray-800">
          {/* Confidence */}
          <div className="flex items-center justify-between mb-4 pt-2">
            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
              Confidence Level
            </span>
            <div className="flex items-center gap-2">
              <div className="w-24 h-1 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-500/60 rounded-full" style={{ width: confW }} />
              </div>
              <span className="text-[10px] font-mono text-cyan-400">{ws.confidence}%</span>
              <span className="text-[9px] font-mono text-gray-600 uppercase">{ws.confidenceLabel}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Positive factors */}
            {ws.positiveFactors.length > 0 && (
              <div>
                <div className="text-[10px] font-mono text-emerald-400/70 uppercase tracking-widest mb-2">
                  Positive Factors ({ws.positiveFactors.length})
                </div>
                <div className="space-y-0.5">
                  {ws.positiveFactors.map((f, i) => (
                    <FactorRow key={i} factor={f} />
                  ))}
                </div>
              </div>
            )}

            {/* Negative factors */}
            {ws.negativeFactors.length > 0 && (
              <div>
                <div className="text-[10px] font-mono text-red-400/70 uppercase tracking-widest mb-2">
                  Negative Factors ({ws.negativeFactors.length})
                </div>
                <div className="space-y-0.5">
                  {ws.negativeFactors.map((f, i) => (
                    <FactorRow key={i} factor={f} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function WhyEngine({ whyScores }: WhyEngineProps) {
  const sorted = [...whyScores].sort((a, b) => b.score - a.score)

  return (
    <div>
      <div className="text-[10px] font-mono text-gray-500 tracking-[0.2em] uppercase mb-4">
        Why Engine™ — Score Explainability
      </div>
      <div className="space-y-2">
        {sorted.map(ws => (
          <WhyCard key={ws.category} ws={ws} />
        ))}
      </div>
    </div>
  )
}
