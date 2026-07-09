import WidgetCard from '../dashboard/WidgetCard'
import type { ActivityEvent, ReleaseRecord, ReleaseIntelAnalysis, ExecutiveBrief, ReleaseMission } from './types'
import { formatDateTime } from './format'

interface Props {
  release: ReleaseRecord
  analysis: ReleaseIntelAnalysis | null
  brief: ExecutiveBrief | null
  missions: ReleaseMission[]
  events: ActivityEvent[]
}

interface TimelineEntry {
  at: string
  label: string
  detail?: string
  color: string
}

const SEVERITY_COLOR: Record<string, string> = {
  error: 'bg-red-400',
  warning: 'bg-yellow-400',
  info: 'bg-[#00d4ff]',
}

export default function MissionTimeline({ release, analysis, brief, missions, events }: Props) {
  const entries: TimelineEntry[] = []

  entries.push({ at: release.created_at, label: 'Release created', detail: release.title, color: 'bg-[#00ff41]' })

  events.forEach(ev => {
    entries.push({
      at: ev.created_at,
      label: ev.title,
      detail: ev.description ?? undefined,
      color: SEVERITY_COLOR[ev.severity ?? 'info'] ?? 'bg-gray-500',
    })
  })

  // Anchors not covered by activity_log — real DB timestamps, not synthesized data.
  const hasBriefEvent = events.some(e => e.event_type === 'release_intel.brief_generated' || /brief/i.test(e.title))
  if (brief && !hasBriefEvent) {
    entries.push({ at: brief.created_at, label: 'Executive brief created', detail: brief.used_ai ? 'AI generated' : 'Rule-based fallback', color: 'bg-[#00ff41]' })
  }

  const hasMissionEvent = events.some(e => e.event_type === 'release_intel.mission_created' || /mission/i.test(e.title))
  if (missions.length > 0 && !hasMissionEvent) {
    const earliest = missions.reduce((min, m) => (m.created_at < min ? m.created_at : min), missions[0].created_at)
    entries.push({ at: earliest, label: 'Mission generation', detail: `${missions.length} missions created`, color: 'bg-[#00ff41]' })
  }

  if (analysis?.analyzed_at) {
    const hasAnalyzedEvent = events.some(e => /analyzed|analysis complete/i.test(e.title))
    if (!hasAnalyzedEvent) {
      entries.push({ at: analysis.analyzed_at, label: 'Analysis completed', detail: `data completeness: ${analysis.data_completeness}`, color: 'bg-[#00ff41]' })
    }
  }

  entries.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())

  return (
    <WidgetCard title="MISSION TIMELINE" accent="cyan">
      {entries.length === 0 ? (
        <div className="px-5 py-8 text-center text-[11px] font-mono text-gray-600 tracking-widest">NO TIMELINE EVENTS YET</div>
      ) : (
        <div className="p-5">
          <div className="space-y-0">
            {entries.map((e, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-2 h-2 rounded-full mt-1 ${e.color}`} />
                  {i < entries.length - 1 && <div className="w-px flex-1 bg-white/10 my-1" />}
                </div>
                <div className="pb-4 flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono text-white/80">{e.label}</span>
                    <span className="text-[9px] font-mono text-gray-600 flex-shrink-0">{formatDateTime(e.at)}</span>
                  </div>
                  {e.detail && <div className="text-[10px] font-mono text-gray-600 mt-0.5">{e.detail}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </WidgetCard>
  )
}
