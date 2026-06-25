import { ReactNode } from 'react'
import { Link } from 'react-router-dom'

type Accent = 'green' | 'cyan' | 'purple' | 'orange' | 'fuchsia' | 'yellow'

interface WidgetCardProps {
  title: string
  accent?: Accent
  href?: string
  onRefresh?: () => void
  children: ReactNode
}

const ACCENTS: Record<Accent, { bar: string; title: string; action: string }> = {
  green:   { bar: 'bg-[#00ff41]',   title: 'text-[#00ff41]',   action: 'text-[#00ff41]/40 hover:text-[#00ff41]' },
  cyan:    { bar: 'bg-[#00d4ff]',   title: 'text-[#00d4ff]',   action: 'text-[#00d4ff]/40 hover:text-[#00d4ff]' },
  purple:  { bar: 'bg-purple-400',  title: 'text-purple-400',  action: 'text-purple-400/40 hover:text-purple-400' },
  orange:  { bar: 'bg-orange-400',  title: 'text-orange-400',  action: 'text-orange-400/40 hover:text-orange-400' },
  fuchsia: { bar: 'bg-fuchsia-400', title: 'text-fuchsia-400', action: 'text-fuchsia-400/40 hover:text-fuchsia-400' },
  yellow:  { bar: 'bg-yellow-400',  title: 'text-yellow-400',  action: 'text-yellow-400/40 hover:text-yellow-400' },
}

export default function WidgetCard({ title, accent = 'green', href, onRefresh, children }: WidgetCardProps) {
  const a = ACCENTS[accent]
  return (
    <div className="border border-[#00ff41]/10 rounded-lg bg-[#0a0a0a] overflow-hidden flex flex-col">
      <div className="px-5 py-3 border-b border-[#111] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className={`w-0.5 h-4 rounded-full ${a.bar}`} />
          <span className={`text-[10px] font-mono tracking-[0.22em] font-medium ${a.title}`}>{title}</span>
        </div>
        <div className="flex items-center gap-3">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className={`text-[10px] font-mono tracking-[0.15em] ${a.action} transition-colors`}
            >
              ↻
            </button>
          )}
          {href && (
            <Link to={href} className={`text-[10px] font-mono tracking-[0.15em] ${a.action} transition-colors`}>
              VIEW ALL →
            </Link>
          )}
        </div>
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  )
}
