import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { releases as releasesApi, artists as artistsApi, activity as activityApi, automation as automationApi, releaseIntel as releaseIntelApi, monitoring as monitoringApi } from '../api/client'
import { useAuthStore } from '../store/authStore'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import EmptyState from '../components/EmptyState'
import Toast from '../components/Toast'
import ReleaseSelectorBar from '../components/release-intel/ReleaseSelectorBar'
import TabBar from '../components/release-intel/TabBar'
import ReleaseSummary from '../components/release-intel/ReleaseSummary'
import ExecutiveBriefCard from '../components/release-intel/ExecutiveBriefCard'
import ScoreBoard from '../components/release-intel/ScoreBoard'
import MissionBoard from '../components/release-intel/MissionBoard'
import MissionTimeline from '../components/release-intel/MissionTimeline'
import ActionCenter from '../components/release-intel/ActionCenter'
import AnalysisDetails from '../components/release-intel/AnalysisDetails'
import DiagnosticsPanel from '../components/release-intel/DiagnosticsPanel'
import AutomationStatusPanel from '../components/release-intel/AutomationStatusPanel'
import FutureIntegrations from '../components/release-intel/FutureIntegrations'
import PlaylistPitchTab from '../components/release-intel/PlaylistPitchTab'
import SyncPitchTab from '../components/release-intel/SyncPitchTab'
import PressOutreachTab from '../components/release-intel/PressOutreachTab'
import FanGrowthTab from '../components/release-intel/FanGrowthTab'
import ContentCalendarTab from '../components/release-intel/ContentCalendarTab'
import AnalyticsTab from '../components/release-intel/AnalyticsTab'
import type {
  ReleaseRecord, ReleaseIntelSnapshot, ActivityEvent, DiagnosticsState, AutomationRun, MissionExecution,
} from '../components/release-intel/types'
import { ACTIVE_MISSION_STATUSES, RELEASE_INTEL_TABS } from '../components/release-intel/types'
import type { ReleaseIntelTabKey } from '../components/release-intel/types'

interface ArtistOption { id: string; stage_name: string }

function normaliseList(raw: any, key?: string): any[] {
  if (Array.isArray(raw)) return raw
  if (key && Array.isArray(raw?.[key])) return raw[key]
  if (Array.isArray(raw?.data)) return raw.data
  return []
}

export default function ReleaseIntel() {
  const { user } = useAuthStore()
  const canWrite = ['owner', 'admin', 'editor', 'team'].includes(user?.role ?? '')
  const navigate = useNavigate()
  const { id: routeId } = useParams<{ id?: string }>()

  const [releasesList, setReleasesList] = useState<ReleaseRecord[]>([])
  const [artistsList, setArtistsList] = useState<ArtistOption[]>([])
  const [releasesLoading, setReleasesLoading] = useState(true)
  const [releasesError, setReleasesError] = useState('')

  const [selectedId, setSelectedId] = useState(routeId ?? '')
  const [snapshot, setSnapshot] = useState<ReleaseIntelSnapshot | null>(null)
  const [snapshotLoading, setSnapshotLoading] = useState(false)
  const [snapshotError, setSnapshotError] = useState('')

  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [releaseRuns, setReleaseRuns] = useState<AutomationRun[]>([])
  const [automationOverview, setAutomationOverview] = useState<any>(null)
  const [n8nHealth, setN8nHealth] = useState<any>(null)
  const [registryEntry, setRegistryEntry] = useState<any>(null)
  const [missionsHealth, setMissionsHealth] = useState<any>(null)

  const [analyzing, setAnalyzing] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [updatingMissionId, setUpdatingMissionId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const [activeTab, setActiveTab] = useState<ReleaseIntelTabKey>('overview')
  const [executions, setExecutions] = useState<Record<string, MissionExecution | null>>({})
  const [executionLoading, setExecutionLoading] = useState<Record<string, boolean>>({})

  const [diagnostics, setDiagnostics] = useState<DiagnosticsState>({
    calls: [], lastAnalysisDurationMs: null, errors: [], warnings: [],
  })

  const record = useCallback((label: string, method: string, url: string, status: number | 'error', latencyMs: number, error?: string) => {
    setDiagnostics(d => ({
      ...d,
      calls: [...d.calls.slice(-19), { label, method, url, status, latencyMs, at: new Date().toISOString() }],
      errors: error ? [...d.errors.slice(-9), error] : d.errors,
    }))
  }, [])

  const timed = useCallback(async <T,>(label: string, method: string, url: string, fn: () => Promise<T>): Promise<T> => {
    const start = performance.now()
    try {
      const result = await fn()
      record(label, method, url, (result as any)?.status ?? 200, Math.round(performance.now() - start))
      return result
    } catch (err: any) {
      const status = err?.response?.status ?? 'error'
      const message = err?.response?.data?.message ?? err?.message ?? String(err)
      record(label, method, url, status, Math.round(performance.now() - start), `${label}: ${message}`)
      throw err
    }
  }, [record])

  // Load releases + artists once
  useEffect(() => {
    setReleasesLoading(true)
    Promise.all([
      timed('list releases', 'GET', '/releases', () => releasesApi.list()),
      timed('list artists', 'GET', '/artists', () => artistsApi.list()).catch(() => null),
    ])
      .then(([releasesRes, artistsRes]) => {
        const list = normaliseList(releasesRes.data, 'releases') as ReleaseRecord[]
        setReleasesList(list)
        if (artistsRes) setArtistsList(normaliseList(artistsRes.data, 'artists') as ArtistOption[])
        if (!routeId && list.length > 0) setSelectedId(list[0].id)
      })
      .catch((err: any) => setReleasesError(err.response?.data?.message ?? 'Failed to load releases'))
      .finally(() => setReleasesLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadSnapshot = useCallback(async (releaseId: string) => {
    if (!releaseId) return
    setSnapshotLoading(true)
    setSnapshotError('')
    try {
      const res = await timed('release intel snapshot', 'GET', `/release-intel/${releaseId}`, () => releaseIntelApi.getSnapshot(releaseId))
      setSnapshot(res.data?.data ?? null)
    } catch (err: any) {
      setSnapshotError(err.response?.data?.message ?? 'Failed to load Release Intel snapshot')
      setSnapshot(null)
    } finally {
      setSnapshotLoading(false)
    }
  }, [timed])

  const loadTimeline = useCallback(async (releaseId: string) => {
    try {
      const res = await timed('activity timeline', 'GET', '/activity/recent', () =>
        activityApi.recent({ entityType: 'release', entityId: releaseId, limit: 50 }))
      setEvents((res.data?.data ?? []) as ActivityEvent[])
    } catch {
      setEvents([])
    }
  }, [timed])

  const loadAutomation = useCallback(async (releaseId: string) => {
    try {
      const [statsRes, healthRes, registryRes, historyRes, missionsHealthRes] = await Promise.all([
        timed('automation stats', 'GET', '/automation/stats', () => automationApi.stats()).catch(() => null),
        timed('automation health', 'GET', '/automation/health', () => automationApi.health()).catch(() => null),
        timed('automation registry', 'GET', '/automation/registry', () => automationApi.registry.list()).catch(() => null),
        timed('automation history', 'GET', '/automation/history', () => automationApi.history({ release_id: releaseId, limit: 50 })).catch(() => null),
        timed('mission workflow health', 'GET', '/monitoring/missions', () => monitoringApi.missions()).catch(() => null),
      ])
      setAutomationOverview(statsRes?.data?.data?.overview ?? null)
      setN8nHealth(healthRes?.data?.data ?? null)
      const registry = normaliseList(registryRes?.data?.data)
      setRegistryEntry(registry.find((w: any) => w.name === 'release-intelligence') ?? null)
      const runs = normaliseList(historyRes?.data?.data, 'runs') as AutomationRun[]
      setReleaseRuns(runs)
      setMissionsHealth(missionsHealthRes?.data ?? null)
    } catch {
      setAutomationOverview(null)
    }
  }, [timed])

  useEffect(() => {
    if (!selectedId) return
    loadSnapshot(selectedId)
    loadTimeline(selectedId)
    loadAutomation(selectedId)
    navigate(`/release-intel/${selectedId}`, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  const handleRefresh = useCallback(async () => {
    if (!selectedId) return
    setRefreshing(true)
    await Promise.all([loadSnapshot(selectedId), loadTimeline(selectedId), loadAutomation(selectedId)])
    setRefreshing(false)
  }, [selectedId, loadSnapshot, loadTimeline, loadAutomation])

  const handleAnalyze = useCallback(async (force: boolean) => {
    if (!selectedId) return
    setAnalyzing(true)
    const start = performance.now()
    try {
      await timed('run analysis', 'POST', `/release-intel/${selectedId}/analyze`, () => releaseIntelApi.analyze(selectedId, force))
      setDiagnostics(d => ({ ...d, lastAnalysisDurationMs: Math.round(performance.now() - start) }))
      setToast({ message: 'Analysis complete', type: 'success' })
      await Promise.all([loadSnapshot(selectedId), loadTimeline(selectedId), loadAutomation(selectedId)])
    } catch (err: any) {
      setDiagnostics(d => ({ ...d, lastAnalysisDurationMs: Math.round(performance.now() - start) }))
      setToast({ message: err.response?.data?.message ?? 'Analysis failed', type: 'error' })
    } finally {
      setAnalyzing(false)
    }
  }, [selectedId, timed, loadSnapshot, loadTimeline, loadAutomation])

  const handleUpdateMission = useCallback(async (missionId: string, patch: Record<string, unknown>) => {
    setUpdatingMissionId(missionId)
    try {
      await timed('update mission', 'PATCH', `/release-intel/missions/${missionId}`, () => releaseIntelApi.updateMission(missionId, patch))
      setToast({ message: 'Mission updated', type: 'success' })
      if (selectedId) await loadSnapshot(selectedId)
    } catch (err: any) {
      setToast({ message: err.response?.data?.message ?? 'Failed to update mission', type: 'error' })
    } finally {
      setUpdatingMissionId(null)
    }
  }, [timed, selectedId, loadSnapshot])

  const loadExecution = useCallback(async (missionId: string) => {
    setExecutionLoading(s => ({ ...s, [missionId]: true }))
    try {
      const res = await timed('mission execution', 'GET', `/release-intel/missions/${missionId}/execution`, () => releaseIntelApi.getMissionExecution(missionId))
      setExecutions(s => ({ ...s, [missionId]: res.data?.data ?? null }))
    } catch {
      setExecutions(s => ({ ...s, [missionId]: null }))
    } finally {
      setExecutionLoading(s => ({ ...s, [missionId]: false }))
    }
  }, [timed])

  const runMissionAction = useCallback(async (
    label: string, missionId: string, successMessage: string,
    call: () => Promise<unknown>,
  ) => {
    setUpdatingMissionId(missionId)
    try {
      await timed(label, 'POST', `/release-intel/missions/${missionId}`, call)
      setToast({ message: successMessage, type: 'success' })
      if (selectedId) await Promise.all([loadSnapshot(selectedId), loadTimeline(selectedId)])
      // Only refresh execution history if this mission's tab has already loaded it once.
      if (executions[missionId] !== undefined) await loadExecution(missionId)
    } catch (err: any) {
      setToast({ message: err.response?.data?.message ?? `Failed to ${label}`, type: 'error' })
    } finally {
      setUpdatingMissionId(null)
    }
  }, [timed, selectedId, loadSnapshot, loadTimeline, executions, loadExecution])

  const handleDispatchMission = useCallback((missionId: string) =>
    runMissionAction('dispatch mission', missionId, 'Mission dispatched', () => releaseIntelApi.dispatchMission(missionId)),
  [runMissionAction])

  const handleRetryMission = useCallback((missionId: string) =>
    runMissionAction('retry mission', missionId, 'Mission re-dispatched', () => releaseIntelApi.retryMission(missionId)),
  [runMissionAction])

  const handleCancelMission = useCallback((missionId: string) =>
    runMissionAction('cancel mission', missionId, 'Mission cancelled', () => releaseIntelApi.cancelMission(missionId)),
  [runMissionAction])

  // Live mission progress: poll only while at least one mission is actually
  // in-flight (queued/running/waiting/retrying) — no polling otherwise, since
  // this page is plain-REST-on-demand everywhere else.
  const hasActiveMissions = (snapshot?.missions ?? []).some(m => ACTIVE_MISSION_STATUSES.includes(m.status))
  useEffect(() => {
    if (!hasActiveMissions || !selectedId) return
    const interval = setInterval(() => { loadSnapshot(selectedId) }, 5000)
    return () => clearInterval(interval)
  }, [hasActiveMissions, selectedId, loadSnapshot])

  const artistName = useMemo(() => {
    if (!snapshot?.release.artist_id) return null
    return artistsList.find(a => a.id === snapshot.release.artist_id)?.stage_name ?? null
  }, [snapshot, artistsList])

  const missionTabProps = useMemo(() => ({
    onUpdateMission: handleUpdateMission,
    onDispatchMission: handleDispatchMission,
    onRetryMission: handleRetryMission,
    onCancelMission: handleCancelMission,
    updatingId: updatingMissionId,
    canWrite,
    onLoadExecution: loadExecution,
  }), [handleUpdateMission, handleDispatchMission, handleRetryMission, handleCancelMission, updatingMissionId, canWrite, loadExecution])

  if (releasesLoading) {
    return <div className="flex justify-center py-24"><LoadingSpinner text="LOADING RELEASES..." /></div>
  }

  if (releasesError) {
    return <ErrorMessage message={releasesError} onRetry={() => window.location.reload()} />
  }

  if (releasesList.length === 0) {
    return (
      <div className="space-y-5">
        <ReleaseSelectorBar
          releases={[]} selectedId="" onSelect={() => {}} analysis={null}
          onRefresh={() => {}} refreshing={false} onAnalyze={() => {}} analyzing={false} canWrite={canWrite}
        />
        <EmptyState
          icon="◎"
          title="No releases have been analyzed yet"
          message="Create a release to start generating Release Intel — analysis, executive briefs, and missions run automatically."
          hint="Use CREATE RELEASE on the Releases page, then come back here."
          color="green"
        />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <ReleaseSelectorBar
        releases={releasesList}
        selectedId={selectedId}
        onSelect={setSelectedId}
        analysis={snapshot?.analysis ?? null}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        onAnalyze={handleAnalyze}
        analyzing={analyzing}
        canWrite={canWrite}
      />

      {snapshotLoading && <div className="flex justify-center py-16"><LoadingSpinner text="LOADING RELEASE INTEL..." /></div>}
      {!snapshotLoading && snapshotError && <ErrorMessage message={snapshotError} onRetry={() => loadSnapshot(selectedId)} />}

      {!snapshotLoading && !snapshotError && snapshot && (
        <>
          <TabBar
            tabs={RELEASE_INTEL_TABS}
            activeTab={activeTab}
            onSelect={setActiveTab}
            countByTab={{ missions: snapshot.missions.length }}
          />

          {activeTab === 'overview' && (
            <div className="space-y-5">
              <ReleaseSummary release={snapshot.release} analysis={snapshot.analysis} artistName={artistName} />
              <ScoreBoard analysis={snapshot.analysis} brief={snapshot.brief} missions={snapshot.missions} />
              <ActionCenter
                analysis={snapshot.analysis}
                missions={snapshot.missions}
                onAnalyze={handleAnalyze}
                onRefresh={handleRefresh}
                onOpenMissionTab={setActiveTab}
                analyzing={analyzing}
                refreshing={refreshing}
                canWrite={canWrite}
              />
              <MissionTimeline
                release={snapshot.release}
                analysis={snapshot.analysis}
                brief={snapshot.brief}
                missions={snapshot.missions}
                events={events}
              />
            </div>
          )}

          {activeTab === 'intelligence' && (
            <div className="space-y-5">
              <ExecutiveBriefCard brief={snapshot.brief} />
              <AnalysisDetails analysis={snapshot.analysis} brief={snapshot.brief} />
            </div>
          )}

          {activeTab === 'missions' && (
            <MissionBoard
              missions={snapshot.missions}
              onUpdateMission={handleUpdateMission}
              onDispatchMission={handleDispatchMission}
              onRetryMission={handleRetryMission}
              onCancelMission={handleCancelMission}
              updatingId={updatingMissionId}
              canWrite={canWrite}
            />
          )}

          {activeTab === 'playlist' && (
            <PlaylistPitchTab
              mission={snapshot.missions.find(m => m.mission_type === 'playlist')}
              execution={executions[snapshot.missions.find(m => m.mission_type === 'playlist')?.id ?? ''] ?? null}
              executionLoading={executionLoading[snapshot.missions.find(m => m.mission_type === 'playlist')?.id ?? ''] ?? false}
              {...missionTabProps}
            />
          )}

          {activeTab === 'sync' && (
            <SyncPitchTab
              mission={snapshot.missions.find(m => m.mission_type === 'sync')}
              execution={executions[snapshot.missions.find(m => m.mission_type === 'sync')?.id ?? ''] ?? null}
              executionLoading={executionLoading[snapshot.missions.find(m => m.mission_type === 'sync')?.id ?? ''] ?? false}
              {...missionTabProps}
            />
          )}

          {activeTab === 'outreach' && (
            <PressOutreachTab
              mission={snapshot.missions.find(m => m.mission_type === 'outreach')}
              execution={executions[snapshot.missions.find(m => m.mission_type === 'outreach')?.id ?? ''] ?? null}
              executionLoading={executionLoading[snapshot.missions.find(m => m.mission_type === 'outreach')?.id ?? ''] ?? false}
              {...missionTabProps}
            />
          )}

          {activeTab === 'fan_growth' && (
            <FanGrowthTab
              mission={snapshot.missions.find(m => m.mission_type === 'fan_growth')}
              execution={executions[snapshot.missions.find(m => m.mission_type === 'fan_growth')?.id ?? ''] ?? null}
              executionLoading={executionLoading[snapshot.missions.find(m => m.mission_type === 'fan_growth')?.id ?? ''] ?? false}
              {...missionTabProps}
            />
          )}

          {activeTab === 'content' && (
            <ContentCalendarTab
              mission={snapshot.missions.find(m => m.mission_type === 'content')}
              execution={executions[snapshot.missions.find(m => m.mission_type === 'content')?.id ?? ''] ?? null}
              executionLoading={executionLoading[snapshot.missions.find(m => m.mission_type === 'content')?.id ?? ''] ?? false}
              {...missionTabProps}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsTab
              mission={snapshot.missions.find(m => m.mission_type === 'analytics')}
              execution={executions[snapshot.missions.find(m => m.mission_type === 'analytics')?.id ?? ''] ?? null}
              executionLoading={executionLoading[snapshot.missions.find(m => m.mission_type === 'analytics')?.id ?? ''] ?? false}
              {...missionTabProps}
            />
          )}

          {activeTab === 'diagnostics' && (
            <div className="space-y-5">
              <DiagnosticsPanel diagnostics={diagnostics} releaseId={selectedId} missions={snapshot.missions} />
              <AutomationStatusPanel
                analysis={snapshot.analysis}
                missions={snapshot.missions}
                overview={automationOverview}
                n8nHealth={n8nHealth}
                registryEntry={registryEntry}
                releaseRuns={releaseRuns}
                missionsHealth={missionsHealth}
              />
              <FutureIntegrations />
            </div>
          )}
        </>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  )
}
