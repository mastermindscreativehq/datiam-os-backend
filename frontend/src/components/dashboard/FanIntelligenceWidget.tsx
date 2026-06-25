import { useQuery } from '@tanstack/react-query'
import { fanIntelligence } from '../../api/client'
import WidgetSkeleton from './WidgetSkeleton'

function bar(pct: number, color: string) {
  return (
    <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden mt-1.5">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  )
}

export default function FanIntelligenceWidget() {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['fan-intelligence', 'summary'],
    queryFn: () => fanIntelligence.summary().then(r => r.data?.data ?? r.data),
    staleTime: 120_000,
    retry: 2,
  })

  if (isPending) return <WidgetSkeleton type="stats" rows={4} />

  if (isError) {
    return (
      <div className="px-5 py-5 flex items-center justify-between">
        <span className="text-[11px] font-mono text-yellow-400/60 tracking-widest">⚠ Fan data unavailable</span>
        <button onClick={() => refetch()} className="text-[10px] font-mono text-yellow-400/40 hover:text-yellow-400 tracking-widest">RETRY</button>
      </div>
    )
  }

  const d = data ?? {}
  const total: number = Number(d.total_fans ?? d.total ?? 0)
  const active: number = Number(d.active_fans ?? d.active ?? 0)
  const growth: number = Number(d.growth_rate ?? d.growth ?? 0)
  const engagement: number = Number(d.engagement_avg ?? d.engagement_rate ?? 0)
  const activePct = total > 0 ? Math.round((active / total) * 100) : 0

  if (total === 0 && active === 0) {
    return (
      <div className="px-5 py-8 text-center">
        <div className="text-2xl text-[#00ff41]/10 mb-3">◈</div>
        <p className="text-[10px] font-mono text-gray-700 tracking-widest">NO FAN DATA YET</p>
        <p className="text-[10px] font-mono text-gray-800 mt-1 tracking-wider">Fan intelligence activates once fans are recorded</p>
      </div>
    )
  }

  const metrics = [
    { label: 'TOTAL FANS',   value: total.toLocaleString(),          color: 'text-[#00ff41]',  bar: 'bg-[#00ff41]', pct: 100 },
    { label: 'ACTIVE FANS',  value: active.toLocaleString(),         color: 'text-[#00d4ff]',  bar: 'bg-[#00d4ff]', pct: activePct },
    { label: 'GROWTH RATE',  value: `${growth > 0 ? '+' : ''}${growth}%`, color: growth >= 0 ? 'text-[#00ff41]' : 'text-red-400', bar: growth >= 0 ? 'bg-[#00ff41]' : 'bg-red-400', pct: Math.min(100, Math.abs(growth) * 5) },
    { label: 'ENGAGEMENT',   value: `${engagement}%`,                color: 'text-purple-400', bar: 'bg-purple-400', pct: engagement },
  ]

  return (
    <div className="p-4 grid grid-cols-2 gap-3">
      {metrics.map(m => (
        <div key={m.label} className="bg-[#0d0d0d] border border-white/[0.04] rounded-md p-3">
          <div className="text-[9px] font-mono tracking-[0.2em] text-gray-600 mb-1">{m.label}</div>
          <div className={`text-xl font-bold font-mono ${m.color} tabular-nums`}>{m.value}</div>
          {bar(m.pct, m.bar)}
        </div>
      ))}
    </div>
  )
}
