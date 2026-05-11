import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

const NAV = [
  { to: '/dashboard',        label: 'OVERVIEW',      icon: '⬡' },
  { to: '/artists',          label: 'ARTIST',        icon: '⬟' },
  { to: '/fan-intelligence', label: 'FAN INTEL',     icon: '◈' },
  { to: '/catalog',          label: 'CATALOG',       icon: '◉' },
  { to: '/releases',         label: 'RELEASES',      icon: '◎' },
  { to: '/sync-pitches',     label: 'SYNC PITCHES',  icon: '◇' },
  { to: '/royalty-sources',  label: 'ROYALTIES',     icon: '◆' },
  { to: '/content-ideas',    label: 'CONTENT IDEAS', icon: '✦' },
  { to: '/automation-runs',  label: 'AUTOMATION',    icon: '⬢' },
  { to: '/activity',         label: 'ACTIVITY',      icon: '◈' },
]

export default function Sidebar() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-[#0c0c0c] border-r border-[#00ff41]/15 flex flex-col z-50">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-[#00ff41]/15">
        <div className="text-[#00ff41] font-mono text-lg font-bold tracking-[0.25em] text-glow-green">
          DATIAM OS
        </div>
        <div className="text-[#00d4ff]/40 text-[10px] font-mono mt-1 tracking-[0.2em]">
          MATRIX INTELLIGENCE v3.0
        </div>
        <div className="flex items-center gap-2 mt-3">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00ff41] animate-pulse" />
          <div className="text-[#00ff41]/40 text-[10px] font-mono tracking-widest">ONLINE</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
        {NAV.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded text-[11px] font-mono tracking-[0.15em] transition-all duration-150 ${
                isActive
                  ? 'bg-[#00ff41]/10 text-[#00ff41] border border-[#00ff41]/25 glow-green'
                  : 'text-gray-600 border border-transparent hover:text-[#00d4ff] hover:bg-[#00d4ff]/5 hover:border-[#00d4ff]/15'
              }`
            }
          >
            <span className="w-4 text-center">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-[#00ff41]/15 space-y-3">
        <div className="text-[10px] font-mono text-[#00ff41]/30 tracking-widest truncate px-1">
          ◎ {user?.email ?? 'OPERATOR'}
        </div>
        <button
          onClick={handleLogout}
          className="w-full py-2 text-[11px] font-mono tracking-widest text-red-500/70 border border-red-500/20 rounded hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/40 transition-all duration-200"
        >
          ⊗ DISCONNECT
        </button>
      </div>
    </aside>
  )
}
