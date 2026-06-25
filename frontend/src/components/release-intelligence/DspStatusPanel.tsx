import { useState } from 'react'
import { useDspStatuses, useUpdateDspStatus } from '../../hooks/useReleaseIntelligence'
import LoadingSpinner from '../LoadingSpinner'

const DSP_STATUS_COLOR: Record<string, string> = {
  not_submitted: 'text-gray-500',
  submitted:     'text-[#00d4ff]',
  processing:    'text-yellow-400',
  live:          'text-[#00ff41]',
  rejected:      'text-red-400',
  taken_down:    'text-red-600',
}

const DSP_ICON: Record<string, string> = {
  spotify:       '🟢',
  apple_music:   '🎵',
  youtube_music: '▶',
  audiomack:     '🎧',
  boomplay:      '🎶',
  tidal:         '🌊',
  amazon_music:  '📦',
  deezer:        '🎸',
}

interface Props { releaseId: string }

export default function DspStatusPanel({ releaseId }: Props) {
  const { data: dsps, isLoading } = useDspStatuses(releaseId)
  const updateMutation = useUpdateDspStatus(releaseId)
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState<Record<string, string>>({})

  const startEdit = (dsp: any) => {
    setEditing(dsp.platform)
    setForm({ status: dsp.status, url: dsp.url ?? '', notes: dsp.notes ?? '' })
  }

  const save = async (platform: string) => {
    await updateMutation.mutateAsync({ platform, body: form })
    setEditing(null)
  }

  if (isLoading) return <LoadingSpinner />

  const statuses: any[] = dsps ?? []
  const live = statuses.filter((d: any) => d.status === 'live').length

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500 font-mono flex-shrink-0">{live}/{statuses.length} LIVE</span>
        <div className="h-1 flex-1 bg-[#1a1a1a] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#00ff41] rounded-full transition-all"
            style={{ width: `${statuses.length ? (live / statuses.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      <div className="space-y-2">
        {statuses.map((dsp: any) => (
          <div key={dsp.platform} className="bg-[#1a1a1a] border border-[#222] rounded-lg p-3">
            {editing === dsp.platform ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <span>{DSP_ICON[dsp.platform] ?? '🎵'}</span>
                  <span className="text-white text-sm font-medium capitalize">{dsp.platform.replace(/_/g, ' ')}</span>
                </div>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full bg-[#111] border border-[#333] rounded px-2 py-1 text-xs text-white"
                >
                  {['not_submitted','submitted','processing','live','rejected','taken_down'].map(s => (
                    <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                  ))}
                </select>
                <input
                  placeholder="URL (optional)"
                  value={form.url}
                  onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                  className="w-full bg-[#111] border border-[#333] rounded px-2 py-1 text-xs text-white placeholder-gray-600"
                />
                <input
                  placeholder="Notes (optional)"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full bg-[#111] border border-[#333] rounded px-2 py-1 text-xs text-white placeholder-gray-600"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => save(dsp.platform)}
                    disabled={updateMutation.isPending}
                    className="flex-1 bg-[#00d4ff]/20 text-[#00d4ff] text-xs py-1 rounded hover:bg-[#00d4ff]/30 disabled:opacity-50"
                  >
                    {updateMutation.isPending ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    onClick={() => setEditing(null)}
                    className="flex-1 bg-[#222] text-gray-400 text-xs py-1 rounded hover:bg-[#333]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">{DSP_ICON[dsp.platform] ?? '🎵'}</span>
                  <div>
                    <div className="text-white text-sm capitalize">{dsp.platform.replace(/_/g, ' ')}</div>
                    {dsp.url && (
                      <a href={dsp.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#00d4ff] hover:underline">
                        View →
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-mono uppercase ${DSP_STATUS_COLOR[dsp.status] ?? 'text-gray-500'}`}>
                    {dsp.status.replace(/_/g, ' ')}
                  </span>
                  <button
                    onClick={() => startEdit(dsp)}
                    className="text-[10px] text-gray-600 hover:text-gray-400 border border-[#333] rounded px-2 py-0.5"
                  >
                    Edit
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
