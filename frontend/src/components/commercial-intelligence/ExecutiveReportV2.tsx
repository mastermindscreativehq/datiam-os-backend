interface ExecutiveReportV2Data {
  commercialSummary: string
  audienceSummary:   string
  marketSummary:     string
  revenueSummary:    string
  improvementPlan:   string[]
}

interface Props {
  report: ExecutiveReportV2Data
}

const SECTIONS = [
  { key: 'commercialSummary' as const, label: 'Commercial Summary', icon: '◈', color: 'text-cyan-400', border: 'border-cyan-800/40' },
  { key: 'audienceSummary'   as const, label: 'Audience Summary',   icon: '◉', color: 'text-green-400', border: 'border-green-800/40' },
  { key: 'marketSummary'     as const, label: 'Market Summary',     icon: '◇', color: 'text-purple-400', border: 'border-purple-800/40' },
  { key: 'revenueSummary'    as const, label: 'Revenue Summary',    icon: '◆', color: 'text-yellow-400', border: 'border-yellow-800/40' },
]

export default function ExecutiveReportV2({ report }: Props) {
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[9px] font-mono text-gray-600 uppercase tracking-widest mb-1">Executive Assessment™ — A&R Report</div>
          <p className="text-xs text-gray-500">Professional A&R style commercial assessment across four dimensions.</p>
        </div>
      </div>

      {/* Four section cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {SECTIONS.map(s => (
          <div key={s.key} className={`bg-gray-900/60 border ${s.border} rounded-xl p-5`}>
            <div className={`flex items-center gap-1.5 mb-3 text-[10px] font-mono font-bold tracking-widest uppercase ${s.color}`}>
              <span>{s.icon}</span>
              {s.label}
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">{report[s.key]}</p>
          </div>
        ))}
      </div>

      {/* Improvement Plan */}
      <div className="bg-gray-900/40 border border-gray-700/50 rounded-xl p-5">
        <div className="text-[10px] font-mono text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
          <span className="text-yellow-500">◐</span> Improvement Roadmap
        </div>
        <div className="space-y-3">
          {report.improvementPlan.map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="flex-shrink-0 w-5 h-5 rounded-full border border-yellow-700/60 bg-yellow-900/20 flex items-center justify-center">
                <span className="text-[9px] font-mono text-yellow-500">{i + 1}</span>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed pt-0.5">{item}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
