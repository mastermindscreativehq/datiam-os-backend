import { useEffect, useState, useCallback } from 'react'
import DataTable from '../../components/DataTable'
import EmptyState from '../../components/EmptyState'
import LoadingSpinner from '../../components/LoadingSpinner'
import ErrorMessage from '../../components/ErrorMessage'
import Modal, { Field, Input, Select, Textarea } from '../../components/Modal'
import ConfirmModal from '../../components/ConfirmModal'
import Toast from '../../components/Toast'
import { growth, isCriticalError } from '../../api/client'
import { useAuthStore } from '../../store/authStore'

function normalise(raw: any): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw
  for (const key of ['data', 'items', 'results']) {
    if (Array.isArray(raw?.[key])) return raw[key]
  }
  return raw ? [raw] : []
}

const EMPTY_FORM = {
  title:         '',
  category:      '',
  description:   '',
  trend_score:   '',
  platform_slug: '',
}

export default function GrowthTrends() {
  const { user } = useAuthStore()
  const canWrite  = ['owner', 'admin', 'editor', 'team'].includes(user?.role ?? '')

  const [data,       setData]       = useState<any>(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const [modalOpen,  setModalOpen]  = useState(false)
  const [deleteItem, setDeleteItem] = useState<Record<string, unknown> | null>(null)
  const [form,       setForm]       = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [deleting,   setDeleting]   = useState(false)
  const [toast,      setToast]      = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [expiring,   setExpiring]   = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await growth.trends.list()
      setData(res.data)
    } catch (err: any) {
      if (isCriticalError(err)) setError(err.response?.data?.message || 'Failed to load trends')
      else setData([])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const openCreate = () => { setForm(EMPTY_FORM); setModalOpen(true) }

  const handleSubmit = async () => {
    if (!form.title) { setToast({ message: 'Title is required', type: 'error' }); return }
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = { title: form.title.trim() }
      if (form.category)      body.category      = form.category
      if (form.description)   body.description   = form.description.trim()
      if (form.trend_score)   body.trend_score   = Number(form.trend_score)
      if (form.platform_slug) body.platform_slug = form.platform_slug.trim()

      await growth.trends.create(body)
      setToast({ message: 'Trend created', type: 'success' })
      setModalOpen(false); fetchData()
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || 'Failed to create trend', type: 'error' })
    } finally { setSubmitting(false) }
  }

  const handleConfirmExpire = async () => {
    if (!deleteItem) return
    setDeleting(true)
    try {
      await growth.trends.expire(String(deleteItem.id))
      setToast({ message: 'Trend expired', type: 'success' })
      setDeleteItem(null); fetchData()
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || 'Failed', type: 'error' })
    } finally { setDeleting(false) }
  }

  const handleExpire = async (row: Record<string, unknown>) => {
    const id = String(row.id)
    setExpiring(id)
    try {
      await growth.trends.expire(id)
      setToast({ message: 'Trend marked expired', type: 'success' })
      fetchData()
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || 'Failed to expire', type: 'error' })
    } finally { setExpiring(null) }
  }

  const set = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<any>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const items = normalise(data)

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-1 h-6 bg-emerald-400 rounded-full" />
            <h1 className="text-xl font-bold font-mono text-emerald-400 tracking-[0.2em]">TREND INTELLIGENCE</h1>
          </div>
          <p className="text-gray-600 text-[11px] font-mono tracking-[0.2em] ml-4">GROWTH OS · EMERGING TRENDS</p>
        </div>
        <div className="flex items-center gap-3">
          {!loading && !error && data && (
            <div className="text-emerald-400/50 text-[10px] font-mono border border-emerald-400/20 rounded px-3 py-1.5 tracking-widest">{items.length} TRENDS</div>
          )}
          {canWrite && (
            <button onClick={openCreate} className="text-[10px] font-mono tracking-widest px-4 py-1.5 border border-emerald-400/40 text-emerald-400 hover:bg-emerald-400/10 rounded transition-colors">
              + TRACK TREND
            </button>
          )}
        </div>
      </div>

      {loading && <div className="flex justify-center py-24"><LoadingSpinner text="LOADING TRENDS..." /></div>}
      {error && <ErrorMessage message={error} onRetry={fetchData} />}

      {!loading && !error && data && (
        items.length > 0 ? (
          <div className="space-y-4">
            <DataTable
              data={items}
              color="cyan"
              onDelete={['owner', 'admin'].includes(user?.role ?? '') ? setDeleteItem : undefined}
            />
            {/* Expire buttons */}
            <div className="flex flex-wrap gap-2">
              {items.map((item: any) => (
                <button
                  key={item.id}
                  onClick={() => handleExpire(item)}
                  disabled={expiring === String(item.id) || item.status === 'expired'}
                  className="text-[9px] font-mono tracking-widest px-3 py-1 border border-yellow-400/30 text-yellow-400/60 hover:bg-yellow-400/10 hover:text-yellow-400 rounded transition-colors disabled:opacity-40"
                >
                  {expiring === String(item.id) ? 'EXPIRING...' : `EXPIRE · ${String(item.title ?? '').slice(0, 20)}`}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState icon="✦" title="No trends tracked" message="No trends are being tracked." hint="Use TRACK TREND to add a trend." color="cyan" />
        )
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => !submitting && setModalOpen(false)}
        title="TRACK TREND"
        subtitle="TREND INTELLIGENCE"
        color="cyan"
        footer={
          <>
            <button onClick={() => setModalOpen(false)} disabled={submitting} className="text-[10px] font-mono tracking-widest px-4 py-2 border border-white/10 text-gray-500 hover:text-gray-400 rounded transition-colors disabled:opacity-50">CANCEL</button>
            <button onClick={handleSubmit} disabled={submitting} className="text-[10px] font-mono tracking-widest px-5 py-2 border border-emerald-400/40 text-emerald-400 hover:bg-emerald-400/10 rounded transition-colors disabled:opacity-50">
              {submitting ? 'SAVING...' : 'TRACK TREND'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Title" required>
            <Input value={form.title} onChange={set('title')} placeholder="Trend title" autoFocus />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Category">
              <Select value={form.category} onChange={set('category')}>
                <option value="">Select category...</option>
                <option value="dance">DANCE</option>
                <option value="audio">AUDIO</option>
                <option value="format">FORMAT</option>
                <option value="hashtag">HASHTAG</option>
                <option value="challenge">CHALLENGE</option>
                <option value="meme">MEME</option>
                <option value="aesthetic">AESTHETIC</option>
                <option value="collaboration">COLLABORATION</option>
              </Select>
            </Field>
            <Field label="Trend Score (0-100)">
              <Input value={form.trend_score} onChange={set('trend_score')} type="number" placeholder="0" />
            </Field>
          </div>
          <Field label="Platform Slug">
            <Input value={form.platform_slug} onChange={set('platform_slug')} placeholder="e.g. tiktok, instagram" />
          </Field>
          <Field label="Description">
            <Textarea value={form.description} onChange={set('description')} placeholder="Trend description and context..." rows={3} />
          </Field>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteItem}
        title="EXPIRE TREND"
        message={`Mark trend "${deleteItem?.title}" as expired?`}
        onConfirm={handleConfirmExpire}
        onCancel={() => setDeleteItem(null)}
        loading={deleting}
      />

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  )
}
