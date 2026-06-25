import { Link } from 'react-router-dom'
import { useReleaseDashboard } from '../../hooks/useReleaseIntelligence'
import ReleaseStateBadge from '../ReleaseStateBadge'
import LoadingSpinner from '../LoadingSpinner'
import ErrorMessage from '../ErrorMessage'

const GRADE_COLOR: Record<string, string> = {
  release_ready: 'text-[#00ff41]',
  almost_ready:  'text-yellow-400',
  in_progress:   'text-[#00d4ff]',
  not_ready:     'text-red-400',
}

interface Props { artistId?: string }

export default function ReleaseDashboard({ artistId }: Props) {
  const { data, isLoading, error } = useReleaseDashboard(artistId)

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage message="Failed to load release dashboard" />
  if (!data) return null

  const { releases, summary } = data

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total',    value: summary.total,           color: 'text-white'        },
          { label: 'Draft',    value: summary.draft,           color: 'text-gray-400'     },
          { label: 'Scheduled',value: summary.scheduled,       color: 'text-[#00d4ff]'   },
          { label: 'Released', value: summary.released,        color: 'text-[#00ff41]'   },
          { label: 'Due ≤30d', value: summary.due_in_30_days,  color: 'text-yellow-400'  },
        ].map(s => (
          <div key={s.label} className="bg-[#111] border border-[#222] rounded-lg p-3 text-center">
            <div className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {summary.critical_alerts > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2">
          <span className="text-red-400 text-xs font-mono">
            ⚠ {summary.critical_alerts} CRITICAL ALERT{summary.critical_alerts > 1 ? 'S' : ''} REQUIRE ATTENTION
          </span>
        </div>
      )}

      <div className="space-y-3">
        {releases.length === 0 && (
          <div className="text-center text-gray-500 py-12 text-sm">No releases found</div>
        )}
        {releases.map((r: any) => (
          <Link
            key={r.id}
            to={`/release-intelligence/${r.id}`}
            className="block bg-[#111] border border-[#222] rounded-lg p-4 hover:border-[#333] transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                {r.cover_art_url ? (
                  <img src={r.cover_art_url} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded bg-[#1a1a1a] border border-[#333] flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-mono text-gray-600">{r.release_type?.charAt(0).toUpperCase()}</span>
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-white font-medium truncate">{r.release_title}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-mono text-gray-500 uppercase">{r.release_type}</span>
                    {r.artist && <span className="text-[10px] text-gray-600">· {r.artist.stage_name}</span>}
                    {r.release_date && <span className="text-[10px] text-gray-600">· {r.release_date}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {r.readiness && (
                  <div className="text-right">
                    <div className={`text-lg font-bold font-mono ${GRADE_COLOR[r.readiness.grade] ?? 'text-gray-400'}`}>
                      {r.readiness.score}%
                    </div>
                    <div className="text-[9px] text-gray-600 font-mono uppercase">ready</div>
                  </div>
                )}
                <ReleaseStateBadge state={r.release_state} size="sm" />
                {r.active_alerts?.length > 0 && (
                  <span className="text-[9px] font-mono text-red-400 border border-red-500/30 rounded px-1.5 py-0.5">
                    {r.active_alerts.length} alert{r.active_alerts.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
