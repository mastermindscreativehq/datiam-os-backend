import WidgetCard from '../dashboard/WidgetCard'
import EmptyState from '../EmptyState'
import type { ExecutiveBrief } from './types'
import { formatDateTime } from './format'

interface Props {
  brief: ExecutiveBrief | null
}

function List({ items }: { items: string[] }) {
  if (items.length === 0) return <div className="text-[11px] font-mono text-gray-600">None recorded.</div>
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="text-[11px] font-mono text-white/80 flex gap-2">
          <span className="text-[#00ff41]/40">▸</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

export default function ExecutiveBriefCard({ brief }: Props) {
  return (
    <WidgetCard title="AI EXECUTIVE BRIEF" accent="green">
      {!brief ? (
        <div className="p-2">
          <EmptyState
            icon="◎"
            title="No executive brief yet"
            message="Run analysis to generate an executive brief for this release."
            color="green"
          />
        </div>
      ) : (
        <div className="p-5 space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className={`text-[10px] font-mono tracking-widest px-2.5 py-1 rounded border ${brief.used_ai ? 'text-[#00ff41] border-[#00ff41]/30 bg-[#00ff41]/5' : 'text-yellow-400 border-yellow-400/30 bg-yellow-400/5'}`}>
              {brief.used_ai ? '◆ AI GENERATED' : '◇ RULE-BASED FALLBACK'}
            </div>
            <div className="flex items-center gap-4 text-[10px] font-mono text-gray-600 tracking-widest">
              <span>CONFIDENCE <span className="text-white/70">{Math.round(parseFloat(brief.confidence_score) * 100)}%</span></span>
              <span>GENERATED {formatDateTime(brief.created_at)}</span>
            </div>
          </div>

          <div>
            <div className="text-[9px] font-mono text-[#00ff41]/50 tracking-[0.25em] mb-2">EXECUTIVE SUMMARY</div>
            <p className="text-[12px] font-mono text-white/85 leading-relaxed">{brief.summary}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <div className="text-[9px] font-mono text-[#00d4ff]/50 tracking-[0.25em] mb-2">COMMERCIAL OPPORTUNITY</div>
              <p className="text-[11px] font-mono text-white/75 leading-relaxed">{brief.commercial_outlook}</p>
            </div>
            <div>
              <div className="text-[9px] font-mono text-[#00d4ff]/50 tracking-[0.25em] mb-2">MARKET OBSERVATIONS</div>
              <List items={brief.audience_recommendations} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <div className="text-[9px] font-mono text-[#00ff41]/50 tracking-[0.25em] mb-2">BIGGEST STRENGTHS</div>
              <List items={brief.strengths} />
            </div>
            <div>
              <div className="text-[9px] font-mono text-orange-400/50 tracking-[0.25em] mb-2">BIGGEST WEAKNESSES</div>
              <List items={brief.weaknesses} />
            </div>
          </div>

          <div>
            <div className="text-[9px] font-mono text-[#00ff41]/50 tracking-[0.25em] mb-2">IMMEDIATE RECOMMENDATIONS</div>
            <List items={brief.priority_actions} />
          </div>
        </div>
      )}
    </WidgetCard>
  )
}
