interface Props {
  label: string
  value: string | number
  sub?: string
  color?: 'green' | 'cyan' | 'purple' | 'orange'
  icon?: string
}

const themes = {
  green:  { text: 'text-[#00ff41]', border: 'border-[#00ff41]/25', bg: 'bg-[#00ff41]/5',  glow: 'hover:glow-green' },
  cyan:   { text: 'text-[#00d4ff]', border: 'border-[#00d4ff]/25', bg: 'bg-[#00d4ff]/5',  glow: 'hover:glow-cyan' },
  purple: { text: 'text-purple-400', border: 'border-purple-500/25', bg: 'bg-purple-500/5', glow: '' },
  orange: { text: 'text-orange-400', border: 'border-orange-500/25', bg: 'bg-orange-500/5', glow: '' },
}

export default function StatCard({ label, value, sub, color = 'green', icon }: Props) {
  const t = themes[color]
  return (
    <div
      className={`p-5 rounded-lg border ${t.border} ${t.bg} ${t.glow} transition-all duration-300 hover:scale-[1.02] cursor-default`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="text-[10px] font-mono tracking-[0.2em] text-gray-500 uppercase">{label}</div>
        {icon && <span className={`text-lg ${t.text} opacity-60`}>{icon}</span>}
      </div>
      <div className={`text-3xl font-bold font-mono ${t.text} leading-none`}>{value}</div>
      {sub && <div className="text-[10px] text-gray-600 mt-2 font-mono tracking-wider">{sub}</div>}
    </div>
  )
}
