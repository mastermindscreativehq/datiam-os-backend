import { useEffect, useState } from 'react'
import StatCard from '../components/StatCard'
import DataTable from '../components/DataTable'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import { fanIntelligence } from '../api/client'

function toArray(raw: any): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw
  if (raw?.data && Array.isArray(raw.data)) return raw.data
  if (raw?.items && Array.isArray(raw.items)) return raw.items
  return []
}

export default function FanIntelligence() {
  const [summary,   setSummary]   = useState<any>(null)
  const [topFans,   setTopFans]   = useState<any>(null)
  const [geography, setGeography] = useState<any>(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')

  const fetchAll = async () => {
    setLoading(true)
    setError('')
    try {
      const [sRes, tfRes, gRes] = await Promise.all([
        fanIntelligence.summary(),
        fanIntelligence.topFans(),
        fanIntelligence.geography(),
      ])
      setSummary(sRes.data)
      setTopFans(tfRes.data)
      setGeography(gRes.data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load fan intelligence')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  const topFanRows  = toArray(topFans)
  const geoItems    = toArray(geography)

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-1 h-6 bg-[#00d4ff] rounded-full" />
          <h1 className="text-xl font-bold font-mono text-[#00d4ff] tracking-[0.2em] text-glow-cyan">
            FAN INTELLIGENCE
          </h1>
        </div>
        <p className="text-gray-600 text-[11px] font-mono tracking-[0.2em] ml-4">
          AUDIENCE BEHAVIOR ANALYTICS
        </p>
      </div>

      {loading && (
        <div className="flex justify-center py-24">
          <LoadingSpinner text="SCANNING FAN MATRIX..." />
        </div>
      )}

      {error && <ErrorMessage message={error} onRetry={fetchAll} />}

      {!loading && !error && (
        <div className="space-y-8">
          {/* Summary KPIs */}
          {summary && (
            <section>
              <div className="text-[10px] font-mono tracking-[0.25em] text-[#00d4ff]/40 mb-3 uppercase">
                Audience Summary
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <StatCard label="Total Fans"    value={summary.totalFans    ?? summary.total    ?? '—'} color="green" />
                <StatCard label="Active Fans"   value={summary.activeFans   ?? summary.active   ?? '—'} color="cyan" />
                <StatCard label="Avg Engagement" value={summary.avgEngagement ?? summary.engagement ?? '—'} color="purple" />
                <StatCard label="Growth Rate"   value={summary.growthRate   ?? summary.growth   ?? '—'} color="orange" />
              </div>
              <div className="border border-[#00d4ff]/15 rounded-lg bg-[#0d0d0d]">
                <div className="px-5 py-2.5 border-b border-[#00d4ff]/10 text-[10px] font-mono tracking-[0.2em] text-[#00d4ff]/40">
                  GET /api/fan-intelligence/summary
                </div>
                <pre className="p-4 text-[#00d4ff]/60 text-[11px] font-mono overflow-auto max-h-40">
                  {JSON.stringify(summary, null, 2)}
                </pre>
              </div>
            </section>
          )}

          {/* Top Fans Table */}
          {topFans && (
            <section>
              <div className="text-[10px] font-mono tracking-[0.25em] text-[#00ff41]/40 mb-3 uppercase">
                Top Fans
              </div>
              {topFanRows.length > 0 ? (
                <DataTable data={topFanRows} color="green" />
              ) : (
                <div className="border border-[#00ff41]/15 rounded-lg bg-[#0d0d0d]">
                  <pre className="p-4 text-[#00ff41]/60 text-[11px] font-mono overflow-auto max-h-64">
                    {JSON.stringify(topFans, null, 2)}
                  </pre>
                </div>
              )}
            </section>
          )}

          {/* Geographic Distribution */}
          {geography && (
            <section>
              <div className="text-[10px] font-mono tracking-[0.25em] text-[#00d4ff]/40 mb-3 uppercase">
                Geographic Distribution
              </div>
              {geoItems.length > 0 ? (
                <div className="border border-[#00d4ff]/20 rounded-lg bg-[#0d0d0d] p-5 space-y-3">
                  {geoItems.slice(0, 12).map((item: any, i: number) => {
                    const name = item.country || item.region || item.name || item.city || `Location ${i + 1}`
                    const val  = Number(item.fans || item.count || item.value || item.listeners || 0)
                    const maxVal = Math.max(...geoItems.map((g: any) =>
                      Number(g.fans || g.count || g.value || g.listeners || 0)
                    ), 1)
                    const pct = Math.round((val / maxVal) * 100)
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-28 text-gray-500 text-[11px] font-mono truncate">{name}</div>
                        <div className="flex-1 h-1 bg-[#111] rounded overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#00d4ff]/80 to-[#00d4ff]/40 rounded transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="w-20 text-right text-[#00d4ff]/50 text-[11px] font-mono">
                          {val.toLocaleString()}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="border border-[#00d4ff]/15 rounded-lg bg-[#0d0d0d]">
                  <pre className="p-4 text-[#00d4ff]/60 text-[11px] font-mono overflow-auto max-h-64">
                    {JSON.stringify(geography, null, 2)}
                  </pre>
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  )
}
