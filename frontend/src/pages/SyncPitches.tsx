import { useEffect, useState } from 'react'
import DataTable from '../components/DataTable'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import { syncPitches } from '../api/client'

function normalise(raw: any): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw
  for (const key of ['pitches', 'syncPitches', 'sync_pitches', 'items', 'data']) {
    if (Array.isArray(raw?.[key])) return raw[key]
  }
  return raw ? [raw] : []
}

const STATUS_COLORS: Record<string, string> = {
  pending:  'text-yellow-400',
  approved: 'text-[#00ff41]',
  rejected: 'text-red-400',
  active:   'text-[#00d4ff]',
}

export default function SyncPitches() {
  const [data,    setData]    = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await syncPitches.list()
      setData(res.data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load sync pitches')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const items = normalise(data)

  const statusCounts = items.reduce<Record<string, number>>((acc, item: any) => {
    const s = String(item.status ?? 'unknown').toLowerCase()
    acc[s] = (acc[s] || 0) + 1
    return acc
  }, {})

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-1 h-6 bg-purple-400 rounded-full" />
          <h1 className="text-xl font-bold font-mono text-purple-400 tracking-[0.2em]">
            SYNC PITCHES
          </h1>
        </div>
        <p className="text-gray-600 text-[11px] font-mono tracking-[0.2em] ml-4">SYNC LICENSING PIPELINE</p>
      </div>

      {loading && (
        <div className="flex justify-center py-24">
          <LoadingSpinner text="LOADING SYNC PITCHES..." />
        </div>
      )}

      {error && <ErrorMessage message={error} onRetry={fetchData} />}

      {!loading && !error && data && (
        <div className="space-y-5">
          {/* Status summary chips */}
          {Object.keys(statusCounts).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(statusCounts).map(([status, count]) => (
                <div
                  key={status}
                  className={`text-[10px] font-mono border border-current/25 rounded px-3 py-1 tracking-widest ${STATUS_COLORS[status] ?? 'text-gray-500'}`}
                >
                  {status.toUpperCase()} · {count}
                </div>
              ))}
            </div>
          )}

          {items.length > 0 ? (
            <DataTable data={items} color="cyan" />
          ) : (
            <div className="border border-purple-500/15 rounded-lg bg-[#0d0d0d]">
              <div className="px-5 py-2.5 border-b border-purple-500/10 text-[10px] font-mono tracking-widest text-purple-400/40">
                GET /api/sync-pitches
              </div>
              <pre className="p-5 text-purple-400/60 text-[11px] font-mono overflow-auto max-h-96">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
