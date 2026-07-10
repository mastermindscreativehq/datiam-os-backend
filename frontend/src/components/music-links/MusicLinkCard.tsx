import type { MusicLink } from './types'

type Accent = 'cyan' | 'fuchsia'

const ACCENTS: Record<Accent, string> = {
  cyan: 'hover:border-[#00d4ff]/30 hover:text-[#00d4ff]',
  fuchsia: 'hover:border-fuchsia-400/30 hover:text-fuchsia-400',
}

interface Props {
  link: MusicLink
  accent?: Accent
  onEdit?: (link: MusicLink) => void
  onDelete?: (link: MusicLink) => void
  ownerLabel?: string
}

export default function MusicLinkCard({ link, accent = 'cyan', onEdit, onDelete, ownerLabel }: Props) {
  return (
    <div className="flex items-center justify-between gap-3 border border-white/10 rounded px-3 py-2 bg-[#0d0d0d]">
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex-1 min-w-0 text-[10px] font-mono text-gray-400 truncate transition-colors ${ACCENTS[accent]}`}
        title={link.url}
      >
        <span className="text-gray-300 tracking-widest">{(link.label || link.platform).toUpperCase()}</span>
        {link.territory && <span className="text-gray-700 ml-2">[{link.territory}]</span>}
        {!link.is_active && <span className="text-gray-700 ml-2">(INACTIVE)</span>}
        {ownerLabel && <span className="text-gray-700 ml-2">{ownerLabel}</span>}
        <div className="text-gray-700 truncate">{link.url}</div>
      </a>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {link.is_primary && (
          <span className="text-[9px] font-mono tracking-widest text-yellow-400/60 border border-yellow-400/20 rounded px-1.5 py-0.5">
            PRIMARY
          </span>
        )}
        {onEdit && (
          <button
            onClick={() => onEdit(link)}
            className="text-[9px] font-mono tracking-widest px-2 py-1 border border-white/10 text-gray-500 hover:text-gray-300 hover:border-white/20 rounded transition-colors"
          >
            EDIT
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(link)}
            className="text-[9px] font-mono tracking-widest px-2 py-1 border border-red-500/20 text-red-500/60 hover:text-red-400 hover:border-red-500/40 rounded transition-colors"
          >
            DEL
          </button>
        )}
      </div>
    </div>
  )
}
