import { useEffect, useState } from 'react'
import DataTable from '../components/DataTable'
import EmptyState from '../components/EmptyState'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import { contentIdeas, isCriticalError } from '../api/client'

function normalise(raw: any): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw
  for (const key of ['contentIdeas', 'content_ideas', 'ideas', 'items', 'data']) {
    if (Array.isArray(raw?.[key])) return raw[key]
  }
  return raw ? [raw] : []
}

export default function ContentIdeas() {
  const [data,    setData]    = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      console.log('[ContentIdeas] GET /api/content/ideas')
      const res = await contentIdeas.list()
      console.log('[ContentIdeas] response', res.status, res.data)
      setData(res.data)
    } catch (err: any) {
      const status = err.response?.status
      console.error('[ContentIdeas] fetch error', { status, data: err.response?.data, message: err.message })
      if (isCriticalError(err)) {
        setError(err.response?.data?.message || err.message || 'Failed to load content ideas')
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
            <div className="w-1 h-6 bg-fuchsia-400 rounded-full" />
            <h1 className="text-xl font-bold font-mono text-fuchsia-400 tracking-[0.2em]">
              CONTENT IDEAS
            </h1>
          </div>
          <p className="text-gray-600 text-[11px] font-mono tracking-[0.2em] ml-4">CREATIVE CONTENT PIPELINE</p>
        </div>
        {!loading && !error && data && (
          <div className="text-fuchsia-400/50 text-[10px] font-mono border border-fuchsia-400/20 rounded px-3 py-1.5 tracking-widest">
            {items.length} IDEAS
          </div>
        )}
      </div>

      {loading && (
        <div className="flex justify-center py-24">
          <LoadingSpinner text="LOADING CONTENT IDEAS..." />
        </div>
      )}

      {error && <ErrorMessage message={error} onRetry={fetchData} />}

      {!loading && !error && data && (
        items.length > 0 ? (
          <DataTable data={items} color="cyan" />
        ) : (
          <EmptyState
            icon="◈"
            title="No content signals available"
            message="No content ideas have been added yet."
            hint="Add content ideas manually via the admin API or connect your content strategy pipeline."
            color="fuchsia"
          />
        )
      )}
    </div>
  )
}
