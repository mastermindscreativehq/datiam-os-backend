import { useQuery } from '@tanstack/react-query'
import { missionControl } from '../../api/client'
import WidgetCard from '../dashboard/WidgetCard'
import WidgetSkeleton from '../dashboard/WidgetSkeleton'
import { WidgetErrorBoundary } from '../dashboard/WidgetErrorBoundary'
import { Link } from 'react-router-dom'

interface AutomationStats {
  totalRuns: number
  successCount: number
  failedCount: number
  lastRun: { name: string; status: string; runAt: string } | null
  successRate: number
  queueHealth: 'healthy' | 'warning' | 'degraded'
}

const HEALTH_CONFIG = {
  healthy:  { color: 'text-[#00ff41]', dot: 'bg-[#00ff41] animate-pulse', label: 'HEALTHY' },
  warning:  { color: 'text-yellow-400', dot: 'bg-yellow-400',              label: 'WARNING' },
  degraded: { color: 'text-red-400',    dot: 'bg-red-400 animate-pulse',   label: 'DEGRADED' },
}

function AutomationContent() {
  const { data, isLoading } = useQuery({
    queryKey: ['mission-automation'],
    queryFn: async () => {
      const res = await missionControl.brief()
      return res.data?.data?.automationStatus as AutomationStats
    },
    staleTime: 60_000,
  })

  if (isLoading) return <WidgetSkeleton type="stats" />

  const stats = data ?? { totalRuns: 0, successCount: 0, failedCount: 0, lastRun: null, successRate: 0, queueHealth: 'healthy' as const }
  const health = HEALTH_CONFIG[stats.queueHealth] ?? HEALTH_CONFIG.healthy

  return (
    <div className="p-4 space-y-4">
      {/* n8n Integration Banner */}
      <div className="rounded border border-dashed border-[#00d4ff]/20 p-3 bg-[#00d4ff]/3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[9px] font-mono text-[#00d4ff]/60 tracking-[0.2em]">n8n AUTOMATION LAYER</span>
          <span className="text-[8px] font-mono text-[#00d4ff]/30 border border-[#00d4ff]/20 px-1.5 py-0.5 rounded">READY TO CONNECT</span>
        </div>
        <div className="text-[10px] font-mono text-gray-600">Webhook endpoint reserved · Workflows will plug in here</div>
      </div>

      {/* Queue Health */}
      <div className="flex items-center justify-between py-2 border-b border-[#111]">
        <span className="text-[10px] font-mono text-gray-500 tracking-widest">QUEUE HEALTH</span>
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${health.dot}`} />
          <span className={`text-[10px] font-mono ${health.color}`}>{health.label}</span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'TOTAL RUNS',   value: stats.totalRuns,    color: 'text-white/60' },
          { label: 'SUCCESS RATE', value: `${stats.successRate}%`, color: stats.successRate >= 80 ? 'text-[#00ff41]' : stats.successRate >= 50 ? 'text-yellow-400' : 'text-red-400' },
          { label: 'SUCCESSFUL',   value: stats.successCount, color: 'text-[#00ff41]/70' },
          { label: 'FAILED',       value: stats.failedCount,  color: stats.failedCount > 0 ? 'text-red-400' : 'text-gray-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="p-2.5 rounded bg-white/[0.02] border border-[#111]">
            <div className="text-[9px] font-mono text-gray-600 tracking-widest mb-1">{label}</div>
            <div className={`text-base font-mono font-bold ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Last run */}
      {stats.lastRun && (
        <div className="pt-1">
          <div className="text-[9px] font-mono text-gray-600 tracking-widest mb-1.5">LAST RUN</div>
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${stats.lastRun.status === 'success' ? 'bg-[#00ff41]' : 'bg-red-400'}`} />
            <span className="text-[11px] font-mono text-white/60 truncate">{stats.lastRun.name}</span>
            <span className="text-[9px] font-mono text-gray-600 flex-shrink-0">
              {new Date(stats.lastRun.runAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      )}

      <Link to="/automation-runs" className="block text-center py-2 text-[9px] font-mono text-[#00d4ff]/40 hover:text-[#00d4ff] tracking-[0.2em] transition-colors border-t border-[#111]">
        VIEW AUTOMATION RUNS →
      </Link>
    </div>
  )
}

export default function AutomationStatus() {
  return (
    <WidgetCard title="AUTOMATION STATUS" accent="cyan">
      <WidgetErrorBoundary title="AUTOMATION STATUS">
        <AutomationContent />
      </WidgetErrorBoundary>
    </WidgetCard>
  )
}
