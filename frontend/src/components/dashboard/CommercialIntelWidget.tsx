import { useQuery } from '@tanstack/react-query'
import { artists, commercialIntelligence } from '../../api/client'
import WidgetSkeleton from './WidgetSkeleton'

export default function CommercialIntelWidget() {
  const artistsQ = useQuery({
    queryKey: ['artists', 'list'],
    queryFn: () => artists.list().then(r => r.data?.data ?? r.data),
    staleTime: 300_000,
    retry: 2,
  })

  const artistList: any[] = Array.isArray(artistsQ.data) ? artistsQ.data : (artistsQ.data?.artists ?? [])
  const firstArtist = artistList[0]

  const ciQ = useQuery({
    queryKey: ['commercial-intelligence', 'artist', firstArtist?.id],
    queryFn: () => commercialIntelligence.byArtist(firstArtist!.id, 3).then(r => r.data?.data ?? r.data),
    enabled: !!firstArtist?.id,
    staleTime: 300_000,
    retry: 2,
  })

  const isPending = artistsQ.isPending || (!!firstArtist && ciQ.isPending)

  if (isPending) return <WidgetSkeleton rows={3} />

  if (artistsQ.isError) {
    return (
      <div className="px-5 py-5 flex items-center justify-between">
        <span className="text-[11px] font-mono text-yellow-400/60 tracking-widest">⚠ Data unavailable</span>
        <button onClick={() => artistsQ.refetch()} className="text-[10px] font-mono text-yellow-400/40 hover:text-yellow-400 tracking-widest">RETRY</button>
      </div>
    )
  }

  if (artistList.length === 0) {
    return (
      <div className="px-5 py-8 text-center">
        <div className="text-2xl text-fuchsia-400/10 mb-3">⬡</div>
        <p className="text-[10px] font-mono text-gray-700 tracking-widest">NO ARTISTS CONFIGURED</p>
        <p className="text-[10px] font-mono text-gray-800 mt-1 tracking-wider">Add an artist and upload audio to activate CI Engine</p>
      </div>
    )
  }

  const analyses: any[] = Array.isArray(ciQ.data) ? ciQ.data : (ciQ.data?.analyses ?? [])

  if (analyses.length === 0) {
    return (
      <div className="px-5 py-8 text-center">
        <div className="text-2xl text-fuchsia-400/10 mb-3">⬡</div>
        <p className="text-[10px] font-mono text-gray-700 tracking-widest">NO CI ANALYSES YET</p>
        <p className="text-[10px] font-mono text-gray-800 mt-1 tracking-wider">Upload and process audio to generate commercial intelligence</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-[#111]">
      <div className="px-5 py-2.5">
        <span className="text-[9px] font-mono text-gray-700 tracking-wider">ARTIST: {firstArtist?.name ?? firstArtist?.artist_name ?? '—'}</span>
      </div>
      {analyses.map((a: any) => {
        const syncScore = Number(a.sync_readiness_score ?? a.overall_score ?? 0)
        const tier = a.revenue_tier ?? a.market_tier ?? '—'
        return (
          <div key={a.id ?? a.upload_id} className="px-5 py-3 flex items-center gap-3 hover:bg-white/[0.015] transition-colors">
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-mono text-gray-200 truncate">
                {a.song_title ?? a.title ?? 'Analysis'}
              </div>
              <div className="text-[10px] font-mono text-gray-600 mt-0.5">
                Tier: {tier} · Score: {syncScore > 0 ? syncScore : '—'}
              </div>
            </div>
            {syncScore > 0 && (
              <div className={`text-sm font-bold font-mono tabular-nums ${syncScore >= 75 ? 'text-[#00ff41]' : syncScore >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                {syncScore}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
