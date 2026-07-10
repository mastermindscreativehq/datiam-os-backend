import { MUSIC_LINK_CATEGORIES, MUSIC_LINK_CATEGORY_LABELS } from './types'
import type { GroupedMusicLinks, MusicLink } from './types'
import MusicLinkCard from './MusicLinkCard'

type Accent = 'cyan' | 'fuchsia'

interface Props {
  groups: GroupedMusicLinks
  accent?: Accent
  onEdit?: (link: MusicLink) => void
  onDelete?: (link: MusicLink) => void
  getOwnerLabel?: (link: MusicLink) => string
  emptyHint?: string
}

export default function MusicLinkGroupList({ groups, accent = 'cyan', onEdit, onDelete, getOwnerLabel, emptyHint }: Props) {
  const totalLinks = MUSIC_LINK_CATEGORIES.reduce((sum, cat) => sum + (groups[cat]?.length ?? 0), 0)

  if (totalLinks === 0) {
    return (
      <p className="text-[10px] font-mono text-gray-700 tracking-widest py-6 text-center">
        {emptyHint ?? 'NO LINKS ADDED YET'}
      </p>
    )
  }

  return (
    <div className="space-y-5">
      {MUSIC_LINK_CATEGORIES.map((cat) => {
        const links = groups[cat] ?? []
        if (links.length === 0) return null
        return (
          <div key={cat}>
            <p className="text-[9px] font-mono text-gray-700 tracking-widest mb-2">
              {MUSIC_LINK_CATEGORY_LABELS[cat].toUpperCase()} ({links.length})
            </p>
            <div className="space-y-1.5">
              {links.map((link) => (
                <MusicLinkCard
                  key={link.id}
                  link={link}
                  accent={accent}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  ownerLabel={getOwnerLabel?.(link)}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
