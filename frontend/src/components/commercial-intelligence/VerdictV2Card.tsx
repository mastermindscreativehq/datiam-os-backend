interface VerdictStrengthFactor {
  label: string
  description: string
  impact: number
}

interface VerdictRiskFactor {
  label: string
  description: string
  impact: number
}

interface VerdictRecommendedAction {
  priority: number
  action: string
  rationale: string
}

interface Props {
  strengthFactors:    VerdictStrengthFactor[]
  riskFactors:        VerdictRiskFactor[]
  recommendedActions: VerdictRecommendedAction[]
}

export default function VerdictV2Card({ strengthFactors, riskFactors, recommendedActions }: Props) {
  return (
    <div className="space-y-4">
      <div className="text-[9px] font-mono text-gray-600 uppercase tracking-widest">
        DATIAM Commercial Verdict V2™
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Strengths */}
        <div className="bg-green-950/20 border border-green-800/40 rounded-xl p-4">
          <div className="text-[10px] font-mono text-green-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <span>▲</span> Strength Factors
          </div>
          {strengthFactors.length === 0 ? (
            <p className="text-[10px] text-gray-600">No significant strengths identified.</p>
          ) : (
            <div className="space-y-2.5">
              {strengthFactors.map((f, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[11px] font-medium text-green-300">{f.label}</span>
                    <span className="text-[10px] font-mono text-green-500">+{f.impact}</span>
                  </div>
                  <p className="text-[9px] text-gray-600 leading-tight">{f.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Risks */}
        <div className="bg-red-950/20 border border-red-800/40 rounded-xl p-4">
          <div className="text-[10px] font-mono text-red-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <span>▼</span> Risk Factors
          </div>
          {riskFactors.length === 0 ? (
            <p className="text-[10px] text-green-600 font-mono">No significant risks identified.</p>
          ) : (
            <div className="space-y-2.5">
              {riskFactors.map((f, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[11px] font-medium text-red-300">{f.label}</span>
                    <span className="text-[10px] font-mono text-red-500">{f.impact}</span>
                  </div>
                  <p className="text-[9px] text-gray-600 leading-tight">{f.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="bg-blue-950/20 border border-blue-800/40 rounded-xl p-4">
          <div className="text-[10px] font-mono text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <span>◈</span> Recommended Actions
          </div>
          {recommendedActions.length === 0 ? (
            <p className="text-[10px] text-gray-600">No actions generated.</p>
          ) : (
            <div className="space-y-2.5">
              {recommendedActions.map((a, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-[9px] font-mono text-blue-600 flex-shrink-0 mt-0.5">{a.priority}.</span>
                  <div>
                    <div className="text-[11px] font-medium text-blue-300">{a.action}</div>
                    <p className="text-[9px] text-gray-600 leading-tight mt-0.5">{a.rationale}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
