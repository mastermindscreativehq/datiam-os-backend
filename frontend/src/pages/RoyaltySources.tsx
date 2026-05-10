import { useEffect, useState } from 'react'
import DataTable from '../components/DataTable'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import { royaltySources } from '../api/client'

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
      const res = await royaltySources.list()
      setData(res.data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load royalty sources')
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
          <div className="border border-yellow-400/15 rounded-lg bg-[#0d0d0d]">
            <div className="px-5 py-2.5 border-b border-yellow-400/10 text-[10px] font-mono tracking-widest text-yellow-400/40">
              GET /api/royalty-sources
            </div>
            <pre className="p-5 text-yellow-400/60 text-[11px] font-mono overflow-auto max-h-96">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )
      )}
    </div>
  )
}
