import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { missionControl } from '../../api/client'

interface SearchResult {
  type: string
  id: string
  title: string
  subtitle: string
  href: string
}

const TYPE_ICONS: Record<string, string> = {
  artist:   '⬟',
  release:  '◎',
  contract: '◇',
  campaign: '◉',
  sync:     '✦',
  payment:  '◆',
}

const TYPE_COLORS: Record<string, string> = {
  artist:   'text-[#00ff41]',
  release:  'text-[#00d4ff]',
  contract: 'text-orange-400',
  campaign: 'text-purple-400',
  sync:     'text-yellow-400',
  payment:  'text-fuchsia-400',
}

export default function GlobalSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setIsOpen(false); return }
    setIsLoading(true)
    try {
      const res = await missionControl.search(q)
      const data: SearchResult[] = res.data?.data?.results ?? []
      setResults(data)
      setIsOpen(data.length > 0)
    } catch {
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value
    setQuery(q)
    setSelectedIndex(-1)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(q), 250)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, results.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && selectedIndex >= 0) {
      const r = results[selectedIndex]
      if (r) { navigate(r.href); setIsOpen(false); setQuery('') }
    }
    if (e.key === 'Escape') { setIsOpen(false); inputRef.current?.blur() }
  }

  const handleResultClick = (r: SearchResult) => {
    navigate(r.href)
    setIsOpen(false)
    setQuery('')
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!(e.target as Element).closest('[data-search-container]')) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div data-search-container className="relative w-full max-w-2xl mx-auto">
      <div className={`relative flex items-center border rounded-lg transition-colors ${isOpen ? 'border-[#00ff41]/30 bg-[#00ff41]/3' : 'border-[#00ff41]/15 bg-[#0c0c0c]'} focus-within:border-[#00ff41]/40`}>
        <span className="pl-4 text-[#00ff41]/30 font-mono text-sm flex-shrink-0">⌕</span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && results.length > 0 && setIsOpen(true)}
          placeholder="Search artists, releases, contracts, campaigns, payments..."
          className="flex-1 bg-transparent px-3 py-3 text-[12px] font-mono text-white/80 placeholder:text-gray-700 outline-none tracking-wide"
        />
        {isLoading && (
          <span className="pr-4 text-[#00ff41]/30 font-mono text-[10px] animate-pulse">SEARCHING...</span>
        )}
        {!isLoading && query && (
          <button
            onClick={() => { setQuery(''); setResults([]); setIsOpen(false) }}
            className="pr-4 text-gray-600 hover:text-white font-mono text-sm transition-colors"
          >
            ×
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-[#0c0c0c] border border-[#00ff41]/15 rounded-lg overflow-hidden shadow-2xl">
          {results.map((r, i) => (
            <button
              key={`${r.type}-${r.id}`}
              onClick={() => handleResultClick(r)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${i === selectedIndex ? 'bg-[#00ff41]/5' : 'hover:bg-white/[0.02]'} border-b border-[#111] last:border-0`}
            >
              <span className={`text-sm flex-shrink-0 ${TYPE_COLORS[r.type] ?? 'text-gray-400'}`}>
                {TYPE_ICONS[r.type] ?? '◆'}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-mono text-white/80 truncate">{r.title}</div>
                {r.subtitle && (
                  <div className="text-[9px] font-mono text-gray-600 truncate">{r.subtitle}</div>
                )}
              </div>
              <span className={`text-[9px] font-mono ${TYPE_COLORS[r.type] ?? 'text-gray-500'} opacity-60 flex-shrink-0`}>
                {r.type.toUpperCase()}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
