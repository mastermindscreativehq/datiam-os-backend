import WidgetCard from '../dashboard/WidgetCard'
import type { MissionType, ReleaseIntelAnalysis, ReleaseMission } from './types'
import { MISSION_TYPE_LABELS } from './format'

interface Props {
  analysis: ReleaseIntelAnalysis | null
  missions: ReleaseMission[]
  onAnalyze: (force: boolean) => void
  onRefresh: () => void
  onOpenMissionTab: (type: MissionType) => void
  analyzing: boolean
  refreshing: boolean
  canWrite: boolean
}

const MISSION_TYPES: MissionType[] = ['playlist', 'sync', 'fan_growth', 'content', 'outreach', 'analytics']

export default function ActionCenter({ analysis, missions, onAnalyze, onRefresh, onOpenMissionTab, analyzing, refreshing, canWrite }: Props) {
  const hasMission = (type: MissionType) => missions.some(m => m.mission_type === type)

  return (
    <WidgetCard title="ACTION CENTER" accent="green">
      <div className="p-5 flex flex-wrap gap-2.5">
        {canWrite && (
          <button
            disabled={analyzing}
            onClick={() => onAnalyze(false)}
            className="text-[10px] font-mono tracking-widest px-4 py-2 border border-[#00ff41]/40 text-[#00ff41] hover:bg-[#00ff41]/10 rounded transition-colors disabled:opacity-50"
          >
            {analyzing ? 'RUNNING…' : '▶ RUN ANALYSIS'}
          </button>
        )}
        <button
          disabled={refreshing}
          onClick={onRefresh}
          className="text-[10px] font-mono tracking-widest px-4 py-2 border border-[#00d4ff]/40 text-[#00d4ff] hover:bg-[#00d4ff]/10 rounded transition-colors disabled:opacity-50"
        >
          {refreshing ? 'REFRESHING…' : '↻ REFRESH'}
        </button>

        {MISSION_TYPES.map(type => (
          <button
            key={type}
            disabled={!hasMission(type)}
            onClick={() => onOpenMissionTab(type)}
            className="text-[10px] font-mono tracking-widest px-4 py-2 border border-gray-700 text-gray-400 hover:border-[#00ff41]/30 hover:text-[#00ff41] rounded transition-colors disabled:opacity-30"
          >
            OPEN {MISSION_TYPE_LABELS[type]} MISSION
          </button>
        ))}

        {canWrite && analysis?.status === 'failed' && (
          <button
            disabled={analyzing}
            onClick={() => onAnalyze(true)}
            className="text-[10px] font-mono tracking-widest px-4 py-2 border border-red-400/40 text-red-400 hover:bg-red-400/10 rounded transition-colors disabled:opacity-50"
          >
            {analyzing ? 'RETRYING…' : '⟲ RETRY FAILED ANALYSIS'}
          </button>
        )}
      </div>
    </WidgetCard>
  )
}
