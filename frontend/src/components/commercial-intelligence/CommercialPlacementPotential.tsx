interface CommercialPlacementPotentialProps {
  score: number
  classification: string
  description: string
  colorKey: 'red' | 'orange' | 'yellow' | 'green' | 'cyan'
}

const COLOR_MAP = {
  red:    { text: 'text-red-400',    border: 'border-red-500/30',    bg: 'bg-red-500/10',    bar: 'bg-red-500',    glow: '' },
  orange: { text: 'text-orange-400', border: 'border-orange-500/30', bg: 'bg-orange-500/10', bar: 'bg-orange-500', glow: '' },
  yellow: { text: 'text-yellow-400', border: 'border-yellow-500/30', bg: 'bg-yellow-500/10', bar: 'bg-yellow-500', glow: '' },
  green:  { text: 'text-green-400',  border: 'border-green-500/30',  bg: 'bg-green-500/10',  bar: 'bg-green-500',  glow: '' },
  cyan:   { text: 'text-cyan-400',   border: 'border-cyan-500/30',   bg: 'bg-cyan-500/10',   bar: 'bg-cyan-500',   glow: 'shadow-[0_0_20px_rgba(6,182,212,0.15)]' },
}

export default function CommercialPlacementPotential({ score, classification, description, colorKey }: CommercialPlacementPotentialProps) {
  const colors = COLOR_MAP[colorKey]
  const circumference = 2 * Math.PI * 44
  const offset = circumference - (score / 100) * circumference

  return (
    <div className={`bg-[#0c0c0c] rounded-xl border ${colors.border} ${colors.glow} p-6`}>
      <div className="text-[10px] font-mono text-gray-500 tracking-[0.2em] uppercase mb-4">
        Commercial Placement Potential™
      </div>
      <div className="flex items-center gap-6">
        {/* Circular score */}
        <div className="relative flex-shrink-0">
          <svg width="110" height="110" className="-rotate-90">
            <circle cx="55" cy="55" r="44" fill="none" stroke="#1f2937" strokeWidth="6" />
            <circle
              cx="55" cy="55" r="44" fill="none"
              stroke="currentColor" strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className={colors.text}
              style={{ transition: 'stroke-dashoffset 0.8s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-3xl font-bold font-mono ${colors.text}`}>{score}</span>
            <span className="text-xs text-gray-500 font-mono">/100</span>
          </div>
        </div>

        <div className="flex-1">
          <div className={`text-lg font-bold ${colors.text} mb-1`}>{classification} Opportunity</div>
          <div className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-mono tracking-widest ${colors.bg} ${colors.text} border ${colors.border} mb-3`}>
            {classification.toUpperCase()}
          </div>
          <p className="text-gray-400 text-xs leading-relaxed">{description}</p>
        </div>
      </div>

      {/* Classification scale */}
      <div className="mt-5 pt-4 border-t border-gray-800">
        <div className="flex justify-between text-[9px] font-mono text-gray-600 mb-1.5">
          <span>Very Low</span><span>Low</span><span>Moderate</span><span>Strong</span><span>Exceptional</span>
        </div>
        <div className="relative h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div className="absolute inset-0 flex">
            <div className="flex-1 bg-red-900/40" />
            <div className="flex-1 bg-orange-900/40" />
            <div className="flex-1 bg-yellow-900/40" />
            <div className="flex-1 bg-green-900/40" />
            <div className="flex-1 bg-cyan-900/40" />
          </div>
          <div
            className={`absolute top-0 left-0 h-full w-2 ${colors.bar} rounded-full shadow-lg`}
            style={{ left: `calc(${score}% - 4px)`, transition: 'left 0.8s ease' }}
          />
        </div>
      </div>
    </div>
  )
}
