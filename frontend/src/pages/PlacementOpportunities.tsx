import { useState, useEffect } from 'react'
import { artists as artistsApi, syncIntelligence as syncApi } from '../api/client'
import LoadingSpinner from '../components/LoadingSpinner'

interface Artist { id: string; stage_name: string }

interface Opportunity {
  id: string
  upload_id: string
  file_name: string | null
  overall: number | null
  topCategories: string[] | null
  syncTags: string[] | null
  placementNotes: string | null
  highlights: { film_trailer: number | null; sports_content: number | null; social_content: number | null }
  createdAt: string | null
}

const CATEGORY_ICONS: Record<string, string> = {
  film_trailer: '🎬', netflix_drama: '🎭', documentary: '🎞️', sports_content: '⚡',
  gaming: '🎮', fashion: '👗', luxury_brands: '💎', travel_campaigns: '✈️',
  commercial_ads: '📺', social_content: '📱',
}

function ScoreCircle({ value, label }: { value: number | null; label: string }) {
  const v = value ?? 0
  const colour = v >= 75 ? '#4ade80' : v >= 55 ? '#facc15' : v >= 35 ? '#fb923c' : '#f87171'
  const circumference = 2 * Math.PI * 20
  const offset = circumference - (v / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="52" height="52" className="-rotate-90">
        <circle cx="26" cy="26" r="20" fill="none" stroke="#374151" strokeWidth="4" />
        <circle
          cx="26" cy="26" r="20" fill="none"
          stroke={colour} strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <div className="text-center -mt-1">
        <div className="text-base font-bold text-white leading-none">{v.toFixed(0)}</div>
      </div>
      <div className="text-xs text-gray-400 text-center leading-tight">{label}</div>
    </div>
  )
}

export default function PlacementOpportunities() {
  const [artists, setArtists] = useState<Artist[]>([])
  const [selectedArtist, setSelectedArtist] = useState('')
  const [minScore, setMinScore] = useState(60)
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
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
    syncApi.opportunities(selectedArtist, minScore)
      .then(r => setOpportunities(r.data?.data ?? []))
      .catch(() => setError('Failed to load opportunities'))
      .finally(() => setLoading(false))
  }, [selectedArtist, minScore])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Placement Opportunities</h1>
          <p className="text-gray-400 text-sm mt-1">Top-scoring tracks ranked by sync potential</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-gray-400 text-sm whitespace-nowrap">Min score</label>
            <select
              value={minScore}
              onChange={e => setMinScore(parseInt(e.target.value))}
              className="bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
            >
              <option value={40}>40+</option>
              <option value={50}>50+</option>
              <option value={60}>60+</option>
              <option value={70}>70+</option>
              <option value={80}>80+</option>
            </select>
          </div>
          <select
            value={selectedArtist}
            onChange={e => setSelectedArtist(e.target.value)}
            className="bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
          >
            {artists.map(a => <option key={a.id} value={a.id}>{a.stage_name}</option>)}
          </select>
        </div>
      </div>

      {loading && <div className="flex justify-center py-12"><LoadingSpinner /></div>}
      {error && <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300">{error}</div>}

      {!loading && opportunities.length === 0 && !error && (
        <div className="text-center py-16 text-gray-500">
          <div className="text-5xl mb-4">🎯</div>
          <p className="text-lg">No opportunities above {minScore}.</p>
          <p className="text-sm mt-2">Try lowering the minimum score filter.</p>
        </div>
      )}

      <div className="space-y-3">
        {opportunities.map((opp, idx) => (
          <div key={opp.id} className="bg-gray-800 rounded-xl p-5 border border-gray-700 hover:border-gray-500 transition-colors">
            <div className="flex items-start gap-5">
              {/* Rank badge */}
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-300">
                {idx + 1}
              </div>

              {/* Main info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-white font-medium truncate">
                    {opp.file_name ?? opp.upload_id.slice(0, 12) + '…'}
                  </span>
                  <span className={`text-lg font-bold font-mono ${(opp.overall ?? 0) >= 70 ? 'text-green-400' : (opp.overall ?? 0) >= 55 ? 'text-yellow-400' : 'text-orange-400'}`}>
                    {opp.overall?.toFixed(0) ?? '—'}
                  </span>
                </div>

                {/* Top categories */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {(opp.topCategories ?? []).slice(0, 4).map(cat => (
                    <span key={cat} className="flex items-center gap-1 px-2.5 py-1 bg-gray-700 text-gray-200 text-xs rounded-full border border-gray-600">
                      {CATEGORY_ICONS[cat] ?? '🎵'}
                      <span>{cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                    </span>
                  ))}
                </div>

                {/* Tags */}
                {(opp.syncTags ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {(opp.syncTags ?? []).slice(0, 6).map(tag => (
                      <span key={tag} className="px-2 py-0.5 bg-cyan-900/30 text-cyan-300 text-xs rounded border border-cyan-800/50">{tag}</span>
                    ))}
                  </div>
                )}

                {opp.placementNotes && (
                  <p className="text-gray-400 text-xs leading-relaxed line-clamp-2">{opp.placementNotes}</p>
                )}
              </div>

              {/* Highlight scores */}
              <div className="flex-shrink-0 flex items-center gap-4">
                <ScoreCircle value={opp.highlights.film_trailer} label="Film" />
                <ScoreCircle value={opp.highlights.sports_content} label="Sports" />
                <ScoreCircle value={opp.highlights.social_content} label="Social" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
