import { useReleaseAlerts, useGenerateAlerts, useResolveAlert } from '../../hooks/useReleaseIntelligence'
import LoadingSpinner from '../LoadingSpinner'

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; border: string; dot: string }> = {
  critical: { color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/30',    dot: 'bg-red-500'    },
  warning:  { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', dot: 'bg-yellow-500' },
  info:     { color: 'text-[#00d4ff]',  bg: 'bg-[#00d4ff]/5',  border: 'border-[#00d4ff]/20',  dot: 'bg-[#00d4ff]'  },
}

interface Props { releaseId: string }

export default function ReleaseAlerts({ releaseId }: Props) {
  const { data: alerts, isLoading } = useReleaseAlerts(releaseId)
  const generateMutation = useGenerateAlerts(releaseId)
  const resolveMutation  = useResolveAlert(releaseId)

  if (isLoading) return <LoadingSpinner />

  const list: any[] = alerts ?? []
  const critical = list.filter(a => a.severity === 'critical').length
  const warnings  = list.filter(a => a.severity === 'warning').length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {critical > 0 && (
            <span className="text-[9px] font-mono text-red-400 border border-red-500/30 rounded px-1.5 py-0.5">
              {critical} CRITICAL
            </span>
          )}
          {warnings > 0 && (
            <span className="text-[9px] font-mono text-yellow-400 border border-yellow-500/30 rounded px-1.5 py-0.5">
              {warnings} WARNING
            </span>
          )}
          {list.length === 0 && (
            <span className="text-[10px] text-[#00ff41] font-mono">✓ NO ACTIVE ALERTS</span>
          )}
        </div>
        <button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          className="text-[10px] font-mono text-gray-500 hover:text-gray-300 border border-[#333] rounded px-2 py-1"
        >
          {generateMutation.isPending ? 'Scanning…' : '↻ Scan'}
        </button>
      </div>

      {list.map((a: any) => {
        const cfg = SEVERITY_CONFIG[a.severity] ?? SEVERITY_CONFIG.info
        return (
          <div key={a.id} className={`rounded-lg border p-3 ${cfg.bg} ${cfg.border}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${cfg.dot}`} />
                <div>
                  <div className={`text-sm font-medium ${cfg.color}`}>{a.title}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{a.message}</div>
                </div>
              </div>
              <button
                onClick={() => resolveMutation.mutate(a.id)}
                disabled={resolveMutation.isPending}
                className="text-[10px] text-gray-600 hover:text-gray-400 border border-[#333] rounded px-1.5 py-0.5 flex-shrink-0"
              >
                Resolve
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
