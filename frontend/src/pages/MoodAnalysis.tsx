import { useState, useEffect } from 'react'
import { artists as artistsApi, audioDna } from '../api/client'
import LoadingSpinner from '../components/LoadingSpinner'

interface Artist { id: string; stage_name: string }

interface MoodRecord {
  id: string
  upload_id: string
  genre: { primary: string }
  mood: {
    primary: string | null
    secondary: string | null
    profile: {
      primary: string; secondary: string; intensity: number; valence: number
      weights: Record<string, number>
    } | null
  }
  fingerprints: {
    emotional: {
      valence: number; arousal: number; dominance: number
      primary_emotion: string; emotion_tags: string[]
    } | null
  }
  dimensions: {
    romance: number | null; melancholy: number | null; triumph: number | null
    aggression: number | null; spirituality: number | null; tension: number | null
  }
  meta: { analyzedAt: string | null }
}

const MOOD_PALETTE: Record<string, string> = {
  Euphoric: '#a78bfa', Melancholic: '#60a5fa', Tense: '#f59e0b',
  Peaceful: '#34d399', Triumphant: '#fbbf24', Aggressive: '#ef4444',
  Romantic: '#f472b6', Spiritual: '#818cf8', Dark: '#6b7280',
  Uplifting: '#86efac', Nostalgic: '#fb923c', Anxious: '#fca5a5',
  Confident: '#4ade80', Mysterious: '#a855f7', Playful: '#facc15',
  Raw: '#f97316', Cinematic: '#e879f9', Dreamy: '#93c5fd',
}

function EmotionBar({ label, weight, mood }: { label: string; weight: number; mood: string }) {
  const colour = MOOD_PALETTE[label] ?? '#6b7280'
  return (
    <div className="mb-2.5">
      <div className="flex justify-between text-xs mb-1">
        <span style={{ color: colour }} className="font-medium">{label}</span>
        <span className="text-gray-400 font-mono">{weight}%</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-1.5">
        <div
          className="h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${weight}%`, backgroundColor: colour }}
        />
      </div>
    </div>
  )
}

function MoodDot({ mood, size = 'md' }: { mood: string; size?: 'sm' | 'md' | 'lg' }) {
  const colour = MOOD_PALETTE[mood] ?? '#6b7280'
  const sizes = { sm: 'w-2 h-2', md: 'w-3 h-3', lg: 'w-4 h-4' }
  return (
    <span
      className={`inline-block rounded-full ${sizes[size]} mr-1.5`}
      style={{ backgroundColor: colour }}
    />
  )
}

export default function MoodAnalysis() {
  const [artists, setArtists] = useState<Artist[]>([])
  const [selectedArtist, setSelectedArtist] = useState('')
  const [records, setRecords] = useState<MoodRecord[]>([])
  const [selected, setSelected] = useState<MoodRecord | null>(null)
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
      .then(r => {
        const list: MoodRecord[] = r.data?.data ?? []
        setRecords(list)
        if (list.length > 0) setSelected(list[0])
      })
      .catch(() => setError('Failed to load mood data'))
      .finally(() => setLoading(false))
  }, [selectedArtist])

  const profile = selected?.mood.profile
  const emotional = selected?.fingerprints.emotional
  const weights = profile?.weights ? Object.entries(profile.weights).sort((a, b) => b[1] - a[1]) : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Mood Analysis</h1>
          <p className="text-gray-400 text-sm mt-1">Emotional profile · Valence-Arousal map · Feeling weights</p>
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
          <div className="text-5xl mb-4">🎭</div>
          <p className="text-lg">No mood analyses yet.</p>
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
                    ? 'bg-indigo-900/40 border-indigo-600'
                    : 'bg-gray-800 border-gray-700 hover:border-gray-500'
                }`}
              >
                <div className="flex items-center">
                  {r.mood.primary && <MoodDot mood={r.mood.primary} size="sm" />}
                  <span className="text-white text-sm font-medium">{r.mood.primary ?? '—'}</span>
                </div>
                <div className="text-gray-400 text-xs mt-0.5">{r.genre.primary}</div>
              </button>
            ))}
          </div>

          {selected && (
            <div className="col-span-8 space-y-4">
              {/* Primary mood */}
              <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Primary Mood</h3>
                <div className="flex items-center gap-4">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold text-white"
                    style={{ backgroundColor: MOOD_PALETTE[selected.mood.primary ?? ''] ?? '#4b5563' }}
                  >
                    {(selected.mood.primary ?? '?')[0]}
                  </div>
                  <div>
                    <div className="text-xl font-bold text-white">{selected.mood.primary ?? 'Unknown'}</div>
                    {selected.mood.secondary && (
                      <div className="text-gray-400 text-sm flex items-center mt-1">
                        <MoodDot mood={selected.mood.secondary} size="sm" />
                        {selected.mood.secondary}
                      </div>
                    )}
                  </div>
                  {profile && (
                    <div className="ml-auto text-right">
                      <div className="text-2xl font-bold text-white">{profile.intensity?.toFixed(0)}</div>
                      <div className="text-xs text-gray-400">Intensity</div>
                    </div>
                  )}
                </div>
              </div>

              {/* VAD space */}
              {emotional && (
                <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Emotional Fingerprint (VAD)</h3>
                  <div className="grid grid-cols-3 gap-6">
                    {[
                      { key: 'valence',   label: 'Valence',   desc: 'Negative → Positive', colour: '#a78bfa' },
                      { key: 'arousal',   label: 'Arousal',   desc: 'Calm → Energetic',    colour: '#f472b6' },
                      { key: 'dominance', label: 'Dominance', desc: 'Weak → Powerful',     colour: '#60a5fa' },
                    ].map(({ key, label, desc, colour }) => {
                      const val = (emotional as unknown as Record<string, number>)[key] ?? 0
                      return (
                        <div key={key} className="text-center">
                          <div
                            className="text-3xl font-bold mb-1"
                            style={{ color: colour }}
                          >{val.toFixed(0)}</div>
                          <div className="text-white text-sm font-medium">{label}</div>
                          <div className="text-gray-500 text-xs mt-1">{desc}</div>
                          <div className="w-full bg-gray-700 rounded-full h-1.5 mt-2">
                            <div
                              className="h-1.5 rounded-full"
                              style={{ width: `${val}%`, backgroundColor: colour }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Emotion weights */}
              {weights.length > 0 && (
                <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Emotional Composition</h3>
                  <div className="grid grid-cols-2 gap-x-8">
                    {weights.slice(0, 12).map(([label, weight]) => (
                      <EmotionBar key={label} label={label} weight={weight} mood={label} />
                    ))}
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
