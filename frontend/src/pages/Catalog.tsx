import { useEffect, useState, useCallback } from 'react'
import DataTable from '../components/DataTable'
import EmptyState from '../components/EmptyState'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import Modal, { Field, Input, Select } from '../components/Modal'
import Toast from '../components/Toast'
import { catalog, artists, isCriticalError } from '../api/client'

function normalise(raw: any): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw
  for (const key of ['songs', 'tracks', 'items', 'data', 'catalog']) {
    if (Array.isArray(raw?.[key])) return raw[key]
  }
  return raw ? [raw] : []
}

interface ArtistOption { id: string; stage_name: string }

const EMPTY_FORM = {
  title: '',
  artist_id: '',
  genre: '',
  bpm: '',
  key: '',
  mood: '',
  energy_level: '',
  release_status: '',
  sync_ready: false,
  explicit: false,
}

export default function Catalog() {
  const [data,        setData]        = useState<any>(null)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const [modalOpen,   setModalOpen]   = useState(false)
  const [form,        setForm]        = useState(EMPTY_FORM)
  const [submitting,  setSubmitting]  = useState(false)
  const [artistList,  setArtistList]  = useState<ArtistOption[]>([])
  const [toast,       setToast]       = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await catalog.songs()
      setData(res.data)
    } catch (err: any) {
      if (isCriticalError(err)) {
        setError(err.response?.data?.message || err.message || 'Failed to load catalog')
      } else {
        setData([])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const openModal = async () => {
    setForm(EMPTY_FORM)
    setModalOpen(true)
    try {
      const res = await artists.list()
      const list = Array.isArray(res.data) ? res.data : (res.data?.artists ?? res.data?.data ?? [])
      setArtistList(list)
      if (list.length === 1) setForm(f => ({ ...f, artist_id: list[0].id }))
    } catch {
      setArtistList([])
    }
  }

  const handleSubmit = async () => {
    if (!form.title.trim()) { setToast({ message: 'Song title is required', type: 'error' }); return }
    if (!form.artist_id)    { setToast({ message: 'Artist is required', type: 'error' }); return }

    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        title:      form.title.trim(),
        artist_id:  form.artist_id,
        sync_ready: form.sync_ready,
        explicit:   form.explicit,
      }
      if (form.genre)          body.genre          = form.genre.trim()
      if (form.bpm)            body.bpm            = parseInt(form.bpm, 10)
      if (form.key)            body.key            = form.key
      if (form.mood)           body.mood           = form.mood.trim()
      if (form.energy_level)   body.energy_level   = parseInt(form.energy_level, 10)
      if (form.release_status) body.release_status = form.release_status

      await catalog.create(body)
      setModalOpen(false)
      setToast({ message: 'Song created successfully', type: 'success' })
      fetchData()
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || 'Failed to create song', type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  const set = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<any>) =>
    setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const items = normalise(data)

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-1 h-6 bg-[#00ff41] rounded-full" />
            <h1 className="text-xl font-bold font-mono text-[#00ff41] tracking-[0.2em] text-glow-green">
              CATALOG
            </h1>
          </div>
          <p className="text-gray-600 text-[11px] font-mono tracking-[0.2em] ml-4">SONG REGISTRY</p>
        </div>
        <div className="flex items-center gap-3">
          {!loading && !error && data && (
            <div className="text-[#00ff41]/50 text-[10px] font-mono border border-[#00ff41]/20 rounded px-3 py-1.5 tracking-widest">
              {items.length} TRACKS
            </div>
          )}
          <button
            onClick={openModal}
            className="text-[10px] font-mono tracking-widest px-4 py-1.5 border border-[#00ff41]/40 text-[#00ff41] hover:bg-[#00ff41]/10 rounded transition-colors"
          >
            + CREATE SONG
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-24">
          <LoadingSpinner text="LOADING CATALOG..." />
        </div>
      )}

      {error && <ErrorMessage message={error} onRetry={fetchData} />}

      {!loading && !error && data && (
        items.length > 0 ? (
          <DataTable data={items} color="green" />
        ) : (
          <EmptyState
            icon="◉"
            title="No catalog entries yet"
            message="Add your first song to begin building your registered catalog."
            hint='Use the CREATE SONG button above to add your first track.'
            color="green"
          />
        )
      )}

      {/* Create Song Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => !submitting && setModalOpen(false)}
        title="CREATE SONG"
        subtitle="ADD TO CATALOG REGISTRY"
        color="green"
        footer={
          <>
            <button
              onClick={() => setModalOpen(false)}
              disabled={submitting}
              className="text-[10px] font-mono tracking-widest px-4 py-2 border border-white/10 text-gray-500 hover:text-gray-400 rounded transition-colors disabled:opacity-50"
            >
              CANCEL
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="text-[10px] font-mono tracking-widest px-5 py-2 border border-[#00ff41]/40 text-[#00ff41] hover:bg-[#00ff41]/10 rounded transition-colors disabled:opacity-50"
            >
              {submitting ? 'SAVING...' : 'CREATE SONG'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Song Title" required>
            <Input
              value={form.title}
              onChange={set('title')}
              placeholder="Enter song title"
              autoFocus
            />
          </Field>

          <Field label="Artist" required hint={artistList.length === 0 ? 'No artist profile found — create one first via API' : undefined}>
            <Select value={form.artist_id} onChange={set('artist_id')}>
              <option value="">Select artist...</option>
              {artistList.map(a => (
                <option key={a.id} value={a.id}>{a.stage_name || a.id}</option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Genre">
              <Input value={form.genre} onChange={set('genre')} placeholder="e.g. Afrobeats" />
            </Field>
            <Field label="BPM">
              <Input value={form.bpm} onChange={set('bpm')} placeholder="e.g. 120" type="number" min="1" max="300" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Key">
              <Select value={form.key} onChange={set('key')}>
                <option value="">Select key...</option>
                {['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'].map(k => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </Select>
            </Field>
            <Field label="Energy Level (1–10)">
              <Input value={form.energy_level} onChange={set('energy_level')} placeholder="1–10" type="number" min="1" max="10" />
            </Field>
          </div>

          <Field label="Mood">
            <Input value={form.mood} onChange={set('mood')} placeholder="e.g. Energetic, Melancholic" />
          </Field>

          <Field label="Release Status">
            <Select value={form.release_status} onChange={set('release_status')}>
              <option value="">Select status...</option>
              <option value="draft">DRAFT</option>
              <option value="registered">REGISTERED</option>
              <option value="distributed">DISTRIBUTED</option>
              <option value="released">RELEASED</option>
              <option value="archived">ARCHIVED</option>
            </Select>
          </Field>

          <div className="flex items-center gap-6 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.sync_ready}
                onChange={set('sync_ready')}
                className="w-3.5 h-3.5 accent-[#00ff41]"
              />
              <span className="text-[11px] font-mono text-gray-500 tracking-widest">SYNC READY</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.explicit}
                onChange={set('explicit')}
                className="w-3.5 h-3.5 accent-[#00ff41]"
              />
              <span className="text-[11px] font-mono text-gray-500 tracking-widest">EXPLICIT</span>
            </label>
          </div>
        </div>
      </Modal>

      {toast && (
        <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      )}
    </div>
  )
}
