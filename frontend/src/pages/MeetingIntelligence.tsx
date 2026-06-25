import { useState, useEffect } from 'react';
import { meetings } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';

interface Meeting {
  id: string;
  campaign_id: string;
  contact_id: string;
  meeting_title: string;
  meeting_type: 'discovery' | 'pitch' | 'licensing' | 'sync' | 'partnership' | 'followup';
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  scheduled_at: string;
  meeting_preparation_score: number | null;
  confidence_score: number | null;
  notes: string | null;
  created_at: string;
}

interface MeetingAnalytics {
  total: number;
  by_status: {
    scheduled: number;
    confirmed: number;
    completed: number;
    cancelled: number;
    no_show: number;
  };
  by_type: Record<string, number>;
  avg_outcome_score: number;
  conversion_rate: number;
  meetings_to_deal_rate: number;
}

const TYPE_STYLES: Record<string, { label: string; className: string }> = {
  discovery:   { label: 'DISCOVERY',   className: 'bg-purple-500/10 text-purple-400 border border-purple-500/25' },
  pitch:       { label: 'PITCH',       className: 'bg-[#00d4ff]/10 text-[#00d4ff] border border-[#00d4ff]/25' },
  licensing:   { label: 'LICENSING',   className: 'bg-[#00ff41]/10 text-[#00ff41] border border-[#00ff41]/25' },
  sync:        { label: 'SYNC',        className: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/25' },
  partnership: { label: 'PARTNERSHIP', className: 'bg-orange-500/10 text-orange-400 border border-orange-500/25' },
  followup:    { label: 'FOLLOW-UP',   className: 'bg-gray-500/10 text-gray-400 border border-gray-500/25' },
};

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  scheduled:  { label: 'SCHEDULED',  className: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/25' },
  confirmed:  { label: 'CONFIRMED',  className: 'bg-[#00d4ff]/10 text-[#00d4ff] border border-[#00d4ff]/25' },
  completed:  { label: 'COMPLETED',  className: 'bg-[#00ff41]/10 text-[#00ff41] border border-[#00ff41]/25' },
  cancelled:  { label: 'CANCELLED',  className: 'bg-red-500/10 text-red-400 border border-red-500/25' },
  no_show:    { label: 'NO SHOW',    className: 'bg-red-500/10 text-red-400 border border-red-500/25' },
};

export default function MeetingIntelligence() {
  const [meetingList, setMeetingList] = useState<Meeting[]>([]);
  const [analytics, setAnalytics] = useState<MeetingAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [listRes, analyticsRes] = await Promise.all([
          meetings.list(),
          meetings.analytics(),
        ]);
        const listData = listRes.data?.data ?? listRes.data;
        const analyticsData = analyticsRes.data?.data ?? analyticsRes.data;
        setMeetingList(listData?.meetings ?? []);
        setAnalytics(analyticsData);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to load meeting data';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c0c0c] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0c0c0c] p-8">
        <div className="border border-red-500/40 bg-red-500/10 rounded-lg p-4 text-red-400 font-mono text-sm">
          ERROR: {error}
        </div>
      </div>
    );
  }

  const cancelledNoShow = (analytics?.by_status?.cancelled ?? 0) + (analytics?.by_status?.no_show ?? 0);

  return (
    <div className="min-h-screen bg-[#0c0c0c] p-8 font-mono">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-[0.2em] text-[#00d4ff] uppercase">
          Meeting Intelligence
        </h1>
        <p className="text-gray-500 tracking-[0.15em] text-xs mt-1 uppercase">
          Meeting Analytics Engine
        </p>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          <div className="bg-[#111] border border-[#00d4ff]/10 rounded-lg p-4">
            <p className="text-gray-500 text-xs tracking-[0.15em] uppercase mb-1">Total</p>
            <p className="text-2xl font-bold text-[#00d4ff]">{analytics.total ?? 0}</p>
          </div>
          <div className="bg-[#111] border border-[#00ff41]/10 rounded-lg p-4">
            <p className="text-gray-500 text-xs tracking-[0.15em] uppercase mb-1">Completed</p>
            <p className="text-2xl font-bold text-[#00ff41]">{analytics.by_status?.completed ?? 0}</p>
          </div>
          <div className="bg-[#111] border border-yellow-500/10 rounded-lg p-4">
            <p className="text-gray-500 text-xs tracking-[0.15em] uppercase mb-1">Scheduled</p>
            <p className="text-2xl font-bold text-yellow-400">
              {(analytics.by_status?.scheduled ?? 0) + (analytics.by_status?.confirmed ?? 0)}
            </p>
          </div>
          <div className="bg-[#111] border border-red-500/10 rounded-lg p-4">
            <p className="text-gray-500 text-xs tracking-[0.15em] uppercase mb-1">Cancelled / No-show</p>
            <p className="text-2xl font-bold text-red-400">{cancelledNoShow}</p>
          </div>
          <div className="bg-[#111] border border-[#00d4ff]/10 rounded-lg p-4">
            <p className="text-gray-500 text-xs tracking-[0.15em] uppercase mb-1">Conversion Rate</p>
            <p className="text-2xl font-bold text-[#00d4ff]">
              {Math.round((analytics.conversion_rate ?? 0) * 100)}%
            </p>
          </div>
          <div className="bg-[#111] border border-[#00ff41]/10 rounded-lg p-4">
            <p className="text-gray-500 text-xs tracking-[0.15em] uppercase mb-1">Avg Outcome Score</p>
            <p className="text-2xl font-bold text-[#00ff41]">
              {Math.round(analytics.avg_outcome_score ?? 0)}
            </p>
          </div>
        </div>
      )}

      {/* Meetings Table */}
      <div className="bg-[#111] border border-[#00d4ff]/10 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-[#ffffff]/5">
          <h2 className="text-sm font-bold tracking-[0.15em] text-[#00d4ff] uppercase">
            Meetings
          </h2>
        </div>

        {meetingList.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm tracking-[0.1em]">
            NO MEETINGS FOUND
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#ffffff]/5">
                  <th className="text-left p-4 text-gray-500 tracking-[0.1em] uppercase font-normal">Title</th>
                  <th className="text-left p-4 text-gray-500 tracking-[0.1em] uppercase font-normal">Type</th>
                  <th className="text-left p-4 text-gray-500 tracking-[0.1em] uppercase font-normal">Status</th>
                  <th className="text-left p-4 text-gray-500 tracking-[0.1em] uppercase font-normal">Prep Score</th>
                  <th className="text-left p-4 text-gray-500 tracking-[0.1em] uppercase font-normal">Confidence</th>
                  <th className="text-left p-4 text-gray-500 tracking-[0.1em] uppercase font-normal">Notes</th>
                  <th className="text-left p-4 text-gray-500 tracking-[0.1em] uppercase font-normal">Date</th>
                </tr>
              </thead>
              <tbody>
                {meetingList.map((meeting) => {
                  const typeStyle = TYPE_STYLES[meeting.meeting_type] ?? { label: meeting.meeting_type.toUpperCase(), className: 'bg-gray-500/10 text-gray-400 border border-gray-500/25' };
                  const statusStyle = STATUS_STYLES[meeting.status] ?? { label: meeting.status.toUpperCase(), className: 'bg-gray-500/10 text-gray-400 border border-gray-500/25' };
                  const summary = meeting.notes
                    ? meeting.notes.length > 80
                      ? meeting.notes.slice(0, 80) + '...'
                      : meeting.notes
                    : '—';
                  return (
                    <tr
                      key={meeting.id}
                      className="bg-[#0c0c0c] border-b border-[#ffffff]/5 hover:bg-[#00d4ff]/5 transition-colors"
                    >
                      <td className="p-4 text-gray-300 font-medium max-w-[180px] truncate">
                        {meeting.meeting_title || '—'}
                      </td>
                      <td className="p-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] tracking-[0.1em] font-medium ${typeStyle.className}`}>
                          {typeStyle.label}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] tracking-[0.1em] font-medium ${statusStyle.className}`}>
                          {statusStyle.label}
                        </span>
                      </td>
                      <td className="p-4">
                        {meeting.meeting_preparation_score != null ? (
                          <span className="text-[#00ff41]">{Math.round(meeting.meeting_preparation_score * 100)}%</span>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>
                      <td className="p-4">
                        {meeting.confidence_score != null ? (
                          <span className="text-[#00d4ff]">{Math.round(meeting.confidence_score * 100)}%</span>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>
                      <td className="p-4 text-gray-400 max-w-[260px]">
                        {summary}
                      </td>
                      <td className="p-4 text-gray-500 whitespace-nowrap">
                        {meeting.scheduled_at
                          ? new Date(meeting.scheduled_at).toLocaleDateString()
                          : new Date(meeting.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
