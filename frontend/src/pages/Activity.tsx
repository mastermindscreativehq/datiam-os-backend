import { useEffect, useState, useCallback } from 'react'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import { activity } from '../api/client'

type Severity = 'info' | 'warning' | 'error' | 'critical'

interface ActivityEntry {
  id: string
  event_type: string | null
  module: string | null
  title: string | null
  description: string | null
  severity: string
  created_at: string
  // legacy
  action: string | null
  entity_type: string | null
}

interface ActivityStats {
  bySeverity: { severity: string; count: number }[]
  byModule: { module: string; count: number }[]
  byEventType: { event_type: string; count: number }[]
}

interface FetchError {
  message: string
  status?: number
  requestId?: string
}

const SEVERITY_STYLE: Record<string, string> = {
  info:     'text-[#00d4ff] border-[#00d4ff]/30 bg-[#00d4ff]/5',
  warning:  'text-yellow-400 border-yellow-400/30 bg-yellow-400/5',
  error:    'text-red-400 border-red-400/30 bg-red-400/5',
  critical: 'text-red-500 border-red-500/40 bg-red-500/10',
}

function severityStyle(s: string) {
  return SEVERITY_STYLE[s] ?? SEVERITY_STYLE.info
}

function formatTs(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function normalise(raw: unknown): ActivityEntry[] {
  if (Array.isArray(raw)) return raw as ActivityEntry[]
  const obj = raw as Record<string, unknown>
  for (const k of ['activities', 'data', 'items']) {
    if (Array.isArray(obj?.[k])) return obj[k] as ActivityEntry[]
  }
  return []
}

function normaliseStats(raw: unknown): ActivityStats | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  const data = (obj.data ?? obj) as Record<string, unknown>
  if (!data.bySeverity) return null
  return data as unknown as ActivityStats
}

export default function Activity() {
  const [items,       setItems]       = useState<ActivityEntry[]>([])
  const [stats,       setStats]       = useState<ActivityStats | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState<FetchError | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) { setLoading(true); setError(null) }

    // Debug: confirm token and URL
    const token = localStorage.getItem('datiam_token')
    console.log('[Activity] fetch start', {
      silent,
      tokenExists: !!token,
      tokenSnippet: token ? `${token.substring(0, 20)}…` : null,
    })

    try {
      const [recentResult, statsResult] = await Promise.allSettled([
        activity.recent(),
        activity.stats(),
      ])

      // ── recent (required) ─────────────────────────────────────────────────
      if (recentResult.status === 'fulfilled') {
        const payload = recentResult.value.data
        console.log('[Activity] /recent OK', payload)
        setItems(normalise(payload))
        setError(null)
      } else {
        const err = recentResult.reason
        const status: number | undefined = err?.response?.status
        const requestId: string | undefined = err?.response?.headers?.['x-request-id'] ?? undefined
        // backend returns { error: "..." } — check both keys so we never swallow the real message
        const msg: string =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Failed to load activity log'
        console.error('[Activity] /recent FAILED', {
          status,
          requestId,
          responseBody: err?.response?.data,
          networkMessage: err?.message,
        })
        setError({ message: msg, status, requestId })
      }

      // ── stats (optional — non-fatal) ───────────────────────────────────────
      if (statsResult.status === 'fulfilled') {
        const payload = statsResult.value.data
        console.log('[Activity] /stats OK', payload)
        setStats(normaliseStats(payload))
      } else {
        console.warn('[Activity] /stats FAILED (non-fatal)', {
          status: statsResult.reason?.response?.status,
          body:   statsResult.reason?.response?.data,
        })
      }

      setLastUpdated(new Date())
    } catch (unexpected: unknown) {
      const msg = unexpected instanceof Error ? unexpected.message : 'Unexpected error'
      console.error('[Activity] unexpected error', unexpected)
      if (!silent) setError({ message: msg })
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  // Initial load + 15-second live poll
  useEffect(() => {
    fetchData()
    const id = setInterval(() => fetchData(true), 15_000)
    return () => clearInterval(id)
  }, [fetchData])

  const errorDisplay = error
    ? [
        error.message,
        error.status    && `HTTP ${error.status}`,
        error.requestId && `[${error.requestId}]`,
      ].filter(Boolean).join('  ')
    : ''

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-1 h-6 bg-[#00d4ff] rounded-full" />
            <h1 className="text-xl font-bold font-mono text-[#00d4ff] tracking-[0.2em]">ACTIVITY</h1>
          </div>
          <p className="text-gray-600 text-[11px] font-mono tracking-[0.2em] ml-4">SYSTEM EVENT LOG</p>
        </div>
        {lastUpdated && !loading && (
          <div className="text-[9px] font-mono text-gray-700 self-end pb-0.5">
            POLLED {lastUpdated.toLocaleTimeString()} · 15s INTERVAL
          </div>
        )}
      </div>

      {loading && (
        <div className="flex justify-center py-24">
          <LoadingSpinner text="LOADING ACTIVITY..." />
        </div>
      )}

      {!loading && error && (
        <ErrorMessage message={errorDisplay} onRetry={() => fetchData(false)} />
      )}

      {!loading && !error && (
        <div className="space-y-6">
          {/* Stats row */}
          {stats && (
            <div className="grid grid-cols-3 gap-3">
              <StatGroup label="BY SEVERITY" entries={stats.bySeverity.map(r => ({ key: r.severity,              count: r.count }))} />
              <StatGroup label="BY MODULE"   entries={stats.byModule.map(r =>   ({ key: r.module   ?? '—',       count: r.count }))} />
              <StatGroup label="BY EVENT"    entries={stats.byEventType.map(r => ({ key: r.event_type ?? '—',    count: r.count }))} />
            </div>
          )}

          {/* Event list */}
          {items.length === 0 ? (
            <div className="border border-[#00d4ff]/10 rounded p-12 text-center">
              <div className="text-[#00d4ff]/20 text-3xl mb-3">◈</div>
              <div className="text-gray-600 text-[11px] font-mono tracking-widest">NO REAL ACTIVITY RECORDED YET</div>
            </div>
          ) : (
            <div className="space-y-1">
              {items.map((item) => (
                <ActivityRow key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StatGroup({ label, entries }: { label: string; entries: { key: string; count: number }[] }) {
  return (
    <div className="border border-white/5 rounded p-3 bg-[#111]">
      <div className="text-[9px] font-mono text-gray-600 tracking-widest mb-2">{label}</div>
      <div className="space-y-1">
        {entries.length === 0 && (
          <div className="text-[10px] font-mono text-gray-700">—</div>
        )}
        {entries.map(({ key, count }) => (
          <div key={key} className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-gray-400 truncate">{key.toUpperCase()}</span>
            <span className="text-[10px] font-mono text-[#00d4ff]/60 ml-2">{count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ActivityRow({ item }: { item: ActivityEntry }) {
  const sev    = (item.severity ?? 'info') as Severity
  const label  = item.title      ?? item.action     ?? item.event_type ?? '—'
  const mod    = item.module     ?? item.entity_type ?? '—'
  const evtTag = item.event_type ?? item.action      ?? '—'

  return (
    <div className="flex items-start gap-3 border border-white/5 rounded px-3 py-2.5 hover:border-white/10 transition-colors bg-[#0d0d0d]">
      <div className="mt-0.5 shrink-0">
        <span className={`text-[9px] font-mono border rounded px-1.5 py-0.5 tracking-widest ${severityStyle(sev)}`}>
          {sev.toUpperCase()}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-mono text-gray-200 truncate">{label}</span>
          <span className="text-[9px] font-mono text-[#00d4ff]/40 border border-[#00d4ff]/15 rounded px-1.5 py-0.5">
            {mod.toUpperCase()}
          </span>
        </div>
        {item.description && (
          <div className="text-[10px] font-mono text-gray-600 mt-0.5 truncate">{item.description}</div>
        )}
        <div className="text-[9px] font-mono text-gray-700 mt-1 flex items-center gap-2">
          <span>{formatTs(item.created_at)}</span>
          {evtTag !== label && <span className="text-gray-800">· {evtTag}</span>}
        </div>
      </div>
    </div>
  )
}
