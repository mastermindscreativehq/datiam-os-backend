import { useState, useEffect } from 'react'
import { artists as artistsApi, audioDna } from '../api/client'
import LoadingSpinner from '../components/LoadingSpinner'

interface Artist { id: string; stage_name: string }

interface DnaRecord {
  id: string
  upload_id: string
  genre: { primary: string; secondary: string | null; confidence: number | null; tags: string[] | null }
  mood: { primary: string | null; secondary: string | null; profile: unknown }
  fingerprints: {
    emotional: { valence: number; arousal: number; dominance: number; primary_emotion: string; emotion_tags: string[] } | null
    sonic: { spectral_character: string; dynamic_range: string; texture: string; harmonic_richness: number; rhythmic_density: number; spatial_depth: number } | null
    energy: { arc_type: string; peak_type: string; volatility: number; drop_impact: number; retention: number } | null
  }
  dimensions: {
    danceability: number | null; brightness: number | null; warmth: number | null; darkness: number | null
    aggression: number | null; spirituality: number | null; romance: number | null; triumph: number | null
    melancholy: number | null; tension: number | null
  }
  meta: { analyzerVersion: string | null; processingTimeMs: number | null; analyzedAt: string | null }
}

const DIMENSION_COLOURS: Record<string, string> = {
  danceability: 'bg-purple-500', brightness: 'bg-yellow-400', warmth: 'bg-orange-400',
  darkness: 'bg-gray-600', aggression: 'bg-red-500', spirituality: 'bg-indigo-400',
  romance: 'bg-pink-400', triumph: 'bg-green-500', melancholy: 'bg-blue-400', tension: 'bg-amber-500',
}

function DimensionBar({ label, value, colour }: { label: string; value: number | null; colour: string }) {
  const pct = value ?? 0
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span className="capitalize">{label}</span>
        <span className="font-mono text-white">{pct.toFixed(0)}</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div className={`h-2 rounded-full transition-all duration-500 ${colour}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function AudioDNA() {
  const [artists, setArtists] = useState<Artist[]>([])
  const [selectedArtist, setSelectedArtist] = useState('')
  const [records, setRecords] = useState<DnaRecord[]>([])
  const [selected, setSelected] = useState<DnaRecord | null>(null)
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
    setError('')
    audioDna.byArtist(selectedArtist)
      .then(r => {
        const list: DnaRecord[] = r.data?.data ?? []
        setRecords(list)
        if (list.length > 0) setSelected(list[0])
      })
      .catch(() => setError('Failed to load DNA records'))
      .finally(() => setLoading(false))
  }, [selectedArtist])

  const dims = selected?.dimensions
  const dimensionEntries = dims
    ? Object.entries(dims) as [string, number | null][]
    : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Sonic DNA</h1>
          <p className="text-gray-400 text-sm mt-1">Audio fingerprint · Genre · Mood · Sonic Dimensions</p>
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
          <div className="text-5xl mb-4">🧬</div>
          <p className="text-lg">No DNA analyses yet.</p>
          <p className="text-sm mt-2">Upload audio and run DNA analysis from the Audio Upload page.</p>
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
                    ? 'bg-purple-900/40 border-purple-600'
                    : 'bg-gray-800 border-gray-700 hover:border-gray-500'
                }`}
              >
                <div className="text-white text-sm font-medium truncate">{r.genre.primary}</div>
                <div className="text-gray-400 text-xs mt-0.5">{r.mood.primary ?? '—'} · {r.genre.confidence?.toFixed(0)}% confidence</div>
              </button>
            ))}
          </div>

          {/* Detail panel */}
          {selected && (
            <div className="col-span-8 space-y-4">
              {/* Genre card */}
              <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Genre Profile</h3>
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="px-3 py-1.5 bg-purple-600 text-white text-sm font-semibold rounded-lg">
                    {selected.genre.primary}
                  </span>
                  {selected.genre.secondary && (
                    <span className="px-3 py-1.5 bg-gray-700 text-gray-200 text-sm rounded-lg">
                      {selected.genre.secondary}
                    </span>
                  )}
                  <span className="text-gray-400 text-sm ml-auto">{selected.genre.confidence?.toFixed(0)}% confidence</span>
                </div>
                {selected.genre.tags && selected.genre.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {selected.genre.tags.slice(0, 5).map(t => (
                      <span key={t} className="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded">{t}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Mood card */}
              <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Mood Profile</h3>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg">
                    {selected.mood.primary ?? '—'}
                  </span>
                  {selected.mood.secondary && (
                    <span className="px-3 py-1.5 bg-gray-700 text-gray-200 text-sm rounded-lg">
                      {selected.mood.secondary}
                    </span>
                  )}
                </div>
                {selected.fingerprints.emotional && (
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    {['valence', 'arousal', 'dominance'].map(key => (
                      <div key={key} className="text-center">
                        <div className="text-2xl font-bold text-white">
                          {(selected.fingerprints.emotional as unknown as Record<string, number>)[key]?.toFixed(0)}
                        </div>
                        <div className="text-xs text-gray-400 capitalize">{key}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Dimensions radar */}
              <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Sonic Dimensions</h3>
                <div className="grid grid-cols-2 gap-x-8">
                  {dimensionEntries.map(([key, val]) => (
                    <DimensionBar
                      key={key}
                      label={key}
                      value={val}
                      colour={DIMENSION_COLOURS[key] ?? 'bg-gray-500'}
                    />
                  ))}
                </div>
              </div>

              {/* Sonic fingerprint */}
              {selected.fingerprints.sonic && (
                <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Sonic Fingerprint</h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div><span className="text-gray-400">Spectral:</span> <span className="text-white capitalize">{selected.fingerprints.sonic.spectral_character}</span></div>
                    <div><span className="text-gray-400">Dynamics:</span> <span className="text-white capitalize">{selected.fingerprints.sonic.dynamic_range}</span></div>
                    <div><span className="text-gray-400">Texture:</span> <span className="text-white capitalize">{selected.fingerprints.sonic.texture}</span></div>
                    <div><span className="text-gray-400">Harmonic:</span> <span className="text-white">{selected.fingerprints.sonic.harmonic_richness?.toFixed(0)}</span></div>
                    <div><span className="text-gray-400">Rhythmic:</span> <span className="text-white">{selected.fingerprints.sonic.rhythmic_density?.toFixed(0)}</span></div>
                    <div><span className="text-gray-400">Spatial:</span> <span className="text-white">{selected.fingerprints.sonic.spatial_depth?.toFixed(0)}</span></div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
