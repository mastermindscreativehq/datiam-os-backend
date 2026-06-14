interface TierBreakdown {
  syncPotential:    { formatted: string }
  creatorLicensing: { formatted: string }
  sportsContent:    { formatted: string }
  brandPlacement:   { formatted: string }
}

interface TierEntry {
  totalMin: number
  totalMax: number
  formattedTotal: string
  breakdown: TierBreakdown
  assumptions: string
}

interface RevenueTierForecast {
  conservative: TierEntry
  expected:     TierEntry
  aggressive:   TierEntry
}

interface Props {
  forecast: RevenueTierForecast
}

const TIER_CONFIG = {
  conservative: {
    label: 'Conservative',
    icon: '▽',
    bg: 'bg-gray-900',
    border: 'border-gray-700',
    color: 'text-gray-300',
    accent: 'text-gray-400',
    badge: 'bg-gray-800 text-gray-400',
  },
  expected: {
    label: 'Expected',
    icon: '◇',
    bg: 'bg-green-950/30',
    border: 'border-green-700/50',
    color: 'text-green-300',
    accent: 'text-green-400',
    badge: 'bg-green-900/40 text-green-300',
  },
  aggressive: {
    label: 'Aggressive',
    icon: '△',
    bg: 'bg-cyan-950/30',
    border: 'border-cyan-700/50',
    color: 'text-cyan-300',
    accent: 'text-cyan-400',
    badge: 'bg-cyan-900/40 text-cyan-300',
  },
} as const

type TierKey = keyof typeof TIER_CONFIG

const BREAKDOWN_LABELS: Record<keyof TierBreakdown, string> = {
  syncPotential:    'Sync Potential',
  creatorLicensing: 'Creator Licensing',
  sportsContent:    'Sports Content',
  brandPlacement:   'Brand Placement',
}

export default function RevenueTierForecast({ forecast }: Props) {
  return (
    <div className="space-y-5">
      <div>
        <div className="text-[9px] font-mono text-gray-600 uppercase tracking-widest mb-1">Revenue Forecast Engine™</div>
        <p className="text-xs text-gray-500">Annual revenue projections across three scenarios — sync, creator, sports, and brand channels.</p>
      </div>

      {/* Three tier cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {(Object.keys(TIER_CONFIG) as TierKey[]).map((tier) => {
          const cfg = TIER_CONFIG[tier]
          const entry = forecast[tier]

          return (
            <div key={tier} className={`rounded-xl border p-5 ${cfg.bg} ${cfg.border}`}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-sm ${cfg.accent}`}>{cfg.icon}</span>
                <span className={`text-[11px] font-mono font-bold tracking-wider uppercase ${cfg.accent}`}>
                  {cfg.label}
                </span>
              </div>

              <div className={`text-xl font-bold font-mono mb-1 ${cfg.color}`}>
                {entry.formattedTotal}
              </div>
              <div className="text-[9px] text-gray-600 mb-4">estimated annual revenue</div>

              <div className="space-y-2">
                {(Object.keys(BREAKDOWN_LABELS) as (keyof TierBreakdown)[]).map(key => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-500">{BREAKDOWN_LABELS[key]}</span>
                    <span className={`text-[10px] font-mono font-medium ${cfg.accent}`}>
                      {entry.breakdown[key].formatted}
                    </span>
                  </div>
                ))}
              </div>

              <div className={`mt-4 pt-3 border-t border-gray-800/50`}>
                <p className="text-[9px] text-gray-600 leading-relaxed">{entry.assumptions}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Comparison bar */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
        <div className="text-[9px] font-mono text-gray-600 uppercase tracking-widest mb-3">Annual Revenue Range Comparison</div>
        <div className="space-y-2">
          {(Object.keys(TIER_CONFIG) as TierKey[]).map(tier => {
            const entry = forecast[tier]
            const maxVal = forecast.aggressive.totalMax
            const pct = maxVal > 0 ? (entry.totalMax / maxVal) * 100 : 0
            const cfg = TIER_CONFIG[tier]
            return (
              <div key={tier} className="flex items-center gap-3">
                <span className={`text-[10px] font-mono w-20 flex-shrink-0 ${cfg.accent}`}>{cfg.label}</span>
                <div className="flex-1 relative h-2 bg-gray-800 rounded-full">
                  <div
                    className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ${tier === 'conservative' ? 'bg-gray-600' : tier === 'expected' ? 'bg-green-500' : 'bg-cyan-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className={`text-[10px] font-mono w-28 text-right flex-shrink-0 ${cfg.color}`}>
                  {entry.formattedTotal}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
