export type ReleaseState =
  | 'draft'
  | 'blocked'
  | 'almost_ready'
  | 'ready_for_distribution'
  | 'scheduled'
  | 'released'
  | string

const STATE_STYLE: Record<string, { text: string; border: string; dot: string }> = {
  draft:                  { text: 'text-gray-400',     border: 'border-gray-500/30',     dot: 'bg-gray-500'     },
  blocked:                { text: 'text-red-400',      border: 'border-red-500/40',      dot: 'bg-red-500'      },
  almost_ready:           { text: 'text-yellow-400',   border: 'border-yellow-500/40',   dot: 'bg-yellow-400'   },
  ready_for_distribution: { text: 'text-emerald-400',  border: 'border-emerald-500/40',  dot: 'bg-emerald-400'  },
  scheduled:              { text: 'text-[#00d4ff]',    border: 'border-[#00d4ff]/40',    dot: 'bg-[#00d4ff]'    },
  released:               { text: 'text-[#00ff41]',    border: 'border-[#00ff41]/40',    dot: 'bg-[#00ff41]'    },
}

const STATE_LABEL: Record<string, string> = {
  draft:                  'DRAFT',
  blocked:                'BLOCKED',
  almost_ready:           'ALMOST READY',
  ready_for_distribution: 'READY',
  scheduled:              'SCHEDULED',
  released:               'RELEASED',
}

interface Props {
  state: ReleaseState
  size?: 'sm' | 'md'
  showDot?: boolean
}

export default function ReleaseStateBadge({ state, size = 'sm', showDot = true }: Props) {
  const style = STATE_STYLE[state] ?? { text: 'text-gray-500', border: 'border-gray-700', dot: 'bg-gray-500' }
  const label = STATE_LABEL[state] ?? state.toUpperCase().replace(/_/g, ' ')
  const textSize = size === 'md' ? 'text-[11px]' : 'text-[9px]'
  const px = size === 'md' ? 'px-2.5 py-1' : 'px-2 py-0.5'

  return (
    <span className={`inline-flex items-center gap-1.5 font-mono tracking-widest rounded border ${style.border} ${style.text} ${textSize} ${px}`}>
      {showDot && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${style.dot}`} />}
      {label}
    </span>
  )
}
