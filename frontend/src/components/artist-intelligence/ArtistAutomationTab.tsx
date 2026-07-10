import { useState } from 'react'
import { AUTOMATION_CATEGORIES, AUTOMATION_CATEGORY_LABELS } from './types'
import type { AutomationCategory } from './types'

interface DispatchResult {
  dispatched?: number
  results?: Array<{ workflow: string; status: string }>
}

interface Props {
  canWrite: boolean
  onDispatch: (category: AutomationCategory) => Promise<DispatchResult | void>
}

export default function ArtistAutomationTab({ canWrite, onDispatch }: Props) {
  const [pending, setPending] = useState<AutomationCategory | null>(null)
  const [results, setResults] = useState<Partial<Record<AutomationCategory, DispatchResult>>>({})

  const handleClick = async (category: AutomationCategory) => {
    setPending(category)
    try {
      const result = await onDispatch(category)
      setResults(r => ({ ...r, [category]: result ?? {} }))
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="border border-fuchsia-400/10 rounded-lg bg-[#0a0a0a] p-5 space-y-4">
      <p className="text-[10px] font-mono text-fuchsia-400/60 tracking-widest">
        TRIGGER AUTOMATED WORKFLOWS (VIA N8N)
      </p>
      <div className="grid grid-cols-2 gap-3">
        {AUTOMATION_CATEGORIES.map((category) => {
          const result = results[category]
          return (
            <div key={category} className="border border-white/10 rounded px-4 py-3 bg-[#0d0d0d] flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-mono text-gray-300 tracking-wide">{AUTOMATION_CATEGORY_LABELS[category]}</p>
                {result && (
                  <p className="text-[9px] font-mono text-gray-700 mt-1 tracking-widest">
                    DISPATCHED: {result.dispatched ?? 0}
                  </p>
                )}
              </div>
              <button
                onClick={() => handleClick(category)}
                disabled={!canWrite || pending === category}
                className="flex-shrink-0 text-[9px] font-mono tracking-widest px-3 py-1.5 border border-fuchsia-400/40 text-fuchsia-400 hover:bg-fuchsia-400/10 rounded transition-colors disabled:opacity-40"
              >
                {pending === category ? '...' : 'RUN'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
