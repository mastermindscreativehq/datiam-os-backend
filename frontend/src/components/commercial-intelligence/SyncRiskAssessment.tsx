interface RiskFactor {
  label: string
  status: 'clear' | 'flag' | 'warning' | 'unknown'
  detail: string
  riskLevel: 'Low' | 'Moderate' | 'High' | 'Critical'
}

interface SyncRiskAssessmentProps {
  overallRisk: string
  riskScore: number
  factors: RiskFactor[]
  recommendation: string
}

const STATUS_CONFIG = {
  clear:   { icon: '✓', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  flag:    { icon: '✗', color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/30' },
  warning: { icon: '⚠', color: 'text-yellow-400',  bg: 'bg-yellow-500/10',  border: 'border-yellow-500/30' },
  unknown: { icon: '?', color: 'text-gray-500',    bg: 'bg-gray-800',       border: 'border-gray-700' },
}

const RISK_LEVEL_COLORS: Record<string, string> = {
  Low:      'text-emerald-400',
  Moderate: 'text-yellow-400',
  High:     'text-red-400',
  Critical: 'text-red-500 font-bold',
}

const OVERALL_RISK_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  Low:      { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  Moderate: { color: 'text-yellow-400',  bg: 'bg-yellow-500/10',  border: 'border-yellow-500/30' },
  High:     { color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/30' },
  Critical: { color: 'text-red-500',     bg: 'bg-red-500/15',     border: 'border-red-500/40' },
}

export default function SyncRiskAssessment({ overallRisk, riskScore, factors, recommendation }: SyncRiskAssessmentProps) {
  const rCfg = OVERALL_RISK_CONFIG[overallRisk] ?? OVERALL_RISK_CONFIG['Moderate']

  return (
    <div>
      <div className="text-[10px] font-mono text-gray-500 tracking-[0.2em] uppercase mb-4">
        Sync Risk Assessment™
      </div>

      {/* Overall risk header */}
      <div className={`flex items-center justify-between p-3 rounded-lg border ${rCfg.bg} ${rCfg.border} mb-4`}>
        <div className="flex items-center gap-3">
          <span className={`text-sm font-mono font-bold ${rCfg.color}`}>Overall Risk</span>
          <span className={`text-lg font-bold ${rCfg.color}`}>{overallRisk}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-gray-500">Risk Score</span>
          <span className={`text-sm font-mono font-bold ${rCfg.color}`}>{riskScore}/100</span>
        </div>
      </div>

      {/* Risk factors */}
      <div className="space-y-2 mb-4">
        {factors.map((f, i) => {
          const cfg = STATUS_CONFIG[f.status]
          return (
            <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${cfg.bg} ${cfg.border}`}>
              <span className={`text-sm font-bold flex-shrink-0 mt-0.5 ${cfg.color}`}>{cfg.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-xs font-medium ${cfg.color}`}>{f.label}</span>
                  <span className={`text-[9px] font-mono uppercase ${RISK_LEVEL_COLORS[f.riskLevel]}`}>
                    {f.riskLevel}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">{f.detail}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Recommendation */}
      <div className="border-t border-gray-800 pt-4">
        <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-2">
          Risk Mitigation Recommendation
        </div>
        <p className="text-gray-300 text-xs leading-relaxed">{recommendation}</p>
      </div>
    </div>
  )
}
