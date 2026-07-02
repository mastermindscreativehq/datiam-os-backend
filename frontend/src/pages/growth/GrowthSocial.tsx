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
  platform_id:     '',
  handle:          '',
  username:        '',
  followers_count: '',
  status:          '',
}

export default function GrowthSocial() {
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

  const fetchData = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await growth.social.list()
      setData(res.data)
    } catch (err: any) {
      if (isCriticalError(err)) setError(err.response?.data?.message || 'Failed to load social accounts')
      else setData([])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const openCreate = () => { setForm(EMPTY_FORM); setEditItem(null); setModalOpen(true) }

  const openEdit = (row: Record<string, unknown>) => {
    setEditItem(row)
    setForm({
      platform_id:     String(row.platform_id ?? ''),
      handle:          String(row.handle ?? ''),
      username:        String(row.username ?? ''),
      followers_count: String(row.followers_count ?? ''),
      status:          String(row.status ?? ''),
    })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.platform_id) { setToast({ message: 'Platform ID is required', type: 'error' }); return }
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = { platform_id: form.platform_id.trim() }
      if (form.handle)           body.handle          = form.handle.trim()
      if (form.username)         body.username         = form.username.trim()
      if (form.followers_count)  body.followers_count  = Number(form.followers_count)
      if (form.status)           body.status           = form.status

      if (editItem) {
        await growth.social.update(String(editItem.id), body)
        setToast({ message: 'Account updated', type: 'success' })
      } else {
        await growth.social.create(body)
        setToast({ message: 'Account created', type: 'success' })
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
      await growth.social.remove(String(deleteItem.id))
      setToast({ message: 'Account removed', type: 'success' })
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
            <div className="w-1 h-6 bg-emerald-400 rounded-full" />
            <h1 className="text-xl font-bold font-mono text-emerald-400 tracking-[0.2em]">SOCIAL ACCOUNTS</h1>
          </div>
          <p className="text-gray-600 text-[11px] font-mono tracking-[0.2em] ml-4">GROWTH OS · SOCIAL PROFILES</p>
        </div>
        <div className="flex items-center gap-3">
          {!loading && !error && data && (
            <div className="text-emerald-400/50 text-[10px] font-mono border border-emerald-400/20 rounded px-3 py-1.5 tracking-widest">{items.length} ACCOUNTS</div>
          )}
          {canWrite && (
            <button onClick={openCreate} className="text-[10px] font-mono tracking-widest px-4 py-1.5 border border-emerald-400/40 text-emerald-400 hover:bg-emerald-400/10 rounded transition-colors">
              + CONNECT ACCOUNT
            </button>
          )}
        </div>
      </div>

      {loading && <div className="flex justify-center py-24"><LoadingSpinner text="LOADING ACCOUNTS..." /></div>}
      {error && <ErrorMessage message={error} onRetry={fetchData} />}

      {!loading && !error && data && (
        items.length > 0 ? (
          <DataTable
            data={items}
            color="cyan"
            onEdit={canWrite ? openEdit : undefined}
            onDelete={canDelete ? setDeleteItem : undefined}
          />
        ) : (
          <EmptyState icon="◎" title="No social accounts" message="No social accounts connected yet." hint="Use CONNECT ACCOUNT to add your first profile." color="cyan" />
        )
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => !submitting && setModalOpen(false)}
        title={editItem ? 'EDIT ACCOUNT' : 'CONNECT ACCOUNT'}
        subtitle="SOCIAL ACCOUNTS"
        color="cyan"
        footer={
          <>
            <button onClick={() => setModalOpen(false)} disabled={submitting} className="text-[10px] font-mono tracking-widest px-4 py-2 border border-white/10 text-gray-500 hover:text-gray-400 rounded transition-colors disabled:opacity-50">CANCEL</button>
            <button onClick={handleSubmit} disabled={submitting} className="text-[10px] font-mono tracking-widest px-5 py-2 border border-emerald-400/40 text-emerald-400 hover:bg-emerald-400/10 rounded transition-colors disabled:opacity-50">
              {submitting ? 'SAVING...' : editItem ? 'SAVE CHANGES' : 'CONNECT'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Platform ID" required hint="UUID of the platform">
            <Input value={form.platform_id} onChange={set('platform_id')} placeholder="Platform ID (UUID)" autoFocus />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Handle">
              <Input value={form.handle} onChange={set('handle')} placeholder="@handle" />
            </Field>
            <Field label="Username">
              <Input value={form.username} onChange={set('username')} placeholder="Username" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Followers Count">
              <Input value={form.followers_count} onChange={set('followers_count')} type="number" placeholder="0" />
            </Field>
            <Field label="Status">
              <Select value={form.status} onChange={set('status')}>
                <option value="">Select status...</option>
                <option value="active">ACTIVE</option>
                <option value="disconnected">DISCONNECTED</option>
                <option value="suspended">SUSPENDED</option>
                <option value="pending">PENDING</option>
              </Select>
            </Field>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteItem}
        title="REMOVE ACCOUNT"
        message={`Remove account "${deleteItem?.handle || deleteItem?.username}"?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteItem(null)}
        loading={deleting}
      />

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  )
}
