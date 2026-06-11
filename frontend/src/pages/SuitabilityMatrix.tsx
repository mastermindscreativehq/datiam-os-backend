import { useState, useEffect } from 'react'
import { artists as artistsApi, syncIntelligence as syncApi } from '../api/client'
import LoadingSpinner from '../components/LoadingSpinner'

interface Artist { id: string; stage_name: string }

interface MatrixRow {
  id: string
  upload_id: string
  overallSyncScore: number | null
  categories: Array<{ category: string; label: string; score: number | null; confidence: number | null }>
}

const ALL_CATS = [
  { key: 'film_trailer',     label: 'Film',     icon: '🎬' },
  { key: 'netflix_drama',    label: 'Drama',    icon: '🎭' },
  { key: 'documentary',      label: 'Docs',     icon: '🎞️' },
  { key: 'sports_content',   label: 'Sports',   icon: '⚡' },
  { key: 'gaming',           label: 'Gaming',   icon: '🎮' },
  { key: 'fashion',          label: 'Fashion',  icon: '👗' },
  { key: 'luxury_brands',    label: 'Luxury',   icon: '💎' },
  { key: 'travel_campaigns', label: 'Travel',   icon: '✈️' },
  { key: 'commercial_ads',   label: 'Ads',      icon: '📺' },
  { key: 'social_content',   label: 'Social',   icon: '📱' },
]

function cellColour(score: number | null): string {
  if (score === null) return 'bg-gray-800 text-gray-600'
  if (score >= 80) return 'bg-green-600/80 text-white'
  if (score >= 65) return 'bg-green-500/50 text-green-100'
  if (score >= 50) return 'bg-yellow-600/50 text-yellow-100'
  if (score >= 35) return 'bg-orange-600/40 text-orange-200'
  return 'bg-gray-700/50 text-gray-500'
}

export default function SuitabilityMatrix() {
  const [artists, setArtists] = useState<Artist[]>([])
  const [selectedArtist, setSelectedArtist] = useState('')
  const [rows, setRows] = useState<MatrixRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sortBy, setSortBy] = useState<string>('overall')

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
    syncApi.byArtist(selectedArtist, 50)
      .then(r => setRows(r.data?.data ?? []))
      .catch(() => setError('Failed to load sync data'))
      .finally(() => setLoading(false))
  }, [selectedArtist])

  const sorted = [...rows].sort((a, b) => {
    if (sortBy === 'overall') return (b.overallSyncScore ?? 0) - (a.overallSyncScore ?? 0)
    const aScore = a.categories.find(c => c.category === sortBy)?.score ?? 0
    const bScore = b.categories.find(c => c.category === sortBy)?.score ?? 0
    return bScore - aScore
  })

  // Category column averages
  const colAverages: Record<string, number> = {}
  for (const cat of ALL_CATS) {
    const scores = rows.flatMap(r => r.categories.filter(c => c.category === cat.key).map(c => c.score ?? 0))
    colAverages[cat.key] = scores.length > 0 ? scores.reduce((s, v) => s + v, 0) / scores.length : 0
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Suitability Matrix</h1>
          <p className="text-gray-400 text-sm mt-1">All tracks × all sync categories — click a column header to sort</p>
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

      {!loading && rows.length === 0 && !error && (
        <div className="text-center py-16 text-gray-500">
          <div className="text-5xl mb-4">📊</div>
          <p className="text-lg">No sync data yet.</p>
        </div>
      )}

      {rows.length > 0 && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left px-4 py-3 text-gray-400 font-medium whitespace-nowrap">Track</th>
                <th
                  className={`px-3 py-3 text-center cursor-pointer whitespace-nowrap font-medium transition-colors ${sortBy === 'overall' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
                  onClick={() => setSortBy('overall')}
                >
                  Overall {sortBy === 'overall' && '▼'}
                </th>
                {ALL_CATS.map(cat => (
                  <th
                    key={cat.key}
                    className={`px-2 py-3 text-center cursor-pointer whitespace-nowrap font-medium transition-colors ${sortBy === cat.key ? 'text-white' : 'text-gray-400 hover:text-white'}`}
                    onClick={() => setSortBy(cat.key)}
                    title={cat.key.replace(/_/g, ' ')}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span>{cat.icon}</span>
                      <span className="text-xs">{cat.label}</span>
                      {sortBy === cat.key && <span className="text-xs">▼</span>}
                    </div>
                  </th>
                ))}
              </tr>

              {/* Column averages row */}
              <tr className="border-b border-gray-700 bg-gray-700/30">
                <td className="px-4 py-2 text-xs text-gray-500 font-medium">Avg</td>
                <td className="px-3 py-2 text-center">
                  <span className="text-xs font-mono text-gray-400">
                    {(rows.reduce((s, r) => s + (r.overallSyncScore ?? 0), 0) / rows.length).toFixed(0)}
                  </span>
                </td>
                {ALL_CATS.map(cat => (
                  <td key={cat.key} className="px-2 py-2 text-center">
                    <span className="text-xs font-mono text-gray-400">{colAverages[cat.key].toFixed(0)}</span>
                  </td>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, idx) => (
                <tr key={row.id} className={`border-b border-gray-700/50 hover:bg-gray-700/20 transition-colors ${idx % 2 === 0 ? '' : 'bg-gray-800/50'}`}>
                  <td className="px-4 py-3 text-gray-300 max-w-32">
                    <div className="truncate text-xs">{row.upload_id.slice(0, 8)}…</div>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className={`font-bold font-mono text-sm ${(row.overallSyncScore ?? 0) >= 65 ? 'text-green-400' : 'text-yellow-400'}`}>
                      {row.overallSyncScore?.toFixed(0) ?? '—'}
                    </span>
                  </td>
                  {ALL_CATS.map(cat => {
                    const catData = row.categories.find(c => c.category === cat.key)
                    return (
                      <td key={cat.key} className="px-1.5 py-2 text-center">
                        <div
                          className={`mx-auto w-10 h-8 rounded flex items-center justify-center text-xs font-mono font-bold transition-colors ${cellColour(catData?.score ?? null)}`}
                          title={`${cat.label}: ${catData?.score?.toFixed(0) ?? '—'} (${catData?.confidence?.toFixed(0) ?? '—'}% confidence)`}
                        >
                          {catData?.score?.toFixed(0) ?? '—'}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      {rows.length > 0 && (
        <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
          <span>Score key:</span>
          {[
            { colour: 'bg-green-600/80', label: '80+' },
            { colour: 'bg-green-500/50', label: '65–79' },
            { colour: 'bg-yellow-600/50', label: '50–64' },
            { colour: 'bg-orange-600/40', label: '35–49' },
            { colour: 'bg-gray-700/50', label: '<35' },
          ].map(({ colour, label }) => (
            <div key={label} className="flex items-center gap-1">
              <div className={`w-4 h-4 rounded ${colour}`} />
              <span>{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
