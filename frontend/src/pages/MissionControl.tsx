import { lazy, Suspense } from 'react'
import { useAuthStore } from '../store/authStore'
import WidgetSkeleton from '../components/dashboard/WidgetSkeleton'
import GlobalSearch from '../components/mission-control/GlobalSearch'
import AIExecutiveBrief from '../components/mission-control/AIExecutiveBrief'
import CriticalActionsPanel from '../components/mission-control/CriticalActionsPanel'
import ReleaseCommandCenter from '../components/mission-control/ReleaseCommandCenter'
import AutomationStatus from '../components/mission-control/AutomationStatus'

const OpportunityFeed  = lazy(() => import('../components/mission-control/OpportunityFeed'))
const RiskMonitor      = lazy(() => import('../components/mission-control/RiskMonitor'))

export default function MissionControl() {
  const { user } = useAuthStore()
  const now = new Date()
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const dateStr = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-0.5 h-7 bg-[#00ff41] rounded-full" />
            <div>
              <h1 className="text-2xl font-bold font-mono text-[#00ff41] tracking-[0.2em]">
                MISSION CONTROL
              </h1>
              <p className="text-gray-600 text-[10px] font-mono tracking-[0.25em] mt-0.5">
                DATIAM OS · OPERATIONAL BRAIN
              </p>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[#00ff41] font-mono text-xl font-bold tracking-wider">{timeStr}</div>
          <div className="text-gray-600 text-[10px] font-mono tracking-[0.15em] mt-0.5">{dateStr}</div>
          {user && (
            <div className="text-[10px] font-mono tracking-widest mt-1">
              <span className={
                user.role === 'owner' ? 'text-[#00ff41]' :
                user.role === 'admin' ? 'text-[#00d4ff]' :
                'text-gray-500'
              }>
                {String(user.role ?? 'team').toUpperCase()}
              </span>
              <span className="text-gray-600 ml-1">· {user.full_name ?? user.email}</span>
            </div>
          )}
        </div>
      </div>

      {/* Global Search */}
      <GlobalSearch />

      {/* Row 1: AI Executive Brief (full width) */}
      <AIExecutiveBrief />

      {/* Row 2: Critical Actions + Automation Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CriticalActionsPanel />
        </div>
        <div>
          <AutomationStatus />
        </div>
      </div>

      {/* Row 3: Release Command Center (full width) */}
      <ReleaseCommandCenter />

      {/* Row 4: Opportunity Feed + Risk Monitor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Suspense fallback={<WidgetSkeleton type="list" rows={5} />}>
          <OpportunityFeed />
        </Suspense>
        <Suspense fallback={<WidgetSkeleton type="list" rows={5} />}>
          <RiskMonitor />
        </Suspense>
      </div>
    </div>
  )
}
