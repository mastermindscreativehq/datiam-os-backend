import ReleaseStateBadge, { type ReleaseState } from './ReleaseStateBadge'

interface Props {
  state: ReleaseState
  completionPercent: number
  missingGateFields?: string[]
  compact?: boolean
}

const FIELD_LABELS: Record<string, string> = {
  metadata_ready:      'Metadata',
  cover_art_ready:     'Cover art',
  mix_ready:           'Mix approved',
  master_ready:        'Master approved',
  distributor_ready:   'Distributor confirmed',
  release_date_ready:  'Release date locked',
  final_approval:      'Final approval',
}

function barColor(pct: number, state: ReleaseState): string {
  if (state === 'released')               return '#00ff41'
  if (state === 'scheduled')              return '#00d4ff'
  if (state === 'ready_for_distribution') return '#00ff41'
  if (pct >= 70)                          return '#facc15'
  if (state === 'blocked')                return '#f87171'
  return '#00d4ff'
}

export default function ReleaseReadinessMeter({ state, completionPercent, missingGateFields = [], compact = false }: Props) {
  const color = barColor(completionPercent, state)

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-20 h-1 bg-white/10 rounded-full overflow-hidden flex-shrink-0">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${completionPercent}%`, background: color }}
          />
        </div>
        <span className="text-[10px] font-mono text-gray-500">{completionPercent}%</span>
        <ReleaseStateBadge state={state} />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* State + percent */}
      <div className="flex items-center justify-between">
        <ReleaseStateBadge state={state} size="md" />
        <span className="text-[11px] font-mono text-gray-400">{completionPercent}% complete</span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${completionPercent}%`, background: color }}
        />
      </div>

      {/* Blocked warnings */}
      {missingGateFields.length > 0 && (
        <div className="border border-red-500/20 rounded px-3 py-2.5 bg-red-500/5 space-y-1">
          <div className="text-[9px] font-mono text-red-400 tracking-widest mb-1.5">
            BLOCKING ITEMS — REQUIRED TO ADVANCE
          </div>
          {missingGateFields.map(f => (
            <div key={f} className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-red-500/60 flex-shrink-0" />
              <span className="text-[10px] font-mono text-gray-500">{FIELD_LABELS[f] ?? f}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
