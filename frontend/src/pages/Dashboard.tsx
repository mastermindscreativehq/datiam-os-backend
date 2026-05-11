import { useEffect, useState } from 'react'
import StatCard from '../components/StatCard'
import LoadingSpinner from '../components/LoadingSpinner'
import { dashboard } from '../api/client'

const DEFAULT_DATA = {
  fans:             { total: 0, active: 0, growth_rate: 0, engagement_avg: 0 },
  songs:            { total: 0, released: 0, drafts: 0 },
  revenue_summary:  { total_tracked: 0, monthly: 0, currency: 'USD' },
  sync_pitches:     { active: 0, pending: 0, won: 0, win_rate: 0 },
  releases:         { live: 0, upcoming: 0 },
  tasks:            { pending: 0, completed: 0 },
  automation:       { runs: 0, successful: 0, failed: 0 },
  ai_recommendations: [] as any[],
}

function pick(obj: any, ...keys: string[]): string {
  for (const k of keys) {
    if (obj?.[k] !== undefined && obj?.[k] !== null) return String(obj[k])
  }
  return '—'
}

function pickNum(obj: any, ...keys: string[]): string {
  for (const k of keys) {
    const v = obj?.[k]
    if (v !== undefined && v !== null) {
      const n = Number(v)
      return isNaN(n) ? String(v) : n.toLocaleString()
    }
  }
  return '—'
}

export default function Dashboard() {
  const [data, setData]       = useState<any>(DEFAULT_DATA)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      console.log('[Dashboard] GET /api/dashboard/overview, token present:', !!localStorage.getItem('datiam_token'))
      const res = await dashboard.overview()
      console.log('[Dashboard] response status:', res.status)
      console.log('[Dashboard] response payload:', res.data)
      // Backend returns { success, data } — unwrap the inner data object
      const payload = res.data?.data ?? res.data
      setData(payload ?? DEFAULT_DATA)
    } catch (err: any) {
      console.error('[Dashboard] request failed:', err.message)
      console.error('[Dashboard] response status:', err.response?.status)
      console.error('[Dashboard] response data:', err.response?.data)
      setError('Live data unavailable — showing cached defaults')
      setData(DEFAULT_DATA)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-1 h-6 bg-[#00ff41] rounded-full" />
          <h1 className="text-xl font-bold font-mono text-[#00ff41] tracking-[0.2em] text-glow-green">
            SYSTEM OVERVIEW
          </h1>
        </div>
        <p className="text-gray-600 text-[11px] font-mono tracking-[0.2em] ml-4">
          REAL-TIME INTELLIGENCE MATRIX
        </p>
      </div>

      {loading && (
        <div className="flex justify-center py-24">
          <LoadingSpinner text="LOADING OVERVIEW..." />
        </div>
      )}

      {error && (
        <div className="mb-4 px-4 py-2 border border-yellow-500/30 rounded bg-yellow-500/5 flex items-center justify-between">
          <span className="text-yellow-400/70 text-[11px] font-mono tracking-[0.15em]">
            ⚠ {error}
          </span>
          <button
            onClick={fetchData}
            className="text-[10px] font-mono text-yellow-400/50 hover:text-yellow-400 ml-4 underline"
          >
            RETRY
          </button>
        </div>
      )}

      {!loading && (
        <div className="space-y-6">
          {/* KPI Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Fans"
              value={pickNum(data?.fans, 'total')}
              color="green"
              icon="◈"
              sub="registered audience"
            />
            <StatCard
              label="Total Songs"
              value={pickNum(data?.songs, 'total')}
              color="cyan"
              icon="◉"
              sub="catalog"
            />
            <StatCard
              label="Revenue"
              value={
                data?.revenue_summary?.total_tracked != null
                  ? `$${Number(data.revenue_summary.total_tracked).toLocaleString()}`
                  : '—'
              }
              color="purple"
              icon="◆"
              sub="gross tracked"
            />
            <StatCard
              label="Sync Pitches"
              value={pickNum(data?.sync_pitches, 'active')}
              color="orange"
              icon="⬢"
              sub="active"
            />
          </div>

          {/* Secondary stats */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard
              label="Live Releases"
              value={pickNum(data?.releases, 'live')}
              color="cyan"
              icon="◎"
            />
            <StatCard
              label="Pending Tasks"
              value={pickNum(data?.tasks, 'pending')}
              color="green"
              icon="◷"
            />
            <StatCard
              label="Sync Win Rate"
              value={`${data?.sync_pitches?.win_rate ?? 0}%`}
              color="purple"
              icon="↑"
            />
          </div>

          {/* Raw payload */}
          <div className="border border-[#00ff41]/15 rounded-lg bg-[#0d0d0d]">
            <div className="px-5 py-3 border-b border-[#00ff41]/10 flex items-center justify-between">
              <div className="text-[10px] font-mono tracking-[0.2em] text-[#00ff41]/40">
                RAW MATRIX PAYLOAD
              </div>
              <div className="text-[10px] font-mono text-gray-700">
                GET /api/dashboard/overview
              </div>
            </div>
            <pre className="p-5 text-[#00d4ff]/70 text-[11px] font-mono overflow-auto max-h-72 leading-relaxed">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
