import { useEffect, useState } from 'react'
import { contracts } from '../api/client'
import LoadingSpinner from '../components/LoadingSpinner'

interface Contract {
  id: string
  deal_id: string
  contract_title: string
  contract_type: string
  status: 'draft' | 'generated' | 'sent' | 'viewed' | 'signed' | 'expired' | 'cancelled'
  contract_value: number
  currency: string
  expires_at: string | null
  signature_provider: string | null
  signed_at: string | null
  sent_at: string | null
  viewed_at: string | null
  created_at: string
}

interface ContractAnalytics {
  total: number
  by_status: {
    draft: number
    generated: number
    sent: number
    viewed: number
    signed: number
    expired: number
    cancelled: number
  }
  total_contract_value: number
  signed_value: number
  conversion_rate: number
  avg_days_to_sign: number
}

const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  draft:     { bg: 'bg-gray-500/10',     text: 'text-gray-400',     border: 'border-gray-500/25' },
  generated: { bg: 'bg-blue-500/10',     text: 'text-blue-400',     border: 'border-blue-500/25' },
  sent:      { bg: 'bg-[#00d4ff]/10',    text: 'text-[#00d4ff]',    border: 'border-[#00d4ff]/25' },
  viewed:    { bg: 'bg-yellow-500/10',   text: 'text-yellow-400',   border: 'border-yellow-500/25' },
  signed:    { bg: 'bg-[#00ff41]/10',    text: 'text-[#00ff41]',    border: 'border-[#00ff41]/25' },
  expired:   { bg: 'bg-red-500/10',      text: 'text-red-400',      border: 'border-red-500/25' },
  cancelled: { bg: 'bg-red-500/10',      text: 'text-red-400',      border: 'border-red-500/25' },
}

const FUNNEL_STAGES: Array<keyof ContractAnalytics['by_status']> = [
  'draft', 'generated', 'sent', 'viewed', 'signed',
]

const stageLabel: Record<string, string> = {
  draft:     'DRAFT',
  generated: 'GENERATED',
  sent:      'SENT',
  viewed:    'VIEWED',
  signed:    'SIGNED',
}

const stageColor: Record<string, string> = {
  draft:     'bg-gray-500/20 border-gray-500/30 text-gray-400',
  generated: 'bg-blue-500/20 border-blue-500/30 text-blue-400',
  sent:      'bg-[#00d4ff]/10 border-[#00d4ff]/30 text-[#00d4ff]',
  viewed:    'bg-yellow-500/20 border-yellow-500/30 text-yellow-400',
  signed:    'bg-[#00ff41]/10 border-[#00ff41]/30 text-[#00ff41]',
}

export default function ContractIntelligence() {
  const [contractList, setContractList] = useState<Contract[]>([])
  const [analytics, setAnalytics] = useState<ContractAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true)
      setError(null)
      try {
        const [listRes, analyticsRes] = await Promise.all([
          contracts.list(),
          contracts.analytics(),
        ])
        const listData = listRes.data?.data ?? listRes.data
        const analyticsData = analyticsRes.data?.data ?? analyticsRes.data
        setContractList(listData?.contracts ?? [])
        setAnalytics(analyticsData)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load contract data'
        setError(message)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c0c0c] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0c0c0c] p-6 font-mono">
        <div className="border border-red-500/30 bg-red-500/10 rounded-lg p-4 text-red-400">
          <span className="tracking-[0.15em] text-sm">ERROR: {error}</span>
        </div>
      </div>
    )
  }

  const funnelMax = analytics
    ? Math.max(...FUNNEL_STAGES.map(s => analytics.by_status[s] || 0), 1)
    : 1

  return (
    <div className="min-h-screen bg-[#0c0c0c] p-6 font-mono">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#00ff41] tracking-[0.2em] uppercase">
          CONTRACT INTELLIGENCE
        </h1>
        <p className="text-gray-500 text-xs tracking-[0.15em] mt-1">
          CONTRACT LIFECYCLE ENGINE
        </p>
      </div>

      {/* Analytics Row */}
      {analytics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-8">
          <div className="bg-[#111] border border-[#00ff41]/10 rounded-lg p-4 col-span-1">
            <div className="text-gray-500 text-xs tracking-[0.15em] mb-1">TOTAL</div>
            <div className="text-white text-xl font-bold">{analytics.total}</div>
          </div>

          <div className="bg-[#111] border border-[#00ff41]/10 rounded-lg p-4 col-span-1">
            <div className="text-gray-500 text-xs tracking-[0.15em] mb-1">SIGNED</div>
            <div className="text-[#00ff41] text-xl font-bold">{analytics.by_status.signed ?? 0}</div>
          </div>

          <div className="bg-[#111] border border-[#00d4ff]/10 rounded-lg p-4 col-span-1">
            <div className="text-gray-500 text-xs tracking-[0.15em] mb-1">SENT</div>
            <div className="text-[#00d4ff] text-xl font-bold">{analytics.by_status.sent ?? 0}</div>
          </div>

          <div className="bg-[#111] border border-[#ffffff]/5 rounded-lg p-4 col-span-1">
            <div className="text-gray-500 text-xs tracking-[0.15em] mb-1">DRAFT</div>
            <div className="text-gray-400 text-xl font-bold">{analytics.by_status.draft ?? 0}</div>
          </div>

          <div className="bg-[#111] border border-red-500/10 rounded-lg p-4 col-span-1">
            <div className="text-gray-500 text-xs tracking-[0.15em] mb-1">EXPIRED</div>
            <div className="text-red-400 text-xl font-bold">{analytics.by_status.expired ?? 0}</div>
          </div>

          <div className="bg-[#111] border border-[#00ff41]/10 rounded-lg p-4 col-span-1">
            <div className="text-gray-500 text-xs tracking-[0.15em] mb-1">CONVERSION</div>
            <div className="text-[#00ff41] text-xl font-bold">
              {Math.round((analytics.conversion_rate ?? 0) * 100)}%
            </div>
          </div>

          <div className="bg-[#111] border border-[#00d4ff]/10 rounded-lg p-4 col-span-1">
            <div className="text-gray-500 text-xs tracking-[0.15em] mb-1">TOTAL VALUE</div>
            <div className="text-[#00d4ff] text-sm font-bold">
              {(analytics.total_contract_value ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
            </div>
          </div>

          <div className="bg-[#111] border border-[#00ff41]/10 rounded-lg p-4 col-span-1">
            <div className="text-gray-500 text-xs tracking-[0.15em] mb-1">SIGNED VALUE</div>
            <div className="text-[#00ff41] text-sm font-bold">
              {(analytics.signed_value ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
            </div>
          </div>
        </div>
      )}

      {/* Contract Lifecycle Funnel */}
      {analytics && (
        <div className="bg-[#111] border border-[#00ff41]/10 rounded-lg p-6 mb-8">
          <h2 className="text-[#00ff41] text-xs tracking-[0.2em] uppercase mb-6">
            CONTRACT LIFECYCLE FUNNEL
          </h2>
          <div className="flex items-end gap-2 sm:gap-4">
            {FUNNEL_STAGES.map((stage, idx) => {
              const count = analytics.by_status[stage] ?? 0
              const heightPct = funnelMax > 0 ? (count / funnelMax) * 100 : 0
              const barHeight = Math.max(heightPct * 1.2, 8)
              return (
                <div key={stage} className="flex-1 flex flex-col items-center gap-2">
                  {idx < FUNNEL_STAGES.length - 1 && (
                    <div className="hidden sm:block absolute" />
                  )}
                  <div className="text-xs font-bold text-white">{count}</div>
                  <div
                    className={`w-full rounded-t border ${stageColor[stage]} transition-all duration-500`}
                    style={{ height: `${barHeight}px`, minHeight: '8px' }}
                  />
                  <div className={`text-xs tracking-[0.1em] text-center ${stageColor[stage].split(' ').find(c => c.startsWith('text-'))}`}>
                    {stageLabel[stage]}
                  </div>
                </div>
              )
            })}
          </div>
          {/* Arrow indicators between stages */}
          <div className="flex items-center mt-4 text-gray-600 text-xs tracking-[0.1em]">
            {FUNNEL_STAGES.map((stage, idx) => (
              <div key={stage} className="flex items-center flex-1">
                <div className="flex-1 border-t border-dashed border-gray-700" />
                {idx < FUNNEL_STAGES.length - 1 && (
                  <span className="mx-1 text-gray-600">›</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contracts Table */}
      <div className="bg-[#111] border border-[#00ff41]/10 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-[#ffffff]/5">
          <h2 className="text-[#00ff41] text-xs tracking-[0.2em] uppercase">
            ALL CONTRACTS
          </h2>
        </div>

        {contractList.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm tracking-[0.1em]">
            NO CONTRACTS FOUND
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#ffffff]/5">
                  <th className="text-left text-gray-500 tracking-[0.15em] px-4 py-3 font-normal">TITLE</th>
                  <th className="text-left text-gray-500 tracking-[0.15em] px-4 py-3 font-normal">TYPE</th>
                  <th className="text-left text-gray-500 tracking-[0.15em] px-4 py-3 font-normal">STATUS</th>
                  <th className="text-right text-gray-500 tracking-[0.15em] px-4 py-3 font-normal">VALUE</th>
                  <th className="text-left text-gray-500 tracking-[0.15em] px-4 py-3 font-normal">EXPIRES</th>
                  <th className="text-left text-gray-500 tracking-[0.15em] px-4 py-3 font-normal">CREATED</th>
                </tr>
              </thead>
              <tbody>
                {contractList.map((contract) => {
                  const sc = statusColors[contract.status] ?? statusColors.draft
                  return (
                    <tr
                      key={contract.id}
                      className="bg-[#0c0c0c] border-b border-[#ffffff]/5 hover:bg-[#00ff41]/5 transition-colors"
                    >
                      <td className="px-4 py-3 text-white font-mono">
                        {contract.contract_title || '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-400 uppercase tracking-[0.1em]">
                        {contract.contract_type || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs tracking-[0.1em] uppercase font-mono ${sc.bg} ${sc.text} ${sc.border}`}
                        >
                          {contract.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-white font-mono">
                        {contract.contract_value != null
                          ? contract.contract_value.toLocaleString('en-US', { style: 'currency', currency: contract.currency ?? 'USD' })
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        {contract.expires_at
                          ? new Date(contract.expires_at).toLocaleDateString()
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        {contract.created_at
                          ? new Date(contract.created_at).toLocaleDateString()
                          : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
