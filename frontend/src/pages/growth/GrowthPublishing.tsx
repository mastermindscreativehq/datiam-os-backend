import { useEffect, useState, useCallback } from 'react'
import DataTable from '../../components/DataTable'
import EmptyState from '../../components/EmptyState'
import LoadingSpinner from '../../components/LoadingSpinner'
import ErrorMessage from '../../components/ErrorMessage'
import Modal, { Field, Input, Textarea } from '../../components/Modal'
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

type Tab = 'scheduled' | 'published'

const EMPTY_FORM = {
  social_account_id: '',
  caption:           '',
  scheduled_for:     '',
}

export default function GrowthPublishing() {
  const { user } = useAuthStore()
  const canWrite = ['owner', 'admin', 'editor', 'team'].includes(user?.role ?? '')

  const [tab,        setTab]        = useState<Tab>('scheduled')
  const [scheduled,  setScheduled]  = useState<any>(null)
  const [published,  setPublished]  = useState<any>(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const [modalOpen,  setModalOpen]  = useState(false)
  const [form,       setForm]       = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [toast,      setToast]      = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [cancelling, setCancelling] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [sRes, pRes] = await Promise.all([
        growth.publishing.scheduled(),
        growth.publishing.published(),
      ])
      setScheduled(sRes.data)
      setPublished(pRes.data)
    } catch (err: any) {
      if (isCriticalError(err)) setError(err.response?.data?.message || 'Failed to load publishing data')
      else { setScheduled([]); setPublished([]) }
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSchedule = async () => {
    if (!form.social_account_id) { setToast({ message: 'Social account ID is required', type: 'error' }); return }
    if (!form.scheduled_for)      { setToast({ message: 'Scheduled time is required', type: 'error' }); return }
    setSubmitting(true)
    try {
      await growth.publishing.schedule({
        social_account_id: form.social_account_id.trim(),
        caption:           form.caption.trim(),
        scheduled_for:     form.scheduled_for,
      })
      setToast({ message: 'Post scheduled', type: 'success' })
      setModalOpen(false); setForm(EMPTY_FORM); fetchData()
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || 'Failed to schedule', type: 'error' })
    } finally { setSubmitting(false) }
  }

  const handleCancel = async (row: Record<string, unknown>) => {
    const id = String(row.id)
    setCancelling(id)
    try {
      await growth.publishing.cancel(id)
      setToast({ message: 'Post cancelled', type: 'success' })
      fetchData()
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || 'Failed to cancel', type: 'error' })
    } finally { setCancelling(null) }
  }

  const set = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<any>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const scheduledItems = normalise(scheduled)
  const publishedItems = normalise(published)

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-1 h-6 bg-emerald-400 rounded-full" />
            <h1 className="text-xl font-bold font-mono text-emerald-400 tracking-[0.2em]">PUBLISHING ENGINE</h1>
          </div>
          <p className="text-gray-600 text-[11px] font-mono tracking-[0.2em] ml-4">GROWTH OS · CONTENT SCHEDULING</p>
        </div>
        <div className="flex items-center gap-3">
          {canWrite && (
            <button onClick={() => { setForm(EMPTY_FORM); setModalOpen(true) }} className="text-[10px] font-mono tracking-widest px-4 py-1.5 border border-emerald-400/40 text-emerald-400 hover:bg-emerald-400/10 rounded transition-colors">
              + SCHEDULE POST
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-[#00ff41]/10">
        {(['scheduled', 'published'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-[10px] font-mono tracking-[0.15em] px-4 py-2 transition-colors border-b-2 -mb-px ${
              tab === t
                ? 'text-emerald-400 border-emerald-400'
                : 'text-gray-600 border-transparent hover:text-gray-400'
            }`}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      {loading && <div className="flex justify-center py-24"><LoadingSpinner text="LOADING..." /></div>}
      {error && <ErrorMessage message={error} onRetry={fetchData} />}

      {!loading && !error && (
        <>
          {tab === 'scheduled' && (
            <div className="space-y-4">
              {scheduledItems.length > 0 ? (
                <>
                  <DataTable data={scheduledItems} color="cyan" />
                  {/* Cancel buttons for non-final states */}
                  <div className="flex flex-wrap gap-2">
                    {scheduledItems
                      .filter((item: any) => !['published', 'cancelled'].includes(String(item.status)))
                      .map((item: any) => (
                        <button
                          key={item.id}
                          onClick={() => handleCancel(item)}
                          disabled={cancelling === String(item.id)}
                          className="text-[9px] font-mono tracking-widest px-3 py-1 border border-red-400/30 text-red-400/60 hover:bg-red-400/10 hover:text-red-400 rounded transition-colors disabled:opacity-40"
                        >
                          {cancelling === String(item.id) ? 'CANCELLING...' : `CANCEL · ${String(item.id).slice(0, 8)}`}
                        </button>
                      ))}
                  </div>
                </>
              ) : (
                <EmptyState icon="◆" title="No scheduled posts" message="No posts scheduled." hint="Use SCHEDULE POST to queue content." color="cyan" />
              )}
            </div>
          )}
          {tab === 'published' && (
            publishedItems.length > 0 ? (
              <DataTable data={publishedItems} color="cyan" />
            ) : (
              <EmptyState icon="◆" title="No published posts" message="No posts published yet." color="cyan" />
            )
          )}
        </>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => !submitting && setModalOpen(false)}
        title="SCHEDULE POST"
        subtitle="PUBLISHING ENGINE"
        color="cyan"
        footer={
          <>
            <button onClick={() => setModalOpen(false)} disabled={submitting} className="text-[10px] font-mono tracking-widest px-4 py-2 border border-white/10 text-gray-500 hover:text-gray-400 rounded transition-colors disabled:opacity-50">CANCEL</button>
            <button onClick={handleSchedule} disabled={submitting} className="text-[10px] font-mono tracking-widest px-5 py-2 border border-emerald-400/40 text-emerald-400 hover:bg-emerald-400/10 rounded transition-colors disabled:opacity-50">
              {submitting ? 'SCHEDULING...' : 'SCHEDULE'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Social Account ID" required>
            <Input value={form.social_account_id} onChange={set('social_account_id')} placeholder="Social account UUID" autoFocus />
          </Field>
          <Field label="Caption">
            <Textarea value={form.caption} onChange={set('caption')} placeholder="Post caption..." rows={3} />
          </Field>
          <Field label="Scheduled For" required>
            <Input value={form.scheduled_for} onChange={set('scheduled_for')} type="datetime-local" />
          </Field>
        </div>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  )
}
