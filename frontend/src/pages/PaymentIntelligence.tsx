import { useState, useEffect } from 'react';
import { payments } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';

interface Payment {
  id: string;
  contract_id: string;
  deal_id: string;
  payment_amount: number;
  currency: string;
  payment_status: 'pending' | 'invoice_sent' | 'partial' | 'paid' | 'overdue' | 'refunded' | 'cancelled';
  invoice_number: string | null;
  invoice_sent_at: string | null;
  due_date: string | null;
  paid_at: string | null;
  amount_paid: number | null;
  payment_method: string | null;
  created_at: string;
}

interface PaymentAnalytics {
  payments_created: number;
  payments_paid: number;
  payments_overdue: number;
  collection_rate: number;
  total_paid_value: number;
  average_payment_value: number;
  total_outstanding_value: number;
  median_days_to_pay: number;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending:      { bg: 'bg-gray-500/20', text: 'text-gray-400',    label: 'PENDING' },
  invoice_sent: { bg: 'bg-[#00d4ff]/20', text: 'text-[#00d4ff]', label: 'INVOICE SENT' },
  partial:      { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'PARTIAL' },
  paid:         { bg: 'bg-[#00ff41]/20', text: 'text-[#00ff41]',  label: 'PAID' },
  overdue:      { bg: 'bg-red-500/20',   text: 'text-red-400',    label: 'OVERDUE' },
  refunded:     { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'REFUNDED' },
  cancelled:    { bg: 'bg-red-500/20',   text: 'text-red-400',    label: 'CANCELLED' },
};

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? { bg: 'bg-gray-500/20', text: 'text-gray-400', label: status.toUpperCase() };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono tracking-[0.1em] ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}

function formatCurrency(val: number | null | undefined): string {
  if (val == null) return '—';
  return val.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function formatDate(val: string | null | undefined): string {
  if (!val) return '—';
  return new Date(val).toLocaleDateString();
}

function isOverdue(payment: Payment): boolean {
  if (!payment.due_date) return false;
  if (payment.payment_status === 'paid' || payment.payment_status === 'cancelled' || payment.payment_status === 'refunded') return false;
  return new Date(payment.due_date) < new Date();
}

export default function PaymentIntelligence() {
  const [paymentList, setPaymentList] = useState<Payment[]>([]);
  const [analytics, setAnalytics] = useState<PaymentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendingInvoice, setSendingInvoice] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const [listRes, analyticsRes] = await Promise.all([
          payments.list(),
          payments.analytics(),
        ]);
        const listData = listRes.data?.data ?? listRes.data;
        const analyticsData = analyticsRes.data?.data ?? analyticsRes.data;
        setPaymentList(listData?.payments ?? listData ?? []);
        setAnalytics(analyticsData);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to load payment data';
        setError(msg);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  async function handleSendInvoice(paymentId: string) {
    setSendingInvoice(paymentId);
    try {
      await payments.sendInvoice(paymentId);
      // Refresh list to show updated invoice_sent status
      const listRes = await payments.list();
      const listData = listRes.data?.data ?? listRes.data;
      setPaymentList(listData?.payments ?? listData ?? []);
    } catch {
      // silently fail — no modal needed per spec
    } finally {
      setSendingInvoice(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c0c0c] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0c0c0c] font-mono p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#00ff41] tracking-[0.2em] uppercase">
          PAYMENT INTELLIGENCE
        </h1>
        <p className="text-gray-500 tracking-[0.15em] text-sm mt-1">COLLECTION ENGINE</p>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-6 border border-red-500/40 bg-red-500/10 rounded-lg p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {/* Total Payments */}
          <div className="bg-[#111] border border-[#00ff41]/10 rounded-lg p-4">
            <p className="text-gray-500 text-xs tracking-[0.1em] uppercase mb-2">Total Payments</p>
            <p className="text-2xl font-bold text-white">{analytics.payments_created}</p>
          </div>

          {/* Paid */}
          <div className="bg-[#111] border border-[#00ff41]/10 rounded-lg p-4">
            <p className="text-gray-500 text-xs tracking-[0.1em] uppercase mb-2">Paid</p>
            <p className="text-2xl font-bold text-[#00ff41]">{analytics.payments_paid}</p>
          </div>

          {/* Overdue */}
          <div className="bg-[#111] border border-red-500/10 rounded-lg p-4">
            <p className="text-gray-500 text-xs tracking-[0.1em] uppercase mb-2">Overdue</p>
            <p className="text-2xl font-bold text-red-400">{analytics.payments_overdue}</p>
          </div>

          {/* Collection Rate */}
          <div className="bg-[#111] border border-[#00ff41]/10 rounded-lg p-4">
            <p className="text-gray-500 text-xs tracking-[0.1em] uppercase mb-2">Collection Rate</p>
            <p className="text-2xl font-bold text-[#00ff41]">
              {Math.round(analytics.collection_rate * 100)}%
            </p>
          </div>

          {/* Total Paid Value */}
          <div className="bg-[#111] border border-[#00ff41]/10 rounded-lg p-4">
            <p className="text-gray-500 text-xs tracking-[0.1em] uppercase mb-2">Total Paid</p>
            <p className="text-xl font-bold text-[#00ff41]">{formatCurrency(analytics.total_paid_value)}</p>
          </div>

          {/* Outstanding */}
          <div className="bg-[#111] border border-red-500/10 rounded-lg p-4">
            <p className="text-gray-500 text-xs tracking-[0.1em] uppercase mb-2">Outstanding</p>
            <p className="text-xl font-bold text-red-400">{formatCurrency(analytics.total_outstanding_value)}</p>
          </div>

          {/* Avg Payment */}
          <div className="bg-[#111] border border-[#00d4ff]/10 rounded-lg p-4">
            <p className="text-gray-500 text-xs tracking-[0.1em] uppercase mb-2">Avg Payment</p>
            <p className="text-xl font-bold text-[#00d4ff]">{formatCurrency(analytics.average_payment_value)}</p>
          </div>

          {/* Median Days to Pay */}
          <div className="bg-[#111] border border-[#00d4ff]/10 rounded-lg p-4">
            <p className="text-gray-500 text-xs tracking-[0.1em] uppercase mb-2">Median Days to Pay</p>
            <p className="text-2xl font-bold text-[#00d4ff]">
              {analytics.median_days_to_pay != null ? Math.round(analytics.median_days_to_pay) : '—'}
            </p>
          </div>
        </div>
      )}

      {/* Payments Table */}
      <div className="bg-[#111] border border-[#00ff41]/10 rounded-lg overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-[#ffffff]/5">
          <h2 className="text-[#00ff41] text-sm tracking-[0.15em] uppercase font-bold">Payments</h2>
        </div>

        {paymentList.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500 text-sm tracking-[0.1em]">
            NO PAYMENTS FOUND
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#ffffff]/5">
                  <th className="px-4 py-3 text-left text-gray-500 text-xs tracking-[0.1em] uppercase">Invoice #</th>
                  <th className="px-4 py-3 text-left text-gray-500 text-xs tracking-[0.1em] uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-gray-500 text-xs tracking-[0.1em] uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-gray-500 text-xs tracking-[0.1em] uppercase">Due Date</th>
                  <th className="px-4 py-3 text-left text-gray-500 text-xs tracking-[0.1em] uppercase">Paid Date</th>
                  <th className="px-4 py-3 text-left text-gray-500 text-xs tracking-[0.1em] uppercase">Method</th>
                  <th className="px-4 py-3 text-left text-gray-500 text-xs tracking-[0.1em] uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paymentList.map((payment) => {
                  const overdue = isOverdue(payment);
                  return (
                    <tr
                      key={payment.id}
                      className="bg-[#0c0c0c] border-b border-[#ffffff]/5 hover:bg-[#00ff41]/5 transition-colors"
                    >
                      {/* Invoice # */}
                      <td className="px-4 py-3 text-gray-300">
                        {payment.invoice_number
                          ? payment.invoice_number
                          : <span className="text-gray-600">{payment.id.substring(0, 8)}…</span>
                        }
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <StatusBadge status={payment.payment_status} />
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3 text-right text-white font-mono">
                        {formatCurrency(payment.payment_amount)}
                      </td>

                      {/* Due Date */}
                      <td className={`px-4 py-3 ${overdue ? 'text-red-400' : 'text-gray-400'}`}>
                        {payment.due_date ? (
                          <span className={overdue ? 'font-bold' : ''}>
                            {formatDate(payment.due_date)}
                            {overdue && <span className="ml-2 text-xs text-red-500">OVERDUE</span>}
                          </span>
                        ) : '—'}
                      </td>

                      {/* Paid Date */}
                      <td className="px-4 py-3 text-gray-400">
                        {formatDate(payment.paid_at)}
                      </td>

                      {/* Method */}
                      <td className="px-4 py-3 text-gray-400 uppercase text-xs tracking-[0.05em]">
                        {payment.payment_method ?? '—'}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        {(payment.payment_status === 'pending' || payment.payment_status === 'invoice_sent') && (
                          <button
                            onClick={() => handleSendInvoice(payment.id)}
                            disabled={sendingInvoice === payment.id}
                            className="px-3 py-1 text-xs tracking-[0.1em] uppercase border border-[#00d4ff]/25 text-[#00d4ff] bg-[#00d4ff]/10 rounded hover:bg-[#00d4ff]/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {sendingInvoice === payment.id ? 'SENDING…' : 'SEND INVOICE'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary Section — Outstanding Receivables */}
      {analytics && (
        <div className="bg-[#111] border border-red-500/20 rounded-lg p-6">
          <h2 className="text-red-400 text-sm tracking-[0.15em] uppercase font-bold mb-4">
            Outstanding Receivables
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-xs tracking-[0.1em] uppercase mb-1">Total Outstanding Value</p>
              <p className="text-3xl font-bold text-red-400">{formatCurrency(analytics.total_outstanding_value)}</p>
            </div>
            <div className="text-right">
              <p className="text-gray-500 text-xs tracking-[0.1em] uppercase mb-1">Overdue Invoices</p>
              <p className="text-3xl font-bold text-red-500">{analytics.payments_overdue}</p>
            </div>
            <div className="text-right">
              <p className="text-gray-500 text-xs tracking-[0.1em] uppercase mb-1">Collection Rate</p>
              <p className="text-3xl font-bold text-[#00ff41]">
                {Math.round(analytics.collection_rate * 100)}%
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
