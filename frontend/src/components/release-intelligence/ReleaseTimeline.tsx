interface TimelineEvent {
  date:   string
  event:  string
  status: 'completed' | 'in_progress' | 'planned' | 'failed'
  detail: string
}

const STATUS_DOT: Record<string, string> = {
  completed:   'bg-[#00ff41]',
  in_progress: 'bg-[#00d4ff] animate-pulse',
  planned:     'bg-[#333]',
  failed:      'bg-red-500',
}

interface Props { events: TimelineEvent[] }

export default function ReleaseTimeline({ events }: Props) {
  if (!events?.length) {
    return <div className="text-center text-gray-600 text-xs py-6">No timeline events yet</div>
  }

  return (
    <div className="relative">
      <div className="absolute left-3 top-3 bottom-3 w-px bg-[#222]" />
      {events.map((e, i) => (
        <div key={i} className="flex gap-4 pb-4">
          <div className="relative flex-shrink-0 w-7">
            <div className={`w-2 h-2 rounded-full mt-1.5 ml-2 relative z-10 ${STATUS_DOT[e.status] ?? 'bg-gray-700'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-sm">{e.event}</div>
            <div className="text-gray-600 text-xs mt-0.5">{e.detail}</div>
            <div className="text-[10px] text-gray-700 font-mono mt-0.5">
              {new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
