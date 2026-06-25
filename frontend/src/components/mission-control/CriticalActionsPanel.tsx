import { useQuery } from '@tanstack/react-query'
import { missionControl } from '../../api/client'
import WidgetCard from '../dashboard/WidgetCard'
import WidgetSkeleton from '../dashboard/WidgetSkeleton'
import { WidgetErrorBoundary } from '../dashboard/WidgetErrorBoundary'
import { Link } from 'react-router-dom'

interface ActionItem {
  id: string
  [key: string]: unknown
}

interface CriticalActions {
  releasesDue: ActionItem[]
  contractsAwaitingReview: ActionItem[]
  outreachFollowups: ActionItem[]
  meetingsToday: ActionItem[]
  paymentsExpected: ActionItem[]
}

function ActionGroup({ label, items, href, color, emptyText, renderItem }: {
  label: string
  items: ActionItem[]
  href: string
  color: string
  emptyText: string
  renderItem: (item: ActionItem) => { primary: string; secondary: string }
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[9px] font-mono tracking-[0.22em] ${color}`}>{label}</span>
        <Link to={href} className={`text-[9px] font-mono ${color.replace('text-', 'text-').replace(']', '/50]')} hover:opacity-100 opacity-50 tracking-widest`}>
          VIEW →
        </Link>
      </div>
      {items.length === 0 ? (
        <div className="text-[10px] font-mono text-gray-700 py-1">{emptyText}</div>
      ) : (
        <div className="space-y-1">
          {items.slice(0, 3).map((item, i) => {
            const { primary, secondary } = renderItem(item)
            return (
              <Link key={i} to={href} className="flex items-center gap-2 group py-1">
                <div className={`w-1 h-1 rounded-full flex-shrink-0 ${color.replace('text-', 'bg-')}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-mono text-white/70 group-hover:text-white truncate transition-colors">{primary}</div>
                  {secondary && <div className="text-[9px] font-mono text-gray-600 truncate">{secondary}</div>}
                </div>
              </Link>
            )
          })}
          {items.length > 3 && (
            <Link to={href} className={`text-[9px] font-mono ${color} opacity-50 hover:opacity-100`}>
              +{items.length - 3} more
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

function PanelContent() {
  const { data, isLoading } = useQuery({
    queryKey: ['mission-critical-actions'],
    queryFn: async () => {
      const res = await missionControl.brief()
      return res.data?.data?.criticalActions as CriticalActions
    },
    staleTime: 60_000,
  })

  if (isLoading) return <WidgetSkeleton type="list" rows={6} />

  const ca = data ?? { releasesDue: [], contractsAwaitingReview: [], outreachFollowups: [], meetingsToday: [], paymentsExpected: [] }

  return (
    <div className="p-4 space-y-5">
      <ActionGroup
        label="RELEASES DUE"
        items={ca.releasesDue}
        href="/releases"
        color="text-[#00ff41]"
        emptyText="No releases due soon"
        renderItem={item => ({
          primary: String(item.title ?? 'Untitled Release'),
          secondary: item.release_date ? new Date(String(item.release_date)).toLocaleDateString() : '',
        })}
      />
      <ActionGroup
        label="CONTRACTS PENDING"
        items={ca.contractsAwaitingReview}
        href="/contract-intelligence"
        color="text-orange-400"
        emptyText="No contracts pending"
        renderItem={item => ({
          primary: String(item.title ?? 'Untitled Contract'),
          secondary: String(item.status ?? '').replace(/_/g, ' ').toUpperCase(),
        })}
      />
      <ActionGroup
        label="MEETINGS TODAY"
        items={ca.meetingsToday}
        href="/meeting-intelligence"
        color="text-[#00d4ff]"
        emptyText="No meetings today"
        renderItem={item => ({
          primary: String(item.title ?? item.contact_name ?? 'Meeting'),
          secondary: item.scheduled_at ? new Date(String(item.scheduled_at)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        })}
      />
      <ActionGroup
        label="PAYMENTS EXPECTED"
        items={ca.paymentsExpected}
        href="/payment-intelligence"
        color="text-fuchsia-400"
        emptyText="No payments pending"
        renderItem={item => ({
          primary: String(item.title ?? item.company_name ?? 'Payment'),
          secondary: item.amount ? `${item.currency ?? 'USD'} ${Number(item.amount).toLocaleString()}` : '',
        })}
      />
      <ActionGroup
        label="OUTREACH FOLLOWUPS"
        items={ca.outreachFollowups}
        href="/outreach"
        color="text-purple-400"
        emptyText="All campaigns active"
        renderItem={item => ({
          primary: String(item.name ?? 'Campaign'),
          secondary: `${item.total_contacts ?? 0} contacts`,
        })}
      />
    </div>
  )
}

export default function CriticalActionsPanel() {
  return (
    <WidgetCard title="TODAY'S CRITICAL ACTIONS" accent="orange">
      <WidgetErrorBoundary title="TODAY'S CRITICAL ACTIONS">
        <PanelContent />
      </WidgetErrorBoundary>
    </WidgetCard>
  )
}
