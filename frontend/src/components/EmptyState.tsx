type Color = 'green' | 'cyan' | 'purple' | 'yellow' | 'orange' | 'fuchsia'

interface EmptyStateProps {
  icon: string
  title: string
  message: string
  hint?: string
  color?: Color
}

const PALETTE: Record<Color, { border: string; icon: string; title: string; message: string; hint: string }> = {
  green:   { border: 'border-[#00ff41]/15',   icon: 'text-[#00ff41]/15',   title: 'text-[#00ff41]/50',   message: 'text-gray-600', hint: 'text-gray-700' },
  cyan:    { border: 'border-[#00d4ff]/15',   icon: 'text-[#00d4ff]/15',   title: 'text-[#00d4ff]/50',   message: 'text-gray-600', hint: 'text-gray-700' },
  purple:  { border: 'border-purple-400/15',  icon: 'text-purple-400/15',  title: 'text-purple-400/50',  message: 'text-gray-600', hint: 'text-gray-700' },
  yellow:  { border: 'border-yellow-400/15',  icon: 'text-yellow-400/15',  title: 'text-yellow-400/50',  message: 'text-gray-600', hint: 'text-gray-700' },
  orange:  { border: 'border-orange-400/15',  icon: 'text-orange-400/15',  title: 'text-orange-400/50',  message: 'text-gray-600', hint: 'text-gray-700' },
  fuchsia: { border: 'border-fuchsia-400/15', icon: 'text-fuchsia-400/15', title: 'text-fuchsia-400/50', message: 'text-gray-600', hint: 'text-gray-700' },
}

export default function EmptyState({ icon, title, message, hint, color = 'cyan' }: EmptyStateProps) {
  const p = PALETTE[color]
  return (
    <div className={`border ${p.border} rounded-lg bg-[#0d0d0d] py-20 px-8 flex flex-col items-center text-center gap-5`}>
      <div className={`text-5xl ${p.icon} select-none`}>{icon}</div>
      <div className="space-y-2 max-w-sm">
        <p className={`text-[12px] font-mono tracking-[0.25em] uppercase ${p.title}`}>{title}</p>
        <p className={`text-[11px] font-mono tracking-[0.1em] leading-relaxed ${p.message}`}>{message}</p>
        {hint && (
          <p className={`text-[10px] font-mono tracking-[0.1em] leading-relaxed pt-2 ${p.hint}`}>{hint}</p>
        )}
      </div>
    </div>
  )
}
