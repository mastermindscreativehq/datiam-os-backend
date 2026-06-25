import { useEffect, useState } from 'react'
import { outreach } from '../api/client'
import LoadingSpinner from '../components/LoadingSpinner'

interface Campaign {
  id: string
  status: string
  opportunity_score: number | null
  notes: string | null
  company_id: string | null
  created_at: string
  [key: string]: unknown
}

function getStatusBadge(status: string): JSX.Element {
  const s = status?.toLowerCase() ?? ''

  if (s === 'active' || s === 'running') {
    return (
      <span className="inline-block px-2 py-0.5 rounded text-xs font-mono font-semibold bg-[#00ff41]/10 text-[#00ff41] border border-[#00ff41]/25 tracking-[0.1em]">
        {status.toUpperCase()}
      </span>
    )
  }
  if (s === 'paused' || s === 'pending') {
    return (
      <span className="inline-block px-2 py-0.5 rounded text-xs font-mono font-semibold bg-yellow-400/10 text-yellow-400 border border-yellow-400/25 tracking-[0.1em]">
        {status.toUpperCase()}
      </span>
    )
  }
  if (s === 'completed') {
    return (
      <span className="inline-block px-2 py-0.5 rounded text-xs font-mono font-semibold bg-[#00d4ff]/10 text-[#00d4ff] border border-[#00d4ff]/25 tracking-[0.1em]">
        {status.toUpperCase()}
      </span>
    )
  }
  if (s === 'failed') {
    return (
      <span className="inline-block px-2 py-0.5 rounded text-xs font-mono font-semibold bg-red-500/10 text-red-400 border border-red-500/25 tracking-[0.1em]">
        {status.toUpperCase()}
      </span>
    )
  }
  return (
    <span className="inline-block px-2 py-0.5 rounded text-xs font-mono font-semibold bg-gray-500/10 text-gray-400 border border-gray-500/25 tracking-[0.1em]">
      {status.toUpperCase()}
    </span>
  )
}

function OpportunityBar({ score }: { score: number | null }): JSX.Element {
  const value = score ?? 0
  const clamped = Math.min(100, Math.max(0, Math.round(value)))

  let barColor = 'bg-red-500'
  if (clamped >= 70) barColor = 'bg-[#00ff41]'
  else if (clamped >= 40) barColor = 'bg-yellow-400'

  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-1.5 bg-[#ffffff]/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="text-xs font-mono text-gray-400">{clamped}</span>
    </div>
  )
}

export default function OutreachCampaigns(): JSX.Element {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await outreach.listCampaigns()
        const data = res.data?.data ?? res.data
        setCampaigns(data?.campaigns ?? data ?? [])
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to load campaigns'
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    fetchCampaigns()
  }, [])

  return (
    <div className="min-h-screen bg-[#0c0c0c] font-mono p-6">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="w-1 h-12 bg-[#00ff41] rounded-full mt-0.5" />
          <div>
            <h1 className="text-2xl font-bold text-[#00ff41] tracking-[0.2em]">
              OUTREACH CAMPAIGNS
            </h1>
            <p className="text-xs text-gray-500 tracking-[0.15em] mt-1">
              CAMPAIGN INTELLIGENCE ENGINE
            </p>
          </div>
        </div>

        <button
          className="px-4 py-2 text-xs font-mono font-semibold tracking-[0.15em] text-[#00ff41] border border-[#00ff41]/25 bg-[#00ff41]/10 rounded hover:bg-[#00ff41]/20 transition-colors"
          onClick={() => {/* placeholder */}}
        >
          + NEW CAMPAIGN
        </button>
      </div>

      {/* Summary Stats Row */}
      <div className="mb-6">
        <div className="inline-block bg-[#111] border border-[#00ff41]/10 rounded-lg p-4">
          <p className="text-xs text-gray-500 tracking-[0.15em] mb-1">TOTAL CAMPAIGNS</p>
          <p className="text-2xl font-bold text-[#00ff41]">
            {loading ? '—' : campaigns.length}
          </p>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-24">
          <LoadingSpinner />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="border border-red-500/25 bg-red-500/10 rounded-lg p-4 text-red-400 text-sm font-mono">
          ERROR: {error}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && campaigns.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-gray-500 text-sm tracking-[0.1em]">
          <p>NO CAMPAIGNS FOUND</p>
          <p className="text-xs mt-2 text-gray-600">
            Create a new campaign to get started.
          </p>
        </div>
      )}

      {/* Table */}
      {!loading && !error && campaigns.length > 0 && (
        <div className="bg-[#111] border border-[#00ff41]/10 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#ffffff]/5">
                <th className="text-left px-4 py-3 text-xs text-gray-500 tracking-[0.15em] font-normal">
                  CAMPAIGN ID
                </th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 tracking-[0.15em] font-normal">
                  STATUS
                </th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 tracking-[0.15em] font-normal">
                  OPP. SCORE
                </th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 tracking-[0.15em] font-normal">
                  NOTES
                </th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 tracking-[0.15em] font-normal">
                  CREATED
                </th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => (
                <tr
                  key={campaign.id}
                  className="bg-[#0c0c0c] border-b border-[#ffffff]/5 hover:bg-[#00ff41]/5 transition-colors"
                >
                  <td className="px-4 py-3 text-[#00d4ff] text-xs">
                    {campaign.id.slice(0, 8).toUpperCase()}
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(campaign.status ?? 'unknown')}
                  </td>
                  <td className="px-4 py-3">
                    <OpportunityBar score={campaign.opportunity_score} />
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs max-w-xs truncate">
                    {campaign.notes
                      ? campaign.notes.length > 60
                        ? `${campaign.notes.slice(0, 60)}...`
                        : campaign.notes
                      : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {campaign.created_at
                      ? new Date(campaign.created_at).toLocaleDateString()
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
