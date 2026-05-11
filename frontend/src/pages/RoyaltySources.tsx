import { useEffect, useState } from 'react'
import DataTable from '../components/DataTable'
import EmptyState from '../components/EmptyState'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import { royaltySources, isCriticalError } from '../api/client'

function normalise(raw: any): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw
  for (const key of ['royaltySources', 'royalty_sources', 'sources', 'items', 'data']) {
    if (Array.isArray(raw?.[key])) return raw[key]
  }
  return raw ? [raw] : []
}

export default function RoyaltySources() {
  const [data,    setData]    = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      console.log('[RoyaltySources] GET /api/royalties')
      const res = await royaltySources.list()
      console.log('[RoyaltySources] response', res.status, res.data)
      setData(res.data)
    } catch (err: any) {
      const status = err.response?.status
      console.error('[RoyaltySources] fetch error', { status, data: err.response?.data, message: err.message })
      if (isCriticalError(err)) {
        setError(err.response?.data?.message || err.message || 'Failed to load royalty sources')
      } else {
        setData([])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const items = normalise(data)

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-1 h-6 bg-yellow-400 rounded-full" />
            <h1 className="text-xl font-bold font-mono text-yellow-400 tracking-[0.2em]">
              ROYALTY SOURCES
            </h1>
          </div>
          <p className="text-gray-600 text-[11px] font-mono tracking-[0.2em] ml-4">REVENUE STREAM REGISTRY</p>
        </div>
        {!loading && !error && data && (
          <div className="text-yellow-400/50 text-[10px] font-mono border border-yellow-400/20 rounded px-3 py-1.5 tracking-widest">
            {items.length} SOURCES
          </div>
        )}
      </div>

      {loading && (
        <div className="flex justify-center py-24">
          <LoadingSpinner text="LOADING ROYALTY SOURCES..." />
        </div>
      )}

      {error && <ErrorMessage message={error} onRetry={fetchData} />}

      {!loading && !error && data && (
        items.length > 0 ? (
          <DataTable data={items} color="green" />
        ) : (
          <EmptyState
            icon="◆"
            title="No royalty sources connected"
            message="No revenue data has been imported yet."
            hint="Upload a royalty CSV or connect your distribution platform to start tracking earnings."
            color="yellow"
          />
        )
      )}
    </div>
  )
}
