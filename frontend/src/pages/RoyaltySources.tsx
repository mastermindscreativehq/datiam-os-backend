import { useEffect, useState, useCallback } from 'react'
import DataTable from '../components/DataTable'
import EmptyState from '../components/EmptyState'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import Modal, { Field, Input, Select } from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'
import Toast from '../components/Toast'
import { royaltySources, catalog, isCriticalError } from '../api/client'
import { useAuthStore } from '../store/authStore'

function normalise(raw: any): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw
  for (const key of ['royaltySources', 'royalty_sources', 'sources', 'items', 'data']) {
    if (Array.isArray(raw?.[key])) return raw[key]
  }
  return raw ? [raw] : []
}

interface SongOption { id: string; title: string }

const EMPTY_FORM = {
  song_id: '',
  platform: '',
  royalty_type: '' as '' | 'master' | 'publishing' | 'mechanical' | 'performance' | 'neighboring' | 'sync',
  amount: '',
  currency: 'USD',
  period_start: '',
  period_end: '',
}

export default function RoyaltySources() {
  const { user } = useAuthStore()
  const canWrite  = ['owner', 'admin', 'editor', 'team'].includes(user?.role ?? '')
  const canDelete = ['owner', 'admin'].includes(user?.role ?? '')

  const [data,       setData]       = useState<any>(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const [modalOpen,  setModalOpen]  = useState(false)
  const [deleteItem, setDeleteItem] = useState<Record<string, unknown> | null>(null)
  const [form,       setForm]       = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [deleting,   setDeleting]   = useState(false)
  const [songList,   setSongList]   = useState<SongOption[]>([])
  const [toast,      setToast]      = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await royaltySources.list()
      setData(res.data)
    } catch (err: any) {
      if (isCriticalError(err)) setError(err.response?.data?.message || 'Failed to load royalty sources')
      else setData([])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const openCreate = async () => {
    setForm(EMPTY_FORM); setModalOpen(true)
    try {
      const res = await catalog.songs()
      const list = Array.isArray(res.data) ? res.data : (res.data?.songs ?? res.data?.data ?? [])
      setSongList(list)
      if (list.length === 1) setForm(f => ({ ...f, song_id: list[0].id }))
    } catch { setSongList([]) }
  }

  const handleSubmit = async () => {
    if (!form.song_id)       { setToast({ message: 'Song is required', type: 'error' }); return }
    if (!form.platform.trim()) { setToast({ message: 'Platform is required', type: 'error' }); return }
    if (!form.royalty_type)  { setToast({ message: 'Royalty type is required', type: 'error' }); return }
    if (!form.amount)        { setToast({ message: 'Amount is required', type: 'error' }); return }

    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        song_id:      form.song_id,
        platform:     form.platform.trim(),
        royalty_type: form.royalty_type,
        amount:       parseFloat(form.amount),
        currency:     form.currency || 'USD',
      }
      if (form.period_start) body.period_start = form.period_start
      if (form.period_end)   body.period_end   = form.period_end

      await royaltySources.create(body)
      setToast({ message: 'Royalty source added', type: 'success' })
      setModalOpen(false); fetchData()
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || 'Failed to create royalty source', type: 'error' })
    } finally { setSubmitting(false) }
  }

  const handleDelete = async () => {
    if (!deleteItem) return
    setDeleting(true)
    try {
      await royaltySources.remove(String(deleteItem.id))
      setToast({ message: 'Royalty source deleted', type: 'success' })
      setDeleteItem(null); fetchData()
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || 'Failed to delete', type: 'error' })
    } finally { setDeleting(false) }
  }

  const set = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<any>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const items = normalise(data)

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-1 h-6 bg-yellow-400 rounded-full" />
            <h1 className="text-xl font-bold font-mono text-yellow-400 tracking-[0.2em]">ROYALTY SOURCES</h1>
          </div>
          <p className="text-gray-600 text-[11px] font-mono tracking-[0.2em] ml-4">REVENUE STREAM REGISTRY</p>
        </div>
        <div className="flex items-center gap-3">
          {!loading && !error && data && (
            <div className="text-yellow-400/50 text-[10px] font-mono border border-yellow-400/20 rounded px-3 py-1.5 tracking-widest">{items.length} SOURCES</div>
          )}
          {canWrite && (
            <button onClick={openCreate} className="text-[10px] font-mono tracking-widest px-4 py-1.5 border border-yellow-400/40 text-yellow-400 hover:bg-yellow-400/10 rounded transition-colors">
              + ADD SOURCE
            </button>
          )}
        </div>
      </div>

      {loading && <div className="flex justify-center py-24"><LoadingSpinner text="LOADING ROYALTY SOURCES..." /></div>}
      {error && <ErrorMessage message={error} onRetry={fetchData} />}

      {!loading && !error && data && (
        items.length > 0 ? (
          <DataTable data={items} color="green" onDelete={canDelete ? setDeleteItem : undefined} />
        ) : (
          <EmptyState icon="◆" title="No royalty sources connected" message="No revenue data has been imported yet." hint="Use ADD SOURCE to log a royalty entry." color="yellow" />
        )
      )}

      <Modal isOpen={modalOpen} onClose={() => !submitting && setModalOpen(false)} title="ADD ROYALTY SOURCE" subtitle="LOG REVENUE ENTRY" color="orange"
        footer={
          <>
            <button onClick={() => setModalOpen(false)} disabled={submitting} className="text-[10px] font-mono tracking-widest px-4 py-2 border border-white/10 text-gray-500 hover:text-gray-400 rounded transition-colors disabled:opacity-50">CANCEL</button>
            <button onClick={handleSubmit} disabled={submitting} className="text-[10px] font-mono tracking-widest px-5 py-2 border border-yellow-400/40 text-yellow-400 hover:bg-yellow-400/10 rounded transition-colors disabled:opacity-50">
              {submitting ? 'SAVING...' : 'ADD SOURCE'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Song" required hint={songList.length === 0 ? 'No songs in catalog — create a song first' : undefined}>
            <Select value={form.song_id} onChange={set('song_id')} autoFocus>
              <option value="">Select song...</option>
              {songList.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Platform" required><Input value={form.platform} onChange={set('platform')} placeholder="e.g. Spotify, Apple Music" /></Field>
            <Field label="Royalty Type" required>
              <Select value={form.royalty_type} onChange={set('royalty_type')}>
                <option value="">Select type...</option>
                <option value="master">MASTER</option>
                <option value="publishing">PUBLISHING</option>
                <option value="mechanical">MECHANICAL</option>
                <option value="performance">PERFORMANCE</option>
                <option value="neighboring">NEIGHBORING</option>
                <option value="sync">SYNC</option>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Amount (USD)" required><Input value={form.amount} onChange={set('amount')} placeholder="e.g. 124.50" type="number" min="0" step="0.01" /></Field>
            <Field label="Currency"><Input value={form.currency} onChange={set('currency')} placeholder="USD" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Period Start"><Input value={form.period_start} onChange={set('period_start')} type="date" /></Field>
            <Field label="Period End"><Input value={form.period_end} onChange={set('period_end')} type="date" /></Field>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteItem}
        title="DELETE ROYALTY SOURCE"
        message={`Delete this ${deleteItem?.platform} ${deleteItem?.royalty_type} entry?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteItem(null)}
        loading={deleting}
      />

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  )
}
