import { useQuery } from '@tanstack/react-query'
import { missionControl } from '../../api/client'
import WidgetCard from '../dashboard/WidgetCard'
import WidgetSkeleton from '../dashboard/WidgetSkeleton'
import { WidgetErrorBoundary } from '../dashboard/WidgetErrorBoundary'
import { Link } from 'react-router-dom'

interface Action {
  priority: number
  category: string
  action: string
  context: string
  href: string
}

interface Risk {
  type: string
  severity: 'critical' | 'high' | 'medium'
  title: string
  detail: string
  href: string
}

interface Opportunity {
  type: string
  title: string
  detail: string
  score?: number
  href: string
}

function BriefContent() {
  const { data, isLoading } = useQuery({
    queryKey: ['mission-brief'],
    queryFn: async () => {
      const res = await missionControl.brief()
      return res.data?.data?.brief
    },
    staleTime: 60_000,
  })

  if (isLoading) return <WidgetSkeleton type="list" rows={5} />

  const actions: Action[]      = data?.prioritizedActions ?? []
  const risks: Risk[]          = data?.urgentRisks ?? []
  const opps: Opportunity[]    = data?.topOpportunities ?? []

  const SEVERITY_STYLES: Record<string, string> = {
    critical: 'text-red-400 border-red-400/20 bg-red-400/5',
    high:     'text-orange-400 border-orange-400/20 bg-orange-400/5',
    medium:   'text-yellow-400 border-yellow-400/20 bg-yellow-400/5',
  }

  const CAT_COLORS: Record<string, string> = {
    PAYMENT:   'text-fuchsia-400',
    CONTRACT:  'text-orange-400',
    MEETING:   'text-cyan-400',
    RELEASE:   'text-green-400',
    OUTREACH:  'text-purple-400',
    SYNC:      'text-yellow-400',
    DEAL:      'text-blue-400',
  }

  return (
    <div className="divide-y divide-[#111]">
      {/* Prioritised Actions */}
      {actions.length > 0 && (
        <div className="p-4">
          <div className="text-[9px] font-mono text-[#00ff41]/40 tracking-[0.25em] mb-3">PRIORITISED ACTIONS</div>
          <div className="space-y-2">
            {actions.map((a, i) => (
              <Link key={i} to={a.href} className="flex items-start gap-3 group">
                <span className="text-[9px] font-mono text-[#00ff41]/30 w-4 mt-0.5 flex-shrink-0">
                  {String(a.priority).padStart(2, '0')}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-mono tracking-[0.15em] ${CAT_COLORS[a.category] ?? 'text-gray-400'}`}>
                      {a.category}
                    </span>
                    <span className="text-[11px] font-mono text-white/80 group-hover:text-[#00ff41] transition-colors truncate">
                      {a.action}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-gray-600 truncate mt-0.5">{a.context}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Urgent Risks */}
      {risks.length > 0 && (
        <div className="p-4">
          <div className="text-[9px] font-mono text-red-400/50 tracking-[0.25em] mb-3">URGENT RISKS</div>
          <div className="flex flex-wrap gap-2">
            {risks.slice(0, 4).map((r, i) => (
              <Link key={i} to={r.href}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded border text-[10px] font-mono transition-opacity hover:opacity-80 ${SEVERITY_STYLES[r.severity] ?? SEVERITY_STYLES.medium}`}
              >
                <span>⚠</span>
                <span className="truncate max-w-[200px]">{r.title}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Top Opportunities */}
      {opps.length > 0 && (
        <div className="p-4">
          <div className="text-[9px] font-mono text-[#00d4ff]/40 tracking-[0.25em] mb-3">TOP OPPORTUNITIES</div>
          <div className="grid grid-cols-2 gap-2">
            {opps.slice(0, 4).map((o, i) => (
              <Link key={i} to={o.href} className="group p-2.5 rounded border border-[#00d4ff]/10 bg-[#00d4ff]/3 hover:border-[#00d4ff]/30 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-mono text-[#00d4ff]/50 tracking-widest uppercase">{o.type}</span>
                  {o.score !== undefined && (
                    <span className="text-[9px] font-mono text-[#00d4ff]/70">{Math.round(o.score)}%</span>
                  )}
                </div>
                <div className="text-[11px] font-mono text-white/80 group-hover:text-[#00d4ff] truncate transition-colors">{o.title}</div>
                <div className="text-[9px] font-mono text-gray-600 truncate mt-0.5">{o.detail}</div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {actions.length === 0 && risks.length === 0 && opps.length === 0 && (
        <div className="px-5 py-8 text-center">
          <div className="text-[#00ff41]/20 text-2xl mb-2">◎</div>
          <div className="text-[11px] font-mono text-gray-600 tracking-widest">ALL SYSTEMS NOMINAL</div>
        </div>
      )}
    </div>
  )
}

export default function AIExecutiveBrief() {
  return (
    <WidgetCard title="AI EXECUTIVE BRIEF" accent="green">
      <WidgetErrorBoundary title="AI EXECUTIVE BRIEF">
        <BriefContent />
      </WidgetErrorBoundary>
    </WidgetCard>
  )
}
