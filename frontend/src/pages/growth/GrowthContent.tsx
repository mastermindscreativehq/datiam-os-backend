import { useEffect, useState, useCallback } from 'react'
import DataTable from '../../components/DataTable'
import EmptyState from '../../components/EmptyState'
import LoadingSpinner from '../../components/LoadingSpinner'
import ErrorMessage from '../../components/ErrorMessage'
import Modal, { Field, Input, Select } from '../../components/Modal'
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
  title:        '',
  content_type: '',
  platform:     '',
  status:       '',
  hook:         '',
  tags:         '',
}

export default function GrowthContent() {
  const { user } = useAuthStore()
  const canWrite  = ['owner', 'admin', 'editor', 'team'].includes(user?.role ?? '')
  const canDelete = ['owner', 'admin'].includes(user?.role ?? '')

  const [data,       setData]       = useState<any>(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const [modalOpen,  setModalOpen]  = useState(false)
  const [editItem,   setEditItem]   = useState<Record<string, unknown> | null>(null)
  const [deleteItem, setDeleteItem] = useState<Record<string, unknown> | null>(null)
  const [form,       setForm]       = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [deleting,   setDeleting]   = useState(false)
  const [toast,      setToast]      = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [enriching,  setEnriching]  = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await growth.content.list()
      setData(res.data)
    } catch (err: any) {
      if (isCriticalError(err)) setError(err.response?.data?.message || 'Failed to load content')
      else setData([])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const openCreate = () => { setForm(EMPTY_FORM); setEditItem(null); setModalOpen(true) }

  const openEdit = (row: Record<string, unknown>) => {
    setEditItem(row)
    setForm({
      title:        String(row.title ?? ''),
      content_type: String(row.content_type ?? ''),
      platform:     String(row.platform ?? ''),
      status:       String(row.status ?? ''),
      hook:         String(row.hook ?? ''),
      tags:         Array.isArray(row.tags) ? (row.tags as string[]).join(', ') : String(row.tags ?? ''),
    })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.title) { setToast({ message: 'Title is required', type: 'error' }); return }
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = { title: form.title.trim() }
      if (form.content_type) body.content_type = form.content_type
      if (form.platform)     body.platform     = form.platform.trim()
      if (form.status)       body.status       = form.status
      if (form.hook)         body.hook         = form.hook.trim()
      if (form.tags)         body.tags         = form.tags.split(',').map((t: string) => t.trim()).filter(Boolean)

      if (editItem) {
        await growth.content.update(String(editItem.id), body)
        setToast({ message: 'Content updated', type: 'success' })
      } else {
        await growth.content.create(body)
        setToast({ message: 'Content created', type: 'success' })
      }
      setModalOpen(false); fetchData()
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || 'Failed to save', type: 'error' })
    } finally { setSubmitting(false) }
  }

  const handleDelete = async () => {
    if (!deleteItem) return
    setDeleting(true)
    try {
      await growth.content.remove(String(deleteItem.id))
      setToast({ message: 'Content deleted', type: 'success' })
      setDeleteItem(null); fetchData()
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || 'Failed to delete', type: 'error' })
    } finally { setDeleting(false) }
  }

  const handleEnrich = async (row: Record<string, unknown>) => {
    const id = String(row.id)
    setEnriching(id)
    try {
      await growth.ai.enrich({ content_id: id, platform_slug: String(row.platform ?? '') })
      setToast({ message: 'Content enriched via AI', type: 'success' })
      fetchData()
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || 'AI enrichment failed', type: 'error' })
    } finally { setEnriching(null) }
  }

  const set = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<any>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const items = normalise(data)

  // Flatten for table display — include AI enrich action as a simple marker
  const tableItems = items.map((item: any) => ({
    title:             item.title,
    content_type:      item.content_type,
    platform:          item.platform,
    status:            item.status,
    performance_score: item.performance_score,
    id:                item.id,
    _raw:              item,
  }))

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-1 h-6 bg-emerald-400 rounded-full" />
            <h1 className="text-xl font-bold font-mono text-emerald-400 tracking-[0.2em]">CONTENT VAULT</h1>
          </div>
          <p className="text-gray-600 text-[11px] font-mono tracking-[0.2em] ml-4">GROWTH OS · CONTENT PIPELINE</p>
        </div>
        <div className="flex items-center gap-3">
          {!loading && !error && data && (
            <div className="text-emerald-400/50 text-[10px] font-mono border border-emerald-400/20 rounded px-3 py-1.5 tracking-widest">{items.length} ITEMS</div>
          )}
          {canWrite && (
            <button onClick={openCreate} className="text-[10px] font-mono tracking-widest px-4 py-1.5 border border-emerald-400/40 text-emerald-400 hover:bg-emerald-400/10 rounded transition-colors">
              + CREATE CONTENT
            </button>
          )}
        </div>
      </div>

      {loading && <div className="flex justify-center py-24"><LoadingSpinner text="LOADING CONTENT..." /></div>}
      {error && <ErrorMessage message={error} onRetry={fetchData} />}

      {!loading && !error && data && (
        items.length > 0 ? (
          <div className="space-y-4">
            <DataTable
              data={tableItems}
              color="cyan"
              onEdit={canWrite ? (row) => openEdit(row._raw as Record<string, unknown>) : undefined}
              onDelete={canDelete ? (row) => setDeleteItem(row._raw as Record<string, unknown>) : undefined}
            />
            {/* AI Enrich buttons */}
            <div className="flex flex-wrap gap-2">
              {items.map((item: any) => (
                <button
                  key={item.id}
                  onClick={() => handleEnrich(item)}
                  disabled={enriching === String(item.id)}
                  className="text-[9px] font-mono tracking-widest px-3 py-1 border border-emerald-400/30 text-emerald-400/60 hover:bg-emerald-400/10 hover:text-emerald-400 rounded transition-colors disabled:opacity-40"
                >
                  {enriching === String(item.id) ? 'ENRICHING...' : `AI ENRICH · ${String(item.title ?? '').slice(0, 20)}`}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState icon="◈" title="No content yet" message="No content has been added yet." hint="Use CREATE CONTENT to add your first piece." color="cyan" />
        )
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => !submitting && setModalOpen(false)}
        title={editItem ? 'EDIT CONTENT' : 'CREATE CONTENT'}
        subtitle="CONTENT VAULT"
        color="cyan"
        footer={
          <>
            <button onClick={() => setModalOpen(false)} disabled={submitting} className="text-[10px] font-mono tracking-widest px-4 py-2 border border-white/10 text-gray-500 hover:text-gray-400 rounded transition-colors disabled:opacity-50">CANCEL</button>
            <button onClick={handleSubmit} disabled={submitting} className="text-[10px] font-mono tracking-widest px-5 py-2 border border-emerald-400/40 text-emerald-400 hover:bg-emerald-400/10 rounded transition-colors disabled:opacity-50">
              {submitting ? 'SAVING...' : editItem ? 'SAVE CHANGES' : 'CREATE'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Title" required>
            <Input value={form.title} onChange={set('title')} placeholder="Content title" autoFocus />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Content Type">
              <Select value={form.content_type} onChange={set('content_type')}>
                <option value="">Select type...</option>
                <option value="short_video">SHORT VIDEO</option>
                <option value="reel">REEL</option>
                <option value="tiktok">TIKTOK</option>
                <option value="instagram">INSTAGRAM</option>
                <option value="youtube_short">YOUTUBE SHORT</option>
                <option value="carousel">CAROUSEL</option>
                <option value="story">STORY</option>
                <option value="post">POST</option>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={form.status} onChange={set('status')}>
                <option value="">Select status...</option>
                <option value="draft">DRAFT</option>
                <option value="idea">IDEA</option>
                <option value="scripted">SCRIPTED</option>
                <option value="scheduled">SCHEDULED</option>
                <option value="published">PUBLISHED</option>
              </Select>
            </Field>
          </div>
          <Field label="Platform">
            <Input value={form.platform} onChange={set('platform')} placeholder="e.g. instagram, tiktok" />
          </Field>
          <Field label="Hook">
            <Input value={form.hook} onChange={set('hook')} placeholder="Opening hook or angle" />
          </Field>
          <Field label="Tags" hint="Comma-separated">
            <Input value={form.tags} onChange={set('tags')} placeholder="e.g. music, release, promo" />
          </Field>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteItem}
        title="DELETE CONTENT"
        message={`Delete "${deleteItem?.title}"?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteItem(null)}
        loading={deleting}
      />

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  )
}
