import { useQuery } from '@tanstack/react-query'
import { dashboard } from '../../api/client'
import WidgetSkeleton from './WidgetSkeleton'

function n(v: unknown, prefix = ''): string {
  const num = Number(v)
  return v == null || isNaN(num) ? '—' : prefix + num.toLocaleString()
}

export default function TodaysOverview() {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn: () => dashboard.overview().then(r => r.data?.data ?? r.data),
    staleTime: 60_000,
    retry: 2,
  })

  if (isPending) return <WidgetSkeleton type="stats" rows={8} />

  if (isError) {
    return (
      <div className="px-5 py-5 flex items-center justify-between">
        <span className="text-[11px] font-mono text-yellow-400/60 tracking-widest">⚠ Overview unavailable</span>
        <button
          onClick={() => refetch()}
          className="text-[10px] font-mono text-yellow-400/40 hover:text-yellow-400 tracking-widest transition-colors"
        >
          RETRY
        </button>
      </div>
    )
  }

  const d = data ?? {}

  const kpis = [
    { label: 'TOTAL FANS',   value: n(d.fans?.total),             color: 'text-[#00ff41]',  icon: '◈', sub: 'registered audience' },
    { label: 'CATALOG',      value: n(d.songs?.total),             color: 'text-[#00d4ff]',  icon: '◉', sub: `${n(d.songs?.released)} released` },
    { label: 'LIVE',         value: n(d.releases?.live),           color: 'text-[#00d4ff]',  icon: '◎', sub: 'releases active' },
    { label: 'UPCOMING',     value: n(d.releases?.upcoming),       color: 'text-purple-400', icon: '◷', sub: 'scheduled releases' },
    { label: 'SYNC PITCHES', value: n(d.sync_pitches?.active),     color: 'text-orange-400', icon: '⬢', sub: 'active pitches' },
    { label: 'WIN RATE',     value: d.sync_pitches?.win_rate != null ? `${d.sync_pitches.win_rate}%` : '—', color: 'text-[#00ff41]', icon: '↑', sub: 'sync success' },
    { label: 'TASKS',        value: n(d.tasks?.pending),           color: 'text-yellow-400', icon: '◷', sub: 'pending tasks' },
    { label: 'AUTOMATION',   value: n(d.automation?.successful),   color: 'text-purple-400', icon: '⚡', sub: 'successful runs' },
    { label: 'REVENUE',      value: n(d.revenue_summary?.total_tracked, '$'), color: 'text-fuchsia-400', icon: '◆', sub: 'gross tracked', wide: true },
    { label: 'THIS MONTH',   value: n(d.revenue_summary?.monthly, '$'), color: 'text-fuchsia-400', icon: '◆', sub: `${d.revenue_summary?.currency ?? 'USD'}`, wide: true },
  ]

  return (
    <div className="p-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
      {kpis.map(({ label, value, color, icon, sub, wide }) => (
        <div
          key={label}
          className={`bg-[#0d0d0d] border border-white/[0.04] rounded-md p-3 ${(wide as boolean | undefined) ? 'col-span-2 sm:col-span-2' : ''}`}
        >
          <div className="flex items-start justify-between mb-2">
            <span className="text-[9px] font-mono tracking-[0.22em] text-gray-600 uppercase">{label}</span>
            <span className={`text-sm ${color} opacity-40`}>{icon}</span>
          </div>
          <div className={`text-xl font-bold font-mono ${color} leading-none tabular-nums`}>{value}</div>
          <div className="text-[9px] text-gray-700 mt-1.5 font-mono tracking-wider">{sub}</div>
        </div>
      ))}
    </div>
  )
}
