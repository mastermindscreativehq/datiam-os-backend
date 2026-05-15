import { useEffect, useState, useCallback } from 'react'
import { releases as releasesApi } from '../api/client'

interface ChecklistData {
  id: string
  release_id: string
  lyrics_ready: boolean
  cover_art_ready: boolean
  mix_ready: boolean
  master_ready: boolean
  metadata_ready: boolean
  isrc_ready: boolean
  upc_ready: boolean
  distributor_ready: boolean
  release_date_ready: boolean
  promo_assets_ready: boolean
  sync_assets_ready: boolean
  final_approval: boolean
  notes: string | null
  readiness_status: string
  completion_percent: number
}

interface ChecklistItem {
  key: keyof Omit<ChecklistData, 'id' | 'release_id' | 'notes' | 'readiness_status' | 'completion_percent'>
  label: string
  required: boolean
}

const ITEMS: ChecklistItem[] = [
  { key: 'metadata_ready',      label: 'Metadata ready',           required: true  },
  { key: 'cover_art_ready',     label: 'Cover art ready',          required: true  },
  { key: 'mix_ready',           label: 'Mix approved',             required: true  },
  { key: 'master_ready',        label: 'Master approved',          required: true  },
  { key: 'distributor_ready',   label: 'Distributor confirmed',    required: true  },
  { key: 'release_date_ready',  label: 'Release date locked',      required: true  },
  { key: 'final_approval',      label: 'Final approval granted',   required: true  },
  { key: 'lyrics_ready',        label: 'Lyrics finalised',         required: false },
  { key: 'isrc_ready',          label: 'ISRC assigned',            required: false },
  { key: 'upc_ready',           label: 'UPC assigned',             required: false },
  { key: 'promo_assets_ready',  label: 'Promo assets ready',       required: false },
  { key: 'sync_assets_ready',   label: 'Sync assets ready',        required: false },
]

const REQUIRED_KEYS = ITEMS.filter(i => i.required).map(i => i.key)

const STATUS_COLOR: Record<string, string> = {
  ready_for_distribution: 'text-[#00ff41]',
  almost_ready:           'text-yellow-400',
  not_ready:              'text-gray-500',
}

const STATUS_LABEL: Record<string, string> = {
  ready_for_distribution: 'READY FOR DISTRIBUTION',
  almost_ready:           'ALMOST READY',
  not_ready:              'NOT READY',
}

interface Props {
  isOpen: boolean
  releaseId: string
  releaseTitle: string
  onClose: () => void
}

export default function ReleaseChecklistModal({ isOpen, releaseId, releaseTitle, onClose }: Props) {
  const [checklist, setChecklist] = useState<ChecklistData | null>(null)
  const [loading, setLoading]     = useState(false)
  const [saving,  setSaving]      = useState(false)
  const [notes,   setNotes]       = useState('')
  const [error,   setError]       = useState('')
  const [saved,   setSaved]       = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await releasesApi.getChecklist(releaseId)
      const data: ChecklistData = res.data?.data ?? res.data
      setChecklist(data)
      setNotes(data.notes ?? '')
    } catch {
      setError('Failed to load checklist.')
    } finally {
      setLoading(false)
    }
  }, [releaseId])

  useEffect(() => {
    if (isOpen) load()
  }, [isOpen, load])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, saving, onClose])

  const toggle = async (key: keyof ChecklistData) => {
    if (!checklist || saving) return
    const next = { ...checklist, [key]: !checklist[key as keyof ChecklistData] }
    setChecklist(next as ChecklistData)
  }

  const handleSave = async () => {
    if (!checklist || saving) return
    setSaving(true); setError(''); setSaved(false)
    try {
      const body: Record<string, unknown> = { notes: notes || null }
      for (const item of ITEMS) {
        body[item.key] = checklist[item.key]
      }
      const res = await releasesApi.updateChecklist(releaseId, body)
      const updated: ChecklistData = res.data?.data ?? res.data
      setChecklist(updated)
      setNotes(updated.notes ?? '')
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save checklist.')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  const missingRequired = checklist
    ? REQUIRED_KEYS.filter(k => !checklist[k])
    : []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={() => !saving && onClose()}
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-lg bg-[#0a0a0f] border border-[#00d4ff]/20 rounded-lg shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-white/5">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-1 h-5 bg-[#00d4ff] rounded-full" />
              <h2 className="text-sm font-bold font-mono text-[#00d4ff] tracking-[0.2em]">RELEASE CHECKLIST</h2>
            </div>
            <p className="text-[10px] font-mono text-gray-600 tracking-widest ml-3 truncate max-w-xs">{releaseTitle.toUpperCase()}</p>
          </div>
          <button
            onClick={() => !saving && onClose()}
            className="text-gray-600 hover:text-gray-400 font-mono text-lg leading-none mt-0.5"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading && (
            <div className="text-center text-gray-600 font-mono text-[11px] tracking-widest py-8">LOADING...</div>
          )}

          {!loading && error && (
            <div className="text-red-400 font-mono text-[11px] tracking-wide border border-red-500/20 rounded px-3 py-2">{error}</div>
          )}

          {!loading && checklist && (
            <>
              {/* Status bar */}
              <div className="flex items-center justify-between border border-white/5 rounded px-3 py-2.5 bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <div className="text-[10px] font-mono text-gray-500 tracking-widest">READINESS</div>
                  <div className={`text-[10px] font-mono font-bold tracking-widest ${STATUS_COLOR[checklist.readiness_status] ?? 'text-gray-500'}`}>
                    {STATUS_LABEL[checklist.readiness_status] ?? checklist.readiness_status.toUpperCase()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-mono text-[#00d4ff] font-bold">{checklist.completion_percent}%</div>
                  <div className="w-24 h-1 bg-white/10 rounded-full mt-1 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${checklist.completion_percent}%`,
                        background: checklist.completion_percent === 100 ? '#00ff41' : checklist.completion_percent >= 60 ? '#facc15' : '#00d4ff',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Missing required items */}
              {missingRequired.length > 0 && (
                <div className="border border-yellow-500/20 rounded px-3 py-2 bg-yellow-500/5">
                  <div className="text-[10px] font-mono text-yellow-400 tracking-widest mb-1">REQUIRED TO SCHEDULE</div>
                  {missingRequired.map(k => {
                    const item = ITEMS.find(i => i.key === k)!
                    return (
                      <div key={k} className="text-[10px] font-mono text-gray-500 tracking-wide">· {item.label}</div>
                    )
                  })}
                </div>
              )}

              {/* Checklist items — required first, then optional */}
              <div>
                <div className="text-[10px] font-mono text-gray-600 tracking-widest mb-2">REQUIRED ITEMS</div>
                <div className="space-y-1">
                  {ITEMS.filter(i => i.required).map(item => (
                    <CheckRow
                      key={item.key}
                      label={item.label}
                      required
                      checked={!!checklist[item.key]}
                      onToggle={() => toggle(item.key)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-mono text-gray-600 tracking-widest mb-2">OPTIONAL ITEMS</div>
                <div className="space-y-1">
                  {ITEMS.filter(i => !i.required).map(item => (
                    <CheckRow
                      key={item.key}
                      label={item.label}
                      required={false}
                      checked={!!checklist[item.key]}
                      onToggle={() => toggle(item.key)}
                    />
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[10px] font-mono text-gray-600 tracking-widest mb-1.5">NOTES</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Optional notes..."
                  className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-[12px] font-mono text-gray-300 placeholder-gray-700 focus:outline-none focus:border-[#00d4ff]/40 resize-none"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-white/5">
          <div className="text-[10px] font-mono text-[#00ff41] tracking-widest min-h-[14px]">
            {saved ? 'SAVED' : ''}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => !saving && onClose()}
              disabled={saving}
              className="text-[10px] font-mono tracking-widest px-4 py-2 border border-white/10 text-gray-500 hover:text-gray-400 rounded transition-colors disabled:opacity-50"
            >
              CLOSE
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading || !checklist}
              className="text-[10px] font-mono tracking-widest px-5 py-2 border border-[#00d4ff]/40 text-[#00d4ff] hover:bg-[#00d4ff]/10 rounded transition-colors disabled:opacity-50"
            >
              {saving ? 'SAVING...' : 'SAVE CHECKLIST'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function CheckRow({
  label,
  required,
  checked,
  onToggle,
}: {
  label: string
  required: boolean
  checked: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center justify-between px-3 py-2 rounded border transition-colors text-left ${
        checked
          ? 'border-[#00ff41]/20 bg-[#00ff41]/5'
          : 'border-white/5 bg-white/[0.01] hover:bg-white/[0.03]'
      }`}
    >
      <div className="flex items-center gap-2.5">
        <div
          className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
            checked ? 'border-[#00ff41] bg-[#00ff41]/20' : 'border-white/20'
          }`}
        >
          {checked && <span className="text-[#00ff41] text-[8px] leading-none">✓</span>}
        </div>
        <span className={`text-[11px] font-mono tracking-wide ${checked ? 'text-gray-300' : 'text-gray-500'}`}>
          {label}
        </span>
      </div>
      {required && (
        <span className={`text-[9px] font-mono tracking-widest ${checked ? 'text-[#00ff41]/50' : 'text-yellow-500/60'}`}>
          REQUIRED
        </span>
      )}
    </button>
  )
}
