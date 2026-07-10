import type { ReactNode } from 'react'
import WidgetCard from '../dashboard/WidgetCard'
import type { ReleaseRecord, ReleaseIntelAnalysis } from './types'
import { formatDate, ANALYSIS_STATUS_COLORS } from './format'

interface Props {
  release: ReleaseRecord
  analysis: ReleaseIntelAnalysis | null
  artistName: string | null
}

const DSP_FIELDS: Array<{ key: keyof ReleaseRecord; label: string }> = [
  { key: 'spotify_url', label: 'Spotify' },
  { key: 'apple_music_url', label: 'Apple Music' },
  { key: 'audiomack_url', label: 'Audiomack' },
  { key: 'boomplay_url', label: 'Boomplay' },
  { key: 'youtube_url', label: 'YouTube Music' },
  { key: 'deezer_url', label: 'Deezer' },
  { key: 'tidal_url', label: 'Tidal' },
  { key: 'amazon_music_url', label: 'Amazon Music' },
  { key: 'youtube_music_url', label: 'YT Music' },
  { key: 'soundcloud_url', label: 'SoundCloud' },
]

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-[9px] font-mono text-gray-600 tracking-widest mb-1">{label}</div>
      <div className="text-[12px] font-mono text-white/85">{children}</div>
    </div>
  )
}

export default function ReleaseSummary({ release, analysis, artistName }: Props) {
  const audioUploaded = Boolean(analysis?.resolved_audio_upload_id)
  const statusColor = analysis ? ANALYSIS_STATUS_COLORS[analysis.status] ?? 'text-gray-500' : 'text-gray-600'

  return (
    <WidgetCard title="RELEASE SUMMARY" accent="green">
      <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-5">
        <Field label="SONG TITLE">{release.title}</Field>
        <Field label="ARTIST">{artistName ?? '—'}</Field>
        <Field label="RELEASE DATE">{formatDate(release.release_date)}</Field>
        <Field label="GENRE">{release.genre ?? '—'}</Field>

        <Field label="DSPS CONFIGURED">
          <div className="flex flex-wrap gap-1.5">
            {DSP_FIELDS.map(({ key, label }) => (
              <span
                key={label}
                className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${release[key] ? 'text-[#00ff41] border-[#00ff41]/25' : 'text-gray-600 border-gray-700'}`}
              >
                {label}
              </span>
            ))}
          </div>
        </Field>

        <Field label="ARTWORK">
          {release.cover_art_url ? (
            <img src={release.cover_art_url} alt="cover art" className="w-10 h-10 rounded object-cover border border-[#00ff41]/20" />
          ) : (
            <span className="text-gray-600">No artwork uploaded</span>
          )}
        </Field>

        <Field label="AUDIO UPLOADED">
          <span className={audioUploaded ? 'text-[#00ff41]' : 'text-gray-600'}>{audioUploaded ? 'YES' : 'NO'}</span>
        </Field>

        <Field label="ANALYSIS STATUS">
          <span className={statusColor}>{(analysis?.status ?? 'pending').toUpperCase()}</span>
        </Field>

        <Field label="DATA COMPLETENESS">
          <span className={analysis?.data_completeness === 'full' ? 'text-[#00ff41]' : 'text-yellow-400'}>
            {(analysis?.data_completeness ?? '—').replace('_', ' ').toUpperCase()}
          </span>
        </Field>

        <Field label="COMMERCIAL READINESS">
          <span className="text-[#00d4ff]">{release.release_state.replace(/_/g, ' ').toUpperCase()}</span>
          <div className="text-[9px] text-gray-600 mt-0.5">from release checklist/state engine</div>
        </Field>

        <Field label="PRIMARY ISRC">{release.primary_isrc ?? '—'}</Field>

        <Field label="TERRITORIES">
          {release.territories && release.territories.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {release.territories.map((t) => (
                <span key={t} className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-[#00d4ff]/25 text-[#00d4ff]">
                  {t}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-gray-600">—</span>
          )}
        </Field>
      </div>
    </WidgetCard>
  )
}
