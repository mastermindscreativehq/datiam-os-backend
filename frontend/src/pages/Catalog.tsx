import { useEffect, useState } from 'react'
import DataTable from '../components/DataTable'
import EmptyState from '../components/EmptyState'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import { catalog, isCriticalError } from '../api/client'

function normalise(raw: any): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw
  for (const key of ['songs', 'tracks', 'items', 'data', 'catalog']) {
    if (Array.isArray(raw?.[key])) return raw[key]
  }
  return raw ? [raw] : []
}

export default function Catalog() {
  const [data,    setData]    = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      console.log('[Catalog] GET /api/songs')
      const res = await catalog.songs()
      console.log('[Catalog] response', res.status, res.data)
      setData(res.data)
    } catch (err: any) {
      const status = err.response?.status
      console.error('[Catalog] fetch error', { status, data: err.response?.data, message: err.message })
      if (isCriticalError(err)) {
        setError(err.response?.data?.message || err.message || 'Failed to load catalog')
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
            <div className="w-1 h-6 bg-[#00ff41] rounded-full" />
            <h1 className="text-xl font-bold font-mono text-[#00ff41] tracking-[0.2em] text-glow-green">
              CATALOG
            </h1>
          </div>
          <p className="text-gray-600 text-[11px] font-mono tracking-[0.2em] ml-4">SONG REGISTRY</p>
        </div>
        {!loading && !error && data && (
          <div className="text-[#00ff41]/50 text-[10px] font-mono border border-[#00ff41]/20 rounded px-3 py-1.5 tracking-widest">
            {items.length} TRACKS
          </div>
        )}
      </div>

      {loading && (
        <div className="flex justify-center py-24">
          <LoadingSpinner text="LOADING CATALOG..." />
        </div>
      )}

      {error && <ErrorMessage message={error} onRetry={fetchData} />}

      {!loading && !error && data && (
        items.length > 0 ? (
          <DataTable data={items} color="green" />
        ) : (
          <EmptyState
            icon="◉"
            title="No catalog entries yet"
            message="Add your first song to begin building your registered catalog."
            hint="Songs can be added via the admin API or imported from your distribution account."
            color="green"
          />
        )
      )}
    </div>
  )
}
