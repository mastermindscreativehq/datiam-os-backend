import { useEffect, useState } from 'react'
import DataTable from '../components/DataTable'
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
          <div className="border border-[#00ff41]/15 rounded-lg bg-[#0d0d0d]">
            <div className="px-5 py-2.5 border-b border-[#00ff41]/10 text-[10px] font-mono tracking-widest text-[#00ff41]/40">
              GET /api/catalog/songs
            </div>
            <pre className="p-5 text-[#00ff41]/60 text-[11px] font-mono overflow-auto max-h-96">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )
      )}
    </div>
  )
}
