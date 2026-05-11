import { useEffect, useState, useCallback } from 'react'
import DataTable from '../components/DataTable'
import EmptyState from '../components/EmptyState'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import Modal, { Field, Input, Select } from '../components/Modal'
import Toast from '../components/Toast'
import { releases, catalog, isCriticalError } from '../api/client'

function normalise(raw: any): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw
  for (const key of ['releases', 'items', 'data']) {
    if (Array.isArray(raw?.[key])) return raw[key]
  }
  return raw ? [raw] : []
}

interface SongOption { id: string; title: string }

const STATUS_COLORS: Record<string, string> = {
  planning:  'text-yellow-400',
  submitted: 'text-[#00d4ff]',
  approved:  'text-purple-400',
  live:      'text-[#00ff41]',
}

const EMPTY_FORM = {
  song_id: '',
  release_title: '',
  release_type: 'single' as 'single' | 'ep' | 'album',
  distributor: '',
  release_date: '',
  status: '',
  upc: '',
}

export default function Releases() {
  const [data,       setData]       = useState<any>(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const [modalOpen,  setModalOpen]  = useState(false)
  const [form,       setForm]       = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [songList,   setSongList]   = useState<SongOption[]>([])
  const [toast,      setToast]      = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await releases.list()
      setData(res.data)
    } catch (err: any) {
      if (isCriticalError(err)) {
        setError(err.response?.data?.message || err.message || 'Failed to load releases')
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
      const res = await catalog.songs()
      const list = Array.isArray(res.data) ? res.data : (res.data?.songs ?? res.data?.data ?? [])
      setSongList(list)
      if (list.length === 1) setForm(f => ({ ...f, song_id: list[0].id }))
    } catch {
      setSongList([])
    }
  }

  const handleSubmit = async () => {
    if (!form.release_title.trim()) { setToast({ message: 'Release title is required', type: 'error' }); return }
    if (!form.song_id)              { setToast({ message: 'Song selection is required', type: 'error' }); return }
    if (!form.release_type)         { setToast({ message: 'Release type is required', type: 'error' }); return }

    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        song_id:      form.song_id,
        release_title: form.release_title.trim(),
        release_type:  form.release_type,
      }
      if (form.distributor)  body.distributor  = form.distributor.trim()
      if (form.release_date) body.release_date = form.release_date
      if (form.status)       body.status       = form.status
      if (form.upc)          body.upc          = form.upc.trim()

      await releases.create(body)
      setModalOpen(false)
      setToast({ message: 'Release created successfully', type: 'success' })
      fetchData()
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || 'Failed to create release', type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  const set = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<any>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const items = normalise(data)

  const statusCounts = items.reduce<Record<string, number>>((acc, item: any) => {
    const s = String(item.status ?? 'unknown').toLowerCase()
    acc[s] = (acc[s] || 0) + 1
    return acc
  }, {})

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-1 h-6 bg-[#00d4ff] rounded-full" />
            <h1 className="text-xl font-bold font-mono text-[#00d4ff] tracking-[0.2em] text-glow-cyan">
              RELEASES
            </h1>
          </div>
          <p className="text-gray-600 text-[11px] font-mono tracking-[0.2em] ml-4">RELEASE PIPELINE</p>
        </div>
        <div className="flex items-center gap-3">
          {!loading && !error && data && (
            <div className="text-[#00d4ff]/50 text-[10px] font-mono border border-[#00d4ff]/20 rounded px-3 py-1.5 tracking-widest">
              {items.length} RELEASES
            </div>
          )}
          <button
            onClick={openModal}
            className="text-[10px] font-mono tracking-widest px-4 py-1.5 border border-[#00d4ff]/40 text-[#00d4ff] hover:bg-[#00d4ff]/10 rounded transition-colors"
          >
            + CREATE RELEASE
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-24">
          <LoadingSpinner text="LOADING RELEASES..." />
        </div>
      )}

      {error && <ErrorMessage message={error} onRetry={fetchData} />}

      {!loading && !error && data && (
        <div className="space-y-5">
          {Object.keys(statusCounts).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(statusCounts).map(([status, count]) => (
                <div
                  key={status}
                  className={`text-[10px] font-mono border border-current/25 rounded px-3 py-1 tracking-widest ${STATUS_COLORS[status] ?? 'text-gray-500'}`}
                >
                  {status.toUpperCase()} · {count}
                </div>
              ))}
            </div>
          )}

          {items.length > 0 ? (
            <DataTable data={items} color="cyan" />
          ) : (
            <EmptyState
              icon="◎"
              title="No releases added yet"
              message="Create a release draft to start managing your release pipeline."
              hint='Use the CREATE RELEASE button above to add your first release.'
              color="cyan"
            />
          )}
        </div>
      )}

      {/* Create Release Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => !submitting && setModalOpen(false)}
        title="CREATE RELEASE"
        subtitle="ADD TO RELEASE PIPELINE"
        color="cyan"
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
              className="text-[10px] font-mono tracking-widest px-5 py-2 border border-[#00d4ff]/40 text-[#00d4ff] hover:bg-[#00d4ff]/10 rounded transition-colors disabled:opacity-50"
            >
              {submitting ? 'SAVING...' : 'CREATE RELEASE'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Release Title" required>
            <Input
              value={form.release_title}
              onChange={set('release_title')}
              placeholder="Enter release title"
              autoFocus
            />
          </Field>

          <Field label="Linked Song" required hint={songList.length === 0 ? 'No songs in catalog — create a song first' : undefined}>
            <Select value={form.song_id} onChange={set('song_id')}>
              <option value="">Select song...</option>
              {songList.map(s => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Release Type" required>
              <Select value={form.release_type} onChange={set('release_type')}>
                <option value="single">SINGLE</option>
                <option value="ep">EP</option>
                <option value="album">ALBUM</option>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={form.status} onChange={set('status')}>
                <option value="">Select status...</option>
                <option value="planning">PLANNING</option>
                <option value="submitted">SUBMITTED</option>
                <option value="approved">APPROVED</option>
                <option value="live">LIVE</option>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Distributor">
              <Input value={form.distributor} onChange={set('distributor')} placeholder="e.g. DistroKid" />
            </Field>
            <Field label="UPC">
              <Input value={form.upc} onChange={set('upc')} placeholder="Universal Product Code" />
            </Field>
          </div>

          <Field label="Release Date">
            <Input value={form.release_date} onChange={set('release_date')} type="date" />
          </Field>
        </div>
      </Modal>

      {toast && (
        <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      )}
    </div>
  )
}
