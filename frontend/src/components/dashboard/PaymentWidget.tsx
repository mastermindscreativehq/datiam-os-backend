import { useQuery } from '@tanstack/react-query'
import { payments } from '../../api/client'
import WidgetSkeleton from './WidgetSkeleton'

const ATTENTION_STATUSES = ['pending', 'overdue', 'invoice_sent', 'partial']

const STATUS_BADGE: Record<string, string> = {
  pending:       'text-yellow-400 bg-yellow-400/10',
  overdue:       'text-red-400 bg-red-400/10',
  invoice_sent:  'text-[#00d4ff] bg-[#00d4ff]/10',
  partial:       'text-orange-400 bg-orange-400/10',
  paid:          'text-[#00ff41] bg-[#00ff41]/10',
  cancelled:     'text-gray-700 bg-white/5',
  refunded:      'text-gray-500 bg-white/5',
}

export default function PaymentWidget() {
  const analyticsQ = useQuery({
    queryKey: ['payments', 'analytics'],
    queryFn: () => payments.analytics().then(r => r.data?.data ?? r.data),
    staleTime: 120_000,
    retry: 2,
  })

  const listQ = useQuery({
    queryKey: ['payments', 'list'],
    queryFn: () => payments.list().then(r => r.data?.data ?? r.data),
    staleTime: 90_000,
    retry: 2,
  })

  const isPending = analyticsQ.isPending || listQ.isPending
  const isError = analyticsQ.isError && listQ.isError

  if (isPending) return <WidgetSkeleton rows={4} />

  if (isError) {
    return (
      <div className="px-5 py-5 flex items-center justify-between">
        <span className="text-[11px] font-mono text-yellow-400/60 tracking-widest">⚠ Payment data unavailable</span>
        <button
          onClick={() => { analyticsQ.refetch(); listQ.refetch() }}
          className="text-[10px] font-mono text-yellow-400/40 hover:text-yellow-400 tracking-widest"
        >
          RETRY
        </button>
      </div>
    )
  }

  const analytics = analyticsQ.data ?? {}
  const allPayments: any[] = Array.isArray(listQ.data) ? listQ.data : (listQ.data?.payments ?? [])
  const needAttention = allPayments.filter((p: any) =>
    ATTENTION_STATUSES.includes(p.status?.toLowerCase())
  )

  const totalRevenue = Number(analytics.total_revenue ?? analytics.total_paid ?? 0)
  const pendingAmount = Number(analytics.pending_amount ?? analytics.total_pending ?? 0)
  const overdueCount = Number(analytics.overdue_count ?? needAttention.filter((p: any) => p.status === 'overdue').length)

  if (allPayments.length === 0 && !analyticsQ.data) {
    return (
      <div className="px-5 py-8 text-center">
        <div className="text-2xl text-fuchsia-400/10 mb-3">◆</div>
        <p className="text-[10px] font-mono text-gray-700 tracking-widest">NO PAYMENT RECORDS</p>
        <p className="text-[10px] font-mono text-gray-800 mt-1 tracking-wider">Payments are auto-created from signed contracts</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-[#111]">
      {/* Summary */}
      <div className="px-5 py-3 grid grid-cols-3 gap-3">
        <div>
          <div className="text-[9px] font-mono text-gray-600 tracking-widest mb-0.5">REVENUE</div>
          <div className="text-base font-bold font-mono text-[#00ff41] tabular-nums">
            {totalRevenue > 0 ? `$${totalRevenue.toLocaleString()}` : '—'}
          </div>
        </div>
        <div>
          <div className="text-[9px] font-mono text-gray-600 tracking-widest mb-0.5">PENDING</div>
          <div className="text-base font-bold font-mono text-yellow-400 tabular-nums">
            {pendingAmount > 0 ? `$${pendingAmount.toLocaleString()}` : '—'}
          </div>
        </div>
        <div>
          <div className="text-[9px] font-mono text-gray-600 tracking-widest mb-0.5">OVERDUE</div>
          <div className={`text-base font-bold font-mono tabular-nums ${overdueCount > 0 ? 'text-red-400' : 'text-gray-600'}`}>
            {overdueCount}
          </div>
        </div>
      </div>

      {needAttention.length === 0 ? (
        <div className="px-5 py-4 text-center">
          <p className="text-[10px] font-mono text-gray-700 tracking-widest">✓ ALL PAYMENTS CURRENT</p>
        </div>
      ) : (
        <div className="divide-y divide-[#0f0f0f]">
          {needAttention.slice(0, 5).map((p: any) => {
            const cls = STATUS_BADGE[p.status?.toLowerCase()] ?? 'text-gray-500 bg-white/5'
            return (
              <div key={p.id} className="px-5 py-2.5 flex items-center gap-3 hover:bg-white/[0.015] transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-mono text-gray-200 truncate">
                    {p.description ?? p.invoice_number ?? 'Invoice'}
                  </div>
                  <div className="text-[10px] font-mono text-gray-600 mt-0.5">
                    {p.payer_name ?? p.client_name ?? '—'}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  {p.amount != null && (
                    <div className="text-[11px] font-mono text-fuchsia-400 tabular-nums">${Number(p.amount).toLocaleString()}</div>
                  )}
                  <span className={`text-[9px] font-mono tracking-widest px-1.5 py-0.5 rounded ${cls}`}>
                    {(p.status ?? '').toUpperCase()}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
