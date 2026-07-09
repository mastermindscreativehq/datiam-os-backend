import { useState } from 'react'
import WidgetCard from '../dashboard/WidgetCard'
import type { DiagnosticsState, ReleaseMission } from './types'
import { formatDateTime } from './format'

interface Props {
  diagnostics: DiagnosticsState
  releaseId: string
  missions: ReleaseMission[]
}

export default function DiagnosticsPanel({ diagnostics, releaseId, missions }: Props) {
  const [open, setOpen] = useState(false)
  const lastCall = diagnostics.calls[diagnostics.calls.length - 1] ?? null

  return (
    <WidgetCard title="DIAGNOSTICS" accent="orange">
      <div>
        <button
          onClick={() => setOpen(v => !v)}
          className="w-full flex items-center justify-between px-5 py-3 text-[10px] font-mono tracking-widest text-gray-500 hover:text-gray-300 transition-colors"
        >
          <span>DEVELOPER PANEL</span>
          <span>{open ? '▲ COLLAPSE' : '▼ EXPAND'}</span>
        </button>

        {open && (
          <div className="px-5 pb-5 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <div className="text-[9px] font-mono text-gray-600 tracking-widest">RELEASE ID</div>
                <div className="text-[10px] font-mono text-white/70 break-all">{releaseId}</div>
              </div>
              <div>
                <div className="text-[9px] font-mono text-gray-600 tracking-widest">LAST BACKEND CALL</div>
                <div className="text-[10px] font-mono text-white/70">
                  {lastCall ? `${lastCall.method} ${lastCall.url}` : '—'}
                </div>
              </div>
              <div>
                <div className="text-[9px] font-mono text-gray-600 tracking-widest">API LATENCY</div>
                <div className="text-[10px] font-mono text-white/70">
                  {lastCall ? `${lastCall.latencyMs}ms (status ${lastCall.status})` : '—'}
                </div>
              </div>
              <div>
                <div className="text-[9px] font-mono text-gray-600 tracking-widest">LAST ANALYSIS DURATION</div>
                <div className="text-[10px] font-mono text-white/70">
                  {diagnostics.lastAnalysisDurationMs !== null ? `${diagnostics.lastAnalysisDurationMs}ms (client-measured)` : '—'}
                </div>
              </div>
            </div>

            <div>
              <div className="text-[9px] font-mono text-gray-600 tracking-widest mb-1.5">MISSION IDS</div>
              {missions.length === 0 ? (
                <div className="text-[10px] font-mono text-gray-600">—</div>
              ) : (
                <div className="space-y-0.5">
                  {missions.map(m => (
                    <div key={m.id} className="text-[9px] font-mono text-gray-500 break-all">{m.mission_type}: {m.id}</div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="text-[9px] font-mono text-gray-600 tracking-widest mb-1.5">CALL LOG</div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {diagnostics.calls.length === 0 && <div className="text-[10px] font-mono text-gray-600">No calls recorded yet.</div>}
                {[...diagnostics.calls].reverse().map((c, i) => (
                  <div key={i} className="flex justify-between text-[9px] font-mono text-gray-500">
                    <span>{c.method} {c.url}</span>
                    <span>{c.latencyMs}ms · {c.status} · {formatDateTime(c.at)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-[9px] font-mono text-red-400/60 tracking-widest mb-1.5">ERRORS</div>
                {diagnostics.errors.length === 0 ? (
                  <div className="text-[10px] font-mono text-gray-600">None</div>
                ) : (
                  diagnostics.errors.map((e, i) => <div key={i} className="text-[10px] font-mono text-red-400/80">{e}</div>)
                )}
              </div>
              <div>
                <div className="text-[9px] font-mono text-yellow-400/60 tracking-widest mb-1.5">WARNINGS</div>
                {diagnostics.warnings.length === 0 ? (
                  <div className="text-[10px] font-mono text-gray-600">None</div>
                ) : (
                  diagnostics.warnings.map((w, i) => <div key={i} className="text-[10px] font-mono text-yellow-400/80">{w}</div>)
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </WidgetCard>
  )
}
