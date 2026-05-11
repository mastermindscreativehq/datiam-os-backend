import { useEffect, useState, useCallback } from 'react'
import StatCard from '../components/StatCard'
import LoadingSpinner from '../components/LoadingSpinner'
import { dashboard, activity } from '../api/client'
import { useAuthStore } from '../store/authStore'

const DEFAULT_DATA = {
  fans:             { total: 0, active: 0, growth_rate: 0, engagement_avg: 0 },
  songs:            { total: 0, released: 0, drafts: 0 },
  revenue_summary:  { total_tracked: 0, monthly: 0, currency: 'USD' },
  sync_pitches:     { active: 0, pending: 0, won: 0, win_rate: 0 },
  releases:         { live: 0, upcoming: 0 },
  tasks:            { pending: 0, completed: 0 },
  automation:       { runs: 0, successful: 0, failed: 0 },
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

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'text-[#00ff41]',
  UPDATE: 'text-[#00d4ff]',
  DELETE: 'text-red-400',
  LOGIN:  'text-purple-400',
}

const ACTION_DOTS: Record<string, string> = {
  CREATE: 'bg-[#00ff41]',
  UPDATE: 'bg-[#00d4ff]',
  DELETE: 'bg-red-400',
  LOGIN:  'bg-purple-400',
}

function formatRelTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function Dashboard() {
  const { user } = useAuthStore()

  const [data,       setData]       = useState<any>(DEFAULT_DATA)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const [activityLog,   setActivityLog]   = useState<any[]>([])
  const [activityLoad, setActivityLoad] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await dashboard.overview()
      const payload = res.data?.data ?? res.data
      setData(payload ?? DEFAULT_DATA)
    } catch {
      setError('Live data unavailable')
      setData(DEFAULT_DATA)
    } finally { setLoading(false) }
  }, [])

  const fetchActivity = useCallback(async () => {
    setActivityLoad(true)
    try {
      const res = await activity.recent()
      const payload = res.data?.data ?? res.data
      setActivityLog(Array.isArray(payload) ? payload : [])
    } catch {
      setActivityLog([])
    } finally { setActivityLoad(false) }
  }, [])

  useEffect(() => {
    fetchData()
    fetchActivity()
  }, [fetchData, fetchActivity])

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-1 h-6 bg-[#00ff41] rounded-full" />
              <h1 className="text-xl font-bold font-mono text-[#00ff41] tracking-[0.2em] text-glow-green">
                SYSTEM OVERVIEW
              </h1>
            </div>
            <p className="text-gray-600 text-[11px] font-mono tracking-[0.2em] ml-4">
              OPERATIONAL INTELLIGENCE MATRIX
            </p>
          </div>
          {user && (
            <div className="text-right">
              <div className="text-[10px] font-mono text-gray-600 tracking-widest">
                {user.full_name || user.email}
              </div>
              <div className="text-[10px] font-mono tracking-widest mt-0.5">
                <span className={`${user.role === 'owner' ? 'text-[#00ff41]' : user.role === 'admin' ? 'text-[#00d4ff]' : 'text-gray-500'}`}>
                  {String(user.role ?? 'team').toUpperCase()}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-24">
          <LoadingSpinner text="LOADING OVERVIEW..." />
        </div>
      )}

      {error && (
        <div className="mb-4 px-4 py-2 border border-yellow-500/30 rounded bg-yellow-500/5 flex items-center justify-between">
          <span className="text-yellow-400/70 text-[11px] font-mono tracking-[0.15em]">⚠ {error}</span>
          <button onClick={fetchData} className="text-[10px] font-mono text-yellow-400/50 hover:text-yellow-400 ml-4 underline">RETRY</button>
        </div>
      )}

      {!loading && (
        <div className="space-y-6">
          {/* Primary KPI Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Fans"    value={pickNum(data?.fans, 'total')}                   color="green"  icon="◈" sub="registered audience" />
            <StatCard label="Total Songs"   value={pickNum(data?.songs, 'total')}                  color="cyan"   icon="◉" sub="catalog" />
            <StatCard label="Revenue"       value={data?.revenue_summary?.total_tracked != null ? `$${Number(data.revenue_summary.total_tracked).toLocaleString()}` : '—'} color="purple" icon="◆" sub="gross tracked" />
            <StatCard label="Sync Pitches"  value={pickNum(data?.sync_pitches, 'active')}          color="orange" icon="⬢" sub="active" />
          </div>

          {/* Secondary Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard label="Live Releases"  value={pickNum(data?.releases, 'live')}    color="cyan"   icon="◎" />
            <StatCard label="Pending Tasks"  value={pickNum(data?.tasks, 'pending')}    color="green"  icon="◷" />
            <StatCard label="Sync Win Rate"  value={`${data?.sync_pitches?.win_rate ?? 0}%`} color="purple" icon="↑" />
          </div>

          {/* Activity Feed */}
          <div className="border border-[#00ff41]/15 rounded-lg bg-[#0d0d0d]">
            <div className="px-5 py-3 border-b border-[#00ff41]/10 flex items-center justify-between">
              <div className="text-[10px] font-mono tracking-[0.2em] text-[#00ff41]/50">
                RECENT ACTIVITY
              </div>
              <button
                onClick={fetchActivity}
                className="text-[10px] font-mono text-gray-700 hover:text-gray-500 tracking-widest transition-colors"
              >
                REFRESH
              </button>
            </div>

            {activityLoad ? (
              <div className="px-5 py-8 flex justify-center">
                <LoadingSpinner text="LOADING ACTIVITY..." />
              </div>
            ) : activityLog.length === 0 ? (
              <div className="px-5 py-8 text-center text-gray-700 text-[11px] font-mono tracking-widest">
                NO ACTIVITY RECORDED YET
              </div>
            ) : (
              <div className="divide-y divide-[#111]">
                {activityLog.slice(0, 20).map((entry: any) => (
                  <div key={entry.id} className="px-5 py-3 flex items-center gap-4 hover:bg-white/[0.02] transition-colors">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ACTION_DOTS[entry.action] ?? 'bg-gray-600'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-mono font-bold tracking-widest ${ACTION_COLORS[entry.action] ?? 'text-gray-500'}`}>
                          {entry.action}
                        </span>
                        <span className="text-[11px] font-mono text-gray-400 truncate">
                          {entry.entity_name ?? entry.entity_id ?? entry.entity_type}
                        </span>
                        <span className="text-[10px] font-mono text-gray-700 tracking-widest">
                          [{entry.entity_type}]
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-gray-700 mt-0.5">
                        {entry.user_name ?? entry.user_email}
                      </div>
                    </div>
                    <div className="text-[10px] font-mono text-gray-700 flex-shrink-0 whitespace-nowrap">
                      {formatRelTime(entry.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
