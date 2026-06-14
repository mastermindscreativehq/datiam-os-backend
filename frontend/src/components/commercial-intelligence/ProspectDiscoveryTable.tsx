import { useState } from 'react'

interface ProspectTarget {
  companyName: string
  category: string
  matchScore: number
  reason: string
  type: 'sync' | 'brand' | 'creator' | 'sports'
}

interface ProspectDiscovery {
  syncTargets:    ProspectTarget[]
  brandTargets:   ProspectTarget[]
  creatorTargets: ProspectTarget[]
  sportsTargets:  ProspectTarget[]
}

interface Props {
  prospects: ProspectDiscovery
}

const SECTION_CONFIG = [
  { key: 'syncTargets'    as const, label: 'Sync Targets',    icon: '◈', color: 'text-cyan-400',   border: 'border-cyan-700/40',   bg: 'bg-cyan-900/10' },
  { key: 'brandTargets'   as const, label: 'Brand Targets',   icon: '◆', color: 'text-purple-400', border: 'border-purple-700/40', bg: 'bg-purple-900/10' },
  { key: 'creatorTargets' as const, label: 'Creator Targets', icon: '◉', color: 'text-green-400',  border: 'border-green-700/40',  bg: 'bg-green-900/10' },
  { key: 'sportsTargets'  as const, label: 'Sports Targets',  icon: '◐', color: 'text-orange-400', border: 'border-orange-700/40', bg: 'bg-orange-900/10' },
]

function scoreColor(s: number) {
  return s >= 80 ? 'text-cyan-400' : s >= 65 ? 'text-green-400' : s >= 50 ? 'text-yellow-400' : 'text-gray-400'
}

function ProspectRow({ p }: { p: ProspectTarget }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-b border-gray-800/60 last:border-0">
      <div
        className="flex items-center gap-3 py-2.5 cursor-pointer hover:bg-gray-800/30 px-2 rounded transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex-1 min-w-0">
          <span className="text-xs font-semibold text-gray-200">{p.companyName}</span>
          <span className="text-[10px] text-gray-600 ml-2 font-mono">{p.category}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="relative w-12 h-1 bg-gray-800 rounded-full">
            <div
              className={`absolute inset-y-0 left-0 rounded-full ${p.matchScore >= 80 ? 'bg-cyan-500' : p.matchScore >= 65 ? 'bg-green-500' : p.matchScore >= 50 ? 'bg-yellow-500' : 'bg-gray-600'}`}
              style={{ width: `${p.matchScore}%` }}
            />
          </div>
          <span className={`text-sm font-bold font-mono w-8 text-right ${scoreColor(p.matchScore)}`}>{p.matchScore}%</span>
          <span className="text-gray-700 text-xs">{open ? '▲' : '▼'}</span>
        </div>
      </div>
      {open && (
        <div className="px-2 pb-2.5">
          <p className="text-[10px] text-gray-500 leading-relaxed pl-1 border-l border-gray-700">{p.reason}</p>
        </div>
      )}
    </div>
  )
}

export default function ProspectDiscoveryTable({ prospects }: Props) {
  const [activeSection, setActiveSection] = useState<string>(SECTION_CONFIG[0].key)

  const active = SECTION_CONFIG.find(s => s.key === activeSection)!
  const targets = prospects[activeSection as keyof ProspectDiscovery] as ProspectTarget[]

  return (
    <div className="space-y-5">
      <div>
        <div className="text-[9px] font-mono text-gray-600 uppercase tracking-widest mb-1">Prospect Discovery Engine™</div>
        <p className="text-xs text-gray-500">Potential targets for sync, brand, creator, and sports licensing — ranked by match score.</p>
      </div>

      {/* Section tabs */}
      <div className="flex gap-2 flex-wrap">
        {SECTION_CONFIG.map(s => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-medium tracking-wider border transition-all ${
              activeSection === s.key
                ? `${s.bg} ${s.border} ${s.color}`
                : 'bg-gray-900 border-gray-800 text-gray-600 hover:border-gray-700 hover:text-gray-400'
            }`}
          >
            <span>{s.icon}</span>
            {s.label.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className={`bg-gray-900/50 border rounded-xl overflow-hidden ${active.border}`}>
        <div className={`px-4 py-3 border-b ${active.border} ${active.bg}`}>
          <div className="flex items-center gap-2">
            <span className={active.color}>{active.icon}</span>
            <span className={`text-[10px] font-mono font-bold tracking-widest uppercase ${active.color}`}>
              {active.label}
            </span>
            <span className="text-[9px] text-gray-600 font-mono ml-auto">{targets.length} prospects</span>
          </div>
        </div>

        <div className="divide-y divide-gray-800/0 px-3 py-2">
          {targets.length === 0 ? (
            <p className="text-xs text-gray-600 py-4 text-center font-mono">No prospects identified for this category.</p>
          ) : (
            targets.map((p, i) => <ProspectRow key={i} p={p} />)
          )}
        </div>
      </div>
    </div>
  )
}
