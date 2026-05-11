import { useEffect, useState, useCallback } from 'react'
import DataTable from '../components/DataTable'
import EmptyState from '../components/EmptyState'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import Modal, { Field, Input, Select, Textarea } from '../components/Modal'
import Toast from '../components/Toast'
import { contentIdeas, catalog, isCriticalError } from '../api/client'

function normalise(raw: any): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw
  for (const key of ['contentIdeas', 'content_ideas', 'ideas', 'items', 'data']) {
    if (Array.isArray(raw?.[key])) return raw[key]
  }
  return raw ? [raw] : []
}

interface SongOption { id: string; title: string }

const STATUS_COLORS: Record<string, string> = {
  idea:      'text-gray-400',
  scripted:  'text-[#00d4ff]',
  recorded:  'text-yellow-400',
  edited:    'text-purple-400',
  scheduled: 'text-orange-400',
  posted:    'text-[#00ff41]',
}

const EMPTY_FORM = {
  content_type: '' as '' | 'short_video' | 'interview' | 'post' | 'thread' | 'live_script' | 'reel' | 'tiktok' | 'youtube_short',
  song_id: '',
  hook: '',
  platform: '',
  status: '',
  caption: '',
  scheduled_date: '',
}

export default function ContentIdeas() {
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
      const res = await contentIdeas.list()
      setData(res.data)
    } catch (err: any) {
      if (isCriticalError(err)) {
        setError(err.response?.data?.message || err.message || 'Failed to load content ideas')
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
    } catch {
      setSongList([])
    }
  }

  const handleSubmit = async () => {
    if (!form.content_type) { setToast({ message: 'Content type is required', type: 'error' }); return }

    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        content_type: form.content_type,
      }
      if (form.song_id)        body.song_id        = form.song_id
      if (form.hook)           body.hook           = form.hook.trim()
      if (form.platform)       body.platform       = form.platform.trim()
      if (form.status)         body.status         = form.status
      if (form.caption)        body.caption        = form.caption.trim()
      if (form.scheduled_date) body.scheduled_date = form.scheduled_date

      await contentIdeas.create(body)
      setModalOpen(false)
      setToast({ message: 'Content idea created successfully', type: 'success' })
      fetchData()
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || 'Failed to create content idea', type: 'error' })
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
            <div className="w-1 h-6 bg-fuchsia-400 rounded-full" />
            <h1 className="text-xl font-bold font-mono text-fuchsia-400 tracking-[0.2em]">
              CONTENT IDEAS
            </h1>
          </div>
          <p className="text-gray-600 text-[11px] font-mono tracking-[0.2em] ml-4">CREATIVE CONTENT PIPELINE</p>
        </div>
        <div className="flex items-center gap-3">
          {!loading && !error && data && (
            <div className="text-fuchsia-400/50 text-[10px] font-mono border border-fuchsia-400/20 rounded px-3 py-1.5 tracking-widest">
              {items.length} IDEAS
            </div>
          )}
          <button
            onClick={openModal}
            className="text-[10px] font-mono tracking-widest px-4 py-1.5 border border-fuchsia-400/40 text-fuchsia-400 hover:bg-fuchsia-400/10 rounded transition-colors"
          >
            + CREATE IDEA
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-24">
          <LoadingSpinner text="LOADING CONTENT IDEAS..." />
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
              icon="◈"
              title="No content signals available"
              message="No content ideas have been added yet."
              hint='Use the CREATE IDEA button above to log your first content idea.'
              color="fuchsia"
            />
          )}
        </div>
      )}

      {/* Create Content Idea Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => !submitting && setModalOpen(false)}
        title="CREATE CONTENT IDEA"
        subtitle="ADD TO CONTENT PIPELINE"
        color="fuchsia"
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
              className="text-[10px] font-mono tracking-widest px-5 py-2 border border-fuchsia-400/40 text-fuchsia-400 hover:bg-fuchsia-400/10 rounded transition-colors disabled:opacity-50"
            >
              {submitting ? 'SAVING...' : 'CREATE IDEA'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Content Type" required>
            <Select value={form.content_type} onChange={set('content_type')} autoFocus>
              <option value="">Select type...</option>
              <option value="short_video">SHORT VIDEO</option>
              <option value="reel">REEL</option>
              <option value="tiktok">TIKTOK</option>
              <option value="youtube_short">YOUTUBE SHORT</option>
              <option value="post">POST</option>
              <option value="thread">THREAD</option>
              <option value="interview">INTERVIEW</option>
              <option value="live_script">LIVE SCRIPT</option>
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Platform">
              <Input value={form.platform} onChange={set('platform')} placeholder="e.g. Instagram, TikTok" />
            </Field>
            <Field label="Status">
              <Select value={form.status} onChange={set('status')}>
                <option value="">Select status...</option>
                <option value="idea">IDEA</option>
                <option value="scripted">SCRIPTED</option>
                <option value="recorded">RECORDED</option>
                <option value="edited">EDITED</option>
                <option value="scheduled">SCHEDULED</option>
                <option value="posted">POSTED</option>
              </Select>
            </Field>
          </div>

          <Field label="Linked Song" hint="Optional — link to a specific song">
            <Select value={form.song_id} onChange={set('song_id')}>
              <option value="">No song linked...</option>
              {songList.map(s => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </Select>
          </Field>

          <Field label="Hook">
            <Input value={form.hook} onChange={set('hook')} placeholder="Opening hook or angle for this content" />
          </Field>

          <Field label="Caption">
            <Textarea value={form.caption} onChange={set('caption')} placeholder="Post caption or script notes..." rows={3} />
          </Field>

          <Field label="Scheduled Date">
            <Input value={form.scheduled_date} onChange={set('scheduled_date')} type="date" />
          </Field>
        </div>
      </Modal>

      {toast && (
        <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      )}
    </div>
  )
}
