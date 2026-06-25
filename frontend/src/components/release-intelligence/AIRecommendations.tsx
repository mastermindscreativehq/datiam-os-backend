import { useReleaseRecommendations, useGenerateRecommendations, useActionRecommendation } from '../../hooks/useReleaseIntelligence'
import LoadingSpinner from '../LoadingSpinner'

const TYPE_COLOR: Record<string, string> = {
  timing:       'text-[#00d4ff]',
  marketing:    'text-yellow-400',
  distribution: 'text-[#00ff41]',
  content:      'text-purple-400',
  sync:         'text-orange-400',
  playlist:     'text-pink-400',
  press:        'text-blue-400',
  catalog:      'text-gray-400',
}

interface Props { releaseId: string }

export default function AIRecommendations({ releaseId }: Props) {
  const { data: recs, isLoading } = useReleaseRecommendations(releaseId)
  const generateMutation = useGenerateRecommendations(releaseId)
  const actionMutation   = useActionRecommendation(releaseId)

  if (isLoading) return <LoadingSpinner />

  const list: any[]    = (recs ?? []).filter((r: any) => !r.is_actioned)
  const actioned: number = (recs ?? []).filter((r: any) => r.is_actioned).length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-500 font-mono">
          {list.length} REC{list.length !== 1 ? 'S' : ''}{actioned > 0 ? ` · ${actioned} ACTIONED` : ''}
        </span>
        <button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          className="text-[10px] font-mono text-[#00d4ff] border border-[#00d4ff]/30 rounded px-2 py-1 hover:bg-[#00d4ff]/10 disabled:opacity-50"
        >
          {generateMutation.isPending ? 'Generating…' : '✦ Regenerate'}
        </button>
      </div>

      {list.length === 0 && (
        <div className="text-center text-gray-600 text-xs py-6">
          {!recs || recs.length === 0
            ? 'Click Regenerate to get AI recommendations'
            : 'All recommendations actioned ✓'}
        </div>
      )}

      {list.map((r: any) => (
        <div key={r.id} className="bg-[#1a1a1a] border border-[#222] rounded-lg p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`text-[9px] font-mono uppercase ${TYPE_COLOR[r.rec_type] ?? 'text-gray-400'}`}>
                  {r.rec_type}
                </span>
                <span className="text-[9px] text-gray-700 font-mono">#{r.priority}</span>
              </div>
              <div className="text-white text-sm font-medium">{r.title}</div>
              <div className="text-gray-500 text-xs mt-1 leading-relaxed">{r.description}</div>
            </div>
            <button
              onClick={() => actionMutation.mutate(r.id)}
              disabled={actionMutation.isPending}
              className="text-[10px] font-mono text-[#00ff41] border border-[#00ff41]/30 rounded px-2 py-1 hover:bg-[#00ff41]/10 flex-shrink-0 disabled:opacity-50"
            >
              Done
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
