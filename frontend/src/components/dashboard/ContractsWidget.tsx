import { useQuery } from '@tanstack/react-query'
import { contracts } from '../../api/client'
import WidgetSkeleton from './WidgetSkeleton'

const ATTENTION_STATUSES = ['pending_signature', 'sent', 'review', 'draft', 'pending']

const STATUS_BADGE: Record<string, string> = {
  draft:               'text-gray-500 bg-white/5',
  pending:             'text-yellow-400 bg-yellow-400/10',
  pending_signature:   'text-orange-400 bg-orange-400/10',
  sent:                'text-[#00d4ff] bg-[#00d4ff]/10',
  review:              'text-purple-400 bg-purple-400/10',
  signed:              'text-[#00ff41] bg-[#00ff41]/10',
  active:              'text-[#00ff41] bg-[#00ff41]/10',
  expired:             'text-red-400 bg-red-400/10',
  terminated:          'text-red-400 bg-red-400/10',
  cancelled:           'text-gray-700 bg-white/5',
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return ''
  try {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

export default function ContractsWidget() {
  const listQ = useQuery({
    queryKey: ['contracts', 'list'],
    queryFn: () => contracts.list().then(r => r.data?.data ?? r.data),
    staleTime: 90_000,
    retry: 2,
  })

  const analyticsQ = useQuery({
    queryKey: ['contracts', 'analytics'],
    queryFn: () => contracts.analytics().then(r => r.data?.data ?? r.data),
    staleTime: 120_000,
    retry: 2,
  })

  const isPending = listQ.isPending
  const isError = listQ.isError

  if (isPending) return <WidgetSkeleton rows={4} />

  if (isError) {
    return (
      <div className="px-5 py-5 flex items-center justify-between">
        <span className="text-[11px] font-mono text-yellow-400/60 tracking-widest">⚠ Contracts unavailable</span>
        <button onClick={() => listQ.refetch()} className="text-[10px] font-mono text-yellow-400/40 hover:text-yellow-400 tracking-widest">RETRY</button>
      </div>
    )
  }

  const allContracts: any[] = Array.isArray(listQ.data) ? listQ.data : (listQ.data?.contracts ?? [])
  const needAttention = allContracts.filter((c: any) =>
    ATTENTION_STATUSES.includes(c.status?.toLowerCase())
  )
  const analytics = analyticsQ.data ?? {}
  const totalContracts = Number(analytics.total_contracts ?? allContracts.length)
  const activeContracts = Number(analytics.active_contracts ?? allContracts.filter((c: any) => c.status === 'active' || c.status === 'signed').length)

  if (allContracts.length === 0) {
    return (
      <div className="px-5 py-8 text-center">
        <div className="text-2xl text-purple-400/10 mb-3">◈</div>
        <p className="text-[10px] font-mono text-gray-700 tracking-widest">NO CONTRACTS YET</p>
        <p className="text-[10px] font-mono text-gray-800 mt-1 tracking-wider">Contracts are auto-generated from won deals</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-[#111]">
      {/* Stats row */}
      <div className="px-5 py-3 grid grid-cols-2 gap-4">
        <div>
          <div className="text-[9px] font-mono text-gray-600 tracking-widest mb-0.5">TOTAL</div>
          <div className="text-lg font-bold font-mono text-purple-400 tabular-nums">{totalContracts}</div>
        </div>
        <div>
          <div className="text-[9px] font-mono text-gray-600 tracking-widest mb-0.5">ACTIVE</div>
          <div className="text-lg font-bold font-mono text-[#00ff41] tabular-nums">{activeContracts}</div>
        </div>
      </div>

      {needAttention.length === 0 ? (
        <div className="px-5 py-4 text-center">
          <p className="text-[10px] font-mono text-gray-700 tracking-widest">✓ NO ACTION NEEDED</p>
        </div>
      ) : (
        <div className="divide-y divide-[#0f0f0f]">
          {needAttention.slice(0, 5).map((c: any) => {
            const cls = STATUS_BADGE[c.status?.toLowerCase()] ?? 'text-gray-500 bg-white/5'
            return (
              <div key={c.id} className="px-5 py-3 flex items-center gap-3 hover:bg-white/[0.015] transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-mono text-gray-200 truncate">{c.title ?? c.contract_type ?? 'Contract'}</div>
                  <div className="text-[10px] font-mono text-gray-600 mt-0.5">
                    {c.party_name ?? c.counterparty ?? '—'}
                    {fmtDate(c.created_at) && ` · ${fmtDate(c.created_at)}`}
                  </div>
                </div>
                <span className={`text-[9px] font-mono tracking-widest px-1.5 py-0.5 rounded flex-shrink-0 ${cls}`}>
                  {(c.status ?? '').toUpperCase().replace('_', ' ')}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
