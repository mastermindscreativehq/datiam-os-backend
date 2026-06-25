import { useQuery } from '@tanstack/react-query'
import { missionControl } from '../../api/client'
import WidgetCard from '../dashboard/WidgetCard'
import WidgetSkeleton from '../dashboard/WidgetSkeleton'
import { WidgetErrorBoundary } from '../dashboard/WidgetErrorBoundary'
import { Link } from 'react-router-dom'

function ScoreBar({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div className="w-full h-0.5 bg-white/5 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

function FeedContent() {
  const { data, isLoading } = useQuery({
    queryKey: ['mission-opportunities'],
    queryFn: async () => {
      const res = await missionControl.brief()
      return res.data?.data?.opportunityFeed
    },
    staleTime: 60_000,
  })

  if (isLoading) return <WidgetSkeleton type="list" rows={6} />

  const syncOpps: any[] = data?.syncOpportunities ?? []
  const openDeals: any[] = data?.openDeals ?? []

  return (
    <div className="divide-y divide-[#111]">
      {/* Sync Opportunities */}
      {syncOpps.length > 0 && (
        <div className="p-4">
          <div className="text-[9px] font-mono text-yellow-400/50 tracking-[0.25em] mb-3">SYNC OPPORTUNITIES</div>
          <div className="space-y-3">
            {syncOpps.slice(0, 4).map((s: any, i: number) => (
              <Link key={i} to="/sync-pitches" className="group block">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-mono text-white/80 group-hover:text-yellow-400 truncate transition-colors">
                    {s.song_title ?? 'Sync Opportunity'}
                  </span>
                  {s.score && (
                    <span className="text-[10px] font-mono text-yellow-400/70 flex-shrink-0 ml-2">
                      {Math.round(Number(s.score))}%
                    </span>
                  )}
                </div>
                <div className="text-[9px] font-mono text-gray-600 mb-1.5">
                  {[s.supervisor_name, s.company_name].filter(Boolean).join(' · ')}
                </div>
                {s.score && <ScoreBar value={Number(s.score)} color="bg-yellow-400" />}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Open Deals */}
      {openDeals.length > 0 && (
        <div className="p-4">
          <div className="text-[9px] font-mono text-[#00d4ff]/50 tracking-[0.25em] mb-3">OPEN DEALS</div>
          <div className="space-y-3">
            {openDeals.slice(0, 4).map((d: any, i: number) => (
              <Link key={i} to="/deal-intelligence" className="group block">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-mono text-white/80 group-hover:text-[#00d4ff] truncate transition-colors">
                    {d.title ?? 'Open Deal'}
                  </span>
                  {d.deal_score && (
                    <span className="text-[10px] font-mono text-[#00d4ff]/70 flex-shrink-0 ml-2">
                      {Math.round(Number(d.deal_score) * 100)}%
                    </span>
                  )}
                </div>
                <div className="text-[9px] font-mono text-gray-600 mb-1.5">
                  {[String(d.stage ?? '').replace(/_/g, ' '), d.company_name].filter(Boolean).join(' · ')}
                </div>
                {d.deal_score && <ScoreBar value={Number(d.deal_score) * 100} color="bg-[#00d4ff]" />}
              </Link>
            ))}
          </div>
        </div>
      )}

      {syncOpps.length === 0 && openDeals.length === 0 && (
        <div className="px-5 py-8 text-center">
          <div className="text-yellow-400/20 text-2xl mb-2">◇</div>
          <div className="text-[11px] font-mono text-gray-600 tracking-widest">NO ACTIVE OPPORTUNITIES</div>
        </div>
      )}
    </div>
  )
}

export default function OpportunityFeed() {
  return (
    <WidgetCard title="OPPORTUNITY FEED" accent="yellow" href="/sync-pitches">
      <WidgetErrorBoundary title="OPPORTUNITY FEED">
        <FeedContent />
      </WidgetErrorBoundary>
    </WidgetCard>
  )
}
