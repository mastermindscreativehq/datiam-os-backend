interface RevenueForecast {
  category: string
  label: string
  licenseRangeMin: number
  licenseRangeMax: number
  formattedRange: string
  likelihood: string
  revenueClass: string
  commercialValue: string
  annualEstimateMin: number
  annualEstimateMax: number
  formattedAnnualEstimate: string
}

interface RevenueForecastProps {
  forecasts: RevenueForecast[]
}

const CATEGORY_ICONS: Record<string, string> = {
  film_trailer: '🎬', netflix_drama: '🎭', documentary: '🎞️', sports_content: '⚡',
  gaming: '🎮', fashion: '👗', luxury_brands: '💎', travel_campaigns: '✈️',
  commercial_ads: '📺', social_content: '📱',
}

const LIKELIHOOD_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  'High':     { color: 'text-cyan-400',   bg: 'bg-cyan-500/10',   border: 'border-cyan-500/30' },
  'Medium':   { color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/30' },
  'Low':      { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
  'Very Low': { color: 'text-gray-500',   bg: 'bg-gray-800',      border: 'border-gray-700' },
}

const REVENUE_CLASS_CONFIG: Record<string, string> = {
  'Premium':     'text-cyan-400',
  'Emerging':    'text-green-400',
  'Speculative': 'text-yellow-400',
  'Marginal':    'text-gray-500',
}

export default function RevenueForecast({ forecasts }: RevenueForecastProps) {
  const top = forecasts.slice(0, 5)

  return (
    <div>
      <div className="text-[10px] font-mono text-gray-500 tracking-[0.2em] uppercase mb-4">
        Revenue Forecast Engine™
      </div>

      <div className="space-y-3">
        {top.map(f => {
          const lCfg = LIKELIHOOD_CONFIG[f.likelihood] ?? LIKELIHOOD_CONFIG['Very Low']
          const rColor = REVENUE_CLASS_CONFIG[f.revenueClass] ?? 'text-gray-400'

          return (
            <div key={f.category} className="bg-[#0f0f0f] border border-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-base">{CATEGORY_ICONS[f.category] ?? '🎵'}</span>
                  <span className="text-sm font-medium text-gray-200">{f.label}</span>
                </div>
                <span className={`text-xs font-mono font-bold ${rColor}`}>{f.revenueClass}</span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {/* License range */}
                <div>
                  <div className="text-[9px] font-mono text-gray-600 uppercase tracking-wider mb-0.5">
                    Per License
                  </div>
                  <div className="text-sm font-bold text-white font-mono">{f.formattedRange}</div>
                </div>

                {/* Likelihood */}
                <div>
                  <div className="text-[9px] font-mono text-gray-600 uppercase tracking-wider mb-1">
                    Likelihood
                  </div>
                  <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-mono font-semibold border ${lCfg.bg} ${lCfg.color} ${lCfg.border}`}>
                    {f.likelihood}
                  </span>
                </div>

                {/* Annual estimate */}
                <div>
                  <div className="text-[9px] font-mono text-gray-600 uppercase tracking-wider mb-0.5">
                    Annual Est.
                  </div>
                  <div className="text-xs font-mono text-gray-300">{f.formattedAnnualEstimate}</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 p-3 bg-gray-900/30 border border-gray-800/50 rounded-lg">
        <p className="text-[10px] text-gray-600 leading-relaxed">
          Revenue forecasts are based on 2024–2025 industry benchmarks and are adjusted by sync score probability.
          Actual licensing rates depend on negotiation, exclusivity, territory, and buyer budget.
        </p>
      </div>
    </div>
  )
}
