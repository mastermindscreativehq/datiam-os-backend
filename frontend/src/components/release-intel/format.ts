export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatScore(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  const n = typeof value === 'string' ? parseFloat(value) : value
  if (Number.isNaN(n)) return '—'
  return Math.round(n).toString()
}

export function scoreColor(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return 'text-gray-600'
  const n = typeof value === 'string' ? parseFloat(value) : value
  if (Number.isNaN(n)) return 'text-gray-600'
  if (n >= 70) return 'text-[#00ff41]'
  if (n >= 45) return 'text-[#00d4ff]'
  return 'text-yellow-400'
}

export const MISSION_TYPE_LABELS: Record<string, string> = {
  playlist: 'PLAYLIST',
  sync: 'SYNC',
  fan_growth: 'FAN GROWTH',
  content: 'CONTENT',
  outreach: 'OUTREACH',
  analytics: 'ANALYTICS',
}

export const MISSION_STATUS_COLORS: Record<string, string> = {
  pending: 'text-gray-500 border-gray-500/25',
  active: 'text-[#00d4ff] border-[#00d4ff]/25',
  blocked: 'text-orange-400 border-orange-400/25',
  completed: 'text-[#00ff41] border-[#00ff41]/25',
  cancelled: 'text-red-400/70 border-red-400/25',
}

export const ANALYSIS_STATUS_COLORS: Record<string, string> = {
  pending: 'text-gray-500',
  analyzing: 'text-[#00d4ff] animate-pulse',
  complete: 'text-[#00ff41]',
  failed: 'text-red-400',
}
