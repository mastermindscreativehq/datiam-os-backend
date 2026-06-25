import { useQuery } from '@tanstack/react-query'
import { meetings, releases } from '../../api/client'
import WidgetSkeleton from './WidgetSkeleton'

function fmtDate(d: string | null | undefined): string {
  if (!d) return ''
  try {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

function isUpcoming(d: string | null | undefined): boolean {
  if (!d) return false
  try {
    return new Date(d) > new Date()
  } catch {
    return false
  }
}

export default function UpcomingTasksWidget() {
  const meetingsQ = useQuery({
    queryKey: ['meetings', 'list'],
    queryFn: () => meetings.list().then(r => r.data?.data ?? r.data),
    staleTime: 60_000,
    retry: 2,
  })

  const releasesQ = useQuery({
    queryKey: ['releases', 'list'],
    queryFn: () => releases.list().then(r => r.data?.data ?? r.data),
    staleTime: 90_000,
    retry: 2,
  })

  const isPending = meetingsQ.isPending && releasesQ.isPending

  if (isPending) return <WidgetSkeleton rows={5} />

  const meetingList: any[] = Array.isArray(meetingsQ.data) ? meetingsQ.data : (meetingsQ.data?.meetings ?? [])
  const releaseList: any[] = Array.isArray(releasesQ.data) ? releasesQ.data : (releasesQ.data?.releases ?? [])

  type Task = { id: string; label: string; sub: string; date: string; type: 'meeting' | 'release'; color: string }

  const tasks: Task[] = [
    ...meetingList
      .filter((m: any) => isUpcoming(m.scheduled_at ?? m.meeting_date))
      .map((m: any): Task => ({
        id: `meeting-${m.id}`,
        label: m.title ?? m.subject ?? 'Meeting',
        sub: m.attendee_name ?? m.contact_name ?? 'Meeting',
        date: m.scheduled_at ?? m.meeting_date ?? '',
        type: 'meeting',
        color: 'text-[#00d4ff]',
      })),
    ...releaseList
      .filter((r: any) => isUpcoming(r.release_date) && r.status !== 'live')
      .map((r: any): Task => ({
        id: `release-${r.id}`,
        label: r.title ?? r.name ?? 'Release',
        sub: `Release · ${r.type ?? ''}`,
        date: r.release_date ?? '',
        type: 'release',
        color: 'text-purple-400',
      })),
  ]

  tasks.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  if (tasks.length === 0) {
    return (
      <div className="px-5 py-8 text-center">
        <div className="text-2xl text-yellow-400/10 mb-3">◷</div>
        <p className="text-[10px] font-mono text-gray-700 tracking-widest">NO UPCOMING TASKS</p>
        <p className="text-[10px] font-mono text-gray-800 mt-1 tracking-wider">Schedule a meeting or release to see it here</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-[#111]">
      {tasks.slice(0, 8).map(task => (
        <div key={task.id} className="px-5 py-3 flex items-center gap-3 hover:bg-white/[0.015] transition-colors">
          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${task.type === 'meeting' ? 'bg-[#00d4ff]' : 'bg-purple-400'}`} />
          <div className="flex-1 min-w-0">
            <div className={`text-[11px] font-mono truncate ${task.color}`}>{task.label}</div>
            <div className="text-[10px] font-mono text-gray-600 mt-0.5">{task.sub}</div>
          </div>
          <div className="text-[10px] font-mono text-gray-600 flex-shrink-0 whitespace-nowrap">
            {fmtDate(task.date)}
          </div>
        </div>
      ))}
    </div>
  )
}
