import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { catalog } from '../../api/catalog'
import LoadingSpinner from '../../components/LoadingSpinner'
import ErrorMessage from '../../components/ErrorMessage'
import Modal, { Field, Input, Textarea } from '../../components/Modal'
import ConfirmModal from '../../components/ConfirmModal'
import Toast from '../../components/Toast'
import { useAuthStore } from '../../store/authStore'

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status?: string }) {
  if (!status) return null
  const cls =
    status === 'active'   ? 'bg-[#00ff41]/10 text-[#00ff41]' :
    status === 'inactive' ? 'bg-yellow-400/10 text-yellow-400' :
                            'bg-gray-800 text-gray-500'
  return (
    <span className={`text-[9px] font-mono tracking-widest px-2 py-0.5 rounded ${cls}`}>
      {status.toUpperCase()}
    </span>
  )
}

// ── Create Modal ──────────────────────────────────────────────────────────────

interface CreateModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

function CreateArtistModal({ isOpen, onClose, onSuccess }: CreateModalProps) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    stage_name: '',
    legal_name: '',
    biography: '',
    genres: '',
    countries: '',
    profile_image_url: '',
  })

  const mutation = useMutation({
    mutationFn: () => catalog.artists.create({
      ...form,
      genres: form.genres ? form.genres.split(',').map(s => s.trim()).filter(Boolean) : [],
      countries: form.countries ? form.countries.split(',').map(s => s.trim()).filter(Boolean) : [],
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['catalog-artists'] })
      onSuccess()
      onClose()
      setForm({ stage_name: '', legal_name: '', biography: '', genres: '', countries: '', profile_image_url: '' })
    },
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="NEW ARTIST"
      subtitle="Add an artist to the catalog"
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
        <Field label="Genres" hint="Comma-separated: Hip-Hop, R&B, Pop">
          <Input value={form.genres} onChange={set('genres')} placeholder="e.g. Hip-Hop, R&B" />
        </Field>
        <Field label="Countries" hint="Comma-separated: US, UK">
          <Input value={form.countries} onChange={set('countries')} placeholder="e.g. US, UK" />
        </Field>
        <Field label="Profile Image URL">
          <Input value={form.profile_image_url} onChange={set('profile_image_url')} placeholder="https://..." />
        </Field>
        {mutation.error && (
          <p className="text-red-400 text-[11px] font-mono">{(mutation.error as any)?.message ?? 'Error saving artist'}</p>
        )}
      </div>
    </Modal>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CatalogArtists() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const canWrite = ['owner', 'admin', 'editor', 'team'].includes(user?.role ?? '')
  const canDelete = ['owner', 'admin'].includes(user?.role ?? '')

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => setToast({ message, type }), [])

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['catalog-artists', search],
    queryFn: () => catalog.artists.list(search ? { search } : undefined).then(r => r.data),
  })

  const qc = useQueryClient()
  const deleteMutation = useMutation({
    mutationFn: (id: string) => catalog.artists.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['catalog-artists'] })
      showToast('Artist deleted')
      setDeleteTarget(null)
    },
    onError: () => showToast('Failed to delete artist', 'error'),
  })

  const artists: any[] = data?.data ?? data ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-1 h-6 bg-[#00ff41] rounded-full" />
            <h1 className="text-xl font-bold font-mono text-[#00ff41] tracking-[0.2em]">ARTISTS</h1>
          </div>
          <p className="text-gray-600 text-[11px] font-mono tracking-[0.2em] ml-4">CATALOG / ARTIST ROSTER</p>
        </div>
        {canWrite && (
          <button
            onClick={() => setShowCreate(true)}
            className="text-[10px] font-mono tracking-widest px-4 py-1.5 border border-[#00ff41]/40 text-[#00ff41] hover:bg-[#00ff41]/10 rounded transition-colors"
          >
            + NEW ARTIST
          </button>
        )}
      </div>

      {/* Search */}
      <div>
        <input
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          placeholder="SEARCH ARTISTS..."
          className="bg-[#0d0d0d] border border-white/10 rounded px-3 py-2 text-[12px] font-mono text-gray-300 placeholder-gray-700 focus:outline-none focus:border-white/25 transition-colors w-full max-w-sm"
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-24"><LoadingSpinner text="LOADING..." /></div>
      ) : isError ? (
        <ErrorMessage message="Failed to load artists" onRetry={() => refetch()} />
      ) : artists.length === 0 ? (
        <div className="text-center py-12 text-gray-600 text-[11px] font-mono tracking-widest">NO ARTISTS FOUND</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {artists.map((artist: any) => (
            <div
              key={artist.id}
              onClick={() => navigate('/catalog/artists/' + artist.id)}
              className="border border-white/5 rounded p-4 hover:border-[#00ff41]/20 hover:bg-white/[0.02] cursor-pointer transition-all group"
            >
              {/* Avatar */}
              <div className="w-12 h-12 rounded-full overflow-hidden border border-white/10 mb-3 bg-[#111] flex items-center justify-center">
                {artist.profile_image_url ? (
                  <img src={artist.profile_image_url} alt={artist.stage_name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] font-mono text-gray-600">{(artist.stage_name ?? '?')[0]?.toUpperCase()}</span>
                )}
              </div>

              {/* Name + Status */}
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-[13px] font-mono font-bold text-gray-200 group-hover:text-white truncate">{artist.stage_name}</p>
                <StatusBadge status={artist.status} />
              </div>

              {/* Legal name */}
              {artist.legal_name && (
                <p className="text-[10px] font-mono text-gray-600 truncate mb-2">{artist.legal_name}</p>
              )}

              {/* Genre chip */}
              {Array.isArray(artist.genres) && artist.genres.length > 0 && (
                <span className="text-[9px] font-mono tracking-widest px-2 py-0.5 rounded bg-[#00d4ff]/10 text-[#00d4ff] mr-1">
                  {artist.genres[0]}
                </span>
              )}
              {artist.country && (
                <span className="text-[9px] font-mono tracking-widest px-2 py-0.5 rounded bg-white/5 text-gray-500">
                  {artist.country}
                </span>
              )}

              {/* Stats */}
              <div className="flex gap-4 mt-3 pt-3 border-t border-white/5">
                <div>
                  <div className="text-[9px] font-mono text-gray-600 tracking-widest">SONGS</div>
                  <div className="text-[13px] font-mono text-[#00ff41]">{artist.song_count ?? 0}</div>
                </div>
                <div>
                  <div className="text-[9px] font-mono text-gray-600 tracking-widest">RELEASES</div>
                  <div className="text-[13px] font-mono text-[#00ff41]">{artist.release_count ?? 0}</div>
                </div>
              </div>

              {/* Delete */}
              {canDelete && (
                <button
                  onClick={e => { e.stopPropagation(); setDeleteTarget(artist) }}
                  className="mt-3 text-[9px] font-mono text-red-500/40 hover:text-red-400 transition-colors tracking-widest"
                >
                  DELETE
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <CreateArtistModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={() => showToast('Artist created successfully')}
      />

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="DELETE ARTIST"
        message={`Delete "${deleteTarget?.stage_name}"? This action cannot be undone.`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteMutation.isPending}
      />

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  )
}
