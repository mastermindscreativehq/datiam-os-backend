interface DatiamVerdictProps {
  commercialOutlook: string
  bestOpportunity: string
  bestRevenuePath: string
  bestAudience: string[]
  syncReadiness: number
  recommendation: string
  executiveSummary: string
  confidenceScore: number
}

const OUTLOOK_CONFIG: Record<string, { color: string; bg: string; border: string; glow: string }> = {
  'Exceptional': { color: 'text-cyan-400',   bg: 'bg-cyan-500/10',   border: 'border-cyan-500/40',   glow: 'shadow-[0_0_30px_rgba(6,182,212,0.12)]' },
  'Strong':      { color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/40',  glow: 'shadow-[0_0_20px_rgba(74,222,128,0.08)]' },
  'Moderate':    { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/40', glow: '' },
  'Limited':     { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/40', glow: '' },
  'Developing':  { color: 'text-gray-400',   bg: 'bg-gray-800',      border: 'border-gray-700',      glow: '' },
}

const RECO_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  'Pitch Immediately':    { color: 'text-cyan-300',   bg: 'bg-cyan-500/15',   border: 'border-cyan-500/40' },
  'Targeted Outreach':    { color: 'text-green-300',  bg: 'bg-green-500/15',  border: 'border-green-500/40' },
  'Develop Further':      { color: 'text-yellow-300', bg: 'bg-yellow-500/15', border: 'border-yellow-500/40' },
  'Niche Placement Only': { color: 'text-orange-300', bg: 'bg-orange-500/15', border: 'border-orange-500/40' },
  'Not Ready':            { color: 'text-red-300',    bg: 'bg-red-500/15',    border: 'border-red-500/40' },
}

function ReadinessArc({ value }: { value: number }) {
  const radius = 36
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference
  const color = value >= 75 ? '#22d3ee' : value >= 55 ? '#4ade80' : value >= 35 ? '#facc15' : '#fb923c'

  return (
    <div className="relative">
      <svg width="90" height="90" className="-rotate-90">
        <circle cx="45" cy="45" r={radius} fill="none" stroke="#1f2937" strokeWidth="5" />
        <circle
          cx="45" cy="45" r={radius} fill="none"
          stroke={color} strokeWidth="5"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold font-mono" style={{ color }}>{value}%</span>
      </div>
    </div>
  )
}

export default function DatiamVerdict({
  commercialOutlook,
  bestOpportunity,
  bestRevenuePath,
  bestAudience,
  syncReadiness,
  recommendation,
  executiveSummary,
  confidenceScore,
}: DatiamVerdictProps) {
  const oCfg = OUTLOOK_CONFIG[commercialOutlook] ?? OUTLOOK_CONFIG['Moderate']
  const rCfg = RECO_CONFIG[recommendation] ?? RECO_CONFIG['Targeted Outreach']

  return (
    <div className={`bg-[#0a0a0a] rounded-xl border ${oCfg.border} ${oCfg.glow} p-6`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <div className="text-[10px] font-mono text-gray-500 tracking-[0.3em] uppercase">
          DATIAM Verdict™
        </div>
        <div className="flex-1 h-px bg-gradient-to-r from-gray-700 to-transparent" />
        <div className={`text-[9px] font-mono tracking-widest ${oCfg.color} opacity-60`}>
          CONFIDENCE {confidenceScore}%
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-4 mb-5 sm:grid-cols-4">
        {/* Commercial Outlook */}
        <div className="text-center">
          <div className="text-[9px] font-mono text-gray-600 uppercase tracking-wider mb-1.5">Commercial Outlook</div>
          <div className={`text-base font-bold ${oCfg.color}`}>{commercialOutlook}</div>
        </div>

        {/* Best Opportunity */}
        <div className="text-center">
          <div className="text-[9px] font-mono text-gray-600 uppercase tracking-wider mb-1.5">Best Opportunity</div>
          <div className="text-xs font-semibold text-gray-200 leading-tight">{bestOpportunity}</div>
        </div>

        {/* Sync Readiness */}
        <div className="flex flex-col items-center">
          <div className="text-[9px] font-mono text-gray-600 uppercase tracking-wider mb-1">Sync Readiness</div>
          <ReadinessArc value={syncReadiness} />
        </div>

        {/* Recommendation */}
        <div className="flex flex-col items-center justify-center">
          <div className="text-[9px] font-mono text-gray-600 uppercase tracking-wider mb-2">Recommendation</div>
          <span className={`px-3 py-1.5 rounded text-xs font-mono font-bold border text-center ${rCfg.bg} ${rCfg.color} ${rCfg.border}`}>
            {recommendation}
          </span>
        </div>
      </div>

      {/* Revenue path + audience */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="bg-gray-900/50 rounded-lg p-3">
          <div className="text-[9px] font-mono text-gray-600 uppercase tracking-wider mb-1.5">Best Revenue Path</div>
          <div className="text-xs text-gray-300 font-medium">{bestRevenuePath}</div>
        </div>
        <div className="bg-gray-900/50 rounded-lg p-3">
          <div className="text-[9px] font-mono text-gray-600 uppercase tracking-wider mb-1.5">Best Audience</div>
          <div className="flex flex-wrap gap-1">
            {bestAudience.map(a => (
              <span key={a} className="text-[10px] text-gray-300 font-mono">{a}{bestAudience.indexOf(a) < bestAudience.length - 1 ? ' ·' : ''}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Executive summary */}
      <div className={`border-t ${oCfg.border} pt-4`}>
        <div className="text-[9px] font-mono text-gray-600 uppercase tracking-wider mb-2">Executive Summary</div>
        <p className="text-gray-300 text-xs leading-relaxed">{executiveSummary}</p>
      </div>
    </div>
  )
}
