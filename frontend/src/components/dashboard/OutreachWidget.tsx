import { useQuery } from '@tanstack/react-query'
import { outreach } from '../../api/client'
import WidgetSkeleton from './WidgetSkeleton'

const STATUS_BADGE: Record<string, string> = {
  active:    'text-[#00ff41] bg-[#00ff41]/10',
  draft:     'text-gray-500 bg-white/5',
  paused:    'text-yellow-400 bg-yellow-400/10',
  completed: 'text-[#00d4ff] bg-[#00d4ff]/10',
  sent:      'text-[#00d4ff] bg-[#00d4ff]/10',
  scheduled: 'text-purple-400 bg-purple-400/10',
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return ''
  try {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

export default function OutreachWidget() {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['outreach', 'campaigns'],
    queryFn: () => outreach.listCampaigns().then(r => r.data?.data ?? r.data),
    staleTime: 90_000,
    retry: 2,
  })

  if (isPending) return <WidgetSkeleton rows={4} />

  if (isError) {
    return (
      <div className="px-5 py-5 flex items-center justify-between">
        <span className="text-[11px] font-mono text-yellow-400/60 tracking-widest">⚠ Campaigns unavailable</span>
        <button onClick={() => refetch()} className="text-[10px] font-mono text-yellow-400/40 hover:text-yellow-400 tracking-widest">RETRY</button>
      </div>
    )
  }

  const items: any[] = Array.isArray(data) ? data : (data?.campaigns ?? [])

  if (items.length === 0) {
    return (
      <div className="px-5 py-8 text-center">
        <div className="text-2xl text-[#00d4ff]/10 mb-3">◉</div>
        <p className="text-[10px] font-mono text-gray-700 tracking-widest">NO CAMPAIGNS YET</p>
        <p className="text-[10px] font-mono text-gray-800 mt-1 tracking-wider">Create an outreach campaign to get started</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-[#111]">
      {items.slice(0, 6).map((c: any) => {
        const cls = STATUS_BADGE[c.status?.toLowerCase()] ?? 'text-gray-500 bg-white/5'
        const sent = Number(c.emails_sent ?? c.sent_count ?? 0)
        const replies = Number(c.reply_count ?? c.replies ?? 0)
        return (
          <div key={c.id} className="px-5 py-3 flex items-center gap-3 hover:bg-white/[0.015] transition-colors">
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-mono text-gray-200 truncate">{c.name ?? c.title ?? 'Campaign'}</div>
              <div className="text-[10px] font-mono text-gray-600 mt-0.5">
                {sent > 0 && `${sent} sent`}{replies > 0 && ` · ${replies} replies`}
                {fmtDate(c.created_at) && ` · ${fmtDate(c.created_at)}`}
              </div>
            </div>
            <span className={`text-[9px] font-mono tracking-widest px-1.5 py-0.5 rounded flex-shrink-0 ${cls}`}>
              {(c.status ?? 'DRAFT').toUpperCase()}
            </span>
          </div>
        )
      })}
    </div>
  )
}
