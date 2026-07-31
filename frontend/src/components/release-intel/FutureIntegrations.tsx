import { Link } from 'react-router-dom'
import WidgetCard from '../dashboard/WidgetCard'

interface Card {
  label: string
  status: string
  href?: string
}

// Honest status per engine — some already exist as standalone modules but are
// not yet wired into Release Intel's mission/score pipeline; others genuinely
// have no engine at all yet. No fabricated metrics either way.
const CARDS: Card[] = [
  { label: 'Playlist Intelligence', status: 'Waiting for corresponding intelligence engine.' },
  { label: 'Fan Intelligence', status: 'Engine exists but is not yet connected to Release Orchestrator mission scoring.', href: '/fan-intelligence' },
  { label: 'Sync Intelligence', status: 'Partially connected — the sync score above is computed via the existing Sync Intelligence engine once audio is analyzed.', href: '/sync-intelligence' },
  { label: 'Content Intelligence', status: 'Waiting for corresponding intelligence engine.' },
  { label: 'Outreach Intelligence', status: 'Waiting for corresponding intelligence engine.' },
  { label: 'Analytics Intelligence', status: 'Waiting for corresponding intelligence engine.' },
]

export default function FutureIntegrations() {
  return (
    <WidgetCard title="FUTURE INTEGRATIONS" accent="purple">
      <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {CARDS.map(c => (
          <div key={c.label} className="border border-dashed border-purple-400/20 rounded-lg p-4 space-y-2">
            <div className="text-[10px] font-mono text-purple-300/70 tracking-widest">{c.label.toUpperCase()}</div>
            <p className="text-[10px] font-mono text-gray-500 leading-relaxed">{c.status}</p>
            {c.href && (
              <Link to={c.href} className="text-[9px] font-mono text-purple-400/60 hover:text-purple-400 tracking-widest">
                VIEW ENGINE →
              </Link>
            )}
          </div>
        ))}
      </div>
    </WidgetCard>
  )
}
