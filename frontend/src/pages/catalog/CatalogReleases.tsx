import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { catalog } from '../../api/catalog'
import LoadingSpinner from '../../components/LoadingSpinner'
import ErrorMessage from '../../components/ErrorMessage'
import Modal, { Field, Input, Select } from '../../components/Modal'
import Toast from '../../components/Toast'
import { useAuthStore } from '../../store/authStore'

// ── Helpers ───────────────────────────────────────────────────────────────────

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
    type === 'single'      ? 'bg-[#00d4ff]/10 text-[#00d4ff]' :
    type === 'album'       ? 'bg-purple-500/10 text-purple-400' :
    type === 'ep'          ? 'bg-orange-500/10 text-orange-400' :
    type === 'mixtape'     ? 'bg-yellow-400/10 text-yellow-400' :
    type === 'compilation' ? 'bg-gray-500/20 text-gray-400' :
                             'bg-gray-800 text-gray-500'
  return <span className={`text-[9px] font-mono tracking-widest px-2 py-0.5 rounded ${cls}`}>{type.toUpperCase()}</span>
}

// ── Create Modal ──────────────────────────────────────────────────────────────

interface CreateReleaseModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  artists: any[]
}

function CreateReleaseModal({ isOpen, onClose, onSuccess, artists }: CreateReleaseModalProps) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    artist_id: '',
    title: '',
    catalog_release_type: '',
    release_date: '',
    preorder_date: '',
    upc: '',
    distributor: '',
    cover_art_url: '',
  })

  const mutation = useMutation({
    mutationFn: () => catalog.releases.create(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['catalog-releases'] })
      onSuccess()
      onClose()
      setForm({ artist_id: '', title: '', catalog_release_type: '', release_date: '', preorder_date: '', upc: '', distributor: '', cover_art_url: '' })
    },
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="NEW RELEASE"
      subtitle="Add a release to the catalog"
      color="cyan"
      footer={
        <>
          <button onClick={onClose} disabled={mutation.isPending} className="text-[10px] font-mono tracking-widest px-4 py-2 border border-white/10 text-gray-500 hover:text-gray-400 rounded disabled:opacity-50">CANCEL</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.artist_id || !form.title} className="text-[10px] font-mono tracking-widest px-5 py-2 border border-[#00ff41]/40 text-[#00ff41] hover:bg-[#00ff41]/10 rounded disabled:opacity-50">
            {mutation.isPending ? 'SAVING...' : 'SAVE'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Artist" required>
          <Select value={form.artist_id} onChange={set('artist_id')}>
            <option value="">Select artist...</option>
            {artists.map((a: any) => (
              <option key={a.id} value={a.id}>{a.stage_name}</option>
            ))}
          </Select>
        </Field>
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
          <Input value={form.distributor} onChange={set('distributor')} placeholder="e.g. DistroKid, TuneCore" />
        </Field>
        <Field label="Cover Art URL">
          <Input value={form.cover_art_url} onChange={set('cover_art_url')} placeholder="https://..." />
        </Field>
        {mutation.error && (
          <p className="text-red-400 text-[11px] font-mono">{(mutation.error as any)?.message ?? 'Error saving release'}</p>
        )}
      </div>
    </Modal>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CatalogReleases() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const canWrite = ['owner', 'admin', 'editor', 'team'].includes(user?.role ?? '')

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => setToast({ message, type }), [])

  const [artistFilter, setArtistFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const { data: artistsData } = useQuery({
    queryKey: ['catalog-artists-all'],
    queryFn: () => catalog.artists.list().then(r => r.data),
  })

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['catalog-releases', artistFilter, typeFilter, statusFilter],
    queryFn: () => {
      const params: any = {}
      if (artistFilter) params.artist_id = artistFilter
      if (typeFilter) params.type = typeFilter
      if (statusFilter) params.status = statusFilter
      return catalog.releases.list(params).then(r => r.data)
    },
  })

  const artists: any[] = artistsData?.data ?? artistsData ?? []
  const releases: any[] = data?.data ?? data ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-1 h-6 bg-[#00ff41] rounded-full" />
            <h1 className="text-xl font-bold font-mono text-[#00ff41] tracking-[0.2em]">RELEASES</h1>
          </div>
          <p className="text-gray-600 text-[11px] font-mono tracking-[0.2em] ml-4">CATALOG / RELEASE CATALOG</p>
        </div>
        {canWrite && (
          <button
            onClick={() => setShowCreate(true)}
            className="text-[10px] font-mono tracking-widest px-4 py-1.5 border border-[#00ff41]/40 text-[#00ff41] hover:bg-[#00ff41]/10 rounded transition-colors"
          >
            + NEW RELEASE
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={artistFilter}
          onChange={e => setArtistFilter(e.target.value)}
          className="bg-[#0d0d0d] border border-white/10 rounded px-3 py-2 text-[12px] font-mono text-gray-300 focus:outline-none focus:border-white/25 transition-colors"
        >
          <option value="">ALL ARTISTS</option>
          {artists.map((a: any) => (
            <option key={a.id} value={a.id}>{a.stage_name}</option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="bg-[#0d0d0d] border border-white/10 rounded px-3 py-2 text-[12px] font-mono text-gray-300 focus:outline-none focus:border-white/25 transition-colors"
        >
          <option value="">ALL TYPES</option>
          <option value="single">SINGLE</option>
          <option value="ep">EP</option>
          <option value="album">ALBUM</option>
          <option value="mixtape">MIXTAPE</option>
          <option value="compilation">COMPILATION</option>
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="bg-[#0d0d0d] border border-white/10 rounded px-3 py-2 text-[12px] font-mono text-gray-300 focus:outline-none focus:border-white/25 transition-colors"
        >
          <option value="">ALL STATUSES</option>
          <option value="draft">DRAFT</option>
          <option value="scheduled">SCHEDULED</option>
          <option value="released">RELEASED</option>
          <option value="archived">ARCHIVED</option>
        </select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-24"><LoadingSpinner text="LOADING..." /></div>
      ) : isError ? (
        <ErrorMessage message="Failed to load releases" onRetry={() => refetch()} />
      ) : releases.length === 0 ? (
        <div className="text-center py-12 text-gray-600 text-[11px] font-mono tracking-widest">NO RELEASES FOUND</div>
      ) : (
        <div className="border border-white/5 rounded overflow-hidden">
          <table className="w-full text-[10px] font-mono">
            <thead>
              <tr className="border-b border-white/5 text-gray-600 tracking-widest">
                <th className="text-left px-4 py-2">TITLE</th>
                <th className="text-left px-4 py-2">ARTIST</th>
                <th className="text-left px-4 py-2">TYPE</th>
                <th className="text-left px-4 py-2">RELEASE DATE</th>
                <th className="text-left px-4 py-2">STATUS</th>
                <th className="text-left px-4 py-2">UPC</th>
                <th className="text-left px-4 py-2">TRACKS</th>
              </tr>
            </thead>
            <tbody>
              {releases.map((release: any) => (
                <tr
                  key={release.id}
                  onClick={() => navigate('/catalog/releases/' + release.id)}
                  className="border-b border-white/[0.03] hover:bg-white/[0.02] cursor-pointer transition-colors"
                >
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      {release.cover_art_url && (
                        <img src={release.cover_art_url} alt={release.title} className="w-6 h-6 rounded object-cover border border-white/10 flex-shrink-0" />
                      )}
                      <span className="text-gray-300 font-medium">{release.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-gray-500">{release.artist_name ?? '—'}</td>
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
                  <td className="px-4 py-2 text-gray-500">{release.track_count ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateReleaseModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={() => showToast('Release created successfully')}
        artists={artists}
      />

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  )
}
