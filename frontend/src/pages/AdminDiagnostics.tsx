import { useState, useEffect, useCallback } from 'react'
import { monitoring } from '../api/client'

// ── Types ─────────────────────────────────────────────────────────────────────

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'critical'
  version: string
  environment: string
  uptime: number
  timestamp: string
  checks: {
    database: { status: string; responseTimeMs: number }
    redis:    { status: string; responseTimeMs: number }
    queue:    { status: string }
  }
  responseTimeMs: number
}

interface HealthCheck {
  id: string
  status: string
  database_status: string
  redis_status: string
  queue_status: string
  response_time_ms: number | null
  created_at: string
}

interface Incident {
  id: string
  incident_key: string
  severity: string
  title: string
  description: string | null
  status: string
  started_at: string
  resolved_at: string | null
  created_at: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function formatTimestamp(ts: string): string {
  return new Date(ts).toLocaleString('en-GB', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  })
}

// ── Status dot ────────────────────────────────────────────────────────────────

function Dot({ status }: { status: string }) {
  const colour =
    status === 'healthy'   || status === 'connected' ? '#00ff41' :
    status === 'degraded'  || status === 'warning'   ? '#fbbf24' :
    status === 'critical'  || status === 'disconnected' ? '#ef4444' :
    '#6b7280'
  return (
    <span
      className="inline-block w-2 h-2 rounded-full mr-2 flex-shrink-0"
      style={{ background: colour, boxShadow: `0 0 6px ${colour}` }}
    />
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  status,
}: {
  label: string
  value: string
  sub?: string
  status?: string
}) {
  return (
    <div className="bg-[#111] border border-[#00ff41]/10 rounded p-4 space-y-2">
      <div className="text-[10px] font-mono tracking-[0.2em] text-[#00ff41]/40">{label}</div>
      <div className="flex items-center">
        {status && <Dot status={status} />}
        <span className="text-sm font-mono text-[#00ff41] font-bold tracking-wide">{value}</span>
      </div>
      {sub && <div className="text-[10px] font-mono text-[#00d4ff]/40">{sub}</div>}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminDiagnostics() {
  const [health, setHealth]       = useState<HealthStatus | null>(null)
  const [history, setHistory]     = useState<HealthCheck[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [countdown, setCountdown] = useState(30)
  const [resolving, setResolving] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [statusRes, historyRes, incidentsRes] = await Promise.allSettled([
        monitoring.status(),
        monitoring.history(),
        monitoring.incidents(),
      ])

      if (statusRes.status === 'fulfilled')   setHealth(statusRes.value.data)
      if (historyRes.status === 'fulfilled')  setHistory(historyRes.value.data.data ?? [])
      if (incidentsRes.status === 'fulfilled') setIncidents(incidentsRes.value.data.data ?? [])

      if (statusRes.status === 'rejected') {
        setError('Failed to reach the API. Check backend connectivity.')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
      setCountdown(30)
    }
  }, [])

  // Initial fetch
  useEffect(() => { void fetchAll() }, [fetchAll])

  // Auto-refresh countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { void fetchAll(); return 30 }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [fetchAll])

  async function resolveIncident(id: string) {
    setResolving(id)
    try {
      await monitoring.resolveIncident(id)
      setIncidents((prev) =>
        prev.map((i) => i.id === id ? { ...i, status: 'resolved', resolved_at: new Date().toISOString() } : i),
      )
    } finally {
      setResolving(null)
    }
  }

  const openIncidents = incidents.filter((i) => i.status === 'open')

  return (
    <div className="p-6 space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-mono font-bold tracking-[0.2em] text-[#00ff41]">
            SYSTEM DIAGNOSTICS
          </h1>
          <div className="text-[10px] font-mono text-[#00ff41]/30 mt-1 tracking-widest">
            MONITORING · WATCHDOG · INCIDENT TRACKING
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-[10px] font-mono text-[#00d4ff]/40 tracking-widest">
            AUTO-REFRESH {countdown}s
          </div>
          <button
            onClick={() => void fetchAll()}
            disabled={loading}
            className="px-4 py-1.5 text-[11px] font-mono tracking-widest border border-[#00ff41]/20 text-[#00ff41]/60 rounded hover:bg-[#00ff41]/5 hover:text-[#00ff41] hover:border-[#00ff41]/40 transition-all disabled:opacity-40"
          >
            {loading ? 'REFRESHING...' : '⟳ REFRESH'}
          </button>
        </div>
      </div>

      {error && (
        <div className="border border-red-500/30 bg-red-500/5 rounded p-3 text-[11px] font-mono text-red-400">
          ✕ {error}
        </div>
      )}

      {/* Status overview */}
      {health && (
        <section className="space-y-3">
          <div className="text-[10px] font-mono tracking-[0.2em] text-[#00ff41]/40">STATUS OVERVIEW</div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard
              label="API STATUS"
              value={health.status.toUpperCase()}
              sub={`${health.responseTimeMs}ms`}
              status={health.status}
            />
            <StatCard
              label="DATABASE"
              value={health.checks.database.status.toUpperCase()}
              sub={`${health.checks.database.responseTimeMs}ms`}
              status={health.checks.database.status}
            />
            <StatCard
              label="REDIS"
              value={health.checks.redis.status.toUpperCase()}
              sub={health.checks.redis.status !== 'not_configured' ? `${health.checks.redis.responseTimeMs}ms` : 'not configured'}
              status={health.checks.redis.status}
            />
            <StatCard
              label="QUEUE"
              value={health.checks.queue.status.toUpperCase()}
              status={health.checks.queue.status}
            />
            <StatCard
              label="UPTIME"
              value={formatUptime(health.uptime)}
              sub={health.environment}
            />
            <StatCard
              label="VERSION"
              value={`v${health.version}`}
              sub={`Last check: ${formatTimestamp(health.timestamp)}`}
            />
          </div>
        </section>
      )}

      {/* Open incidents */}
      <section className="space-y-3">
        <div className="text-[10px] font-mono tracking-[0.2em] text-[#00ff41]/40">
          OPEN INCIDENTS {openIncidents.length > 0 && <span className="text-red-400">({openIncidents.length})</span>}
        </div>
        {openIncidents.length === 0 ? (
          <div className="border border-[#00ff41]/10 rounded p-4 text-[11px] font-mono text-[#00ff41]/30 text-center">
            ✓ No open incidents
          </div>
        ) : (
          <div className="space-y-2">
            {openIncidents.map((incident) => (
              <div
                key={incident.id}
                className={`border rounded p-4 flex items-start justify-between gap-4 ${
                  incident.severity === 'critical' ? 'border-red-500/30 bg-red-500/5' :
                  incident.severity === 'error'    ? 'border-orange-500/30 bg-orange-500/5' :
                  'border-yellow-500/30 bg-yellow-500/5'
                }`}
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Dot status="critical" />
                    <span className="text-[11px] font-mono font-bold text-white tracking-wide">
                      {incident.title}
                    </span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                      incident.severity === 'critical' ? 'border-red-500/40 text-red-400' :
                      incident.severity === 'error'    ? 'border-orange-500/40 text-orange-400' :
                      'border-yellow-500/40 text-yellow-400'
                    }`}>
                      {incident.severity.toUpperCase()}
                    </span>
                  </div>
                  {incident.description && (
                    <div className="text-[10px] font-mono text-gray-500 truncate">{incident.description}</div>
                  )}
                  <div className="text-[10px] font-mono text-gray-600">
                    Started: {formatTimestamp(incident.started_at)}
                  </div>
                </div>
                <button
                  onClick={() => void resolveIncident(incident.id)}
                  disabled={resolving === incident.id}
                  className="flex-shrink-0 px-3 py-1 text-[10px] font-mono tracking-widest border border-[#00ff41]/20 text-[#00ff41]/60 rounded hover:bg-[#00ff41]/5 hover:text-[#00ff41] transition-all disabled:opacity-40"
                >
                  {resolving === incident.id ? '...' : 'RESOLVE'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Health history */}
      <section className="space-y-3">
        <div className="text-[10px] font-mono tracking-[0.2em] text-[#00ff41]/40">
          HEALTH HISTORY (last {history.length})
        </div>
        <div className="border border-[#00ff41]/10 rounded overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] font-mono">
              <thead>
                <tr className="border-b border-[#00ff41]/10 bg-[#0a0a0a]">
                  {['TIMESTAMP', 'STATUS', 'DATABASE', 'REDIS', 'QUEUE', 'RESPONSE'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left tracking-[0.15em] text-[#00ff41]/30">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-[#00ff41]/20">
                      No health checks recorded yet. Watchdog runs every 60s.
                    </td>
                  </tr>
                ) : (
                  history.map((row, i) => (
                    <tr
                      key={row.id}
                      className={`border-b border-[#00ff41]/5 ${i % 2 === 0 ? 'bg-transparent' : 'bg-[#0a0a0a]'}`}
                    >
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                        {formatTimestamp(row.created_at)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex items-center">
                          <Dot status={row.status} />
                          <span className={
                            row.status === 'healthy'  ? 'text-[#00ff41]' :
                            row.status === 'degraded' ? 'text-yellow-400' :
                            'text-red-400'
                          }>
                            {row.status.toUpperCase()}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex items-center">
                          <Dot status={row.database_status} />
                          <span className="text-gray-400">{row.database_status}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex items-center">
                          <Dot status={row.redis_status} />
                          <span className="text-gray-400">{row.redis_status}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex items-center">
                          <Dot status={row.queue_status} />
                          <span className="text-gray-400">{row.queue_status}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-[#00d4ff]/60 whitespace-nowrap">
                        {row.response_time_ms != null ? `${row.response_time_ms}ms` : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* All incidents (resolved) */}
      {incidents.filter((i) => i.status === 'resolved').length > 0 && (
        <section className="space-y-3">
          <div className="text-[10px] font-mono tracking-[0.2em] text-[#00ff41]/40">RESOLVED INCIDENTS</div>
          <div className="border border-[#00ff41]/10 rounded overflow-hidden">
            <table className="w-full text-[10px] font-mono">
              <thead>
                <tr className="border-b border-[#00ff41]/10 bg-[#0a0a0a]">
                  {['INCIDENT', 'SEVERITY', 'STARTED', 'RESOLVED'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left tracking-[0.15em] text-[#00ff41]/30">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {incidents.filter((i) => i.status === 'resolved').map((incident, i) => (
                  <tr
                    key={incident.id}
                    className={`border-b border-[#00ff41]/5 ${i % 2 === 0 ? 'bg-transparent' : 'bg-[#0a0a0a]'}`}
                  >
                    <td className="px-3 py-2 text-gray-400">{incident.title}</td>
                    <td className="px-3 py-2 text-gray-500 uppercase">{incident.severity}</td>
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                      {formatTimestamp(incident.started_at)}
                    </td>
                    <td className="px-3 py-2 text-[#00ff41]/60 whitespace-nowrap">
                      {incident.resolved_at ? formatTimestamp(incident.resolved_at) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
