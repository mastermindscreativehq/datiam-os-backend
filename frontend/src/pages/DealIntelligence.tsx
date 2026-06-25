import { useEffect, useState } from 'react'
import { deals } from '../api/client'
import LoadingSpinner from '../components/LoadingSpinner'

interface Deal {
  id: string
  deal_name: string
  deal_type: string
  status: 'open' | 'won' | 'lost' | 'cancelled'
  stage: string
  projected_value: number
  actual_value: number | null
  win_probability: number
  revenue_forecast: number
  deal_score: number
  expected_close_date: string | null
  notes: string | null
  created_at: string
}

interface Analytics {
  total: number
  open_deals: number
  won_deals: number
  lost_deals: number
  cancelled: number
  win_rate: number
  pipeline_value: number
  forecasted_revenue: number
  closed_revenue: number
  by_stage: Record<string, number>
}

const PIPELINE_STAGES = [
  'lead',
  'contacted',
  'replied',
  'meeting_scheduled',
  'meeting_completed',
  'proposal_sent',
  'negotiation',
  'contract_sent',
  'contract_signed',
  'won',
  'lost',
]

const STAGE_LABELS: Record<string, string> = {
  lead: 'LEAD',
  contacted: 'CONTACTED',
  replied: 'REPLIED',
  meeting_scheduled: 'MTG SCHEDULED',
  meeting_completed: 'MTG COMPLETED',
  proposal_sent: 'PROPOSAL SENT',
  negotiation: 'NEGOTIATION',
  contract_sent: 'CONTRACT SENT',
  contract_signed: 'CONTRACT SIGNED',
  won: 'WON',
  lost: 'LOST',
}

function fmt$(val: number | null | undefined): string {
  if (val == null) return '$0'
  return val.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function fmtPct(val: number): string {
  return `${Math.round(val)}%`
}

export default function DealIntelligence() {
  const [dealList, setDealList] = useState<Deal[]>([])
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'analytics' | 'pipeline'>('analytics')

  useEffect(() => {
    setLoading(true)
    setError(null)

    Promise.all([deals.list(), deals.analytics()])
      .then(([listRes, analyticsRes]) => {
        const listData = listRes.data?.data ?? listRes.data
        const analyticsData = analyticsRes.data?.data ?? analyticsRes.data

        setDealList(listData?.deals ?? [])
        setAnalytics(analyticsData)
      })
      .catch((err) => {
        setError(err?.response?.data?.error ?? err?.message ?? 'Failed to load deal data')
      })
      .finally(() => setLoading(false))
  }, [])

  const dealsByStatus = {
    open: dealList.filter((d) => d.status === 'open'),
    won: dealList.filter((d) => d.status === 'won'),
    lost: dealList.filter((d) => d.status === 'lost'),
    cancelled: dealList.filter((d) => d.status === 'cancelled'),
  }

  const maxStageCount = analytics?.by_stage
    ? Math.max(...Object.values(analytics.by_stage).map(Number), 1)
    : 1

  return (
    <div className="min-h-screen bg-[#0c0c0c] text-white font-mono p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-2 h-2 rounded-full bg-[#00ff41] animate-pulse" />
          <h1 className="text-2xl font-bold tracking-[0.2em] text-[#00ff41]">
            DEAL INTELLIGENCE
          </h1>
        </div>
        <p className="text-gray-500 tracking-[0.15em] text-xs ml-5">
          REVENUE PIPELINE ENGINE
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 mb-8 border border-[#00ff41]/20 rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-6 py-2 text-xs tracking-[0.15em] rounded-md transition-all ${
            activeTab === 'analytics'
              ? 'bg-[#00ff41]/10 text-[#00ff41] border border-[#00ff41]/40'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          ANALYTICS
        </button>
        <button
          onClick={() => setActiveTab('pipeline')}
          className={`px-6 py-2 text-xs tracking-[0.15em] rounded-md transition-all ${
            activeTab === 'pipeline'
              ? 'bg-[#00ff41]/10 text-[#00ff41] border border-[#00ff41]/40'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          PIPELINE
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="border border-red-500/40 bg-red-500/10 rounded-lg p-4 mb-6 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-24">
          <LoadingSpinner />
        </div>
      )}

      {/* ANALYTICS VIEW */}
      {!loading && !error && activeTab === 'analytics' && analytics && (
        <div className="space-y-8">
          {/* Analytics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#111] border border-[#00ff41]/10 rounded-lg p-4">
              <p className="text-gray-500 text-xs tracking-[0.15em] mb-2">TOTAL DEALS</p>
              <p className="text-2xl font-bold text-white">{analytics.total}</p>
            </div>
            <div className="bg-[#111] border border-[#00d4ff]/10 rounded-lg p-4">
              <p className="text-gray-500 text-xs tracking-[0.15em] mb-2">OPEN</p>
              <p className="text-2xl font-bold text-[#00d4ff]">{analytics.open_deals}</p>
            </div>
            <div className="bg-[#111] border border-[#00ff41]/10 rounded-lg p-4">
              <p className="text-gray-500 text-xs tracking-[0.15em] mb-2">WON</p>
              <p className="text-2xl font-bold text-[#00ff41]">{analytics.won_deals}</p>
            </div>
            <div className="bg-[#111] border border-red-500/10 rounded-lg p-4">
              <p className="text-gray-500 text-xs tracking-[0.15em] mb-2">LOST</p>
              <p className="text-2xl font-bold text-red-400">{analytics.lost_deals}</p>
            </div>
            <div className="bg-[#111] border border-[#00ff41]/10 rounded-lg p-4">
              <p className="text-gray-500 text-xs tracking-[0.15em] mb-2">WIN RATE</p>
              <p className="text-2xl font-bold text-[#00ff41]">{Math.round((analytics.win_rate ?? 0) * 100)}%</p>
            </div>
            <div className="bg-[#111] border border-[#00d4ff]/10 rounded-lg p-4">
              <p className="text-gray-500 text-xs tracking-[0.15em] mb-2">PIPELINE VALUE</p>
              <p className="text-lg font-bold text-[#00d4ff]">{fmt$(analytics.pipeline_value)}</p>
            </div>
            <div className="bg-[#111] border border-[#00ff41]/10 rounded-lg p-4">
              <p className="text-gray-500 text-xs tracking-[0.15em] mb-2">FORECASTED REVENUE</p>
              <p className="text-lg font-bold text-[#00ff41]">{fmt$(analytics.forecasted_revenue)}</p>
            </div>
            <div className="bg-[#111] border border-[#00d4ff]/10 rounded-lg p-4">
              <p className="text-gray-500 text-xs tracking-[0.15em] mb-2">CLOSED REVENUE</p>
              <p className="text-lg font-bold text-[#00d4ff]">{fmt$(analytics.closed_revenue)}</p>
            </div>
          </div>

          {/* Stage Pipeline Visualization */}
          <div className="bg-[#111] border border-[#00ff41]/10 rounded-lg p-6">
            <h2 className="text-xs tracking-[0.2em] text-[#00ff41] mb-6">STAGE PIPELINE</h2>
            {analytics.by_stage && Object.keys(analytics.by_stage).length > 0 ? (
              <div className="space-y-3">
                {PIPELINE_STAGES.filter((s) => analytics.by_stage[s] != null || (analytics.by_stage[s] === 0)).map((stage) => {
                  const count = analytics.by_stage[stage] ?? 0
                  const pct = maxStageCount > 0 ? (count / maxStageCount) * 100 : 0
                  const isTerminal = stage === 'won' || stage === 'lost'
                  const barColor = stage === 'won'
                    ? 'bg-[#00ff41]'
                    : stage === 'lost'
                    ? 'bg-red-500'
                    : 'bg-[#00d4ff]'

                  return (
                    <div key={stage} className="flex items-center gap-4">
                      <span className="text-gray-500 text-xs tracking-[0.1em] w-36 shrink-0">
                        {STAGE_LABELS[stage] ?? stage.toUpperCase()}
                      </span>
                      <div className="flex-1 bg-[#0c0c0c] rounded-full h-2 border border-white/5">
                        <div
                          className={`h-2 rounded-full transition-all ${barColor} ${isTerminal ? 'opacity-80' : ''}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className={`text-xs font-bold w-6 text-right ${
                        stage === 'won' ? 'text-[#00ff41]' : stage === 'lost' ? 'text-red-400' : 'text-[#00d4ff]'
                      }`}>
                        {count}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No stage data available.</p>
            )}
          </div>
        </div>
      )}

      {/* PIPELINE / KANBAN VIEW */}
      {!loading && !error && activeTab === 'pipeline' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* OPEN Column */}
          <KanbanColumn
            title="OPEN"
            count={dealsByStatus.open.length}
            accentClass="text-[#00d4ff]"
            borderClass="border-[#00d4ff]/25"
            headerBg="bg-[#00d4ff]/10"
            deals={dealsByStatus.open}
          />

          {/* WON Column */}
          <KanbanColumn
            title="WON"
            count={dealsByStatus.won.length}
            accentClass="text-[#00ff41]"
            borderClass="border-[#00ff41]/25"
            headerBg="bg-[#00ff41]/10"
            deals={dealsByStatus.won}
          />

          {/* LOST Column */}
          <KanbanColumn
            title="LOST"
            count={dealsByStatus.lost.length}
            accentClass="text-red-400"
            borderClass="border-red-500/25"
            headerBg="bg-red-500/10"
            deals={dealsByStatus.lost}
          />

          {/* CANCELLED Column */}
          <KanbanColumn
            title="CANCELLED"
            count={dealsByStatus.cancelled.length}
            accentClass="text-gray-400"
            borderClass="border-gray-500/25"
            headerBg="bg-gray-500/10"
            deals={dealsByStatus.cancelled}
          />
        </div>
      )}
    </div>
  )
}

interface KanbanColumnProps {
  title: string
  count: number
  accentClass: string
  borderClass: string
  headerBg: string
  deals: Deal[]
}

function KanbanColumn({ title, count, accentClass, borderClass, headerBg, deals }: KanbanColumnProps) {
  return (
    <div className={`bg-[#111] border ${borderClass} rounded-lg overflow-hidden`}>
      {/* Column Header */}
      <div className={`${headerBg} border-b ${borderClass} px-4 py-3 flex items-center justify-between`}>
        <span className={`text-xs font-bold tracking-[0.2em] ${accentClass}`}>{title}</span>
        <span className={`text-xs font-bold ${accentClass} bg-[#0c0c0c] border ${borderClass} rounded-full px-2 py-0.5`}>
          {count}
        </span>
      </div>

      {/* Deal Cards */}
      <div className="p-3 space-y-3 min-h-[120px]">
        {deals.length === 0 ? (
          <p className="text-gray-500 text-xs text-center py-6">No deals</p>
        ) : (
          deals.map((deal) => (
            <DealCard key={deal.id} deal={deal} accentClass={accentClass} borderClass={borderClass} />
          ))
        )}
      </div>
    </div>
  )
}

interface DealCardProps {
  deal: Deal
  accentClass: string
  borderClass: string
}

function DealCard({ deal, accentClass, borderClass }: DealCardProps) {
  return (
    <div className={`bg-[#0c0c0c] border ${borderClass} rounded-lg p-3 hover:bg-[#00ff41]/5 transition-colors`}>
      <p className="text-white text-xs font-bold truncate mb-1">{deal.deal_name}</p>
      <p className="text-gray-500 text-xs mb-2">{deal.deal_type}</p>

      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-bold ${accentClass}`}>
          {(deal.projected_value ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
        </span>
        <span className="text-gray-400 text-xs">
          {Math.round(deal.win_probability ?? 0)}% win
        </span>
      </div>

      <div>
        <span className={`inline-block text-xs px-2 py-0.5 rounded-full bg-[#0c0c0c] border ${borderClass} ${accentClass} tracking-[0.08em]`}>
          {STAGE_LABELS[deal.stage] ?? deal.stage?.toUpperCase() ?? 'UNKNOWN'}
        </span>
      </div>
    </div>
  )
}
