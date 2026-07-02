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
  name:          '',
  campaign_type: '',
  description:   '',
  start_date:    '',
  end_date:      '',
}

export default function GrowthCampaigns() {
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
  const [advancing,  setAdvancing]  = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await growth.campaigns.list()
      setData(res.data)
    } catch (err: any) {
      if (isCriticalError(err)) setError(err.response?.data?.message || 'Failed to load campaigns')
      else setData([])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const openCreate = () => { setForm(EMPTY_FORM); setEditItem(null); setModalOpen(true) }

  const openEdit = (row: Record<string, unknown>) => {
    setEditItem(row)
    setForm({
      name:          String(row.name ?? ''),
      campaign_type: String(row.campaign_type ?? ''),
      description:   String(row.description ?? ''),
      start_date:    String(row.start_date ?? '').slice(0, 10),
      end_date:      String(row.end_date ?? '').slice(0, 10),
    })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.name) { setToast({ message: 'Name is required', type: 'error' }); return }
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = { name: form.name.trim() }
      if (form.campaign_type) body.campaign_type = form.campaign_type
      if (form.description)   body.description   = form.description.trim()
      if (form.start_date)    body.start_date     = form.start_date
      if (form.end_date)      body.end_date       = form.end_date

      if (editItem) {
        await growth.campaigns.update(String(editItem.id), body)
        setToast({ message: 'Campaign updated', type: 'success' })
      } else {
        await growth.campaigns.create(body)
        setToast({ message: 'Campaign created', type: 'success' })
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
      await growth.campaigns.remove(String(deleteItem.id))
      setToast({ message: 'Campaign deleted', type: 'success' })
      setDeleteItem(null); fetchData()
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || 'Failed to delete', type: 'error' })
    } finally { setDeleting(false) }
  }

  const handleAdvanceStage = async (row: Record<string, unknown>) => {
    const id = String(row.id)
    setAdvancing(id)
    try {
      await growth.campaigns.advanceStage(id)
      setToast({ message: 'Stage advanced', type: 'success' })
      fetchData()
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || 'Failed to advance stage', type: 'error' })
    } finally { setAdvancing(null) }
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
            <h1 className="text-xl font-bold font-mono text-emerald-400 tracking-[0.2em]">CAMPAIGN MANAGER</h1>
          </div>
          <p className="text-gray-600 text-[11px] font-mono tracking-[0.2em] ml-4">GROWTH OS · CAMPAIGN PIPELINE</p>
        </div>
        <div className="flex items-center gap-3">
          {!loading && !error && data && (
            <div className="text-emerald-400/50 text-[10px] font-mono border border-emerald-400/20 rounded px-3 py-1.5 tracking-widest">{items.length} CAMPAIGNS</div>
          )}
          {canWrite && (
            <button onClick={openCreate} className="text-[10px] font-mono tracking-widest px-4 py-1.5 border border-emerald-400/40 text-emerald-400 hover:bg-emerald-400/10 rounded transition-colors">
              + CREATE CAMPAIGN
            </button>
          )}
        </div>
      </div>

      {loading && <div className="flex justify-center py-24"><LoadingSpinner text="LOADING CAMPAIGNS..." /></div>}
      {error && <ErrorMessage message={error} onRetry={fetchData} />}

      {!loading && !error && data && (
        items.length > 0 ? (
          <div className="space-y-4">
            <DataTable
              data={items}
              color="cyan"
              onEdit={canWrite ? openEdit : undefined}
              onDelete={canDelete ? setDeleteItem : undefined}
            />
            {/* Advance Stage buttons */}
            <div className="flex flex-wrap gap-2">
              {items.map((item: any) => (
                <button
                  key={item.id}
                  onClick={() => handleAdvanceStage(item)}
                  disabled={advancing === String(item.id)}
                  className="text-[9px] font-mono tracking-widest px-3 py-1 border border-emerald-400/30 text-emerald-400/60 hover:bg-emerald-400/10 hover:text-emerald-400 rounded transition-colors disabled:opacity-40"
                >
                  {advancing === String(item.id) ? 'ADVANCING...' : `ADVANCE · ${String(item.name ?? '').slice(0, 20)}`}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState icon="◉" title="No campaigns yet" message="No campaigns have been created yet." hint="Use CREATE CAMPAIGN to launch your first campaign." color="cyan" />
        )
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => !submitting && setModalOpen(false)}
        title={editItem ? 'EDIT CAMPAIGN' : 'CREATE CAMPAIGN'}
        subtitle="CAMPAIGN MANAGER"
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
          <Field label="Campaign Name" required>
            <Input value={form.name} onChange={set('name')} placeholder="Campaign name" autoFocus />
          </Field>
          <Field label="Campaign Type">
            <Select value={form.campaign_type} onChange={set('campaign_type')}>
              <option value="">Select type...</option>
              <option value="release">RELEASE</option>
              <option value="promotional">PROMOTIONAL</option>
              <option value="brand">BRAND</option>
              <option value="fanbase_growth">FANBASE GROWTH</option>
              <option value="collaboration">COLLABORATION</option>
              <option value="playlist_push">PLAYLIST PUSH</option>
            </Select>
          </Field>
          <Field label="Description">
            <Textarea value={form.description} onChange={set('description')} placeholder="Campaign description and goals..." rows={3} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Start Date">
              <Input value={form.start_date} onChange={set('start_date')} type="date" />
            </Field>
            <Field label="End Date">
              <Input value={form.end_date} onChange={set('end_date')} type="date" />
            </Field>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteItem}
        title="DELETE CAMPAIGN"
        message={`Delete campaign "${deleteItem?.name}"?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteItem(null)}
        loading={deleting}
      />

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  )
}
