import { lazy, Suspense } from 'react'
import { useAuthStore } from '../store/authStore'
import WidgetCard from '../components/dashboard/WidgetCard'
import WidgetSkeleton from '../components/dashboard/WidgetSkeleton'
import { WidgetErrorBoundary } from '../components/dashboard/WidgetErrorBoundary'
import TodaysOverview from '../components/dashboard/TodaysOverview'
import ActiveReleasesWidget from '../components/dashboard/ActiveReleasesWidget'
import SyncOpportunitiesWidget from '../components/dashboard/SyncOpportunitiesWidget'
import OutreachWidget from '../components/dashboard/OutreachWidget'
import ContractsWidget from '../components/dashboard/ContractsWidget'
import PaymentWidget from '../components/dashboard/PaymentWidget'
import RecentActivityWidget from '../components/dashboard/RecentActivityWidget'
import UpcomingTasksWidget from '../components/dashboard/UpcomingTasksWidget'
import AIRecommendationsWidget from '../components/dashboard/AIRecommendationsWidget'

// Lazy-load heavy widgets
const FanIntelligenceWidget  = lazy(() => import('../components/dashboard/FanIntelligenceWidget'))
const CommercialIntelWidget  = lazy(() => import('../components/dashboard/CommercialIntelWidget'))
const DealPipelineWidget     = lazy(() => import('../components/dashboard/DealPipelineWidget'))

function Widget({
  title,
  accent,
  href,
  skeletonType = 'list',
  skeletonRows = 4,
  children,
}: {
  title: string
  accent?: 'green' | 'cyan' | 'purple' | 'orange' | 'fuchsia' | 'yellow'
  href?: string
  skeletonType?: 'list' | 'stats' | 'pipeline' | 'activity'
  skeletonRows?: number
  children: React.ReactNode
}) {
  return (
    <WidgetCard title={title} accent={accent} href={href}>
      <WidgetErrorBoundary title={title}>
        <Suspense fallback={<WidgetSkeleton type={skeletonType} rows={skeletonRows} />}>
          {children}
        </Suspense>
      </WidgetErrorBoundary>
    </WidgetCard>
  )
}

export default function Dashboard() {
  const { user } = useAuthStore()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-0.5 h-6 bg-[#00ff41] rounded-full" />
            <h1 className="text-xl font-bold font-mono text-[#00ff41] tracking-[0.2em]">
              COMMAND CENTER
            </h1>
          </div>
          <p className="text-gray-600 text-[11px] font-mono tracking-[0.2em] ml-3.5">
            DATIAM OS · OPERATIONAL INTELLIGENCE
          </p>
        </div>
        {user && (
          <div className="text-right">
            <div className="text-[10px] font-mono text-gray-600 tracking-widest">
              {user.full_name ?? user.email}
            </div>
            <div className="text-[10px] font-mono tracking-widest mt-0.5">
              <span className={
                user.role === 'owner' ? 'text-[#00ff41]' :
                user.role === 'admin' ? 'text-[#00d4ff]' :
                'text-gray-500'
              }>
                {String(user.role ?? 'team').toUpperCase()}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Row 1: Today's Overview — full width hero */}
      <Widget title="TODAY'S OVERVIEW" accent="green" skeletonType="stats" skeletonRows={10}>
        <TodaysOverview />
      </Widget>

      {/* Row 2: Active Releases + Fan Intelligence */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Widget title="ACTIVE RELEASES" accent="cyan" href="/releases" skeletonRows={4}>
          <ActiveReleasesWidget />
        </Widget>
        <Widget title="FAN INTELLIGENCE" accent="green" href="/fan-intelligence" skeletonType="stats" skeletonRows={4}>
          <FanIntelligenceWidget />
        </Widget>
      </div>

      {/* Row 3: Commercial Intelligence + Sync Opportunities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Widget title="COMMERCIAL INTELLIGENCE" accent="fuchsia" href="/commercial-intelligence" skeletonRows={3}>
          <CommercialIntelWidget />
        </Widget>
        <Widget title="SYNC OPPORTUNITIES" accent="orange" href="/sync-pitches" skeletonRows={4}>
          <SyncOpportunitiesWidget />
        </Widget>
      </div>

      {/* Row 4: Outreach + Deal Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Widget title="OUTREACH CAMPAIGNS" accent="cyan" href="/outreach" skeletonRows={4}>
          <OutreachWidget />
        </Widget>
        <Widget title="DEAL PIPELINE" accent="fuchsia" href="/deal-intelligence" skeletonType="pipeline" skeletonRows={5}>
          <DealPipelineWidget />
        </Widget>
      </div>

      {/* Row 5: Contracts + Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Widget title="CONTRACTS REQUIRING ATTENTION" accent="purple" href="/contract-intelligence" skeletonRows={4}>
          <ContractsWidget />
        </Widget>
        <Widget title="PAYMENT INTELLIGENCE" accent="yellow" href="/payment-intelligence" skeletonRows={4}>
          <PaymentWidget />
        </Widget>
      </div>

      {/* Row 6: AI Recommendations — full width */}
      <Widget title="AI RECOMMENDATIONS" accent="purple" skeletonRows={4}>
        <AIRecommendationsWidget />
      </Widget>

      {/* Row 7: Recent Activity + Upcoming Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Widget title="RECENT ACTIVITY" accent="green" href="/activity" skeletonType="activity" skeletonRows={8}>
            <RecentActivityWidget />
          </Widget>
        </div>
        <Widget title="UPCOMING TASKS" accent="yellow" skeletonRows={5}>
          <UpcomingTasksWidget />
        </Widget>
      </div>
    </div>
  )
}
