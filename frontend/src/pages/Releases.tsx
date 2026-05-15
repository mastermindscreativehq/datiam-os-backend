import { useEffect, useState, useCallback } from 'react'
import DataTable from '../components/DataTable'
import EmptyState from '../components/EmptyState'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import Modal, { Field, Input, Select } from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'
import Toast from '../components/Toast'
import ReleaseChecklistModal from '../components/ReleaseChecklistModal'
import ReleaseStateBadge, { type ReleaseState } from '../components/ReleaseStateBadge'
import { releases, artists, isCriticalError } from '../api/client'
import { useAuthStore } from '../store/authStore'

function normalise(raw: any): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw
  for (const key of ['releases', 'items', 'data']) {
    if (Array.isArray(raw?.[key])) return raw[key]
  }
  return raw ? [raw] : []
}

interface ArtistOption { id: string; stage_name: string }

// music_status colors (legacy display)
const STATUS_COLORS: Record<string, string> = {
  draft:     'text-yellow-400',
  scheduled: 'text-[#00d4ff]',
  released:  'text-[#00ff41]',
}

const EMPTY_FORM = {
  title: '',
  artist_id: '',
  type: 'single' as 'single' | 'ep' | 'album',
  distributor: '',
  release_date: '',
  status: 'draft' as '' | 'draft' | 'scheduled' | 'released',
  upc: '',
}

export default function Releases() {
  const { user } = useAuthStore()
  const canWrite  = ['owner', 'admin', 'editor', 'team'].includes(user?.role ?? '')
  const canDelete = ['owner', 'admin'].includes(user?.role ?? '')

  const [data,           setData]           = useState<any>(null)
  const [loading,        setLoading]        = useState(true)
  const [error,          setError]          = useState('')
  const [modalOpen,      setModalOpen]      = useState(false)
  const [editItem,       setEditItem]       = useState<Record<string, unknown> | null>(null)
  const [deleteItem,     setDeleteItem]     = useState<Record<string, unknown> | null>(null)
  const [form,           setForm]           = useState(EMPTY_FORM)
  const [submitting,     setSubmitting]     = useState(false)
  const [deleting,       setDeleting]       = useState(false)
  const [artistList,     setArtistList]     = useState<ArtistOption[]>([])
  const [toast,          setToast]          = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [checklistItem,  setChecklistItem]  = useState<Record<string, unknown> | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await releases.list()
      setData(res.data)
    } catch (err: any) {
      if (isCriticalError(err)) setError(err.response?.data?.message || 'Failed to load releases')
      else setData([])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const loadArtists = async () => {
    try {
      const res = await artists.list()
      const list = Array.isArray(res.data) ? res.data : (res.data?.artists ?? res.data?.data ?? [])
      setArtistList(list)
      return list
    } catch { setArtistList([]); return [] }
  }

  const openCreate = async () => {
    setForm(EMPTY_FORM); setEditItem(null); setModalOpen(true)
    const list = await loadArtists()
    if (list.length === 1) setForm(f => ({ ...f, artist_id: list[0].id }))
  }

  const openEdit = async (row: Record<string, unknown>) => {
    setEditItem(row)
    setForm({
      // Backend mapRelease() exposes `title` (aliased from release_title) and `type`
      title:        String(row.title ?? row.release_title ?? ''),
      artist_id:    String(row.artist_id ?? ''),
      type:         ((row.type ?? row.release_type) as any) || 'single',
      distributor:  String(row.distributor ?? ''),
      release_date: String(row.release_date ?? ''),
      // status is now music_status: draft | scheduled | released
      status:       (String(row.status ?? 'draft') as any) || 'draft',
      upc:          String(row.upc ?? ''),
    })
    setModalOpen(true)
    await loadArtists()
  }

  const handleSubmit = async () => {
    if (!form.title.trim()) { setToast({ message: 'Release title is required', type: 'error' }); return }

    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        type:  form.type,
      }
      if (form.artist_id)    body.artist_id    = form.artist_id
      if (form.distributor)  body.distributor  = form.distributor.trim()
      if (form.release_date) body.release_date = form.release_date
      if (form.status)       body.status       = form.status
      if (form.upc)          body.upc          = form.upc.trim()

      if (editItem) {
        await releases.update(String(editItem.id), body)
        setToast({ message: 'Release updated', type: 'success' })
      } else {
        await releases.create(body)
        setToast({ message: 'Release created', type: 'success' })
      }
      setModalOpen(false); fetchData()
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || 'Failed to save release', type: 'error' })
    } finally { setSubmitting(false) }
  }

  const handleDelete = async () => {
    if (!deleteItem) return
    setDeleting(true)
    try {
      await releases.remove(String(deleteItem.id))
      setToast({ message: 'Release deleted', type: 'success' })
      setDeleteItem(null); fetchData()
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || 'Failed to delete release', type: 'error' })
    } finally { setDeleting(false) }
  }

  const set = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<any>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const items = normalise(data)
  const statusCounts = items.reduce<Record<string, number>>((acc, item: any) => {
    const s = String(item.status ?? 'unknown').toLowerCase()
    acc[s] = (acc[s] || 0) + 1; return acc
  }, {})
  const stateCounts = items.reduce<Record<string, number>>((acc, item: any) => {
    const s = String(item.release_state ?? 'draft').toLowerCase()
    acc[s] = (acc[s] || 0) + 1; return acc
  }, {})

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-1 h-6 bg-[#00d4ff] rounded-full" />
            <h1 className="text-xl font-bold font-mono text-[#00d4ff] tracking-[0.2em] text-glow-cyan">RELEASES</h1>
          </div>
          <p className="text-gray-600 text-[11px] font-mono tracking-[0.2em] ml-4">RELEASE PIPELINE</p>
        </div>
        <div className="flex items-center gap-3">
          {!loading && !error && data && (
            <div className="text-[#00d4ff]/50 text-[10px] font-mono border border-[#00d4ff]/20 rounded px-3 py-1.5 tracking-widest">{items.length} RELEASES</div>
          )}
          {canWrite && (
            <button onClick={openCreate} className="text-[10px] font-mono tracking-widest px-4 py-1.5 border border-[#00d4ff]/40 text-[#00d4ff] hover:bg-[#00d4ff]/10 rounded transition-colors">
              + CREATE RELEASE
            </button>
          )}
        </div>
      </div>

      {loading && <div className="flex justify-center py-24"><LoadingSpinner text="LOADING RELEASES..." /></div>}
      {error && <ErrorMessage message={error} onRetry={fetchData} />}

      {!loading && !error && data && (
        <div className="space-y-5">
          {Object.keys(stateCounts).length > 0 && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-[9px] font-mono text-gray-600 tracking-widest">RELEASE STATE</span>
                {Object.entries(stateCounts).map(([state, count]) => (
                  <div key={state} className="flex items-center gap-1.5">
                    <ReleaseStateBadge state={state as ReleaseState} />
                    <span className="text-[9px] font-mono text-gray-600">×{count}</span>
                  </div>
                ))}
              </div>
              {Object.keys(statusCounts).length > 0 && (
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-[9px] font-mono text-gray-600 tracking-widest">PIPELINE</span>
                  {Object.entries(statusCounts).map(([status, count]) => (
                    <div key={status} className={`text-[9px] font-mono border border-current/25 rounded px-2 py-0.5 tracking-widest ${STATUS_COLORS[status] ?? 'text-gray-500'}`}>
                      {status.toUpperCase()} · {count}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {items.length > 0 ? (
            <DataTable
              data={items}
              color="cyan"
              onEdit={canWrite ? openEdit : undefined}
              onDelete={canDelete ? setDeleteItem : undefined}
              onChecklist={setChecklistItem}
            />
          ) : (
            <EmptyState icon="◎" title="No releases added yet" message="Create a release draft to start managing your release pipeline." hint='Use the CREATE RELEASE button above.' color="cyan" />
          )}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => !submitting && setModalOpen(false)} title={editItem ? 'EDIT RELEASE' : 'CREATE RELEASE'} subtitle="RELEASE PIPELINE" color="cyan"
        footer={
          <>
            <button onClick={() => setModalOpen(false)} disabled={submitting} className="text-[10px] font-mono tracking-widest px-4 py-2 border border-white/10 text-gray-500 hover:text-gray-400 rounded transition-colors disabled:opacity-50">CANCEL</button>
            <button onClick={handleSubmit} disabled={submitting} className="text-[10px] font-mono tracking-widest px-5 py-2 border border-[#00d4ff]/40 text-[#00d4ff] hover:bg-[#00d4ff]/10 rounded transition-colors disabled:opacity-50">
              {submitting ? 'SAVING...' : editItem ? 'SAVE CHANGES' : 'CREATE RELEASE'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Release Title" required>
            <Input value={form.title} onChange={set('title')} placeholder="Enter release title" autoFocus />
          </Field>
          <Field label="Artist" hint={artistList.length === 0 ? 'No artist profile found — create one via the ARTIST page' : undefined}>
            <Select value={form.artist_id} onChange={set('artist_id')}>
              <option value="">Select artist (optional)...</option>
              {artistList.map(a => <option key={a.id} value={a.id}>{a.stage_name || a.id}</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Release Type" required>
              <Select value={form.type} onChange={set('type')}>
                <option value="single">SINGLE</option>
                <option value="ep">EP</option>
                <option value="album">ALBUM</option>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={form.status} onChange={set('status')}>
                <option value="draft">DRAFT</option>
                <option value="scheduled">SCHEDULED</option>
                <option value="released">RELEASED</option>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Distributor"><Input value={form.distributor} onChange={set('distributor')} placeholder="e.g. DistroKid" /></Field>
            <Field label="UPC"><Input value={form.upc} onChange={set('upc')} placeholder="Universal Product Code" /></Field>
          </div>
          <Field label="Release Date"><Input value={form.release_date} onChange={set('release_date')} type="date" /></Field>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteItem}
        title="DELETE RELEASE"
        message={`Delete release "${deleteItem?.title ?? deleteItem?.release_title}"? All linked tasks will also be removed.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteItem(null)}
        loading={deleting}
      />

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}

      {checklistItem && (
        <ReleaseChecklistModal
          isOpen={!!checklistItem}
          releaseId={String(checklistItem.id)}
          releaseTitle={String(checklistItem.title ?? checklistItem.release_title ?? '')}
          onClose={() => setChecklistItem(null)}
        />
      )}
    </div>
  )
}
