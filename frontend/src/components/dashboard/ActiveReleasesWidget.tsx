import { useQuery } from '@tanstack/react-query'
import { releases } from '../../api/client'
import WidgetSkeleton from './WidgetSkeleton'

const STATUS_COLORS: Record<string, string> = {
  live:       'text-[#00ff41] bg-[#00ff41]/10',
  upcoming:   'text-[#00d4ff] bg-[#00d4ff]/10',
  draft:      'text-gray-500 bg-white/5',
  archived:   'text-gray-700 bg-white/5',
  scheduled:  'text-purple-400 bg-purple-400/10',
}

function badge(status: string) {
  const cls = STATUS_COLORS[status?.toLowerCase()] ?? 'text-gray-500 bg-white/5'
  return (
    <span className={`text-[9px] font-mono tracking-widest px-1.5 py-0.5 rounded ${cls}`}>
      {(status ?? 'unknown').toUpperCase()}
    </span>
  )
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return '—'
  }
}

export default function ActiveReleasesWidget() {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['releases', 'list'],
    queryFn: () => releases.list().then(r => r.data?.data ?? r.data),
    staleTime: 90_000,
    retry: 2,
  })

  if (isPending) return <WidgetSkeleton rows={4} />

  if (isError) {
    return (
      <div className="px-5 py-5 flex items-center justify-between">
        <span className="text-[11px] font-mono text-yellow-400/60 tracking-widest">⚠ Releases unavailable</span>
        <button onClick={() => refetch()} className="text-[10px] font-mono text-yellow-400/40 hover:text-yellow-400 tracking-widest">RETRY</button>
      </div>
    )
  }

  const items: any[] = Array.isArray(data) ? data : (data?.releases ?? [])
  const active = items
    .filter((r: any) => ['live', 'upcoming', 'scheduled'].includes(r.status?.toLowerCase()))
    .slice(0, 6)

  if (active.length === 0) {
    return (
      <div className="px-5 py-8 text-center">
        <div className="text-2xl text-[#00d4ff]/10 mb-3">◎</div>
        <p className="text-[10px] font-mono text-gray-700 tracking-widest">NO ACTIVE RELEASES</p>
        <p className="text-[10px] font-mono text-gray-800 mt-1 tracking-wider">Create a release to see it here</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-[#111]">
      {active.map((r: any) => (
        <div key={r.id} className="px-5 py-3 flex items-center gap-3 hover:bg-white/[0.015] transition-colors">
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-mono text-gray-200 truncate">{r.title ?? r.name ?? 'Untitled'}</div>
            <div className="text-[10px] font-mono text-gray-600 mt-0.5">
              {r.artist_name ?? r.type ?? ''}{r.release_date ? ` · ${fmtDate(r.release_date)}` : ''}
            </div>
          </div>
          {badge(r.status)}
        </div>
      ))}
    </div>
  )
}
