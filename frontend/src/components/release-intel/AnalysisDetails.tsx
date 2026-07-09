import WidgetCard from '../dashboard/WidgetCard'
import EmptyState from '../EmptyState'
import type { ReleaseIntelAnalysis, ExecutiveBrief } from './types'
import { formatDate } from './format'

interface Props {
  analysis: ReleaseIntelAnalysis | null
  brief: ExecutiveBrief | null
}

export default function AnalysisDetails({ analysis, brief }: Props) {
  if (!analysis) {
    return (
      <WidgetCard title="ANALYSIS DETAILS" accent="cyan">
        <div className="p-2">
          <EmptyState icon="◇" title="No analysis yet" message="Run analysis to see reasoning and rule engine outputs here." color="cyan" />
        </div>
      </WidgetCard>
    )
  }

  return (
    <WidgetCard title="ANALYSIS DETAILS" accent="cyan">
      <div className="p-5 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {brief && (
            <div>
              <div className="text-[9px] font-mono text-[#00d4ff]/50 tracking-[0.25em] mb-2">PLAYLIST REASONING</div>
              <p className="text-[11px] font-mono text-white/75 leading-relaxed">{brief.playlist_outlook}</p>
            </div>
          )}
          {brief && (
            <div>
              <div className="text-[9px] font-mono text-[#00d4ff]/50 tracking-[0.25em] mb-2">SYNC REASONING</div>
              <p className="text-[11px] font-mono text-white/75 leading-relaxed">{brief.sync_outlook}</p>
            </div>
          )}
        </div>

        {brief && (
          <div>
            <div className="text-[9px] font-mono text-[#00d4ff]/50 tracking-[0.25em] mb-2">VIRAL OUTLOOK &amp; RISK ASSESSMENT</div>
            <p className="text-[11px] font-mono text-white/75 leading-relaxed">{brief.viral_outlook}</p>
            <p className="text-[11px] font-mono text-orange-300/80 leading-relaxed mt-1.5">{brief.risk_assessment}</p>
          </div>
        )}

        {analysis.recommended_release_window && (
          <div>
            <div className="text-[9px] font-mono text-[#00ff41]/50 tracking-[0.25em] mb-2">RELEASE WINDOW REASONING</div>
            <p className="text-[11px] font-mono text-white/75 leading-relaxed">{analysis.recommended_release_window.reasoning}</p>
            <div className="flex gap-4 mt-1.5 text-[9px] font-mono text-gray-600">
              <span>EARLIEST SUBMISSION {formatDate(analysis.recommended_release_window.earliestSubmission)}</span>
              <span>LEAD TIME {analysis.recommended_release_window.leadTimeDays ?? '—'}d</span>
            </div>
          </div>
        )}

        {analysis.recommended_countries && analysis.recommended_countries.length > 0 && (
          <div>
            <div className="text-[9px] font-mono text-[#00ff41]/50 tracking-[0.25em] mb-2">MARKET REASONING — RECOMMENDED COUNTRIES</div>
            <div className="flex flex-wrap gap-2">
              {analysis.recommended_countries.map((c, i) => (
                <span key={i} className="text-[10px] font-mono px-2 py-1 rounded border border-[#00ff41]/20 text-white/70">
                  {c.country} <span className="text-gray-600">· score {c.score} · {c.source.replace(/_/g, ' ')}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {analysis.recommended_dsps && analysis.recommended_dsps.length > 0 && (
          <div>
            <div className="text-[9px] font-mono text-[#00ff41]/50 tracking-[0.25em] mb-2">DSP READINESS</div>
            <div className="flex flex-wrap gap-2">
              {analysis.recommended_dsps.map((d, i) => (
                <span key={i} className={`text-[10px] font-mono px-2 py-1 rounded border ${d.configured ? 'border-[#00ff41]/25 text-[#00ff41]' : 'border-orange-400/25 text-orange-400'}`}>
                  {d.platform} · {d.priority.replace('_', ' ')}
                </span>
              ))}
            </div>
          </div>
        )}

        {analysis.rollout_strategy && (
          <div>
            <div className="text-[9px] font-mono text-[#00ff41]/50 tracking-[0.25em] mb-2">ROLLOUT STRATEGY</div>
            <div className="text-[10px] font-mono text-gray-500 mb-1">PHASE: {analysis.rollout_strategy.phase.replace(/_/g, ' ').toUpperCase()}</div>
            <p className="text-[11px] font-mono text-white/75 leading-relaxed">{analysis.rollout_strategy.recommendation}</p>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-white/5">
          <div>
            <div className="text-[9px] font-mono text-gray-600 tracking-widest">DATA COMPLETENESS</div>
            <div className={`text-[11px] font-mono ${analysis.data_completeness === 'full' ? 'text-[#00ff41]' : 'text-yellow-400'}`}>
              {analysis.data_completeness.replace('_', ' ').toUpperCase()}
            </div>
          </div>
          <div>
            <div className="text-[9px] font-mono text-gray-600 tracking-widest">AUDIO AVAILABLE</div>
            <div className={`text-[11px] font-mono ${analysis.resolved_audio_upload_id ? 'text-[#00ff41]' : 'text-gray-500'}`}>
              {analysis.resolved_audio_upload_id ? 'YES' : 'NO'}
            </div>
          </div>
          <div>
            <div className="text-[9px] font-mono text-gray-600 tracking-widest">RULE ENGINE OUTPUT</div>
            <div className="text-[11px] font-mono text-white/70">{brief?.used_ai ? 'AI-assisted' : 'Rule-based'}</div>
          </div>
          <div>
            <div className="text-[9px] font-mono text-gray-600 tracking-widest">ANALYSIS VERSION</div>
            <div className="text-[11px] font-mono text-white/70">{analysis.analysis_version}</div>
          </div>
        </div>

        {analysis.failure_reason && (
          <div className="border border-red-400/25 rounded p-3 bg-red-400/5">
            <div className="text-[9px] font-mono text-red-400/70 tracking-widest mb-1">FAILURE REASON</div>
            <div className="text-[11px] font-mono text-red-300">{analysis.failure_reason}</div>
          </div>
        )}
      </div>
    </WidgetCard>
  )
}
