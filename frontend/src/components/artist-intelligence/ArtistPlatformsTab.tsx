import { useState } from 'react'
import MusicLinkGroupList from '../music-links/MusicLinkGroupList'
import MusicLinkFormModal, { type MusicLinkFormPayload } from '../music-links/MusicLinkFormModal'
import type { GroupedMusicLinks, MusicLink } from '../music-links/types'

interface Props {
  artistId: string
  groups: GroupedMusicLinks
  canWrite: boolean
  onCreate: (payload: MusicLinkFormPayload) => Promise<void>
  onUpdate: (id: string, payload: MusicLinkFormPayload) => Promise<void>
  onDelete: (link: MusicLink) => Promise<void>
}

export default function ArtistPlatformsTab({ artistId, groups, canWrite, onCreate, onUpdate, onDelete }: Props) {
  const [formOpen, setFormOpen] = useState(false)
  const [editItem, setEditItem] = useState<MusicLink | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (payload: MusicLinkFormPayload) => {
    setSubmitting(true)
    try {
      if (editItem) await onUpdate(editItem.id, payload)
      else await onCreate(payload)
      setFormOpen(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="border border-fuchsia-400/10 rounded-lg bg-[#0a0a0a] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-mono text-fuchsia-400/60 tracking-widest">MUSIC PLATFORMS &amp; SOCIAL LINKS</p>
        {canWrite && (
          <button
            onClick={() => { setEditItem(null); setFormOpen(true) }}
            className="text-[10px] font-mono tracking-widest px-3 py-1.5 border border-fuchsia-400/40 text-fuchsia-400 hover:bg-fuchsia-400/10 rounded transition-colors"
          >
            + ADD LINK
          </button>
        )}
      </div>

      <MusicLinkGroupList
        groups={groups}
        accent="fuchsia"
        onEdit={canWrite ? (link) => { setEditItem(link); setFormOpen(true) } : undefined}
        onDelete={canWrite ? (link) => onDelete(link) : undefined}
        emptyHint="No platform or social links added yet — use + ADD LINK to start building out this artist's Music Links Hub entry."
      />

      <MusicLinkFormModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        initial={editItem}
        defaultOwner={{ type: 'artist', id: artistId }}
        submitting={submitting}
        color="fuchsia"
      />
    </div>
  )
}
