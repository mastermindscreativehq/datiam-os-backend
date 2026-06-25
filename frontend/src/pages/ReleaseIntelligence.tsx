import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useReleaseDetail } from '../hooks/useReleaseIntelligence'
import ReleaseDashboard   from '../components/release-intelligence/ReleaseDashboard'
import ReleaseCalendar    from '../components/release-intelligence/ReleaseCalendar'
import ReadinessScore     from '../components/release-intelligence/ReadinessScore'
import DspStatusPanel     from '../components/release-intelligence/DspStatusPanel'
import CampaignTracker    from '../components/release-intelligence/CampaignTracker'
import ReleaseAlerts      from '../components/release-intelligence/ReleaseAlerts'
import AIRecommendations  from '../components/release-intelligence/AIRecommendations'
import ReleaseTimeline    from '../components/release-intelligence/ReleaseTimeline'
import LoadingSpinner     from '../components/LoadingSpinner'

type TopTab    = 'dashboard' | 'calendar'
type DetailTab = 'overview' | 'distribution' | 'campaigns' | 'alerts' | 'ai' | 'timeline'

const DETAIL_TABS: { key: DetailTab; label: string }[] = [
  { key: 'overview',      label: 'Overview'      },
  { key: 'distribution',  label: 'Distribution'  },
  { key: 'campaigns',     label: 'Campaigns'     },
  { key: 'alerts',        label: 'Alerts'        },
  { key: 'ai',            label: 'AI Recs'       },
  { key: 'timeline',      label: 'Timeline'      },
]

function ReleaseDetailView({ releaseId }: { releaseId: string }) {
  const { data, isLoading } = useReleaseDetail(releaseId)
  const [tab, setTab]       = useState<DetailTab>('overview')

  if (isLoading) return <LoadingSpinner />
  if (!data)     return <div className="text-gray-600 text-sm">Release not found.</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            to="/release-intelligence"
            className="text-[10px] font-mono text-gray-600 hover:text-[#00d4ff] mb-2 inline-block"
          >
            ← Back to Release Intel
          </Link>
          <div className="flex items-center gap-3">
            {data.cover_art_url && (
              <img
                src={data.cover_art_url}
                alt={data.title}
                className="w-12 h-12 rounded object-cover border border-[#222]"
              />
            )}
            <div>
              <h1 className="text-xl font-bold text-white">{data.title}</h1>
              <div className="text-xs text-gray-500 font-mono mt-0.5">
                {data.artist_name && <span className="mr-3">{data.artist_name}</span>}
                {data.release_type && (
                  <span className="mr-3 uppercase text-[#00d4ff]">{data.release_type}</span>
                )}
                {data.release_date && <span>{data.release_date}</span>}
              </div>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-mono text-gray-500">READINESS</div>
          <div className="text-2xl font-bold font-mono text-[#00d4ff]">
            {data.readiness_score ?? '—'}
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 border-b border-[#222] pb-0">
        {DETAIL_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-[11px] font-mono tracking-wider transition-colors border-b-2 -mb-px ${
              tab === t.key
                ? 'border-[#00d4ff] text-[#00d4ff]'
                : 'border-transparent text-gray-600 hover:text-gray-400'
            }`}
          >
            {t.label.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-[#111] border border-[#222] rounded-lg p-5">
        {tab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div>
              <div className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-3">
                Readiness Score
              </div>
              <ReadinessScore releaseId={releaseId} />
            </div>
            <div>
              <div className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-3">
                Active Alerts
              </div>
              <ReleaseAlerts releaseId={releaseId} />
            </div>
          </div>
        )}

        {tab === 'distribution' && (
          <>
            <div className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-3">
              DSP Distribution Status
            </div>
            <DspStatusPanel releaseId={releaseId} />
          </>
        )}

        {tab === 'campaigns' && (
          <>
            <div className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-3">
              Campaign Tracker
            </div>
            <CampaignTracker releaseId={releaseId} />
          </>
        )}

        {tab === 'alerts' && (
          <>
            <div className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-3">
              Release Alerts
            </div>
            <ReleaseAlerts releaseId={releaseId} />
          </>
        )}

        {tab === 'ai' && (
          <>
            <div className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-3">
              AI Recommendations
            </div>
            <AIRecommendations releaseId={releaseId} />
          </>
        )}

        {tab === 'timeline' && (
          <>
            <div className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-3">
              Release Timeline
            </div>
            <ReleaseTimeline events={data.timeline ?? []} />
          </>
        )}
      </div>
    </div>
  )
}

const TOP_TABS: { key: TopTab; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'calendar',  label: 'Calendar'  },
]

export default function ReleaseIntelligence() {
  const { id } = useParams<{ id?: string }>()
  const [tab, setTab] = useState<TopTab>('dashboard')

  if (id) return (
    <div className="max-w-4xl mx-auto">
      <ReleaseDetailView releaseId={id} />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-mono">RELEASE INTELLIGENCE</h1>
          <p className="text-xs text-gray-500 mt-1 font-mono tracking-wider">
            Complete lifecycle management for every music release
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00d4ff] animate-pulse" />
          <span className="text-[10px] font-mono text-[#00d4ff]/60 tracking-widest">LIVE</span>
        </div>
      </div>

      {/* Top tabs */}
      <div className="flex gap-1 border-b border-[#222] pb-0">
        {TOP_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-[11px] font-mono tracking-wider transition-colors border-b-2 -mb-px ${
              tab === t.key
                ? 'border-[#00d4ff] text-[#00d4ff]'
                : 'border-transparent text-gray-600 hover:text-gray-400'
            }`}
          >
            {t.label.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'dashboard' && <ReleaseDashboard />}
      {tab === 'calendar'  && <ReleaseCalendar  />}
    </div>
  )
}
