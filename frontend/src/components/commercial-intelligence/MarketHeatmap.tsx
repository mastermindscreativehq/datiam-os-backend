interface MarketMatch {
  market: string
  label: string
  matchScore: number
  confidenceScore: number
  ranking: number
  matchReasons: string[]
}

interface Props {
  matches: MarketMatch[]
}

function heatColor(score: number): { bg: string; text: string; border: string } {
  if (score >= 80) return { bg: 'bg-cyan-900/40',   text: 'text-cyan-300',   border: 'border-cyan-600/50' }
  if (score >= 65) return { bg: 'bg-green-900/40',  text: 'text-green-300',  border: 'border-green-600/50' }
  if (score >= 50) return { bg: 'bg-yellow-900/30', text: 'text-yellow-300', border: 'border-yellow-600/40' }
  if (score >= 35) return { bg: 'bg-orange-900/30', text: 'text-orange-300', border: 'border-orange-600/40' }
  return { bg: 'bg-gray-900/60', text: 'text-gray-500', border: 'border-gray-800' }
}

function barWidth(score: number) {
  return `${score}%`
}

function barBg(score: number) {
  if (score >= 80) return 'bg-cyan-500'
  if (score >= 65) return 'bg-green-500'
  if (score >= 50) return 'bg-yellow-500'
  if (score >= 35) return 'bg-orange-500'
  return 'bg-gray-600'
}

export default function MarketHeatmap({ matches }: Props) {
  const sorted = [...matches].sort((a, b) => b.matchScore - a.matchScore)

  return (
    <div className="space-y-5">
      <div>
        <div className="text-[9px] font-mono text-gray-600 uppercase tracking-widest mb-1">Market Matching Engine™</div>
        <p className="text-xs text-gray-500">Match score against 10 commercial music markets — ranked by alignment.</p>
      </div>

      {/* Heatmap grid — top 3 */}
      <div className="grid grid-cols-3 gap-3">
        {sorted.slice(0, 3).map((m) => {
          const c = heatColor(m.matchScore)
          return (
            <div key={m.market} className={`rounded-xl border p-4 ${c.bg} ${c.border}`}>
              <div className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mb-1">
                #{m.ranking} Match
              </div>
              <div className={`text-sm font-bold mb-1 ${c.text}`}>{m.label}</div>
              <div className={`text-2xl font-bold font-mono ${c.text}`}>{m.matchScore}%</div>
              <div className="text-[9px] text-gray-600 mt-1">Confidence {m.confidenceScore}%</div>
              <ul className="mt-2 space-y-1">
                {m.matchReasons.slice(0, 2).map((r, i) => (
                  <li key={i} className="text-[9px] text-gray-500 leading-tight">· {r}</li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      {/* Full ranked table */}
      <div className="space-y-2">
        <div className="text-[9px] font-mono text-gray-600 uppercase tracking-widest mb-2">All Markets — Ranked</div>
        {sorted.map((m) => (
          <div key={m.market} className="flex items-center gap-3 py-2 border-b border-gray-800/60">
            <span className="text-[10px] font-mono text-gray-600 w-4 flex-shrink-0">#{m.ranking}</span>
            <span className="text-xs text-gray-300 w-36 flex-shrink-0">{m.label}</span>
            <div className="flex-1 relative h-1.5 bg-gray-800 rounded-full">
              <div
                className={`absolute inset-y-0 left-0 rounded-full ${barBg(m.matchScore)}`}
                style={{ width: barWidth(m.matchScore) }}
              />
            </div>
            <span className={`text-sm font-bold font-mono w-10 text-right flex-shrink-0 ${heatColor(m.matchScore).text}`}>
              {m.matchScore}%
            </span>
            <span className="text-[9px] font-mono text-gray-600 w-20 text-right flex-shrink-0">
              {m.confidenceScore}% conf
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
