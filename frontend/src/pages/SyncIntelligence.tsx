import { useState, useEffect } from 'react'
import { artists as artistsApi, syncIntelligence as syncApi } from '../api/client'
import LoadingSpinner from '../components/LoadingSpinner'

interface Artist { id: string; stage_name: string }

interface SyncRecord {
  id: string
  upload_id: string
  file_name?: string
  overallSyncScore: number | null
  topCategories: string[] | null
  syncTags: string[] | null
  placementNotes: string | null
  categories: Array<{ category: string; label: string; score: number | null; confidence: number | null }>
  meta: { analyzedAt: string | null }
}

const CATEGORY_ICONS: Record<string, string> = {
  film_trailer: '🎬', netflix_drama: '🎭', documentary: '🎞️', sports_content: '⚡',
  gaming: '🎮', fashion: '👗', luxury_brands: '💎', travel_campaigns: '✈️',
  commercial_ads: '📺', social_content: '📱',
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-gray-500">—</span>
  const colour = score >= 75 ? 'text-green-400' : score >= 55 ? 'text-yellow-400' : score >= 35 ? 'text-orange-400' : 'text-red-400'
  return <span className={`font-bold font-mono ${colour}`}>{score.toFixed(0)}</span>
}

function ScoreBar({ score, confidence }: { score: number | null; confidence: number | null }) {
  const s = score ?? 0
  const bg = s >= 75 ? 'bg-green-500' : s >= 55 ? 'bg-yellow-500' : s >= 35 ? 'bg-orange-500' : 'bg-red-500'
  return (
    <div className="flex-1">
      <div className="w-full bg-gray-700 rounded-full h-2 relative">
        <div className={`h-2 rounded-full transition-all duration-500 ${bg}`} style={{ width: `${s}%` }} />
        {confidence !== null && confidence > 0 && (
          <div
            className="absolute top-0 h-2 bg-white/20 rounded-full"
            style={{ left: 0, width: `${confidence}%` }}
          />
        )}
      </div>
    </div>
  )
}

export default function SyncIntelligence() {
  const [artists, setArtists] = useState<Artist[]>([])
  const [selectedArtist, setSelectedArtist] = useState('')
  const [records, setRecords] = useState<SyncRecord[]>([])
  const [selected, setSelected] = useState<SyncRecord | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    artistsApi.list().then(r => {
      const list: Artist[] = r.data?.data ?? r.data ?? []
      setArtists(list)
      if (list.length > 0) setSelectedArtist(list[0].id)
    }).catch(() => setError('Failed to load artists'))
  }, [])

  useEffect(() => {
    if (!selectedArtist) return
    setLoading(true)
    syncApi.byArtist(selectedArtist)
      .then(r => {
        const list: SyncRecord[] = r.data?.data ?? []
        setRecords(list)
        if (list.length > 0) setSelected(list[0])
      })
      .catch(() => setError('Failed to load sync intelligence'))
      .finally(() => setLoading(false))
  }, [selectedArtist])

  const sortedCats = selected?.categories
    ? [...selected.categories].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Sync Intelligence</h1>
          <p className="text-gray-400 text-sm mt-1">Placement suitability · Confidence scoring · Sync opportunities</p>
        </div>
        <select
          value={selectedArtist}
          onChange={e => setSelectedArtist(e.target.value)}
          className="bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
        >
          {artists.map(a => <option key={a.id} value={a.id}>{a.stage_name}</option>)}
        </select>
      </div>

      {loading && <div className="flex justify-center py-12"><LoadingSpinner /></div>}
      {error && <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300">{error}</div>}

      {!loading && records.length === 0 && !error && (
        <div className="text-center py-16 text-gray-500">
          <div className="text-5xl mb-4">🎯</div>
          <p className="text-lg">No sync analyses yet.</p>
          <p className="text-sm mt-2">Run Audio DNA first, then Sync Intelligence from the upload page.</p>
        </div>
      )}

      {records.length > 0 && (
        <div className="grid grid-cols-12 gap-6">
          {/* Track list */}
          <div className="col-span-4 space-y-2">
            {records.map(r => (
              <button
                key={r.id}
                onClick={() => setSelected(r)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selected?.id === r.id
                    ? 'bg-cyan-900/40 border-cyan-600'
                    : 'bg-gray-800 border-gray-700 hover:border-gray-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-white text-sm font-medium truncate">{r.upload_id.slice(0, 8)}…</span>
                  <span className={`text-sm font-bold font-mono ${(r.overallSyncScore ?? 0) >= 65 ? 'text-green-400' : 'text-yellow-400'}`}>
                    {r.overallSyncScore?.toFixed(0) ?? '—'}
                  </span>
                </div>
                <div className="text-gray-400 text-xs mt-1 truncate">
                  {(r.topCategories ?? []).slice(0, 2).join(' · ')}
                </div>
              </button>
            ))}
          </div>

          {selected && (
            <div className="col-span-8 space-y-4">
              {/* Overall score */}
              <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Overall Sync Score</div>
                    <div className="text-5xl font-bold text-white">
                      {selected.overallSyncScore?.toFixed(0) ?? '—'}
                      <span className="text-2xl text-gray-500">/100</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Top Placement</div>
                    {(selected.topCategories ?? []).slice(0, 1).map(cat => (
                      <span key={cat} className="px-3 py-1.5 bg-cyan-900/50 border border-cyan-600 text-cyan-300 text-sm rounded-lg">
                        {CATEGORY_ICONS[cat] ?? '🎵'} {cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Category scores */}
              <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Category Suitability</h3>
                <div className="space-y-3">
                  {sortedCats.map(cat => (
                    <div key={cat.category} className="flex items-center gap-3">
                      <span className="text-base w-6">{CATEGORY_ICONS[cat.category] ?? '🎵'}</span>
                      <div className="w-36 text-sm text-gray-300 truncate">{cat.label}</div>
                      <ScoreBar score={cat.score} confidence={cat.confidence} />
                      <div className="w-10 text-right">
                        <ScoreBadge score={cat.score} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                  <div className="w-8 h-1.5 bg-white/20 rounded" />
                  <span>Confidence band</span>
                </div>
              </div>

              {/* Sync tags */}
              {(selected.syncTags ?? []).length > 0 && (
                <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Sync Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {(selected.syncTags ?? []).map(tag => (
                      <span key={tag} className="px-2.5 py-1 bg-gray-700 text-gray-200 text-xs rounded-full border border-gray-600">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Placement notes */}
              {selected.placementNotes && (
                <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Placement Notes</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">{selected.placementNotes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
