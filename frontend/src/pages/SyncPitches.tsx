import { useEffect, useState, useCallback } from 'react'
import DataTable from '../components/DataTable'
import EmptyState from '../components/EmptyState'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import Modal, { Field, Input, Select, Textarea } from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'
import Toast from '../components/Toast'
import { syncPitches, catalog, isCriticalError } from '../api/client'
import { useAuthStore } from '../store/authStore'

function normalise(raw: any): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw
  for (const key of ['pitches', 'syncPitches', 'sync_pitches', 'items', 'data']) {
    if (Array.isArray(raw?.[key])) return raw[key]
  }
  return raw ? [raw] : []
}

interface SongOption { id: string; title: string }

const STATUS_COLORS: Record<string, string> = {
  prospect:   'text-gray-400',
  pitched:    'text-[#00d4ff]',
  follow_up:  'text-yellow-400',
  accepted:   'text-[#00ff41]',
  rejected:   'text-red-400',
}

type OppType = '' | 'film' | 'tv' | 'ad' | 'game' | 'trailer' | 'youtube' | 'library'

const EMPTY_FORM = {
  song_id: '',
  pitch_target: '',
  opportunity_type: '' as OppType,
  contact_name: '',
  contact_email: '',
  status: '',
  mood_fit: '',
  pitch_date: '',
  notes: '',
}

export default function SyncPitches() {
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
  const [songList,   setSongList]   = useState<SongOption[]>([])
  const [toast,      setToast]      = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await syncPitches.list()
      setData(res.data)
    } catch (err: any) {
      if (isCriticalError(err)) setError(err.response?.data?.message || 'Failed to load sync pitches')
      else setData([])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const loadSongs = async () => {
    try {
      const res = await catalog.songs()
      const list = Array.isArray(res.data) ? res.data : (res.data?.songs ?? res.data?.data ?? [])
      setSongList(list); return list
    } catch { setSongList([]); return [] }
  }

  const openCreate = async () => {
    setForm(EMPTY_FORM); setEditItem(null); setModalOpen(true)
    const list = await loadSongs()
    if (list.length === 1) setForm(f => ({ ...f, song_id: list[0].id }))
  }

  const openEdit = async (row: Record<string, unknown>) => {
    setEditItem(row)
    setForm({
      song_id:          String(row.song_id ?? ''),
      pitch_target:     String(row.pitch_target ?? ''),
      opportunity_type: (row.opportunity_type as OppType) || '',
      contact_name:     String(row.contact_name ?? ''),
      contact_email:    String(row.contact_email ?? ''),
      status:           String(row.status ?? ''),
      mood_fit:         String(row.mood_fit ?? ''),
      pitch_date:       String(row.pitch_date ?? ''),
      notes:            String(row.notes ?? ''),
    })
    setModalOpen(true)
    await loadSongs()
  }

  const handleSubmit = async () => {
    if (!form.pitch_target.trim())  { setToast({ message: 'Pitch target is required', type: 'error' }); return }
    if (!form.song_id)              { setToast({ message: 'Song selection is required', type: 'error' }); return }
    if (!form.opportunity_type)     { setToast({ message: 'Opportunity type is required', type: 'error' }); return }

    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        song_id:          form.song_id,
        pitch_target:     form.pitch_target.trim(),
        opportunity_type: form.opportunity_type,
      }
      if (form.contact_name)  body.contact_name  = form.contact_name.trim()
      if (form.contact_email) body.contact_email = form.contact_email.trim()
      if (form.status)        body.status        = form.status
      if (form.mood_fit)      body.mood_fit      = form.mood_fit.trim()
      if (form.pitch_date)    body.pitch_date    = form.pitch_date
      if (form.notes)         body.notes         = form.notes.trim()

      if (editItem) {
        await syncPitches.update(String(editItem.id), body)
        setToast({ message: 'Sync pitch updated', type: 'success' })
      } else {
        await syncPitches.create(body)
        setToast({ message: 'Sync pitch created', type: 'success' })
      }
      setModalOpen(false); fetchData()
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || 'Failed to save sync pitch', type: 'error' })
    } finally { setSubmitting(false) }
  }

  const handleDelete = async () => {
    if (!deleteItem) return
    setDeleting(true)
    try {
      await syncPitches.remove(String(deleteItem.id))
      setToast({ message: 'Sync pitch deleted', type: 'success' })
      setDeleteItem(null); fetchData()
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || 'Failed to delete', type: 'error' })
    } finally { setDeleting(false) }
  }

  const set = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<any>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const items = normalise(data)
  const statusCounts = items.reduce<Record<string, number>>((acc, item: any) => {
    const s = String(item.status ?? 'unknown').toLowerCase()
    acc[s] = (acc[s] || 0) + 1; return acc
  }, {})

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-1 h-6 bg-purple-400 rounded-full" />
            <h1 className="text-xl font-bold font-mono text-purple-400 tracking-[0.2em]">SYNC PITCHES</h1>
          </div>
          <p className="text-gray-600 text-[11px] font-mono tracking-[0.2em] ml-4">SYNC LICENSING PIPELINE</p>
        </div>
        {canWrite && (
          <button onClick={openCreate} className="text-[10px] font-mono tracking-widest px-4 py-1.5 border border-purple-400/40 text-purple-400 hover:bg-purple-400/10 rounded transition-colors">
            + CREATE PITCH
          </button>
        )}
      </div>

      {loading && <div className="flex justify-center py-24"><LoadingSpinner text="LOADING SYNC PITCHES..." /></div>}
      {error && <ErrorMessage message={error} onRetry={fetchData} />}

      {!loading && !error && data && (
        <div className="space-y-5">
          {Object.keys(statusCounts).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(statusCounts).map(([status, count]) => (
                <div key={status} className={`text-[10px] font-mono border border-current/25 rounded px-3 py-1 tracking-widest ${STATUS_COLORS[status] ?? 'text-gray-500'}`}>
                  {status.toUpperCase()} · {count}
                </div>
              ))}
            </div>
          )}
          {items.length > 0 ? (
            <DataTable data={items} color="cyan" onEdit={canWrite ? openEdit : undefined} onDelete={canDelete ? setDeleteItem : undefined} />
          ) : (
            <EmptyState icon="⬢" title="No sync pitches submitted" message="No sync licensing pitches have been logged yet." hint='Use the CREATE PITCH button above.' color="purple" />
          )}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => !submitting && setModalOpen(false)} title={editItem ? 'EDIT SYNC PITCH' : 'CREATE SYNC PITCH'} subtitle="SYNC LICENSING PIPELINE" color="purple"
        footer={
          <>
            <button onClick={() => setModalOpen(false)} disabled={submitting} className="text-[10px] font-mono tracking-widest px-4 py-2 border border-white/10 text-gray-500 hover:text-gray-400 rounded transition-colors disabled:opacity-50">CANCEL</button>
            <button onClick={handleSubmit} disabled={submitting} className="text-[10px] font-mono tracking-widest px-5 py-2 border border-purple-400/40 text-purple-400 hover:bg-purple-400/10 rounded transition-colors disabled:opacity-50">
              {submitting ? 'SAVING...' : editItem ? 'SAVE CHANGES' : 'CREATE PITCH'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Pitch Target" required hint="Company, supervisor, or platform name">
            <Input value={form.pitch_target} onChange={set('pitch_target')} placeholder="e.g. Netflix Music, HBO, Spotify Editors" autoFocus />
          </Field>
          <Field label="Song" required hint={songList.length === 0 ? 'No songs in catalog — create a song first' : undefined}>
            <Select value={form.song_id} onChange={set('song_id')}>
              <option value="">Select song...</option>
              {songList.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Opportunity Type" required>
              <Select value={form.opportunity_type} onChange={set('opportunity_type')}>
                <option value="">Select type...</option>
                <option value="film">FILM</option>
                <option value="tv">TV</option>
                <option value="ad">AD</option>
                <option value="game">GAME</option>
                <option value="trailer">TRAILER</option>
                <option value="youtube">YOUTUBE</option>
                <option value="library">LIBRARY</option>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={form.status} onChange={set('status')}>
                <option value="">Select status...</option>
                <option value="prospect">PROSPECT</option>
                <option value="pitched">PITCHED</option>
                <option value="follow_up">FOLLOW UP</option>
                <option value="accepted">ACCEPTED</option>
                <option value="rejected">REJECTED</option>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Contact Name"><Input value={form.contact_name} onChange={set('contact_name')} placeholder="Music supervisor name" /></Field>
            <Field label="Contact Email"><Input value={form.contact_email} onChange={set('contact_email')} placeholder="contact@company.com" type="email" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Mood Fit"><Input value={form.mood_fit} onChange={set('mood_fit')} placeholder="e.g. Dark, Uplifting" /></Field>
            <Field label="Pitch Date"><Input value={form.pitch_date} onChange={set('pitch_date')} type="date" /></Field>
          </div>
          <Field label="Notes"><Textarea value={form.notes} onChange={set('notes')} placeholder="Additional context..." rows={3} /></Field>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteItem}
        title="DELETE SYNC PITCH"
        message={`Delete pitch to "${deleteItem?.pitch_target}"?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteItem(null)}
        loading={deleting}
      />

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  )
}
