import { useState } from 'react'
import {
  useReleaseCampaigns,
  useCreateCampaign,
  useUpdateCampaign,
  useDeleteCampaign,
} from '../../hooks/useReleaseIntelligence'
import LoadingSpinner from '../LoadingSpinner'

const STATUS_COLOR: Record<string, string> = {
  planned:   'text-gray-400 border-gray-600',
  active:    'text-[#00d4ff] border-[#00d4ff]/40',
  paused:    'text-yellow-400 border-yellow-400/30',
  completed: 'text-[#00ff41] border-[#00ff41]/40',
  cancelled: 'text-red-400 border-red-400/30',
}

const TYPE_ICON: Record<string, string> = {
  marketing: '📣',
  playlist:  '🎵',
  blog:      '📝',
  press:     '📰',
  pre_save:  '💾',
}

const EMPTY_FORM = { campaign_type: 'marketing', title: '', status: 'planned', target_date: '', notes: '' }

interface Props { releaseId: string }

export default function CampaignTracker({ releaseId }: Props) {
  const { data: campaigns, isLoading } = useReleaseCampaigns(releaseId)
  const createMutation = useCreateCampaign(releaseId)
  const updateMutation = useUpdateCampaign(releaseId)
  const deleteMutation = useDeleteCampaign(releaseId)

  const [adding,   setAdding]   = useState(false)
  const [form,     setForm]     = useState({ ...EMPTY_FORM })
  const [editId,   setEditId]   = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Record<string, string>>({})

  const handleCreate = async () => {
    await createMutation.mutateAsync(form as Record<string, unknown>)
    setAdding(false)
    setForm({ ...EMPTY_FORM })
  }

  const startEdit = (c: any) => {
    setEditId(c.id)
    setEditForm({ status: c.status, notes: c.notes ?? '', target_date: c.target_date ?? '' })
  }

  const saveEdit = async () => {
    if (!editId) return
    await updateMutation.mutateAsync({ campaignId: editId, body: editForm })
    setEditId(null)
  }

  if (isLoading) return <LoadingSpinner />

  const list: any[] = campaigns ?? []

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 font-mono">
          {list.filter(c => c.status === 'active').length} ACTIVE
        </span>
        <button
          onClick={() => setAdding(true)}
          className="text-[10px] font-mono text-[#00d4ff] border border-[#00d4ff]/30 rounded px-2 py-1 hover:bg-[#00d4ff]/10"
        >
          + Add Campaign
        </button>
      </div>

      {adding && (
        <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <select
              value={form.campaign_type}
              onChange={e => setForm(f => ({ ...f, campaign_type: e.target.value }))}
              className="bg-[#111] border border-[#333] rounded px-2 py-1 text-xs text-white"
            >
              {['marketing','playlist','blog','press','pre_save'].map(t => (
                <option key={t} value={t}>{TYPE_ICON[t]} {t.replace(/_/g, ' ')}</option>
              ))}
            </select>
            <select
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              className="bg-[#111] border border-[#333] rounded px-2 py-1 text-xs text-white"
            >
              {['planned','active','paused','completed','cancelled'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <input
            placeholder="Campaign title *"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="w-full bg-[#111] border border-[#333] rounded px-2 py-1 text-xs text-white placeholder-gray-600"
          />
          <input
            type="date"
            value={form.target_date}
            onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))}
            className="w-full bg-[#111] border border-[#333] rounded px-2 py-1 text-xs text-white"
          />
          <input
            placeholder="Notes (optional)"
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            className="w-full bg-[#111] border border-[#333] rounded px-2 py-1 text-xs text-white placeholder-gray-600"
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={!form.title || createMutation.isPending}
              className="flex-1 bg-[#00d4ff]/20 text-[#00d4ff] text-xs py-1 rounded hover:bg-[#00d4ff]/30 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating…' : 'Create'}
            </button>
            <button
              onClick={() => setAdding(false)}
              className="flex-1 bg-[#222] text-gray-400 text-xs py-1 rounded hover:bg-[#333]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {list.length === 0 && !adding && (
        <div className="text-center text-gray-600 text-xs py-6">No campaigns yet</div>
      )}

      {list.map((c: any) => (
        <div key={c.id} className="bg-[#1a1a1a] border border-[#222] rounded-lg p-3">
          {editId === c.id ? (
            <div className="space-y-2">
              <select
                value={editForm.status}
                onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                className="w-full bg-[#111] border border-[#333] rounded px-2 py-1 text-xs text-white"
              >
                {['planned','active','paused','completed','cancelled'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <input
                type="date"
                value={editForm.target_date}
                onChange={e => setEditForm(f => ({ ...f, target_date: e.target.value }))}
                className="w-full bg-[#111] border border-[#333] rounded px-2 py-1 text-xs text-white"
              />
              <input
                placeholder="Notes"
                value={editForm.notes}
                onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full bg-[#111] border border-[#333] rounded px-2 py-1 text-xs text-white placeholder-gray-600"
              />
              <div className="flex gap-2">
                <button
                  onClick={saveEdit}
                  disabled={updateMutation.isPending}
                  className="flex-1 bg-[#00d4ff]/20 text-[#00d4ff] text-xs py-1 rounded disabled:opacity-50"
                >
                  {updateMutation.isPending ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => setEditId(null)}
                  className="flex-1 bg-[#222] text-gray-400 text-xs py-1 rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <span className="text-base mt-0.5">{TYPE_ICON[c.campaign_type] ?? '📌'}</span>
                <div>
                  <div className="text-white text-sm">{c.title}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[9px] font-mono uppercase border rounded px-1.5 py-0.5 ${STATUS_COLOR[c.status] ?? 'text-gray-500 border-gray-700'}`}>
                      {c.status}
                    </span>
                    {c.target_date && <span className="text-[10px] text-gray-600">{c.target_date}</span>}
                  </div>
                  {c.notes && <div className="text-[10px] text-gray-600 mt-1">{c.notes}</div>}
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => startEdit(c)}
                  className="text-[10px] text-gray-600 hover:text-gray-400 border border-[#333] rounded px-1.5 py-0.5"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteMutation.mutate(c.id)}
                  className="text-[10px] text-red-600 hover:text-red-400 border border-red-900/30 rounded px-1.5 py-0.5"
                >
                  ×
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
