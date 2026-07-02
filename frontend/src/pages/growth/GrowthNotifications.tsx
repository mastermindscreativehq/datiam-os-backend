import { useEffect, useState, useCallback } from 'react'
import EmptyState from '../../components/EmptyState'
import LoadingSpinner from '../../components/LoadingSpinner'
import ErrorMessage from '../../components/ErrorMessage'
import Toast from '../../components/Toast'
import { growth, isCriticalError } from '../../api/client'

function normalise(raw: any): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw
  for (const key of ['data', 'items', 'results']) {
    if (Array.isArray(raw?.[key])) return raw[key]
  }
  return raw ? [raw] : []
}

function typeIcon(type: unknown): string {
  const t = String(type ?? '').toLowerCase()
  if (t.includes('alert') || t.includes('warn'))  return '⚠'
  if (t.includes('success') || t.includes('ok'))  return '✓'
  if (t.includes('error') || t.includes('fail'))  return '✗'
  if (t.includes('info'))                          return 'ℹ'
  return '◎'
}

function formatDate(val: unknown): string {
  if (!val) return '—'
  try { return new Date(String(val)).toLocaleString() } catch { return String(val) }
}

export default function GrowthNotifications() {
  const [data,        setData]        = useState<any>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const [toast,       setToast]       = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [unreadOnly,  setUnreadOnly]  = useState(false)
  const [marking,     setMarking]     = useState<string | null>(null)
  const [dismissing,  setDismissing]  = useState<string | null>(null)
  const [markingAll,  setMarkingAll]  = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [notifRes, countRes] = await Promise.all([
        growth.notifications.list(unreadOnly ? { unread_only: true } : undefined),
        growth.notifications.unreadCount(),
      ])
      setData(notifRes.data)
      const cd = countRes.data
      setUnreadCount(
        typeof cd?.unread_count === 'number' ? cd.unread_count :
        typeof cd?.count === 'number'        ? cd.count        : 0
      )
    } catch (err: any) {
      if (isCriticalError(err)) setError(err.response?.data?.message || 'Failed to load notifications')
      else setData([])
    } finally { setLoading(false) }
  }, [unreadOnly])

  useEffect(() => { fetchData() }, [fetchData])

  const handleMarkRead = async (id: string) => {
    setMarking(id)
    try {
      await growth.notifications.markRead(id)
      setToast({ message: 'Marked as read', type: 'success' })
      fetchData()
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || 'Failed', type: 'error' })
    } finally { setMarking(null) }
  }

  const handleDismiss = async (id: string) => {
    setDismissing(id)
    try {
      await growth.notifications.dismiss(id)
      setToast({ message: 'Dismissed', type: 'success' })
      fetchData()
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || 'Failed', type: 'error' })
    } finally { setDismissing(null) }
  }

  const handleMarkAllRead = async () => {
    setMarkingAll(true)
    try {
      await growth.notifications.markAllRead()
      setToast({ message: 'All marked as read', type: 'success' })
      fetchData()
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || 'Failed', type: 'error' })
    } finally { setMarkingAll(false) }
  }

  const items = normalise(data)

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-1 h-6 bg-emerald-400 rounded-full" />
            <h1 className="text-xl font-bold font-mono text-emerald-400 tracking-[0.2em]">
              NOTIFICATIONS
              {unreadCount > 0 && (
                <span className="ml-3 text-[11px] font-mono bg-emerald-400/20 text-emerald-400 border border-emerald-400/30 rounded px-2 py-0.5">{unreadCount} UNREAD</span>
              )}
            </h1>
          </div>
          <p className="text-gray-600 text-[11px] font-mono tracking-[0.2em] ml-4">GROWTH OS · SYSTEM ALERTS</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setUnreadOnly(v => !v)}
            className={`text-[10px] font-mono tracking-widest px-3 py-1.5 border rounded transition-colors ${
              unreadOnly
                ? 'border-emerald-400/40 text-emerald-400 bg-emerald-400/10'
                : 'border-[#00ff41]/15 text-gray-600 hover:text-gray-400'
            }`}
          >
            {unreadOnly ? 'SHOWING UNREAD' : 'SHOW UNREAD ONLY'}
          </button>
          <button
            onClick={handleMarkAllRead}
            disabled={markingAll || unreadCount === 0}
            className="text-[10px] font-mono tracking-widest px-4 py-1.5 border border-emerald-400/30 text-emerald-400/70 hover:bg-emerald-400/10 hover:text-emerald-400 rounded transition-colors disabled:opacity-40"
          >
            {markingAll ? 'MARKING...' : 'MARK ALL READ'}
          </button>
        </div>
      </div>

      {loading && <div className="flex justify-center py-24"><LoadingSpinner text="LOADING NOTIFICATIONS..." /></div>}
      {error && <ErrorMessage message={error} onRetry={fetchData} />}

      {!loading && !error && data && (
        items.length > 0 ? (
          <div className="space-y-2">
            {items.map((item: any) => {
              const isRead = !!item.is_read
              return (
                <div
                  key={item.id}
                  className={`flex items-start gap-4 p-4 border rounded transition-colors ${
                    isRead
                      ? 'border-[#00ff41]/8 bg-transparent opacity-50'
                      : 'border-emerald-400/20 bg-emerald-400/5'
                  }`}
                >
                  {/* Icon */}
                  <div className={`text-base mt-0.5 flex-shrink-0 ${isRead ? 'text-gray-700' : 'text-emerald-400/60'}`}>
                    {typeIcon(item.type)}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {item.type && (
                        <span className="text-[9px] font-mono tracking-widest text-emerald-400/50 border border-emerald-400/20 rounded px-1.5 py-0.5">
                          {String(item.type).toUpperCase()}
                        </span>
                      )}
                      {item.category && (
                        <span className="text-[9px] font-mono tracking-widest text-gray-600 border border-gray-700/30 rounded px-1.5 py-0.5">
                          {String(item.category).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className={`text-[11px] font-mono leading-relaxed ${isRead ? 'text-gray-600' : 'text-gray-300'}`}>
                      {String(item.message ?? '')}
                    </div>
                    <div className="text-[9px] font-mono text-gray-700 mt-1 tracking-widest">
                      {formatDate(item.created_at)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!isRead && (
                      <button
                        onClick={() => handleMarkRead(String(item.id))}
                        disabled={marking === String(item.id)}
                        className="text-[9px] font-mono tracking-widest px-2 py-1 border border-emerald-400/20 text-emerald-400/50 hover:text-emerald-400 hover:border-emerald-400/40 rounded transition-colors disabled:opacity-40"
                      >
                        {marking === String(item.id) ? '...' : 'READ'}
                      </button>
                    )}
                    <button
                      onClick={() => handleDismiss(String(item.id))}
                      disabled={dismissing === String(item.id)}
                      className="text-[9px] font-mono tracking-widest px-2 py-1 border border-red-500/20 text-red-500/40 hover:text-red-400 hover:border-red-500/40 rounded transition-colors disabled:opacity-40"
                    >
                      {dismissing === String(item.id) ? '...' : 'DISMISS'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <EmptyState icon="◎" title="No notifications" message={unreadOnly ? 'No unread notifications.' : 'No notifications yet.'} color="cyan" />
        )
      )}

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  )
}
