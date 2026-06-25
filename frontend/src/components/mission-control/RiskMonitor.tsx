import { useQuery } from '@tanstack/react-query'
import { missionControl } from '../../api/client'
import WidgetCard from '../dashboard/WidgetCard'
import WidgetSkeleton from '../dashboard/WidgetSkeleton'
import { WidgetErrorBoundary } from '../dashboard/WidgetErrorBoundary'
import { Link } from 'react-router-dom'

interface Risk {
  type: string
  severity: 'critical' | 'high' | 'medium'
  title: string
  detail: string
  href: string
}

const SEVERITY_CONFIG = {
  critical: { dot: 'bg-red-400 animate-pulse', badge: 'text-red-400 border-red-400/20', label: 'CRITICAL' },
  high:     { dot: 'bg-orange-400',            badge: 'text-orange-400 border-orange-400/20', label: 'HIGH' },
  medium:   { dot: 'bg-yellow-400',            badge: 'text-yellow-400 border-yellow-400/20', label: 'MEDIUM' },
}

const TYPE_ICONS: Record<string, string> = {
  release:    '◎',
  contract:   '◇',
  payment:    '✦',
  outreach:   '◉',
  automation: '⬢',
}

function RiskContent() {
  const { data, isLoading } = useQuery({
    queryKey: ['mission-risks'],
    queryFn: async () => {
      const res = await missionControl.brief()
      return res.data?.data?.risks as Risk[]
    },
    staleTime: 60_000,
  })

  if (isLoading) return <WidgetSkeleton type="list" rows={5} />

  const risks: Risk[] = data ?? []

  const critical = risks.filter(r => r.severity === 'critical')
  const high     = risks.filter(r => r.severity === 'high')
  const medium   = risks.filter(r => r.severity === 'medium')

  if (risks.length === 0) {
    return (
      <div className="px-5 py-8 text-center">
        <div className="text-[#00ff41]/20 text-2xl mb-2">✓</div>
        <div className="text-[11px] font-mono text-gray-600 tracking-widest">NO ACTIVE RISKS</div>
        <div className="text-[10px] font-mono text-gray-700 mt-1">All systems nominal</div>
      </div>
    )
  }

  return (
    <div>
      {/* Summary bar */}
      <div className="px-4 pt-4 pb-2 flex gap-3">
        {critical.length > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            <span className="text-[10px] font-mono text-red-400">{critical.length} CRITICAL</span>
          </div>
        )}
        {high.length > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
            <span className="text-[10px] font-mono text-orange-400">{high.length} HIGH</span>
          </div>
        )}
        {medium.length > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
            <span className="text-[10px] font-mono text-yellow-400">{medium.length} MEDIUM</span>
          </div>
        )}
      </div>

      <div className="divide-y divide-[#111]">
        {risks.slice(0, 8).map((r, i) => {
          const cfg = SEVERITY_CONFIG[r.severity] ?? SEVERITY_CONFIG.medium
          return (
            <Link key={i} to={r.href} className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.02] group transition-colors">
              <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${cfg.dot}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[9px] font-mono text-gray-600">
                    {TYPE_ICONS[r.type] ?? '◆'} {r.type.toUpperCase()}
                  </span>
                  <span className={`text-[8px] font-mono px-1.5 py-0.5 border rounded ${cfg.badge}`}>
                    {cfg.label}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-white/70 group-hover:text-white truncate transition-colors">
                  {r.title}
                </div>
                {r.detail && (
                  <div className="text-[9px] font-mono text-gray-600 truncate mt-0.5">{r.detail}</div>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export default function RiskMonitor() {
  return (
    <WidgetCard title="RISK MONITOR" accent="orange">
      <WidgetErrorBoundary title="RISK MONITOR">
        <RiskContent />
      </WidgetErrorBoundary>
    </WidgetCard>
  )
}
