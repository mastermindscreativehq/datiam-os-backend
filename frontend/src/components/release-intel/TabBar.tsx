import type { ReleaseIntelTab, ReleaseIntelTabKey } from './types'

interface Props {
  tabs: ReleaseIntelTab[]
  activeTab: ReleaseIntelTabKey
  onSelect: (key: ReleaseIntelTabKey) => void
  countByTab?: Partial<Record<ReleaseIntelTabKey, number>>
}

export default function TabBar({ tabs, activeTab, onSelect, countByTab }: Props) {
  return (
    <div className="border-b border-[#111]">
      <div className="flex gap-1 overflow-x-auto pb-px">
        {tabs.map(tab => {
          const count = countByTab?.[tab.key]
          return (
            <button
              key={tab.key}
              onClick={() => onSelect(tab.key)}
              className={`flex-shrink-0 px-3 py-2 text-[10px] font-mono tracking-wider border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-[#00ff41] text-[#00ff41]'
                  : 'border-transparent text-gray-600 hover:text-gray-400'
              }`}
            >
              {tab.label.toUpperCase()}
              {count !== undefined && <span className="ml-1.5 text-gray-600">({count})</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
