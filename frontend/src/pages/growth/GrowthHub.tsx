import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import LoadingSpinner from '../../components/LoadingSpinner'
import ErrorMessage from '../../components/ErrorMessage'
import { growth, isCriticalError } from '../../api/client'

interface StatCard {
  label: string
  value: number | string
  to: string
  icon: string
  sub?: string
}

export default function GrowthHub() {
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [stats, setStats]       = useState<Record<string, number>>({})

  const fetchStats = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [campaigns, social, trends, notifs] = await Promise.allSettled([
        growth.campaigns.list({ limit: 1 }),
        growth.social.list({ limit: 1 }),
        growth.trends.list({ limit: 1 }),
        growth.notifications.unreadCount(),
      ])

      const get = (r: PromiseSettledResult<any>, key: string, fallback = 0) => {
        if (r.status === 'fulfilled') {
          const d = r.value?.data
          if (typeof d?.total === 'number') return d.total
          if (typeof d?.count === 'number') return d.count
          if (typeof d?.[key] === 'number') return d[key]
          if (Array.isArray(d)) return d.length
        }
        return fallback
      }

      setStats({
        campaigns:     get(campaigns, 'total'),
        social:        get(social, 'total'),
        trends:        get(trends, 'total'),
        unread:        get(notifs, 'unread_count'),
      })
    } catch (err: any) {
      if (isCriticalError(err)) setError('Failed to load Growth OS overview')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchStats() }, [fetchStats])

  const cards: StatCard[] = [
    { label: 'CAMPAIGNS',      value: stats.campaigns ?? 0, to: '/growth/campaigns',    icon: '◉', sub: 'ACTIVE CAMPAIGNS' },
    { label: 'SOCIAL ACCTS',   value: stats.social    ?? 0, to: '/growth/social',       icon: '◎', sub: 'CONNECTED ACCOUNTS' },
    { label: 'ACTIVE TRENDS',  value: stats.trends    ?? 0, to: '/growth/trends',       icon: '✦', sub: 'TRACKED TRENDS' },
    { label: 'UNREAD NOTIFS',  value: stats.unread    ?? 0, to: '/growth/notifications',icon: '◈', sub: 'NOTIFICATIONS' },
  ]

  const modules = [
    { to: '/growth/content',       label: 'CONTENT VAULT',      icon: '◈', desc: 'Manage content ideas, scripts, and media assets' },
    { to: '/growth/campaigns',     label: 'CAMPAIGN MANAGER',   icon: '◉', desc: 'Plan and track marketing campaigns end-to-end' },
    { to: '/growth/social',        label: 'SOCIAL ACCOUNTS',    icon: '◎', desc: 'Connect and manage social media profiles' },
    { to: '/growth/publishing',    label: 'PUBLISHING ENGINE',  icon: '◆', desc: 'Schedule and publish content across platforms' },
    { to: '/growth/analytics',     label: 'ANALYTICS HUB',      icon: '◇', desc: 'Track performance metrics and audience growth' },
    { to: '/growth/trends',        label: 'TREND INTELLIGENCE', icon: '✦', desc: 'Monitor emerging trends and opportunities' },
    { to: '/growth/crm',           label: 'GROWTH CRM',         icon: '◈', desc: 'Manage fan groups and audience segments' },
    { to: '/growth/ai',            label: 'AI STUDIO',          icon: '⬟', desc: 'Generate captions, hashtags, and growth reports' },
    { to: '/growth/notifications', label: 'NOTIFICATIONS',      icon: '◎', desc: 'Stay updated with alerts and system events' },
  ]

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-1 h-6 bg-emerald-400 rounded-full" />
            <h1 className="text-xl font-bold font-mono text-emerald-400 tracking-[0.2em]">GROWTH OS</h1>
          </div>
          <p className="text-gray-600 text-[11px] font-mono tracking-[0.2em] ml-4">ARTIST GROWTH INTELLIGENCE PLATFORM</p>
        </div>
      </div>

      {loading && <div className="flex justify-center py-24"><LoadingSpinner text="LOADING GROWTH OS..." /></div>}
      {error && <ErrorMessage message={error} onRetry={fetchStats} />}

      {!loading && !error && (
        <div className="space-y-8">
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {cards.map((c) => (
              <Link key={c.to} to={c.to} className="block border border-emerald-400/20 bg-emerald-400/5 rounded p-5 hover:border-emerald-400/40 hover:bg-emerald-400/10 transition-all duration-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-emerald-400/50 text-lg">{c.icon}</span>
                  <span className="text-[10px] font-mono text-emerald-400/40 tracking-widest border border-emerald-400/20 rounded px-2 py-0.5">{c.sub}</span>
                </div>
                <div className="text-3xl font-bold font-mono text-emerald-400 mb-1">{c.value}</div>
                <div className="text-[10px] font-mono text-gray-500 tracking-[0.15em]">{c.label}</div>
              </Link>
            ))}
          </div>

          {/* Module grid */}
          <div>
            <div className="text-[10px] font-mono text-gray-600 tracking-[0.2em] mb-4">MODULES</div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {modules.map((m) => (
                <Link key={m.to} to={m.to} className="flex items-start gap-3 p-4 border border-[#00ff41]/10 rounded hover:border-emerald-400/30 hover:bg-emerald-400/5 transition-all duration-200 group">
                  <span className="text-emerald-400/60 text-base mt-0.5 group-hover:text-emerald-400 transition-colors">{m.icon}</span>
                  <div>
                    <div className="text-[11px] font-mono text-emerald-400 tracking-[0.15em] mb-1">{m.label}</div>
                    <div className="text-[10px] font-mono text-gray-600 leading-relaxed">{m.desc}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
