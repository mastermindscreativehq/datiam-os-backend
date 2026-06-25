import { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { catalog } from '../../api/catalog'
import LoadingSpinner from '../../components/LoadingSpinner'
import ErrorMessage from '../../components/ErrorMessage'
import Modal, { Field, Input, Select } from '../../components/Modal'
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
    status === 'released'  ? 'bg-[#00ff41]/10 text-[#00ff41]' :
    status === 'inactive'  ? 'bg-yellow-400/10 text-yellow-400' :
    status === 'draft'     ? 'bg-gray-800 text-gray-500' :
    status === 'archived'  ? 'bg-gray-800 text-gray-500' :
    status === 'scheduled' ? 'bg-[#00d4ff]/10 text-[#00d4ff]' :
                             'bg-gray-800 text-gray-500'
  return <span className={`text-[9px] font-mono tracking-widest px-2 py-0.5 rounded ${cls}`}>{status.toUpperCase()}</span>
}

function TypeBadge({ type }: { type?: string }) {
  if (!type) return null
  const cls =
    type === 'single'       ? 'bg-[#00d4ff]/10 text-[#00d4ff]' :
    type === 'album'        ? 'bg-purple-500/10 text-purple-400' :
    type === 'ep'           ? 'bg-orange-500/10 text-orange-400' :
    type === 'mixtape'      ? 'bg-yellow-400/10 text-yellow-400' :
    type === 'compilation'  ? 'bg-gray-500/20 text-gray-400' :
    type === 'front_cover'  ? 'bg-[#00d4ff]/10 text-[#00d4ff]' :
    type === 'back_cover'   ? 'bg-purple-500/10 text-purple-400' :
    type === 'booklet'      ? 'bg-orange-500/10 text-orange-400' :
    type === 'cd_label'     ? 'bg-yellow-400/10 text-yellow-400' :
                              'bg-gray-800 text-gray-500'
  return <span className={`text-[9px] font-mono tracking-widest px-2 py-0.5 rounded ${cls}`}>{type.replace(/_/g, ' ').toUpperCase()}</span>
}

// ── Add Track Modal ───────────────────────────────────────────────────────────

function AddTrackModal({ isOpen, onClose, releaseId, onSuccess }: any) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ song_id: '', track_number: '', is_explicit: false })

  const mutation = useMutation({
    mutationFn: () => catalog.releases.addTrack(releaseId, {
      song_id: form.song_id,
      track_number: form.track_number ? Number(form.track_number) : undefined,
      is_explicit: form.is_explicit,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['catalog-release-tracks', releaseId] })
      onSuccess()
      onClose()
      setForm({ song_id: '', track_number: '', is_explicit: false })
    },
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="ADD TRACK" color="cyan"
      footer={
        <>
          <button onClick={onClose} disabled={mutation.isPending} className="text-[10px] font-mono tracking-widest px-4 py-2 border border-white/10 text-gray-500 hover:text-gray-400 rounded disabled:opacity-50">CANCEL</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.song_id} className="text-[10px] font-mono tracking-widest px-5 py-2 border border-[#00ff41]/40 text-[#00ff41] hover:bg-[#00ff41]/10 rounded disabled:opacity-50">
            {mutation.isPending ? 'SAVING...' : 'SAVE'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Song ID" required hint="Paste the song UUID from the Songs catalog">
          <Input value={form.song_id} onChange={set('song_id')} placeholder="song-uuid-here" />
        </Field>
        <Field label="Track Number">
          <Input type="number" value={form.track_number} onChange={set('track_number')} placeholder="1" />
        </Field>
        <Field label="Explicit">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_explicit}
              onChange={e => setForm(f => ({ ...f, is_explicit: e.target.checked }))}
              className="accent-[#00ff41]"
            />
            <span className="text-[11px] font-mono text-gray-500">Explicit content</span>
          </label>
        </Field>
      </div>
    </Modal>
  )
}

// ── Add Artwork Modal ─────────────────────────────────────────────────────────

function AddArtworkModal({ isOpen, onClose, releaseId, onSuccess }: any) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ artwork_type: '', image_url: '', width: '', height: '' })

  const mutation = useMutation({
    mutationFn: () => catalog.releases.addArtwork(releaseId, {
      ...form,
      width: form.width ? Number(form.width) : undefined,
      height: form.height ? Number(form.height) : undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['catalog-release-artwork', releaseId] })
      onSuccess()
      onClose()
      setForm({ artwork_type: '', image_url: '', width: '', height: '' })
    },
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="ADD ARTWORK" color="cyan"
      footer={
        <>
          <button onClick={onClose} disabled={mutation.isPending} className="text-[10px] font-mono tracking-widest px-4 py-2 border border-white/10 text-gray-500 hover:text-gray-400 rounded disabled:opacity-50">CANCEL</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.artwork_type} className="text-[10px] font-mono tracking-widest px-5 py-2 border border-[#00ff41]/40 text-[#00ff41] hover:bg-[#00ff41]/10 rounded disabled:opacity-50">
            {mutation.isPending ? 'SAVING...' : 'SAVE'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Artwork Type" required>
          <Select value={form.artwork_type} onChange={set('artwork_type')}>
            <option value="">Select type...</option>
            <option value="front_cover">FRONT COVER</option>
            <option value="back_cover">BACK COVER</option>
            <option value="booklet">BOOKLET</option>
            <option value="cd_label">CD LABEL</option>
          </Select>
        </Field>
        <Field label="Image URL">
          <Input value={form.image_url} onChange={set('image_url')} placeholder="https://..." />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Width (px)">
            <Input type="number" value={form.width} onChange={set('width')} placeholder="3000" />
          </Field>
          <Field label="Height (px)">
            <Input type="number" value={form.height} onChange={set('height')} placeholder="3000" />
          </Field>
        </div>
      </div>
    </Modal>
  )
}

// ── Add Identifier Modal ──────────────────────────────────────────────────────

function AddIdentifierModal({ isOpen, onClose, releaseId, onSuccess }: any) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ identifier_type: '', value: '', territory: '' })

  const mutation = useMutation({
    mutationFn: () => catalog.releases.addIdentifier(releaseId, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['catalog-release-identifiers', releaseId] })
      onSuccess()
      onClose()
      setForm({ identifier_type: '', value: '', territory: '' })
    },
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="ADD IDENTIFIER" color="cyan"
      footer={
        <>
          <button onClick={onClose} disabled={mutation.isPending} className="text-[10px] font-mono tracking-widest px-4 py-2 border border-white/10 text-gray-500 hover:text-gray-400 rounded disabled:opacity-50">CANCEL</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.identifier_type || !form.value} className="text-[10px] font-mono tracking-widest px-5 py-2 border border-[#00ff41]/40 text-[#00ff41] hover:bg-[#00ff41]/10 rounded disabled:opacity-50">
            {mutation.isPending ? 'SAVING...' : 'SAVE'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Identifier Type" required>
          <Select value={form.identifier_type} onChange={set('identifier_type')}>
            <option value="">Select type...</option>
            <option value="UPC">UPC</option>
            <option value="EAN">EAN</option>
            <option value="GRID">GRID</option>
            <option value="ISRC">ISRC</option>
          </Select>
        </Field>
        <Field label="Value" required>
          <Input value={form.value} onChange={set('value')} placeholder="e.g. 00602435943350" />
        </Field>
        <Field label="Territory">
          <Input value={form.territory} onChange={set('territory')} placeholder="e.g. WW, US" />
        </Field>
      </div>
    </Modal>
  )
}

// ── Edit Release Modal ────────────────────────────────────────────────────────

function EditReleaseModal({ isOpen, onClose, release, onSuccess }: any) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    title: release?.title ?? '',
    catalog_release_type: release?.catalog_release_type ?? release?.type ?? '',
    release_date: release?.release_date ? release.release_date.slice(0, 10) : '',
    preorder_date: release?.preorder_date ? release.preorder_date.slice(0, 10) : '',
    upc: release?.upc ?? '',
    distributor: release?.distributor ?? '',
    cover_art_url: release?.cover_art_url ?? '',
  })

  const mutation = useMutation({
    mutationFn: () => catalog.releases.update(release.id, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['catalog-release', release.id] })
      qc.invalidateQueries({ queryKey: ['catalog-releases'] })
      onSuccess()
      onClose()
    },
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="EDIT RELEASE" subtitle={release?.title} color="cyan"
      footer={
        <>
          <button onClick={onClose} disabled={mutation.isPending} className="text-[10px] font-mono tracking-widest px-4 py-2 border border-white/10 text-gray-500 hover:text-gray-400 rounded disabled:opacity-50">CANCEL</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.title} className="text-[10px] font-mono tracking-widest px-5 py-2 border border-[#00ff41]/40 text-[#00ff41] hover:bg-[#00ff41]/10 rounded disabled:opacity-50">
            {mutation.isPending ? 'SAVING...' : 'SAVE'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Title" required>
          <Input value={form.title} onChange={set('title')} placeholder="Release title" />
        </Field>
        <Field label="Release Type">
          <Select value={form.catalog_release_type} onChange={set('catalog_release_type')}>
            <option value="">Select type...</option>
            <option value="single">SINGLE</option>
            <option value="ep">EP</option>
            <option value="album">ALBUM</option>
            <option value="mixtape">MIXTAPE</option>
            <option value="compilation">COMPILATION</option>
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Release Date">
            <Input type="date" value={form.release_date} onChange={set('release_date')} />
          </Field>
          <Field label="Pre-order Date">
            <Input type="date" value={form.preorder_date} onChange={set('preorder_date')} />
          </Field>
        </div>
        <Field label="UPC">
          <Input value={form.upc} onChange={set('upc')} placeholder="Universal Product Code" />
        </Field>
        <Field label="Distributor">
          <Input value={form.distributor} onChange={set('distributor')} placeholder="e.g. DistroKid" />
        </Field>
        <Field label="Cover Art URL">
          <Input value={form.cover_art_url} onChange={set('cover_art_url')} placeholder="https://..." />
        </Field>
        {mutation.error && (
          <p className="text-red-400 text-[11px] font-mono">{(mutation.error as any)?.message ?? 'Error saving'}</p>
        )}
      </div>
    </Modal>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const TABS = ['TRACKLIST', 'ARTWORK', 'IDENTIFIERS'] as const
type Tab = typeof TABS[number]

export default function CatalogReleaseDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const canWrite = ['owner', 'admin', 'editor', 'team'].includes(user?.role ?? '')

  const [activeTab, setActiveTab] = useState<Tab>('TRACKLIST')
  const [showEdit, setShowEdit] = useState(false)
  const [showAddTrack, setShowAddTrack] = useState(false)
  const [showAddArtwork, setShowAddArtwork] = useState(false)
  const [showAddIdentifier, setShowAddIdentifier] = useState(false)

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => setToast({ message, type }), [])

  const { data: releaseData, isLoading, isError, refetch } = useQuery({
    queryKey: ['catalog-release', id],
    queryFn: () => catalog.releases.get(id!).then(r => r.data),
    enabled: !!id,
  })

  const { data: tracksData } = useQuery({
    queryKey: ['catalog-release-tracks', id],
    queryFn: () => catalog.releases.tracks(id!).then(r => r.data),
    enabled: !!id,
  })

  const { data: artworkData } = useQuery({
    queryKey: ['catalog-release-artwork', id],
    queryFn: () => catalog.releases.artwork(id!).then(r => r.data),
    enabled: !!id,
  })

  const { data: identifiersData } = useQuery({
    queryKey: ['catalog-release-identifiers', id],
    queryFn: () => catalog.releases.identifiers(id!).then(r => r.data),
    enabled: !!id,
  })

  if (isLoading) return <div className="flex justify-center py-24"><LoadingSpinner text="LOADING..." /></div>
  if (isError) return <ErrorMessage message="Failed to load release" onRetry={() => refetch()} />

  const release: any = releaseData?.data ?? releaseData ?? {}
  const tracks: any[] = tracksData?.data ?? tracksData ?? []
  const artworks: any[] = artworkData?.data ?? artworkData ?? []
  const identifiers: any[] = identifiersData?.data ?? identifiersData ?? []

  const releaseType = release.catalog_release_type ?? release.type

  return (
    <div className="space-y-6">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="text-[10px] font-mono text-gray-600 hover:text-[#00ff41] transition-colors tracking-widest">
        ← BACK
      </button>

      {/* Header + Sidebar layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main header */}
        <div className="lg:col-span-3 border border-white/5 rounded p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              {/* Cover art */}
              <div className="w-20 h-20 rounded border border-white/10 overflow-hidden bg-[#111] flex-shrink-0">
                {release.cover_art_url ? (
                  <img src={release.cover_art_url} alt={release.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-700 text-[10px] font-mono">NO ART</div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-1 h-6 bg-[#00ff41] rounded-full" />
                  <h1 className="text-xl font-bold font-mono text-[#00ff41] tracking-[0.2em]">{release.title}</h1>
                </div>
                <p className="text-gray-600 text-[11px] font-mono tracking-[0.1em] ml-4 mb-2">{release.artist_name ?? '—'}</p>
                <div className="flex items-center gap-2 ml-4">
                  <TypeBadge type={releaseType} />
                  <StatusBadge status={release.status} />
                  {release.release_date && (
                    <span className="text-[10px] font-mono text-gray-600">{fmtDate(release.release_date)}</span>
                  )}
                </div>
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
        </div>

        {/* Sidebar */}
        <div className="border border-white/5 rounded p-4 space-y-4">
          <div className="text-[10px] font-mono tracking-widest text-gray-500 mb-2">RELEASE INFO</div>
          {[
            { label: 'DISTRIBUTOR', val: release.distributor },
            { label: 'UPC', val: release.upc },
            { label: 'PRE-ORDER', val: fmtDate(release.preorder_date) },
            { label: 'SMART LINK', val: release.smart_link_url },
          ].map(item => (
            <div key={item.label}>
              <div className="text-[9px] font-mono tracking-widest text-gray-600 mb-0.5">{item.label}</div>
              {item.label === 'SMART LINK' && item.val ? (
                <a href={item.val} target="_blank" rel="noopener noreferrer" className="text-[11px] font-mono text-[#00d4ff] hover:underline truncate block">{item.val}</a>
              ) : (
                <div className="text-[11px] font-mono text-gray-400 truncate">{item.val ?? '—'}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-white/5 pb-0">
        {TABS.map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`text-[10px] font-mono tracking-widest pb-3 transition-colors ${activeTab === t ? 'text-[#00ff41] border-b border-[#00ff41]' : 'text-gray-600 hover:text-gray-400'}`}
          >{t}</button>
        ))}
      </div>

      {/* TRACKLIST */}
      {activeTab === 'TRACKLIST' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            {canWrite && (
              <button onClick={() => setShowAddTrack(true)} className="text-[10px] font-mono tracking-widest px-4 py-1.5 border border-[#00d4ff]/40 text-[#00d4ff] hover:bg-[#00d4ff]/10 rounded transition-colors">
                + ADD TRACK
              </button>
            )}
          </div>
          {tracks.length === 0 ? (
            <div className="text-center py-12 text-gray-600 text-[11px] font-mono tracking-widest">NO TRACKS</div>
          ) : (
            <div className="border border-white/5 rounded overflow-hidden">
              <table className="w-full text-[10px] font-mono">
                <thead>
                  <tr className="border-b border-white/5 text-gray-600 tracking-widest">
                    <th className="text-left px-4 py-2 w-12">#</th>
                    <th className="text-left px-4 py-2">TITLE</th>
                    <th className="text-left px-4 py-2">DURATION</th>
                    <th className="text-left px-4 py-2">ISRC</th>
                  </tr>
                </thead>
                <tbody>
                  {tracks
                    .slice()
                    .sort((a: any, b: any) => (a.track_number ?? 0) - (b.track_number ?? 0))
                    .map((track: any) => (
                      <tr key={track.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-2 text-gray-600">{track.track_number ?? '—'}</td>
                        <td className="px-4 py-2 text-gray-300">
                          {track.song_title ?? track.title ?? track.song_id ?? '—'}
                          {track.is_explicit && (
                            <span className="ml-2 text-[8px] px-1 py-0.5 rounded bg-red-500/10 text-red-400">E</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-gray-500">{fmtDuration(track.duration_seconds)}</td>
                        <td className="px-4 py-2">
                          {track.isrc ? (
                            <span className="text-[#00ff41]">✓ {track.isrc}</span>
                          ) : (
                            <span className="text-red-500/50">✗</span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ARTWORK */}
      {activeTab === 'ARTWORK' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            {canWrite && (
              <button onClick={() => setShowAddArtwork(true)} className="text-[10px] font-mono tracking-widest px-4 py-1.5 border border-[#00d4ff]/40 text-[#00d4ff] hover:bg-[#00d4ff]/10 rounded transition-colors">
                + ADD ARTWORK
              </button>
            )}
          </div>
          {artworks.length === 0 ? (
            <div className="text-center py-12 text-gray-600 text-[11px] font-mono tracking-widest">NO ARTWORK</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {artworks.map((art: any) => (
                <div key={art.id} className="border border-white/5 rounded overflow-hidden">
                  {art.image_url ? (
                    <img src={art.image_url} alt={art.artwork_type} className="w-full aspect-square object-cover" />
                  ) : (
                    <div className="w-full aspect-square bg-[#111] flex items-center justify-center text-gray-700 text-[10px] font-mono">NO IMAGE</div>
                  )}
                  <div className="p-2">
                    <TypeBadge type={art.artwork_type} />
                    {(art.width || art.height) && (
                      <div className="text-[9px] font-mono text-gray-600 mt-1">{art.width ?? '?'} × {art.height ?? '?'}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* IDENTIFIERS */}
      {activeTab === 'IDENTIFIERS' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            {canWrite && (
              <button onClick={() => setShowAddIdentifier(true)} className="text-[10px] font-mono tracking-widest px-4 py-1.5 border border-[#00d4ff]/40 text-[#00d4ff] hover:bg-[#00d4ff]/10 rounded transition-colors">
                + ADD IDENTIFIER
              </button>
            )}
          </div>
          {identifiers.length === 0 ? (
            <div className="text-center py-12 text-gray-600 text-[11px] font-mono tracking-widest">NO IDENTIFIERS</div>
          ) : (
            <div className="space-y-2">
              {identifiers.map((ident: any) => (
                <div key={ident.id} className="border border-white/5 rounded p-4 flex items-center gap-4">
                  <TypeBadge type={ident.identifier_type} />
                  <div className="flex-1 font-mono text-[12px] text-gray-300">{ident.value}</div>
                  <div className="text-[10px] font-mono text-gray-600">{ident.territory ?? 'WW'}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <AddTrackModal isOpen={showAddTrack} onClose={() => setShowAddTrack(false)} releaseId={id} onSuccess={() => showToast('Track added')} />
      <AddArtworkModal isOpen={showAddArtwork} onClose={() => setShowAddArtwork(false)} releaseId={id} onSuccess={() => showToast('Artwork added')} />
      <AddIdentifierModal isOpen={showAddIdentifier} onClose={() => setShowAddIdentifier(false)} releaseId={id} onSuccess={() => showToast('Identifier added')} />
      {showEdit && (
        <EditReleaseModal isOpen={showEdit} onClose={() => setShowEdit(false)} release={release} onSuccess={() => showToast('Release updated')} />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  )
}
