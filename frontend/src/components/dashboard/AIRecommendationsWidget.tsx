import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../api/client'
import WidgetSkeleton from './WidgetSkeleton'

const PRIORITY_BADGE: Record<string, string> = {
  high:   'text-red-400 bg-red-400/10',
  medium: 'text-yellow-400 bg-yellow-400/10',
  low:    'text-gray-500 bg-white/5',
}

const TYPE_COLOR: Record<string, string> = {
  release:    'text-[#00d4ff]',
  sync:       'text-orange-400',
  outreach:   'text-purple-400',
  fan:        'text-[#00ff41]',
  deal:       'text-fuchsia-400',
  contract:   'text-purple-400',
  payment:    'text-fuchsia-400',
  general:    'text-gray-400',
}

export default function AIRecommendationsWidget() {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['ai', 'recommendations'],
    queryFn: () => apiClient.get('/ai/recommendations').then(r => r.data?.data ?? r.data),
    staleTime: 300_000,
    retry: 1,
  })

  if (isPending) return <WidgetSkeleton rows={3} />

  if (isError) {
    return (
      <div className="px-5 py-8 text-center">
        <div className="text-2xl text-purple-400/10 mb-3">◈</div>
        <p className="text-[10px] font-mono text-gray-700 tracking-widest">AI ENGINE OFFLINE</p>
        <p className="text-[10px] font-mono text-gray-800 mt-1 tracking-wider">
          Recommendations will appear once the AI engine processes your data
        </p>
        <button
          onClick={() => refetch()}
          className="mt-3 text-[10px] font-mono text-gray-700 hover:text-gray-500 tracking-widest transition-colors"
        >
          RETRY
        </button>
      </div>
    )
  }

  const recs: any[] = Array.isArray(data) ? data : (data?.recommendations ?? [])

  if (recs.length === 0) {
    return (
      <div className="px-5 py-8 text-center">
        <div className="text-2xl text-purple-400/10 mb-3">◈</div>
        <p className="text-[10px] font-mono text-gray-700 tracking-widest">NO RECOMMENDATIONS YET</p>
        <p className="text-[10px] font-mono text-gray-800 mt-1 tracking-wider">
          AI recommendations generate as the platform collects data
        </p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-[#111]">
      {recs.slice(0, 6).map((rec: any, i: number) => {
        const priorityCls = PRIORITY_BADGE[rec.priority?.toLowerCase()] ?? 'text-gray-500 bg-white/5'
        const typeCls = TYPE_COLOR[rec.type?.toLowerCase()] ?? 'text-gray-400'
        return (
          <div key={rec.id ?? i} className="px-5 py-3 flex items-start gap-3 hover:bg-white/[0.015] transition-colors">
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${priorityCls.includes('red') ? 'bg-red-400' : priorityCls.includes('yellow') ? 'bg-yellow-400' : 'bg-gray-600'}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                {rec.type && (
                  <span className={`text-[9px] font-mono tracking-widest ${typeCls}`}>
                    [{(rec.type).toUpperCase()}]
                  </span>
                )}
                <span className="text-[11px] font-mono text-gray-300 leading-snug">{rec.title ?? rec.message ?? rec.recommendation}</span>
              </div>
              {rec.description && (
                <p className="text-[10px] font-mono text-gray-600 leading-relaxed">{rec.description}</p>
              )}
            </div>
            <span className={`text-[9px] font-mono tracking-widest px-1.5 py-0.5 rounded flex-shrink-0 ${priorityCls}`}>
              {(rec.priority ?? 'LOW').toUpperCase()}
            </span>
          </div>
        )
      })}
    </div>
  )
}
