import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
    status === 'active'   ? 'bg-[#00ff41]/10 text-[#00ff41]' :
    status === 'inactive' ? 'bg-yellow-400/10 text-yellow-400' :
    status === 'archived' ? 'bg-gray-800 text-gray-500' :
    status === 'draft'    ? 'bg-gray-800 text-gray-500' :
                            'bg-gray-800 text-gray-500'
  return <span className={`text-[9px] font-mono tracking-widest px-2 py-0.5 rounded ${cls}`}>{status.toUpperCase()}</span>
}

// ── Create Modal ──────────────────────────────────────────────────────────────

interface CreateSongModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  artists: any[]
}

function CreateSongModal({ isOpen, onClose, onSuccess, artists }: CreateSongModalProps) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    artist_id: '',
    title: '',
    genre: '',
    bpm: '',
    key: '',
    duration_seconds: '',
    language: '',
    explicit: false,
    mood: '',
    tags: '',
  })

  const mutation = useMutation({
    mutationFn: () => catalog.songs.create({
      ...form,
      bpm: form.bpm ? Number(form.bpm) : undefined,
      duration_seconds: form.duration_seconds ? Number(form.duration_seconds) : undefined,
      tags: form.tags ? form.tags.split(',').map(s => s.trim()).filter(Boolean) : [],
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['catalog-songs'] })
      onSuccess()
      onClose()
      setForm({ artist_id: '', title: '', genre: '', bpm: '', key: '', duration_seconds: '', language: '', explicit: false, mood: '', tags: '' })
    },
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="NEW SONG"
      subtitle="Add a song to the catalog"
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
          <Input value={form.title} onChange={set('title')} placeholder="Song title" />
        </Field>
        <Field label="Genre">
          <Input value={form.genre} onChange={set('genre')} placeholder="e.g. Hip-Hop" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="BPM">
            <Input type="number" value={form.bpm} onChange={set('bpm')} placeholder="120" />
          </Field>
          <Field label="Key">
            <Input value={form.key} onChange={set('key')} placeholder="e.g. Am" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Duration (seconds)">
            <Input type="number" value={form.duration_seconds} onChange={set('duration_seconds')} placeholder="210" />
          </Field>
          <Field label="Language">
            <Input value={form.language} onChange={set('language')} placeholder="en" />
          </Field>
        </div>
        <Field label="Mood">
          <Input value={form.mood} onChange={set('mood')} placeholder="e.g. Melancholic" />
        </Field>
        <Field label="Tags" hint="Comma-separated">
          <Input value={form.tags} onChange={set('tags')} placeholder="e.g. summer, hype, radio" />
        </Field>
        <Field label="Explicit">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.explicit}
              onChange={e => setForm(f => ({ ...f, explicit: e.target.checked }))}
              className="accent-[#00ff41]"
            />
            <span className="text-[11px] font-mono text-gray-500">Contains explicit content</span>
          </label>
        </Field>
        {mutation.error && (
          <p className="text-red-400 text-[11px] font-mono">{(mutation.error as any)?.message ?? 'Error saving song'}</p>
        )}
      </div>
    </Modal>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CatalogSongs() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const canWrite = ['owner', 'admin', 'editor', 'team'].includes(user?.role ?? '')

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => setToast({ message, type }), [])

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [artistFilter, setArtistFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const { data: artistsData } = useQuery({
    queryKey: ['catalog-artists-all'],
    queryFn: () => catalog.artists.list().then(r => r.data),
  })

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['catalog-songs', search, artistFilter, statusFilter],
    queryFn: () => {
      const params: any = {}
      if (search) params.search = search
      if (artistFilter) params.artist_id = artistFilter
      if (statusFilter) params.status = statusFilter
      return catalog.songs.list(params).then(r => r.data)
    },
  })

  const artists: any[] = artistsData?.data ?? artistsData ?? []
  const songs: any[] = data?.data ?? data ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-1 h-6 bg-[#00ff41] rounded-full" />
            <h1 className="text-xl font-bold font-mono text-[#00ff41] tracking-[0.2em]">SONGS</h1>
          </div>
          <p className="text-gray-600 text-[11px] font-mono tracking-[0.2em] ml-4">CATALOG / SONG LIBRARY</p>
        </div>
        {canWrite && (
          <button
            onClick={() => setShowCreate(true)}
            className="text-[10px] font-mono tracking-widest px-4 py-1.5 border border-[#00ff41]/40 text-[#00ff41] hover:bg-[#00ff41]/10 rounded transition-colors"
          >
            + NEW SONG
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          placeholder="SEARCH SONGS..."
          className="bg-[#0d0d0d] border border-white/10 rounded px-3 py-2 text-[12px] font-mono text-gray-300 placeholder-gray-700 focus:outline-none focus:border-white/25 transition-colors w-full max-w-xs"
        />
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
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="bg-[#0d0d0d] border border-white/10 rounded px-3 py-2 text-[12px] font-mono text-gray-300 focus:outline-none focus:border-white/25 transition-colors"
        >
          <option value="">ALL STATUSES</option>
          <option value="active">ACTIVE</option>
          <option value="inactive">INACTIVE</option>
          <option value="draft">DRAFT</option>
          <option value="archived">ARCHIVED</option>
        </select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-24"><LoadingSpinner text="LOADING..." /></div>
      ) : isError ? (
        <ErrorMessage message="Failed to load songs" onRetry={() => refetch()} />
      ) : songs.length === 0 ? (
        <div className="text-center py-12 text-gray-600 text-[11px] font-mono tracking-widest">NO SONGS FOUND</div>
      ) : (
        <div className="border border-white/5 rounded overflow-hidden">
          <table className="w-full text-[10px] font-mono">
            <thead>
              <tr className="border-b border-white/5 text-gray-600 tracking-widest">
                <th className="text-left px-4 py-2">TITLE</th>
                <th className="text-left px-4 py-2">ARTIST</th>
                <th className="text-left px-4 py-2">BPM</th>
                <th className="text-left px-4 py-2">KEY</th>
                <th className="text-left px-4 py-2">DURATION</th>
                <th className="text-left px-4 py-2">STATUS</th>
                <th className="text-left px-4 py-2">ISRC</th>
                <th className="text-left px-4 py-2">ADDED</th>
              </tr>
            </thead>
            <tbody>
              {songs.map((song: any) => (
                <tr
                  key={song.id}
                  onClick={() => navigate('/catalog/songs/' + song.id)}
                  className="border-b border-white/[0.03] hover:bg-white/[0.02] cursor-pointer transition-colors"
                >
                  <td className="px-4 py-2 text-gray-300 font-medium">{song.title}</td>
                  <td className="px-4 py-2 text-gray-500">{song.artist_name ?? '—'}</td>
                  <td className="px-4 py-2 text-gray-500">{song.bpm ?? '—'}</td>
                  <td className="px-4 py-2 text-gray-500">{song.key ?? '—'}</td>
                  <td className="px-4 py-2 text-gray-500">{fmtDuration(song.duration_seconds)}</td>
                  <td className="px-4 py-2"><StatusBadge status={song.status} /></td>
                  <td className="px-4 py-2">
                    {song.isrc ? (
                      <span className="text-[#00ff41]">✓</span>
                    ) : (
                      <span className="text-red-500/50">✗</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-gray-600">{fmtDate(song.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateSongModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={() => showToast('Song created successfully')}
        artists={artists}
      />

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  )
}
