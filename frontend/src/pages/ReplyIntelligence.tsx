import { useEffect, useState } from 'react'
import { replies } from '../api/client'
import LoadingSpinner from '../components/LoadingSpinner'

// Matches the DB replyStatusEnum exactly
type ReplyStatus =
  | 'positive'
  | 'interested'
  | 'meeting_requested'
  | 'needs_followup'
  | 'not_now'
  | 'rejected'
  | 'out_of_office'
  | 'unknown'

interface ReplyLog {
  id: string
  campaign_id: string
  contact_id: string | null
  subject: string
  body: string
  status: ReplyStatus
  confidence: string | number
  reasoning: string | null
  recommended_next_action: string | null
  created_at: string
}

type FilterStatus = 'all' | 'positive' | 'interested' | 'meeting_requested' | 'rejected' | 'unknown'

const STATUS_BADGE: Record<ReplyStatus, { label: string; className: string }> = {
  positive:          { label: 'POSITIVE',          className: 'bg-[#00ff41]/10 text-[#00ff41] border border-[#00ff41]/30' },
  interested:        { label: 'INTERESTED',         className: 'bg-[#00ff41]/10 text-[#00ff41] border border-[#00ff41]/30' },
  meeting_requested: { label: 'MEETING REQUESTED',  className: 'bg-[#00d4ff]/10 text-[#00d4ff] border border-[#00d4ff]/30' },
  needs_followup:    { label: 'NEEDS FOLLOW-UP',    className: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30' },
  not_now:           { label: 'NOT NOW',            className: 'bg-gray-500/10 text-gray-400 border border-gray-500/30' },
  rejected:          { label: 'NOT INTERESTED',     className: 'bg-red-500/10 text-red-400 border border-red-500/30' },
  out_of_office:     { label: 'OUT OF OFFICE',      className: 'bg-gray-500/10 text-gray-400 border border-gray-500/30' },
  unknown:           { label: 'UNCLASSIFIED',       className: 'bg-gray-500/10 text-gray-400 border border-gray-500/30' },
}

function parseConfidence(raw: string | number): number {
  const n = typeof raw === 'string' ? parseFloat(raw) : raw
  return isNaN(n) ? 0 : n
}

function confidenceClass(score: number): string {
  const pct = score <= 1 ? score * 100 : score
  if (pct > 80) return 'text-[#00ff41]'
  if (pct >= 50) return 'text-yellow-400'
  return 'text-red-400'
}

function confidenceBar(score: number): string {
  const pct = score <= 1 ? score * 100 : score
  if (pct > 80) return 'bg-[#00ff41]'
  if (pct >= 50) return 'bg-yellow-400'
  return 'bg-red-400'
}

function formatConfidence(score: number): string {
  const pct = score <= 1 ? Math.round(score * 100) : Math.round(score)
  return `${pct}%`
}

const FILTER_BUTTONS: { key: FilterStatus; label: string }[] = [
  { key: 'all',               label: 'ALL' },
  { key: 'positive',          label: 'POSITIVE' },
  { key: 'interested',        label: 'INTERESTED' },
  { key: 'meeting_requested', label: 'MEETING REQUESTED' },
  { key: 'rejected',          label: 'NOT INTERESTED' },
  { key: 'unknown',           label: 'UNCLASSIFIED' },
]

export default function ReplyIntelligence() {
  const [replyLogs, setReplyLogs] = useState<ReplyLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    replies
      .list()
      .then((res: unknown) => {
        const body = (res as { data?: { data?: { logs?: ReplyLog[] } } }).data
        const logs: ReplyLog[] = body?.data?.logs ?? []
        setReplyLogs(logs)
      })
      .catch((err: Error) => {
        setError(err?.message ?? 'Failed to load reply data.')
      })
      .finally(() => setLoading(false))
  }, [])

  const totalReplies   = replyLogs.length
  const positiveCount  = replyLogs.filter((r) => r.status === 'positive' || r.status === 'interested').length
  const meetingCount   = replyLogs.filter((r) => r.status === 'meeting_requested').length
  const rejectedCount  = replyLogs.filter((r) => r.status === 'rejected').length

  const filtered =
    filter === 'all' ? replyLogs : replyLogs.filter((r) => r.status === filter)

  return (
    <div className="min-h-screen bg-[#0c0c0c] font-mono text-white p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-[0.2em] text-[#00d4ff] mb-1">
          REPLY INTELLIGENCE
        </h1>
        <p className="text-xs tracking-[0.15em] text-gray-500">AI CLASSIFICATION ENGINE</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#111] border border-[#00d4ff]/10 rounded-lg p-4">
          <p className="text-xs text-gray-500 tracking-[0.15em] mb-1">TOTAL REPLIES</p>
          <p className="text-2xl font-bold text-white">{totalReplies}</p>
        </div>
        <div className="bg-[#111] border border-[#00ff41]/10 rounded-lg p-4">
          <p className="text-xs text-gray-500 tracking-[0.15em] mb-1">POSITIVE / INTERESTED</p>
          <p className="text-2xl font-bold text-[#00ff41]">{positiveCount}</p>
        </div>
        <div className="bg-[#111] border border-[#00d4ff]/10 rounded-lg p-4">
          <p className="text-xs text-gray-500 tracking-[0.15em] mb-1">MEETING REQUESTED</p>
          <p className="text-2xl font-bold text-[#00d4ff]">{meetingCount}</p>
        </div>
        <div className="bg-[#111] border border-red-500/10 rounded-lg p-4">
          <p className="text-xs text-gray-500 tracking-[0.15em] mb-1">NOT INTERESTED</p>
          <p className="text-2xl font-bold text-red-400">{rejectedCount}</p>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        {FILTER_BUTTONS.map((btn) => (
          <button
            key={btn.key}
            onClick={() => setFilter(btn.key)}
            className={`px-3 py-1.5 text-xs tracking-[0.1em] rounded border transition-colors ${
              filter === btn.key
                ? 'bg-[#00d4ff]/10 text-[#00d4ff] border-[#00d4ff]/40'
                : 'bg-transparent text-gray-500 border-gray-700 hover:border-gray-500 hover:text-gray-300'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <div className="border border-red-500/40 bg-red-500/5 rounded-lg p-4 text-red-400 text-sm">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 text-gray-500 text-sm tracking-[0.1em]">
          NO REPLIES FOUND
        </div>
      ) : (
        <div className="bg-[#111] border border-[#00d4ff]/10 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#ffffff]/10">
                <th className="text-left text-xs text-gray-500 tracking-[0.15em] px-4 py-3 font-normal">SUBJECT</th>
                <th className="text-left text-xs text-gray-500 tracking-[0.15em] px-4 py-3 font-normal">STATUS</th>
                <th className="text-left text-xs text-gray-500 tracking-[0.15em] px-4 py-3 font-normal">REASONING</th>
                <th className="text-left text-xs text-gray-500 tracking-[0.15em] px-4 py-3 font-normal">CONFIDENCE</th>
                <th className="text-left text-xs text-gray-500 tracking-[0.15em] px-4 py-3 font-normal">RECOMMENDED ACTION</th>
                <th className="text-left text-xs text-gray-500 tracking-[0.15em] px-4 py-3 font-normal">DATE</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((reply) => {
                const badge = STATUS_BADGE[reply.status] ?? STATUS_BADGE.unknown
                const isSelected = selectedId === reply.id
                const conf = parseConfidence(reply.confidence)
                const confPct = conf <= 1 ? Math.round(conf * 100) : Math.round(conf)

                return (
                  <tr
                    key={reply.id}
                    onClick={() => setSelectedId(isSelected ? null : reply.id)}
                    className={`bg-[#0c0c0c] border-b border-[#ffffff]/5 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#00d4ff]/5 border-l-2 border-l-[#00d4ff]'
                        : 'hover:bg-[#00ff41]/5'
                    }`}
                  >
                    <td className="px-4 py-3 text-gray-300 max-w-[200px]">
                      <span title={reply.subject}>
                        {reply.subject?.length > 50
                          ? reply.subject.slice(0, 50) + '…'
                          : reply.subject || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${badge.className}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs max-w-[200px]">
                      <span title={reply.reasoning ?? undefined}>
                        {reply.reasoning && reply.reasoning.length > 50
                          ? reply.reasoning.slice(0, 50) + '…'
                          : reply.reasoning || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${confidenceBar(conf)}`}
                            style={{ width: `${confPct}%` }}
                          />
                        </div>
                        <span className={`text-xs ${confidenceClass(conf)}`}>
                          {formatConfidence(conf)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs max-w-[200px]">
                      <span title={reply.recommended_next_action ?? undefined}>
                        {reply.recommended_next_action && reply.recommended_next_action.length > 50
                          ? reply.recommended_next_action.slice(0, 50) + '…'
                          : reply.recommended_next_action || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {reply.created_at ? new Date(reply.created_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
