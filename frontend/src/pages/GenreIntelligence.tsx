import { useState, useEffect } from 'react'
import { artists as artistsApi, audioDna } from '../api/client'
import LoadingSpinner from '../components/LoadingSpinner'

interface Artist { id: string; stage_name: string }

interface GenreRecord {
  id: string
  upload_id: string
  genre: {
    primary: string; secondary: string | null
    confidence: number | null; tags: string[] | null
  }
  mood: { primary: string | null }
  dimensions: { danceability: number | null; brightness: number | null; warmth: number | null; darkness: number | null }
  meta: { analyzedAt: string | null }
}

const GENRE_COLOURS: Record<string, string> = {
  'Hip-Hop': '#a78bfa', 'Trap': '#c084fc', 'R&B': '#f472b6', 'Soul': '#fb7185',
  'Pop': '#60a5fa', 'Dance/EDM': '#34d399', 'House': '#4ade80', 'Techno': '#6ee7b7',
  'Drum & Bass': '#f59e0b', 'Dubstep': '#fbbf24', 'Ambient': '#818cf8',
  'Classical': '#e879f9', 'Jazz': '#f97316', 'Blues': '#fb923c', 'Rock': '#ef4444',
  'Metal': '#dc2626', 'Punk': '#b91c1c', 'Country': '#d97706', 'Folk': '#92400e',
  'Reggae': '#16a34a', 'Latin': '#eab308', 'Afrobeats': '#65a30d',
  'Gospel': '#8b5cf6', 'Neo-Soul': '#db2777', 'Indie': '#2563eb',
  'Alternative': '#7c3aed', 'Cinematic': '#9333ea', 'Electronic': '#06b6d4',
  'Lo-Fi': '#64748b', 'Orchestral': '#7e22ce',
}

function confidenceColour(v: number) {
  if (v >= 75) return 'text-green-400'
  if (v >= 55) return 'text-yellow-400'
  return 'text-red-400'
}

export default function GenreIntelligence() {
  const [artists, setArtists] = useState<Artist[]>([])
  const [selectedArtist, setSelectedArtist] = useState('')
  const [records, setRecords] = useState<GenreRecord[]>([])
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
    audioDna.byArtist(selectedArtist)
      .then(r => setRecords(r.data?.data ?? []))
      .catch(() => setError('Failed to load genre data'))
      .finally(() => setLoading(false))
  }, [selectedArtist])

  // Distribution map
  const genreMap: Record<string, { count: number; confidence: number[] }> = {}
  for (const r of records) {
    const g = r.genre.primary
    if (!genreMap[g]) genreMap[g] = { count: 0, confidence: [] }
    genreMap[g].count++
    if (r.genre.confidence != null) genreMap[g].confidence.push(r.genre.confidence)
    if (r.genre.secondary) {
      const s = r.genre.secondary
      if (!genreMap[s]) genreMap[s] = { count: 0, confidence: [] }
      genreMap[s].count += 0.5
    }
  }

  const genreEntries = Object.entries(genreMap)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 12)

  const maxCount = genreEntries[0]?.[1].count ?? 1

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Genre Intelligence</h1>
          <p className="text-gray-400 text-sm mt-1">Primary classification · Confidence scores · Catalog distribution</p>
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
          <div className="text-5xl mb-4">🎼</div>
          <p className="text-lg">No genre analyses yet.</p>
        </div>
      )}

      {records.length > 0 && (
        <div className="space-y-6">
          {/* Genre distribution chart */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-5">Genre Distribution</h3>
            <div className="space-y-3">
              {genreEntries.map(([genre, { count, confidence }]) => {
                const colour = GENRE_COLOURS[genre] ?? '#6b7280'
                const avg = confidence.length > 0
                  ? confidence.reduce((s, v) => s + v, 0) / confidence.length
                  : 0
                return (
                  <div key={genre} className="flex items-center gap-4">
                    <div className="w-28 text-sm text-right text-white truncate">{genre}</div>
                    <div className="flex-1 bg-gray-700 rounded-full h-5 relative">
                      <div
                        className="h-5 rounded-full flex items-center px-2 text-xs font-bold text-white transition-all duration-500"
                        style={{
                          width: `${(count / maxCount) * 100}%`,
                          backgroundColor: colour,
                          minWidth: '2rem',
                        }}
                      >
                        {count % 1 === 0 ? count : count.toFixed(1)}
                      </div>
                    </div>
                    <div className={`w-14 text-xs font-mono text-right ${confidenceColour(avg)}`}>
                      {avg > 0 ? `${avg.toFixed(0)}%` : '—'}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Track table */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-700">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Track Classifications</h3>
            </div>
            <div className="divide-y divide-gray-700">
              {records.map(r => (
                <div key={r.id} className="px-5 py-3 flex items-center gap-4">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: GENRE_COLOURS[r.genre.primary] ?? '#6b7280' }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium">{r.genre.primary}</div>
                    {r.genre.secondary && (
                      <div className="text-gray-400 text-xs">{r.genre.secondary}</div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(r.genre.tags ?? []).slice(0, 3).map(t => (
                      <span key={t} className="px-1.5 py-0.5 bg-gray-700 text-gray-300 text-xs rounded">{t}</span>
                    ))}
                  </div>
                  <div className={`text-sm font-mono w-14 text-right ${confidenceColour(r.genre.confidence ?? 0)}`}>
                    {r.genre.confidence?.toFixed(0) ?? '—'}%
                  </div>
                  {r.mood.primary && (
                    <div className="text-gray-400 text-xs w-24 text-right">{r.mood.primary}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
