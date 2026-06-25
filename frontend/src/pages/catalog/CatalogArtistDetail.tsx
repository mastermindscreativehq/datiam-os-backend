import { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { catalog } from '../../api/catalog'
import LoadingSpinner from '../../components/LoadingSpinner'
import ErrorMessage from '../../components/ErrorMessage'
import Modal, { Field, Input, Textarea } from '../../components/Modal'
import Toast from '../../components/Toast'
import { useAuthStore } from '../../store/authStore'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDuration(secs?: number | null) {
  if (!secs) return '—'
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function fmtDate(d?: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function StatusBadge({ status }: { status?: string }) {
  if (!status) return null
  const cls =
    status === 'active'    ? 'bg-[#00ff41]/10 text-[#00ff41]' :
    status === 'inactive'  ? 'bg-yellow-400/10 text-yellow-400' :
    status === 'archived'  ? 'bg-gray-800 text-gray-500' :
                             'bg-gray-800 text-gray-500'
  return <span className={`text-[9px] font-mono tracking-widest px-2 py-0.5 rounded ${cls}`}>{status.toUpperCase()}</span>
}

function TypeBadge({ type }: { type?: string }) {
  if (!type) return null
  const cls =
    type === 'single'      ? 'bg-[#00d4ff]/10 text-[#00d4ff]' :
    type === 'album'       ? 'bg-purple-500/10 text-purple-400' :
    type === 'ep'          ? 'bg-orange-500/10 text-orange-400' :
                             'bg-gray-800 text-gray-500'
  return <span className={`text-[9px] font-mono tracking-widest px-2 py-0.5 rounded ${cls}`}>{type.toUpperCase()}</span>
}

// ── Edit Modal ────────────────────────────────────────────────────────────────

interface EditModalProps {
  isOpen: boolean
  onClose: () => void
  artist: any
  onSuccess: () => void
}

function EditArtistModal({ isOpen, onClose, artist, onSuccess }: EditModalProps) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    stage_name: artist?.stage_name ?? '',
    legal_name: artist?.legal_name ?? '',
    biography: artist?.biography ?? '',
    genres: Array.isArray(artist?.genres) ? artist.genres.join(', ') : (artist?.genres ?? ''),
    countries: Array.isArray(artist?.countries) ? artist.countries.join(', ') : (artist?.countries ?? ''),
    profile_image_url: artist?.profile_image_url ?? '',
  })

  const mutation = useMutation({
    mutationFn: () => catalog.artists.update(artist.id, {
      ...form,
      genres: form.genres ? form.genres.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
      countries: form.countries ? form.countries.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['catalog-artist', artist.id] })
      qc.invalidateQueries({ queryKey: ['catalog-artists'] })
      onSuccess()
      onClose()
    },
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="EDIT ARTIST"
      subtitle={artist?.stage_name}
      color="green"
      footer={
        <>
          <button onClick={onClose} disabled={mutation.isPending} className="text-[10px] font-mono tracking-widest px-4 py-2 border border-white/10 text-gray-500 hover:text-gray-400 rounded disabled:opacity-50">CANCEL</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.stage_name} className="text-[10px] font-mono tracking-widest px-5 py-2 border border-[#00ff41]/40 text-[#00ff41] hover:bg-[#00ff41]/10 rounded disabled:opacity-50">
            {mutation.isPending ? 'SAVING...' : 'SAVE'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Stage Name" required>
          <Input value={form.stage_name} onChange={set('stage_name')} placeholder="Artist stage name" />
        </Field>
        <Field label="Legal Name">
          <Input value={form.legal_name} onChange={set('legal_name')} placeholder="Legal / real name" />
        </Field>
        <Field label="Biography">
          <Textarea value={form.biography} onChange={set('biography')} placeholder="Short biography..." rows={3} />
        </Field>
        <Field label="Genres" hint="Comma-separated">
          <Input value={form.genres} onChange={set('genres')} placeholder="e.g. Hip-Hop, R&B" />
        </Field>
        <Field label="Countries" hint="Comma-separated">
          <Input value={form.countries} onChange={set('countries')} placeholder="e.g. US, UK" />
        </Field>
        <Field label="Profile Image URL">
          <Input value={form.profile_image_url} onChange={set('profile_image_url')} placeholder="https://..." />
        </Field>
        {mutation.error && (
          <p className="text-red-400 text-[11px] font-mono">{(mutation.error as any)?.message ?? 'Error saving'}</p>
        )}
      </div>
    </Modal>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const TABS = ['SONGS', 'RELEASES', 'STATS'] as const
type Tab = typeof TABS[number]

export default function CatalogArtistDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const canWrite = ['owner', 'admin', 'editor', 'team'].includes(user?.role ?? '')

  const [activeTab, setActiveTab] = useState<Tab>('SONGS')
  const [showEdit, setShowEdit] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => setToast({ message, type }), [])

  const { data: artistData, isLoading, isError, refetch } = useQuery({
    queryKey: ['catalog-artist', id],
    queryFn: () => catalog.artists.get(id!).then(r => r.data),
    enabled: !!id,
  })

  const { data: statsData } = useQuery({
    queryKey: ['catalog-artist-stats', id],
    queryFn: () => catalog.artists.stats(id!).then(r => r.data),
    enabled: !!id,
  })

  const { data: songsData } = useQuery({
    queryKey: ['catalog-artist-songs', id],
    queryFn: () => catalog.artists.songs(id!).then(r => r.data),
    enabled: !!id,
  })

  const { data: releasesData } = useQuery({
    queryKey: ['catalog-artist-releases', id],
    queryFn: () => catalog.artists.releases(id!).then(r => r.data),
    enabled: !!id,
  })

  if (isLoading) return <div className="flex justify-center py-24"><LoadingSpinner text="LOADING..." /></div>
  if (isError) return <ErrorMessage message="Failed to load artist" onRetry={() => refetch()} />

  const artist: any = artistData?.data ?? artistData ?? {}
  const stats: any = statsData?.data ?? statsData ?? {}
  const songs: any[] = songsData?.data ?? songsData ?? []
  const releases: any[] = releasesData?.data ?? releasesData ?? []

  const genres: string[] = Array.isArray(artist.genres) ? artist.genres : []
  const countries: string[] = Array.isArray(artist.countries) ? artist.countries : []

  return (
    <div className="space-y-6">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="text-[10px] font-mono text-gray-600 hover:text-[#00ff41] transition-colors tracking-widest"
      >
        ← BACK
      </button>

      {/* Hero */}
      <div className="border border-white/5 rounded p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full overflow-hidden border border-white/10 bg-[#111] flex items-center justify-center flex-shrink-0">
              {artist.profile_image_url ? (
                <img src={artist.profile_image_url} alt={artist.stage_name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-[14px] font-mono text-gray-600">{(artist.stage_name ?? '?')[0]?.toUpperCase()}</span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-1 h-6 bg-[#00ff41] rounded-full" />
                <h1 className="text-xl font-bold font-mono text-[#00ff41] tracking-[0.2em]">{artist.stage_name}</h1>
                <StatusBadge status={artist.status} />
              </div>
              {artist.legal_name && (
                <p className="text-gray-600 text-[11px] font-mono tracking-[0.1em] ml-4 mb-2">a.k.a. {artist.legal_name}</p>
              )}
              {artist.biography && (
                <p className="text-gray-500 text-[11px] font-mono ml-4 leading-relaxed max-w-2xl">{artist.biography}</p>
              )}
              {/* Genres */}
              {genres.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2 ml-4">
                  {genres.map((g: string) => (
                    <span key={g} className="text-[9px] font-mono tracking-widest px-2 py-0.5 rounded bg-[#00d4ff]/10 text-[#00d4ff]">{g}</span>
                  ))}
                </div>
              )}
              {/* Countries */}
              {countries.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1 ml-4">
                  {countries.map((c: string) => (
                    <span key={c} className="text-[9px] font-mono tracking-widest px-2 py-0.5 rounded bg-white/5 text-gray-500">{c}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
          {canWrite && (
            <button
              onClick={() => setShowEdit(true)}
              className="text-[10px] font-mono tracking-widest px-4 py-1.5 border border-[#00ff41]/40 text-[#00ff41] hover:bg-[#00ff41]/10 rounded transition-colors flex-shrink-0"
            >
              EDIT
            </button>
          )}
        </div>

        {/* Stat bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/5">
          <div className="border rounded p-4 border-[#00ff41]/15">
            <div className="text-[10px] font-mono tracking-widest text-gray-500 mb-1">TOTAL SONGS</div>
            <div className="text-2xl font-mono font-bold text-[#00ff41]">{stats.total_songs ?? songs.length ?? 0}</div>
          </div>
          <div className="border rounded p-4 border-[#00ff41]/15">
            <div className="text-[10px] font-mono tracking-widest text-gray-500 mb-1">TOTAL RELEASES</div>
            <div className="text-2xl font-mono font-bold text-[#00ff41]">{stats.total_releases ?? releases.length ?? 0}</div>
          </div>
          <div className="border rounded p-4 border-[#00ff41]/15">
            <div className="text-[10px] font-mono tracking-widest text-gray-500 mb-1">PENDING RELEASES</div>
            <div className="text-2xl font-mono font-bold text-[#00ff41]">{stats.pending_releases ?? 0}</div>
          </div>
          <div className="border rounded p-4 border-[#00ff41]/15">
            <div className="text-[10px] font-mono tracking-widest text-gray-500 mb-1">MISSING METADATA</div>
            <div className="text-2xl font-mono font-bold text-yellow-400">{stats.missing_metadata ?? 0}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-white/5 pb-0">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`text-[10px] font-mono tracking-widest pb-3 transition-colors ${activeTab === t ? 'text-[#00ff41] border-b border-[#00ff41]' : 'text-gray-600 hover:text-gray-400'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Songs Tab */}
      {activeTab === 'SONGS' && (
        songs.length === 0 ? (
          <div className="text-center py-12 text-gray-600 text-[11px] font-mono tracking-widest">NO SONGS</div>
        ) : (
          <div className="border border-white/5 rounded overflow-hidden">
            <table className="w-full text-[10px] font-mono">
              <thead>
                <tr className="border-b border-white/5 text-gray-600 tracking-widest">
                  <th className="text-left px-4 py-2">TITLE</th>
                  <th className="text-left px-4 py-2">BPM</th>
                  <th className="text-left px-4 py-2">KEY</th>
                  <th className="text-left px-4 py-2">STATUS</th>
                  <th className="text-left px-4 py-2">ISRC</th>
                  <th className="text-left px-4 py-2">DURATION</th>
                </tr>
              </thead>
              <tbody>
                {songs.map((song: any) => (
                  <tr
                    key={song.id}
                    onClick={() => navigate('/catalog/songs/' + song.id)}
                    className="border-b border-white/[0.03] hover:bg-white/[0.02] cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-2 text-gray-300">{song.title}</td>
                    <td className="px-4 py-2 text-gray-500">{song.bpm ?? '—'}</td>
                    <td className="px-4 py-2 text-gray-500">{song.key ?? '—'}</td>
                    <td className="px-4 py-2"><StatusBadge status={song.status} /></td>
                    <td className="px-4 py-2">
                      {song.isrc ? (
                        <span className="text-[#00ff41]">✓</span>
                      ) : (
                        <span className="text-red-500/50">✗</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-gray-500">{fmtDuration(song.duration_seconds)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Releases Tab */}
      {activeTab === 'RELEASES' && (
        releases.length === 0 ? (
          <div className="text-center py-12 text-gray-600 text-[11px] font-mono tracking-widest">NO RELEASES</div>
        ) : (
          <div className="border border-white/5 rounded overflow-hidden">
            <table className="w-full text-[10px] font-mono">
              <thead>
                <tr className="border-b border-white/5 text-gray-600 tracking-widest">
                  <th className="text-left px-4 py-2">TITLE</th>
                  <th className="text-left px-4 py-2">TYPE</th>
                  <th className="text-left px-4 py-2">RELEASE DATE</th>
                  <th className="text-left px-4 py-2">STATUS</th>
                  <th className="text-left px-4 py-2">UPC</th>
                </tr>
              </thead>
              <tbody>
                {releases.map((release: any) => (
                  <tr
                    key={release.id}
                    onClick={() => navigate('/catalog/releases/' + release.id)}
                    className="border-b border-white/[0.03] hover:bg-white/[0.02] cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-2 text-gray-300">{release.title}</td>
                    <td className="px-4 py-2"><TypeBadge type={release.catalog_release_type ?? release.type} /></td>
                    <td className="px-4 py-2 text-gray-500">{fmtDate(release.release_date)}</td>
                    <td className="px-4 py-2"><StatusBadge status={release.status} /></td>
                    <td className="px-4 py-2">
                      {release.upc ? (
                        <span className="text-[#00ff41]">✓</span>
                      ) : (
                        <span className="text-red-500/50">✗</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Stats Tab */}
      {activeTab === 'STATS' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Object.entries(stats).filter(([k]) => !['id', 'artist_id'].includes(k)).map(([key, val]) => (
            <div key={key} className="border rounded p-4 border-[#00ff41]/15">
              <div className="text-[10px] font-mono tracking-widest text-gray-500 mb-1">{key.replace(/_/g, ' ').toUpperCase()}</div>
              <div className="text-2xl font-mono font-bold text-[#00ff41]">{String(val ?? 0)}</div>
            </div>
          ))}
          {Object.keys(stats).length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-600 text-[11px] font-mono tracking-widest">NO STATS AVAILABLE</div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {showEdit && (
        <EditArtistModal
          isOpen={showEdit}
          onClose={() => setShowEdit(false)}
          artist={artist}
          onSuccess={() => showToast('Artist updated successfully')}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  )
}
