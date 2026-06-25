import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useReleaseCalendar } from '../../hooks/useReleaseIntelligence'
import LoadingSpinner from '../LoadingSpinner'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

interface Props { artistId?: string }

export default function ReleaseCalendar({ artistId }: Props) {
  const now = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const { data, isLoading } = useReleaseCalendar(artistId, year, month)

  const prev = () => { if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const next = () => { if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1) }

  const releasesByDay: Record<number, any[]> = {}
  for (const r of data?.releases ?? []) {
    const day = new Date(r.release_date + 'T00:00:00').getDate()
    if (!releasesByDay[day]) releasesByDay[day] = []
    releasesByDay[day].push(r)
  }

  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDay    = new Date(year, month - 1, 1).getDay()

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={prev} className="text-gray-400 hover:text-white px-3 py-1 text-sm">←</button>
        <span className="text-white font-mono text-sm">{MONTHS[month - 1]} {year}</span>
        <button onClick={next} className="text-gray-400 hover:text-white px-3 py-1 text-sm">→</button>
      </div>

      {isLoading ? <LoadingSpinner /> : (
        <>
          <div className="grid grid-cols-7 gap-1">
            {DAYS.map(d => (
              <div key={d} className="text-center text-[10px] font-mono text-gray-600 py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              const dayReleases = day ? (releasesByDay[day] ?? []) : []
              const isToday = day === now.getDate() && month === now.getMonth() + 1 && year === now.getFullYear()
              return (
                <div
                  key={i}
                  className={`min-h-[70px] rounded border p-1 ${
                    day ? 'bg-[#111] border-[#222]' : 'bg-transparent border-transparent'
                  } ${isToday ? 'border-[#00d4ff]/40' : ''}`}
                >
                  {day && (
                    <>
                      <div className={`text-[10px] font-mono mb-1 ${isToday ? 'text-[#00d4ff]' : 'text-gray-500'}`}>{day}</div>
                      {dayReleases.slice(0, 2).map((r: any) => (
                        <Link key={r.id} to={`/release-intelligence/${r.id}`}>
                          <div className="text-[8px] text-[#00d4ff] truncate bg-[#00d4ff]/10 rounded px-1 py-0.5 mb-0.5 hover:bg-[#00d4ff]/20">
                            {r.release_title}
                          </div>
                        </Link>
                      ))}
                      {dayReleases.length > 2 && (
                        <div className="text-[8px] text-gray-600">+{dayReleases.length - 2} more</div>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>

          {(data?.total ?? 0) > 0 && (
            <div className="text-[10px] text-gray-500 font-mono text-center">
              {data?.total} release{data?.total !== 1 ? 's' : ''} in {MONTHS[month - 1]} {year}
            </div>
          )}
        </>
      )}
    </div>
  )
}
