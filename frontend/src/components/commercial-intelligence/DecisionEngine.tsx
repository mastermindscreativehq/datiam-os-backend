interface RecommendedAction {
  priority: number
  title: string
  description: string
  impact: 'High' | 'Medium' | 'Low'
  timeframe: string
  targetAudience: string
  channel: string
}

interface DecisionEngineProps {
  actions: RecommendedAction[]
  primaryFocus: string
  strategyType: string
}

const IMPACT_CONFIG = {
  High:   { color: 'text-cyan-400',   bg: 'bg-cyan-500/10',   border: 'border-cyan-500/30' },
  Medium: { color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/30' },
  Low:    { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
}

const TIMEFRAME_CONFIG = {
  'Immediate':   'text-cyan-400',
  'Short-term':  'text-green-400',
  'Long-term':   'text-yellow-400',
}

const STRATEGY_CONFIG: Record<string, { color: string; bg: string; border: string; icon: string }> = {
  'Aggressive Pitch':    { color: 'text-cyan-400',   bg: 'bg-cyan-500/10',   border: 'border-cyan-500/30',   icon: '⚡' },
  'Targeted Pitch':      { color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/30',  icon: '◎' },
  'Library Submission':  { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', icon: '◈' },
  'Development Needed':  { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', icon: '◆' },
}

export default function DecisionEngine({ actions, primaryFocus, strategyType }: DecisionEngineProps) {
  const sCfg = STRATEGY_CONFIG[strategyType] ?? STRATEGY_CONFIG['Targeted Pitch']
  const priorityActions = actions.slice(0, 5)

  return (
    <div>
      <div className="text-[10px] font-mono text-gray-500 tracking-[0.2em] uppercase mb-4">
        Decision Engine™ — Recommended Actions
      </div>

      {/* Strategy header */}
      <div className={`flex items-center justify-between p-3 rounded-lg border ${sCfg.bg} ${sCfg.border} mb-5`}>
        <div className="flex items-center gap-2">
          <span className={sCfg.color}>{sCfg.icon}</span>
          <span className={`text-xs font-mono font-bold ${sCfg.color}`}>{strategyType}</span>
        </div>
        <div className="text-right">
          <div className="text-[9px] font-mono text-gray-600 uppercase">Primary Focus</div>
          <div className={`text-xs font-mono ${sCfg.color}`}>{primaryFocus}</div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        {priorityActions.map(action => {
          const iCfg = IMPACT_CONFIG[action.impact]
          const tColor = TIMEFRAME_CONFIG[action.timeframe as keyof typeof TIMEFRAME_CONFIG] ?? 'text-gray-400'

          return (
            <div key={action.priority} className="bg-[#0f0f0f] border border-gray-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                {/* Priority number */}
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-xs font-mono font-bold text-gray-400">
                  {action.priority}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="text-sm font-semibold text-white leading-snug">{action.title}</h4>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-semibold border ${iCfg.bg} ${iCfg.color} ${iCfg.border}`}>
                        {action.impact}
                      </span>
                      <span className={`text-[9px] font-mono ${tColor}`}>{action.timeframe}</span>
                    </div>
                  </div>

                  <p className="text-xs text-gray-400 leading-relaxed mb-2">{action.description}</p>

                  <div className="flex flex-wrap gap-3 text-[10px] font-mono">
                    <div>
                      <span className="text-gray-600">Audience: </span>
                      <span className="text-gray-400">{action.targetAudience}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Channel: </span>
                      <span className="text-gray-400">{action.channel}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
