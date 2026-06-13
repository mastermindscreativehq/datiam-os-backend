interface ComparableArtist {
  name: string
  similarity: number
  genre: string
  knownPlacements: string[]
  sharedEmotionalTraits: string[]
  sharedCommercialPatterns: string[]
  similarityReason: string
}

interface ComparableArtistsProps {
  artists: ComparableArtist[]
}

function SimilarityBar({ value }: { value: number }) {
  const color = value >= 80 ? 'bg-cyan-500' : value >= 65 ? 'bg-green-500' : value >= 50 ? 'bg-yellow-500' : 'bg-gray-500'
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 bg-gray-800 rounded-full h-1">
        <div className={`h-1 rounded-full transition-all duration-700 ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className={`text-[11px] font-mono font-bold flex-shrink-0 ${value >= 80 ? 'text-cyan-400' : value >= 65 ? 'text-green-400' : value >= 50 ? 'text-yellow-400' : 'text-gray-500'}`}>
        {value}%
      </span>
    </div>
  )
}

export default function ComparableArtists({ artists }: ComparableArtistsProps) {
  return (
    <div>
      <div className="text-[10px] font-mono text-gray-500 tracking-[0.2em] uppercase mb-4">
        Comparable Artist Intelligence™
      </div>

      <div className="space-y-3">
        {artists.map((artist, idx) => (
          <div key={artist.name} className="bg-[#0f0f0f] border border-gray-800 rounded-lg p-4">
            <div className="flex items-start gap-4">
              {/* Rank + Similarity */}
              <div className="flex-shrink-0 text-center w-10">
                <div className="text-[10px] font-mono text-gray-600">{idx + 1}</div>
                <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-base font-bold text-gray-300 mt-1">
                  {artist.name[0]}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-white">{artist.name}</span>
                  <span className="text-[10px] font-mono text-gray-500 capitalize">{artist.genre}</span>
                </div>
                <SimilarityBar value={artist.similarity} />

                <p className="text-[11px] text-gray-500 leading-relaxed mt-2">{artist.similarityReason}</p>

                {/* Known placements */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {artist.knownPlacements.slice(0, 4).map(p => (
                    <span key={p} className="px-2 py-0.5 bg-gray-800 border border-gray-700 text-gray-300 text-[9px] font-mono rounded">
                      {p}
                    </span>
                  ))}
                </div>

                {/* Shared emotional traits */}
                {artist.sharedEmotionalTraits.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {artist.sharedEmotionalTraits.slice(0, 3).map(t => (
                      <span key={t} className="px-1.5 py-0.5 bg-[#00d4ff]/5 border border-[#00d4ff]/20 text-[#00d4ff]/60 text-[9px] font-mono rounded">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
