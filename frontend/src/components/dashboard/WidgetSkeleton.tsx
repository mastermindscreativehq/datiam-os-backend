type SkeletonType = 'list' | 'stats' | 'pipeline' | 'activity'

interface WidgetSkeletonProps {
  rows?: number
  type?: SkeletonType
}

export default function WidgetSkeleton({ rows = 4, type = 'list' }: WidgetSkeletonProps) {
  if (type === 'stats') {
    return (
      <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 animate-pulse">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className={`h-16 bg-white/[0.03] rounded ${i >= 6 ? 'sm:col-span-2' : ''}`} />
        ))}
      </div>
    )
  }

  if (type === 'pipeline') {
    return (
      <div className="p-4 space-y-2 animate-pulse">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-7 bg-white/[0.03] rounded flex-1" />
            <div className="h-7 w-14 bg-white/[0.03] rounded" />
          </div>
        ))}
      </div>
    )
  }

  if (type === 'activity') {
    return (
      <div className="divide-y divide-[#111] animate-pulse">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-5 py-3 flex items-center gap-4">
            <div className="w-2 h-2 rounded-full bg-white/10 flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 bg-white/[0.07] rounded w-4/5" />
              <div className="h-2 bg-white/[0.04] rounded w-2/5" />
            </div>
            <div className="h-2 w-10 bg-white/[0.04] rounded" />
          </div>
        ))}
      </div>
    )
  }

  // default: list
  return (
    <div className="divide-y divide-[#111] animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-5 py-3 flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-white/10 flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-white/[0.07] rounded w-3/4" />
            <div className="h-2 bg-white/[0.04] rounded w-1/2" />
          </div>
          <div className="h-2 w-12 bg-white/[0.04] rounded" />
        </div>
      ))}
    </div>
  )
}
