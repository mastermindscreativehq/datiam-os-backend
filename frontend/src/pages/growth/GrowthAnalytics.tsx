import { useState, useCallback } from 'react'
import DataTable from '../../components/DataTable'
import LoadingSpinner from '../../components/LoadingSpinner'
import ErrorMessage from '../../components/ErrorMessage'
import { growth, isCriticalError } from '../../api/client'

function normalise(raw: any): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw
  for (const key of ['data', 'items', 'results']) {
    if (Array.isArray(raw?.[key])) return raw[key]
  }
  return raw ? [raw] : []
}

const DAYS_OPTIONS = [7, 14, 30, 90]

interface OverviewData {
  total_views?: number
  total_streams?: number
  total_reach?: number
  total_followers_gained?: number
  [key: string]: unknown
}

export default function GrowthAnalytics() {
  const [artistId,   setArtistId]   = useState('')
  const [days,       setDays]       = useState(30)
  const [overview,   setOverview]   = useState<OverviewData | null>(null)
  const [platforms,  setPlatforms]  = useState<any>(null)
  const [topContent, setTopContent] = useState<any>(null)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')

  const fetchAnalytics = useCallback(async () => {
    if (!artistId.trim()) { setError('Please enter an Artist ID'); return }
    setLoading(true); setError('')
    try {
      const [ovRes, platRes, topRes] = await Promise.all([
        growth.analytics.overview(artistId.trim(), days),
        growth.analytics.byPlatform(artistId.trim(), days),
        growth.analytics.topContent(artistId.trim(), 10),
      ])
      const ov = ovRes.data
      setOverview(ov?.data ?? ov ?? null)
      setPlatforms(platRes.data)
      setTopContent(topRes.data)
    } catch (err: any) {
      if (isCriticalError(err)) setError(err.response?.data?.message || 'Failed to load analytics')
      else setError('Analytics data unavailable')
    } finally { setLoading(false) }
  }, [artistId, days])

  const statCards = overview ? [
    { label: 'TOTAL VIEWS',       value: overview.total_views            ?? 0 },
    { label: 'TOTAL STREAMS',     value: overview.total_streams          ?? 0 },
    { label: 'TOTAL REACH',       value: overview.total_reach            ?? 0 },
    { label: 'FOLLOWERS GAINED',  value: overview.total_followers_gained ?? 0 },
  ] : []

  const platformItems   = normalise(platforms)
  const topContentItems = normalise(topContent)

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-1 h-6 bg-emerald-400 rounded-full" />
            <h1 className="text-xl font-bold font-mono text-emerald-400 tracking-[0.2em]">ANALYTICS HUB</h1>
          </div>
          <p className="text-gray-600 text-[11px] font-mono tracking-[0.2em] ml-4">GROWTH OS · PERFORMANCE METRICS</p>
        </div>
      </div>

      {/* Controls */}
      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[240px]">
          <div className="text-[10px] font-mono text-gray-600 tracking-[0.15em] mb-1.5">ARTIST ID</div>
          <input
            value={artistId}
            onChange={(e) => setArtistId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchAnalytics()}
            placeholder="Paste artist UUID..."
            className="w-full bg-transparent border border-[#00ff41]/15 rounded px-3 py-2 text-[11px] font-mono text-gray-300 placeholder-gray-700 focus:outline-none focus:border-emerald-400/40"
          />
        </div>
        <div>
          <div className="text-[10px] font-mono text-gray-600 tracking-[0.15em] mb-1.5">PERIOD</div>
          <div className="flex gap-1">
            {DAYS_OPTIONS.map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`text-[10px] font-mono tracking-widest px-3 py-2 border rounded transition-colors ${
                  days === d
                    ? 'border-emerald-400/40 text-emerald-400 bg-emerald-400/10'
                    : 'border-[#00ff41]/15 text-gray-600 hover:text-gray-400'
                }`}
              >
                {d}D
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={fetchAnalytics}
          disabled={loading || !artistId.trim()}
          className="text-[10px] font-mono tracking-widest px-5 py-2 border border-emerald-400/40 text-emerald-400 hover:bg-emerald-400/10 rounded transition-colors disabled:opacity-40"
        >
          {loading ? 'LOADING...' : 'FETCH ANALYTICS'}
        </button>
      </div>

      {loading && <div className="flex justify-center py-24"><LoadingSpinner text="LOADING ANALYTICS..." /></div>}
      {error && !loading && <ErrorMessage message={error} onRetry={fetchAnalytics} />}

      {!loading && !error && overview && (
        <div className="space-y-8">
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {statCards.map((c) => (
              <div key={c.label} className="border border-emerald-400/20 bg-emerald-400/5 rounded p-5">
                <div className="text-3xl font-bold font-mono text-emerald-400 mb-1">
                  {Number(c.value).toLocaleString()}
                </div>
                <div className="text-[10px] font-mono text-gray-500 tracking-[0.15em]">{c.label}</div>
              </div>
            ))}
          </div>

          {/* By Platform */}
          {platformItems.length > 0 && (
            <div>
              <div className="text-[10px] font-mono text-gray-600 tracking-[0.2em] mb-3">BY PLATFORM</div>
              <DataTable data={platformItems} color="cyan" />
            </div>
          )}

          {/* Top Content */}
          {topContentItems.length > 0 && (
            <div>
              <div className="text-[10px] font-mono text-gray-600 tracking-[0.2em] mb-3">TOP CONTENT</div>
              <DataTable data={topContentItems} color="cyan" />
            </div>
          )}
        </div>
      )}

      {!loading && !error && !overview && (
        <div className="text-center py-24 text-gray-700 text-[11px] font-mono tracking-[0.15em]">
          ENTER AN ARTIST ID AND FETCH ANALYTICS TO BEGIN
        </div>
      )}
    </div>
  )
}
