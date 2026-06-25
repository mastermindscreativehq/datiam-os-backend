import { useQuery } from '@tanstack/react-query'
import { releases as releasesApi } from '../../api/client'
import WidgetCard from '../dashboard/WidgetCard'
import WidgetSkeleton from '../dashboard/WidgetSkeleton'
import { WidgetErrorBoundary } from '../dashboard/WidgetErrorBoundary'
import { Link } from 'react-router-dom'

interface Release {
  id: string
  title: string
  release_type: string
  status: string
  release_date?: string
  artist_name?: string
}

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  planning:   { color: 'text-gray-500',   label: 'PLANNING' },
  submitted:  { color: 'text-yellow-400', label: 'SUBMITTED' },
  approved:   { color: 'text-[#00d4ff]',  label: 'APPROVED' },
  live:       { color: 'text-[#00ff41]',  label: 'LIVE' },
  draft:      { color: 'text-gray-600',   label: 'DRAFT' },
}

function statusConfig(status: string) {
  return STATUS_CONFIG[status] ?? { color: 'text-gray-500', label: status.toUpperCase() }
}

function CommandContent() {
  const { data, isLoading } = useQuery({
    queryKey: ['mc-releases'],
    queryFn: async () => {
      const res = await releasesApi.list()
      return (res.data?.data ?? res.data ?? []) as Release[]
    },
    staleTime: 2 * 60_000,
  })

  if (isLoading) return <WidgetSkeleton type="pipeline" rows={5} />

  const all: Release[] = data ?? []
  const now = new Date()
  const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)

  const live      = all.filter(r => r.status === 'live')
  const upcoming  = all.filter(r => {
    const rd = r.release_date ? new Date(r.release_date) : null
    return rd && rd > now && rd <= in60Days && r.status !== 'live'
  })
  const inProgress = all.filter(r => ['submitted','approved','planning'].includes(r.status) && !upcoming.find(u => u.id === r.id))

  const displayed = [...live, ...upcoming, ...inProgress].slice(0, 8)

  if (displayed.length === 0) {
    return (
      <div className="px-5 py-8 text-center">
        <div className="text-[#00ff41]/20 text-2xl mb-2">◎</div>
        <div className="text-[11px] font-mono text-gray-600 tracking-widest">NO RELEASES IN PIPELINE</div>
        <Link to="/releases" className="text-[10px] font-mono text-[#00ff41]/40 hover:text-[#00ff41] mt-2 block tracking-widest">
          CREATE RELEASE →
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Summary row */}
      <div className="px-4 pt-3 pb-2 flex gap-4 border-b border-[#111]">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00ff41] animate-pulse" />
          <span className="text-[10px] font-mono text-[#00ff41]">{live.length} LIVE</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00d4ff]" />
          <span className="text-[10px] font-mono text-[#00d4ff]">{upcoming.length} UPCOMING</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-gray-500" />
          <span className="text-[10px] font-mono text-gray-500">{inProgress.length} IN PROGRESS</span>
        </div>
      </div>

      {/* Release list */}
      <div className="divide-y divide-[#111]">
        {displayed.map((r) => {
          const cfg = statusConfig(r.status)
          const rd = r.release_date ? new Date(r.release_date) : null
          const daysUntil = rd ? Math.ceil((rd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null

          return (
            <Link key={r.id} to="/releases" className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] group transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[11px] font-mono text-white/80 group-hover:text-[#00ff41] truncate transition-colors">
                    {r.title}
                  </span>
                  <span className="text-[9px] font-mono text-gray-600 flex-shrink-0">
                    {(r.release_type ?? 'single').toUpperCase()}
                  </span>
                </div>
                {r.artist_name && (
                  <div className="text-[9px] font-mono text-gray-600">{r.artist_name}</div>
                )}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {daysUntil !== null && daysUntil > 0 && (
                  <span className="text-[9px] font-mono text-gray-600">{daysUntil}d</span>
                )}
                {rd && daysUntil !== null && daysUntil <= 0 && r.status !== 'live' && (
                  <span className="text-[9px] font-mono text-red-400">OVERDUE</span>
                )}
                <span className={`text-[9px] font-mono ${cfg.color}`}>{cfg.label}</span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export default function ReleaseCommandCenter() {
  return (
    <WidgetCard title="MUSIC RELEASE COMMAND CENTER" accent="green" href="/releases">
      <WidgetErrorBoundary title="MUSIC RELEASE COMMAND CENTER">
        <CommandContent />
      </WidgetErrorBoundary>
    </WidgetCard>
  )
}
