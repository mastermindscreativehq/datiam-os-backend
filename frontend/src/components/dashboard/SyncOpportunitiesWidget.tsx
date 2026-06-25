import { useQuery } from '@tanstack/react-query'
import { syncPitches } from '../../api/client'
import WidgetSkeleton from './WidgetSkeleton'

const STATUS_BADGE: Record<string, string> = {
  active:   'text-[#00ff41] bg-[#00ff41]/10',
  pending:  'text-yellow-400 bg-yellow-400/10',
  won:      'text-[#00d4ff] bg-[#00d4ff]/10',
  lost:     'text-red-400 bg-red-400/10',
  draft:    'text-gray-500 bg-white/5',
}

export default function SyncOpportunitiesWidget() {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['sync-pitches', 'list'],
    queryFn: () => syncPitches.list().then(r => r.data?.data ?? r.data),
    staleTime: 90_000,
    retry: 2,
  })

  if (isPending) return <WidgetSkeleton rows={4} />

  if (isError) {
    return (
      <div className="px-5 py-5 flex items-center justify-between">
        <span className="text-[11px] font-mono text-yellow-400/60 tracking-widest">⚠ Sync data unavailable</span>
        <button onClick={() => refetch()} className="text-[10px] font-mono text-yellow-400/40 hover:text-yellow-400 tracking-widest">RETRY</button>
      </div>
    )
  }

  const items: any[] = Array.isArray(data) ? data : (data?.pitches ?? [])
  const active = items.filter((p: any) => ['active', 'pending'].includes(p.status?.toLowerCase()))

  if (active.length === 0) {
    return (
      <div className="px-5 py-8 text-center">
        <div className="text-2xl text-orange-400/10 mb-3">⬢</div>
        <p className="text-[10px] font-mono text-gray-700 tracking-widest">NO ACTIVE PITCHES</p>
        <p className="text-[10px] font-mono text-gray-800 mt-1 tracking-wider">Add a sync pitch to track opportunities</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-[#111]">
      {active.slice(0, 6).map((p: any) => {
        const cls = STATUS_BADGE[p.status?.toLowerCase()] ?? 'text-gray-500 bg-white/5'
        return (
          <div key={p.id} className="px-5 py-3 flex items-center gap-3 hover:bg-white/[0.015] transition-colors">
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-mono text-gray-200 truncate">{p.title ?? p.song_title ?? 'Untitled'}</div>
              <div className="text-[10px] font-mono text-gray-600 mt-0.5">
                {p.company ?? p.supervisor ?? p.contact_name ?? '—'}
              </div>
            </div>
            <span className={`text-[9px] font-mono tracking-widest px-1.5 py-0.5 rounded flex-shrink-0 ${cls}`}>
              {(p.status ?? 'unknown').toUpperCase()}
            </span>
          </div>
        )
      })}
    </div>
  )
}
