import type { ArtistIntelTab, ArtistIntelTabKey } from './types'

interface Props {
  tabs: ArtistIntelTab[]
  activeTab: ArtistIntelTabKey
  onSelect: (key: ArtistIntelTabKey) => void
  countByTab?: Partial<Record<ArtistIntelTabKey, number>>
}

export default function ArtistTabBar({ tabs, activeTab, onSelect, countByTab }: Props) {
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
                  ? 'border-fuchsia-400 text-fuchsia-400'
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
