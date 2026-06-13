interface ExecutiveSyncAssessmentProps {
  headline: string
  body: string
  primaryOpportunities: string[]
  supervisorVerdict: string
}

export default function ExecutiveSyncAssessment({
  headline,
  body,
  primaryOpportunities,
  supervisorVerdict,
}: ExecutiveSyncAssessmentProps) {
  return (
    <div className="bg-[#0c0c0c] rounded-xl border border-[#00d4ff]/15 p-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="text-[10px] font-mono text-[#00d4ff]/60 tracking-[0.2em] uppercase">
          Executive Sync Assessment™
        </div>
        <div className="flex-1 h-px bg-[#00d4ff]/10" />
        <span className="text-[9px] font-mono text-[#00d4ff]/30 tracking-widest">MUSIC SUPERVISOR REPORT</span>
      </div>

      {/* Headline */}
      <h3 className="text-white font-semibold text-base leading-snug mb-3">{headline}</h3>

      {/* Body */}
      <p className="text-gray-400 text-sm leading-relaxed mb-5">{body}</p>

      {/* Primary Opportunities */}
      <div className="mb-5">
        <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-3">
          Primary Opportunities
        </div>
        <ul className="space-y-1.5">
          {primaryOpportunities.map((opp, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-gray-300">
              <span className="text-[#00d4ff] font-mono mt-0.5 flex-shrink-0">•</span>
              {opp}
            </li>
          ))}
        </ul>
      </div>

      {/* Supervisor Verdict */}
      <div className="border-t border-gray-800 pt-4">
        <div className="text-[10px] font-mono text-[#00ff41]/60 uppercase tracking-widest mb-2">
          ◎ Supervisor Recommendation
        </div>
        <p className="text-[#00ff41]/80 text-sm leading-relaxed font-mono">{supervisorVerdict}</p>
      </div>
    </div>
  )
}
