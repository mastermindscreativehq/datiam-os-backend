import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { releases as releasesApi, artists as artistsApi, activity as activityApi, automation as automationApi, releaseIntel as releaseIntelApi } from '../api/client'
import { useAuthStore } from '../store/authStore'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import EmptyState from '../components/EmptyState'
import Toast from '../components/Toast'
import ReleaseSelectorBar from '../components/release-intel/ReleaseSelectorBar'
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
import type {
  ReleaseRecord, ReleaseIntelSnapshot, ActivityEvent, DiagnosticsState, AutomationRun,
} from '../components/release-intel/types'

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

  const [analyzing, setAnalyzing] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [updatingMissionId, setUpdatingMissionId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

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
      const [statsRes, healthRes, registryRes, historyRes] = await Promise.all([
        timed('automation stats', 'GET', '/automation/stats', () => automationApi.stats()).catch(() => null),
        timed('automation health', 'GET', '/automation/health', () => automationApi.health()).catch(() => null),
        timed('automation registry', 'GET', '/automation/registry', () => automationApi.registry.list()).catch(() => null),
        timed('automation history', 'GET', '/automation/history', () => automationApi.history({ limit: 200 })).catch(() => null),
      ])
      setAutomationOverview(statsRes?.data?.data?.overview ?? null)
      setN8nHealth(healthRes?.data?.data ?? null)
      const registry = normaliseList(registryRes?.data?.data)
      setRegistryEntry(registry.find((w: any) => w.name === 'release-intelligence') ?? null)
      const runs = normaliseList(historyRes?.data?.data, 'runs') as AutomationRun[]
      setReleaseRuns(runs.filter(r => r.payload?.data?.release_id === releaseId))
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

  const artistName = useMemo(() => {
    if (!snapshot?.release.artist_id) return null
    return artistsList.find(a => a.id === snapshot.release.artist_id)?.stage_name ?? null
  }, [snapshot, artistsList])

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
          <ReleaseSummary release={snapshot.release} analysis={snapshot.analysis} artistName={artistName} />
          <ExecutiveBriefCard brief={snapshot.brief} />
          <ScoreBoard analysis={snapshot.analysis} brief={snapshot.brief} missions={snapshot.missions} />
          <MissionBoard
            missions={snapshot.missions}
            onUpdateMission={handleUpdateMission}
            updatingId={updatingMissionId}
            canWrite={canWrite}
          />
          <MissionTimeline
            release={snapshot.release}
            analysis={snapshot.analysis}
            brief={snapshot.brief}
            missions={snapshot.missions}
            events={events}
          />
          <ActionCenter
            analysis={snapshot.analysis}
            missions={snapshot.missions}
            onAnalyze={handleAnalyze}
            onRefresh={handleRefresh}
            analyzing={analyzing}
            refreshing={refreshing}
            canWrite={canWrite}
          />
          <AnalysisDetails analysis={snapshot.analysis} brief={snapshot.brief} />
          <DiagnosticsPanel diagnostics={diagnostics} releaseId={selectedId} missions={snapshot.missions} />
          <AutomationStatusPanel
            analysis={snapshot.analysis}
            missions={snapshot.missions}
            overview={automationOverview}
            n8nHealth={n8nHealth}
            registryEntry={registryEntry}
            releaseRuns={releaseRuns}
          />
          <FutureIntegrations />
        </>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  )
}
