import { useQuery } from '@tanstack/react-query'
import { deals } from '../../api/client'
import WidgetSkeleton from './WidgetSkeleton'

const STAGE_ORDER = ['prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost']
const STAGE_COLORS: Record<string, string> = {
  prospecting:   'bg-gray-500',
  qualification: 'bg-[#00d4ff]',
  proposal:      'bg-purple-400',
  negotiation:   'bg-orange-400',
  closed_won:    'bg-[#00ff41]',
  closed_lost:   'bg-red-400',
}
const STAGE_LABEL: Record<string, string> = {
  prospecting:   'PROSPECTING',
  qualification: 'QUALIFICATION',
  proposal:      'PROPOSAL',
  negotiation:   'NEGOTIATION',
  closed_won:    'WON',
  closed_lost:   'LOST',
}

export default function DealPipelineWidget() {
  const analyticsQ = useQuery({
    queryKey: ['deals', 'analytics'],
    queryFn: () => deals.analytics().then(r => r.data?.data ?? r.data),
    staleTime: 120_000,
    retry: 2,
  })

  const listQ = useQuery({
    queryKey: ['deals', 'list', 5],
    queryFn: () => deals.list(5).then(r => {
      const payload = r.data?.data ?? r.data
      return Array.isArray(payload) ? payload : (payload?.deals ?? [])
    }),
    staleTime: 90_000,
    retry: 2,
  })

  const isPending = analyticsQ.isPending || listQ.isPending
  const isError = analyticsQ.isError && listQ.isError

  if (isPending) return <WidgetSkeleton type="pipeline" rows={5} />

  if (isError) {
    return (
      <div className="px-5 py-5 flex items-center justify-between">
        <span className="text-[11px] font-mono text-yellow-400/60 tracking-widest">⚠ Deal pipeline unavailable</span>
        <button
          onClick={() => { analyticsQ.refetch(); listQ.refetch() }}
          className="text-[10px] font-mono text-yellow-400/40 hover:text-yellow-400 tracking-widest"
        >
          RETRY
        </button>
      </div>
    )
  }

  const analytics = analyticsQ.data ?? {}
  const recentDeals: any[] = listQ.data ?? []

  const totalDeals = Number(analytics.total_deals ?? 0)
  const pipelineValue = Number(analytics.pipeline_value ?? analytics.total_value ?? 0)
  const wonDeals = Number(analytics.won_deals ?? analytics.closed_won ?? 0)
  const byStage: Record<string, number> = analytics.by_stage ?? {}

  const maxCount = Math.max(1, ...Object.values(byStage).map(Number))

  if (totalDeals === 0 && recentDeals.length === 0) {
    return (
      <div className="px-5 py-8 text-center">
        <div className="text-2xl text-[#00d4ff]/10 mb-3">◆</div>
        <p className="text-[10px] font-mono text-gray-700 tracking-widest">NO DEALS IN PIPELINE</p>
        <p className="text-[10px] font-mono text-gray-800 mt-1 tracking-wider">Deals are created automatically from completed meetings</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-[#111]">
      {/* Summary row */}
      <div className="px-5 py-3 grid grid-cols-3 gap-4">
        <div>
          <div className="text-[9px] font-mono text-gray-600 tracking-widest mb-0.5">TOTAL DEALS</div>
          <div className="text-lg font-bold font-mono text-[#00d4ff] tabular-nums">{totalDeals}</div>
        </div>
        <div>
          <div className="text-[9px] font-mono text-gray-600 tracking-widest mb-0.5">PIPELINE VALUE</div>
          <div className="text-lg font-bold font-mono text-fuchsia-400 tabular-nums">
            {pipelineValue > 0 ? `$${pipelineValue.toLocaleString()}` : '—'}
          </div>
        </div>
        <div>
          <div className="text-[9px] font-mono text-gray-600 tracking-widest mb-0.5">WON</div>
          <div className="text-lg font-bold font-mono text-[#00ff41] tabular-nums">{wonDeals}</div>
        </div>
      </div>

      {/* Pipeline stages */}
      {Object.keys(byStage).length > 0 && (
        <div className="px-5 py-3 space-y-2">
          <div className="text-[9px] font-mono text-gray-700 tracking-widest mb-2">PIPELINE STAGES</div>
          {STAGE_ORDER.filter(s => byStage[s] != null).map(stage => {
            const count = Number(byStage[stage] ?? 0)
            const pct = Math.round((count / maxCount) * 100)
            const color = STAGE_COLORS[stage] ?? 'bg-gray-500'
            return (
              <div key={stage} className="flex items-center gap-3">
                <span className="text-[9px] font-mono text-gray-600 w-24 flex-shrink-0 tracking-wider">{STAGE_LABEL[stage] ?? stage.toUpperCase()}</span>
                <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
                </div>
                <span className="text-[10px] font-mono text-gray-500 w-6 text-right tabular-nums">{count}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Recent deals */}
      {recentDeals.length > 0 && (
        <div className="divide-y divide-[#0f0f0f]">
          {recentDeals.map((d: any) => {
            const stageColor = (STAGE_COLORS[d.stage?.toLowerCase()] ?? 'bg-gray-500').replace('bg-', 'text-')
            return (
              <div key={d.id} className="px-5 py-2.5 flex items-center gap-3 hover:bg-white/[0.015] transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-mono text-gray-200 truncate">{d.title ?? d.name ?? 'Deal'}</div>
                  <div className="text-[10px] font-mono text-gray-600 mt-0.5">
                    {d.company ?? d.contact_name ?? '—'}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  {d.value != null && (
                    <div className="text-[11px] font-mono text-fuchsia-400 tabular-nums">${Number(d.value).toLocaleString()}</div>
                  )}
                  <div className={`text-[9px] font-mono tracking-wider ${stageColor}`}>
                    {(d.stage ?? '—').toUpperCase()}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
