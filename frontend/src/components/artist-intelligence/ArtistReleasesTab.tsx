import { Link } from 'react-router-dom'
import EmptyState from '../EmptyState'
import type { ArtistRelease } from './types'

interface Props {
  releases: ArtistRelease[]
}

export default function ArtistReleasesTab({ releases }: Props) {
  if (releases.length === 0) {
    return (
      <EmptyState
        icon="◈"
        title="No releases linked to this artist yet"
        message="Releases created for this artist in the Catalog Engine or Release Intelligence will appear here automatically."
        color="fuchsia"
      />
    )
  }

  return (
    <div className="space-y-2">
      {releases.map((r) => (
        <Link
          key={r.id}
          to={`/release-intel/${r.id}`}
          className="flex items-center justify-between border border-white/10 rounded px-4 py-3 bg-[#0d0d0d] hover:border-fuchsia-400/30 transition-colors"
        >
          <div>
            <p className="text-[12px] font-mono text-gray-300 tracking-wide">{r.release_title}</p>
            <p className="text-[9px] font-mono text-gray-700 tracking-widest mt-1">
              {r.release_type.toUpperCase()} · {r.music_status.toUpperCase()}
              {r.release_date && ` · ${r.release_date}`}
            </p>
          </div>
          <span className="text-[10px] font-mono text-fuchsia-400/50">VIEW →</span>
        </Link>
      ))}
    </div>
  )
}
