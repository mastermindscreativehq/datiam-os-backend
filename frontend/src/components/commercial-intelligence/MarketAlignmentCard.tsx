interface MarketAlignment {
  category: string
  label: string
  alignmentScore: number
  demand: string
  competition: string
  growth: string
  marketNote: string
}

interface MarketAlignmentCardProps {
  alignments: MarketAlignment[]
}

const CATEGORY_ICONS: Record<string, string> = {
  film_trailer: '🎬', netflix_drama: '🎭', documentary: '🎞️', sports_content: '⚡',
  gaming: '🎮', fashion: '👗', luxury_brands: '💎', travel_campaigns: '✈️',
  commercial_ads: '📺', social_content: '📱',
}

const DEMAND_COLORS: Record<string, string> = {
  'Very High': 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  'High':      'text-green-400 bg-green-500/10 border-green-500/30',
  'Medium':    'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  'Low':       'text-orange-400 bg-orange-500/10 border-orange-500/30',
  'Niche':     'text-gray-400 bg-gray-500/10 border-gray-500/30',
}

const COMPETITION_COLORS: Record<string, string> = {
  'Very High': 'text-red-400',
  'High':      'text-orange-400',
  'Medium':    'text-yellow-400',
  'Low':       'text-green-400',
}

const GROWTH_COLORS: Record<string, string> = {
  'High':      'text-cyan-400',
  'Medium':    'text-green-400',
  'Low':       'text-yellow-400',
  'Declining': 'text-red-400',
}

function scoreBar(score: number) {
  const bg = score >= 70 ? 'bg-cyan-500' : score >= 55 ? 'bg-green-500' : score >= 40 ? 'bg-yellow-500' : 'bg-orange-500'
  return (
    <div className="w-full bg-gray-800 rounded-full h-1 mt-1">
      <div className={`h-1 rounded-full transition-all duration-700 ${bg}`} style={{ width: `${score}%` }} />
    </div>
  )
}

function Pill({ label, colorClass }: { label: string; colorClass: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-mono font-semibold tracking-wider border ${colorClass}`}>
      {label}
    </span>
  )
}

export default function MarketAlignmentCard({ alignments }: MarketAlignmentCardProps) {
  const topSix = alignments.slice(0, 6)

  return (
    <div>
      <div className="text-[10px] font-mono text-gray-500 tracking-[0.2em] uppercase mb-4">
        Market Alignment Analysis™
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {topSix.map(a => (
          <div key={a.category} className="bg-[#0f0f0f] border border-gray-800 rounded-lg p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-base">{CATEGORY_ICONS[a.category] ?? '🎵'}</span>
                <div>
                  <div className="text-xs font-semibold text-gray-200">{a.label}</div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[10px] font-mono text-gray-500">Alignment</span>
                    <span className={`text-[10px] font-mono font-bold ${a.alignmentScore >= 60 ? 'text-cyan-400' : a.alignmentScore >= 45 ? 'text-green-400' : 'text-yellow-400'}`}>
                      {a.alignmentScore}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {scoreBar(a.alignmentScore)}

            <div className="flex flex-wrap gap-1.5 mt-3">
              <Pill label={`Demand: ${a.demand}`} colorClass={DEMAND_COLORS[a.demand] ?? DEMAND_COLORS['Niche']} />
              <Pill label={`Comp: ${a.competition}`} colorClass={`border-gray-700 ${COMPETITION_COLORS[a.competition] ?? 'text-gray-400'}`} />
              <Pill label={`Growth: ${a.growth}`} colorClass={`border-gray-700 ${GROWTH_COLORS[a.growth] ?? 'text-gray-400'}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Full market note for top category */}
      {alignments[0] && (
        <div className="mt-4 p-4 bg-[#0f0f0f] border border-gray-800/50 rounded-lg">
          <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-2">
            {CATEGORY_ICONS[alignments[0].category]} {alignments[0].label} — Market Intelligence
          </div>
          <p className="text-gray-400 text-xs leading-relaxed">{alignments[0].marketNote}</p>
        </div>
      )}
    </div>
  )
}
