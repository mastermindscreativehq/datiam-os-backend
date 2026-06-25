import { useQuery } from '@tanstack/react-query'
import { activity } from '../../api/client'
import WidgetSkeleton from './WidgetSkeleton'

const ACTION_DOT: Record<string, string> = {
  CREATE: 'bg-[#00ff41]',
  UPDATE: 'bg-[#00d4ff]',
  DELETE: 'bg-red-400',
  LOGIN:  'bg-purple-400',
}

const ACTION_COLOR: Record<string, string> = {
  CREATE: 'text-[#00ff41]',
  UPDATE: 'text-[#00d4ff]',
  DELETE: 'text-red-400',
  LOGIN:  'text-purple-400',
}

function relTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function RecentActivityWidget() {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['activity', 'recent'],
    queryFn: () => activity.recent().then(r => r.data?.data ?? r.data),
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 2,
  })

  if (isPending) return <WidgetSkeleton type="activity" rows={8} />

  if (isError) {
    return (
      <div className="px-5 py-5 flex items-center justify-between">
        <span className="text-[11px] font-mono text-yellow-400/60 tracking-widest">⚠ Activity unavailable</span>
        <button onClick={() => refetch()} className="text-[10px] font-mono text-yellow-400/40 hover:text-yellow-400 tracking-widest">RETRY</button>
      </div>
    )
  }

  const log: any[] = Array.isArray(data) ? data : []

  if (log.length === 0) {
    return (
      <div className="px-5 py-8 text-center">
        <div className="text-2xl text-[#00ff41]/10 mb-3">◎</div>
        <p className="text-[10px] font-mono text-gray-700 tracking-widest">NO ACTIVITY RECORDED</p>
        <p className="text-[10px] font-mono text-gray-800 mt-1 tracking-wider">System actions will appear here</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-[#111]">
      {log.slice(0, 20).map((entry: any) => (
        <div key={entry.id} className="px-5 py-3 flex items-center gap-4 hover:bg-white/[0.015] transition-colors">
          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ACTION_DOT[entry.action] ?? 'bg-gray-600'}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-mono font-bold tracking-widest ${ACTION_COLOR[entry.action] ?? 'text-gray-500'}`}>
                {entry.action}
              </span>
              <span className="text-[11px] font-mono text-gray-400 truncate">
                {entry.entity_name ?? entry.entity_id ?? entry.entity_type}
              </span>
              <span className="text-[10px] font-mono text-gray-700 tracking-widest">
                [{entry.entity_type}]
              </span>
            </div>
            <div className="text-[10px] font-mono text-gray-700 mt-0.5">
              {entry.user_name ?? entry.user_email ?? '—'}
            </div>
          </div>
          <div className="text-[10px] font-mono text-gray-700 flex-shrink-0 whitespace-nowrap">
            {relTime(entry.created_at)}
          </div>
        </div>
      ))}
    </div>
  )
}
