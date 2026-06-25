import { useReleaseReadiness } from '../../hooks/useReleaseIntelligence'
import LoadingSpinner from '../LoadingSpinner'

const GRADE_CONFIG: Record<string, { color: string; border: string; label: string }> = {
  release_ready: { color: 'text-[#00ff41]',  border: 'border-[#00ff41]/40',  label: 'RELEASE READY' },
  almost_ready:  { color: 'text-yellow-400', border: 'border-yellow-400/40', label: 'ALMOST READY'  },
  in_progress:   { color: 'text-[#00d4ff]',  border: 'border-[#00d4ff]/40',  label: 'IN PROGRESS'   },
  not_ready:     { color: 'text-red-400',     border: 'border-red-400/40',    label: 'NOT READY'     },
}

interface Props { releaseId: string }

export default function ReadinessScore({ releaseId }: Props) {
  const { data, isLoading } = useReleaseReadiness(releaseId)

  if (isLoading) return <LoadingSpinner />
  if (!data) return null

  const cfg = GRADE_CONFIG[data.grade] ?? GRADE_CONFIG.not_ready

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-6">
        <div className={`w-20 h-20 rounded-full border-2 ${cfg.border} flex flex-col items-center justify-center flex-shrink-0`}>
          <span className={`text-2xl font-bold font-mono ${cfg.color}`}>{data.score}</span>
          <span className="text-[8px] text-gray-600 font-mono">/ 100</span>
        </div>
        <div>
          <div className={`text-sm font-mono font-bold ${cfg.color}`}>{cfg.label}</div>
          <div className="text-xs text-gray-500 mt-1">{data.release_title}</div>
          <div className="grid grid-cols-3 gap-3 mt-2">
            {Object.entries(data.breakdown ?? {}).map(([k, v]) => (
              <div key={k} className="text-center">
                <div className="text-sm font-bold font-mono text-white">{v as number}</div>
                <div className="text-[9px] text-gray-600 uppercase">{k}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <div className="text-[10px] font-mono text-gray-500 mb-2 uppercase tracking-wider">Asset Checklist</div>
        <div className="grid grid-cols-2 gap-1">
          {(data.checklist_items ?? []).map((item: any) => (
            <div key={item.field} className={`flex items-center gap-1.5 text-xs ${item.ready ? 'text-gray-300' : 'text-gray-600'}`}>
              <span className={item.ready ? 'text-[#00ff41]' : 'text-gray-700'}>
                {item.ready ? '✓' : '○'}
              </span>
              {item.label}
            </div>
          ))}
        </div>
      </div>

      {data.dsp_summary && (
        <div>
          <div className="text-[10px] font-mono text-gray-500 mb-2 uppercase tracking-wider">Distribution</div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Live',     value: data.dsp_summary.live,          color: 'text-[#00ff41]' },
              { label: 'Submitted',value: data.dsp_summary.submitted,     color: 'text-[#00d4ff]' },
              { label: 'Pending',  value: data.dsp_summary.not_submitted, color: 'text-gray-500'  },
              { label: 'Rejected', value: data.dsp_summary.rejected,      color: 'text-red-400'   },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className={`text-lg font-bold font-mono ${s.color}`}>{s.value}</div>
                <div className="text-[9px] text-gray-600">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.campaign_summary && (
        <div>
          <div className="text-[10px] font-mono text-gray-500 mb-2 uppercase tracking-wider">Campaigns</div>
          <div className="grid grid-cols-5 gap-1">
            {(data.campaign_summary.by_type ?? []).map((c: any) => (
              <div
                key={c.type}
                className={`text-center border rounded p-1 ${
                  c.exists
                    ? c.status === 'completed'
                      ? 'border-[#00ff41]/30 bg-[#00ff41]/5'
                      : 'border-[#00d4ff]/30 bg-[#00d4ff]/5'
                    : 'border-[#222]'
                }`}
              >
                <div className={`text-[8px] font-mono ${c.exists ? (c.status === 'completed' ? 'text-[#00ff41]' : 'text-[#00d4ff]') : 'text-gray-700'}`}>
                  {c.exists ? (c.status === 'completed' ? '✓' : '●') : '○'}
                </div>
                <div className="text-[7px] text-gray-600 uppercase mt-0.5">{c.type.replace(/_/g, ' ')}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
