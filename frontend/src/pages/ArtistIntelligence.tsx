import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { artistIntelligence as artistIntelApi, artists as artistsApi, musicLinks as musicLinksApi } from '../api/client'
import { useAuthStore } from '../store/authStore'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import EmptyState from '../components/EmptyState'
import Toast from '../components/Toast'
import Modal, { Field, Input } from '../components/Modal'
import ArtistTabBar from '../components/artist-intelligence/ArtistTabBar'
import ArtistOverviewTab from '../components/artist-intelligence/ArtistOverviewTab'
import ArtistPlatformsTab from '../components/artist-intelligence/ArtistPlatformsTab'
import ArtistBusinessRightsTab from '../components/artist-intelligence/ArtistBusinessRightsTab'
import ArtistDistributionTab from '../components/artist-intelligence/ArtistDistributionTab'
import ArtistReleasesTab from '../components/artist-intelligence/ArtistReleasesTab'
import ArtistAutomationTab from '../components/artist-intelligence/ArtistAutomationTab'
import { ARTIST_INTEL_TABS } from '../components/artist-intelligence/types'
import type { ArtistIntelTabKey, ArtistIntelligenceSnapshot, AutomationCategory } from '../components/artist-intelligence/types'
import type { MusicLinkFormPayload } from '../components/music-links/MusicLinkFormModal'
import type { MusicLink } from '../components/music-links/types'

interface ArtistOption { id: string; stage_name: string }

function normaliseList(raw: any, key?: string): any[] {
  if (Array.isArray(raw)) return raw
  if (key && Array.isArray(raw?.[key])) return raw[key]
  if (Array.isArray(raw?.data)) return raw.data
  return []
}

export default function ArtistIntelligence() {
  const { user } = useAuthStore()
  const canWrite = ['owner', 'admin', 'editor', 'team'].includes(user?.role ?? '')
  const navigate = useNavigate()
  const { id: routeId } = useParams<{ id?: string }>()

  const [artistsList, setArtistsList] = useState<ArtistOption[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState('')

  const [selectedId, setSelectedId] = useState(routeId ?? '')
  const [snapshot, setSnapshot] = useState<ArtistIntelligenceSnapshot | null>(null)
  const [snapshotLoading, setSnapshotLoading] = useState(false)
  const [snapshotError, setSnapshotError] = useState('')

  const [activeTab, setActiveTab] = useState<ArtistIntelTabKey>('overview')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [newStageName, setNewStageName] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    setListLoading(true)
    artistsApi.list()
      .then((res) => {
        const list = normaliseList(res.data, 'artists') as ArtistOption[]
        setArtistsList(list)
        if (!routeId && list.length > 0) setSelectedId(list[0].id)
      })
      .catch((err: any) => setListError(err.response?.data?.message ?? 'Failed to load artists'))
      .finally(() => setListLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadSnapshot = useCallback(async (artistId: string) => {
    if (!artistId) return
    setSnapshotLoading(true)
    setSnapshotError('')
    try {
      const res = await artistIntelApi.get(artistId)
      setSnapshot(res.data?.data ?? null)
    } catch (err: any) {
      setSnapshotError(err.response?.data?.message ?? 'Failed to load Artist Intelligence profile')
      setSnapshot(null)
    } finally {
      setSnapshotLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!selectedId) return
    loadSnapshot(selectedId)
    navigate(`/artist-intelligence/${selectedId}`, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  const handleSave = useCallback(async (patch: Record<string, unknown>) => {
    if (!selectedId) return
    setSaving(true)
    try {
      await artistIntelApi.update(selectedId, patch)
      setToast({ message: 'Artist profile updated', type: 'success' })
      await loadSnapshot(selectedId)
    } catch (err: any) {
      setToast({ message: err.response?.data?.message ?? 'Failed to save', type: 'error' })
    } finally {
      setSaving(false)
    }
  }, [selectedId, loadSnapshot])

  const handleCreateLink = useCallback(async (payload: MusicLinkFormPayload) => {
    try {
      await musicLinksApi.create(payload as unknown as Record<string, unknown>)
      setToast({ message: 'Link added', type: 'success' })
      if (selectedId) await loadSnapshot(selectedId)
    } catch (err: any) {
      setToast({ message: err.response?.data?.message ?? 'Failed to add link', type: 'error' })
    }
  }, [selectedId, loadSnapshot])

  const handleUpdateLink = useCallback(async (id: string, payload: MusicLinkFormPayload) => {
    try {
      await musicLinksApi.update(id, payload as unknown as Record<string, unknown>)
      setToast({ message: 'Link updated', type: 'success' })
      if (selectedId) await loadSnapshot(selectedId)
    } catch (err: any) {
      setToast({ message: err.response?.data?.message ?? 'Failed to update link', type: 'error' })
    }
  }, [selectedId, loadSnapshot])

  const handleDeleteLink = useCallback(async (link: MusicLink) => {
    try {
      await musicLinksApi.remove(link.id)
      setToast({ message: 'Link deleted', type: 'success' })
      if (selectedId) await loadSnapshot(selectedId)
    } catch (err: any) {
      setToast({ message: err.response?.data?.message ?? 'Failed to delete link', type: 'error' })
    }
  }, [selectedId, loadSnapshot])

  const handleDispatchAutomation = useCallback(async (category: AutomationCategory) => {
    if (!selectedId) return
    try {
      const res = await artistIntelApi.dispatchAutomation(selectedId, category)
      setToast({ message: `${category.replace(/_/g, ' ')} dispatched`, type: 'success' })
      return res.data?.data
    } catch (err: any) {
      setToast({ message: err.response?.data?.message ?? 'Automation dispatch failed', type: 'error' })
    }
  }, [selectedId])

  const handleCreateArtist = async () => {
    if (!newStageName.trim()) return
    setCreating(true)
    try {
      const res = await artistIntelApi.create({ stage_name: newStageName.trim() })
      const created = res.data?.data
      setToast({ message: 'Artist created', type: 'success' })
      setCreateOpen(false)
      setNewStageName('')
      setArtistsList(list => [...list, { id: created.id, stage_name: created.stage_name }])
      setSelectedId(created.id)
    } catch (err: any) {
      setToast({ message: err.response?.data?.message ?? 'Failed to create artist', type: 'error' })
    } finally {
      setCreating(false)
    }
  }

  if (listLoading) {
    return <div className="flex justify-center py-24"><LoadingSpinner text="LOADING ARTISTS..." /></div>
  }

  if (listError) {
    return <ErrorMessage message={listError} onRetry={() => window.location.reload()} />
  }

  return (
    <div className="space-y-5">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-1 h-6 bg-fuchsia-400 rounded-full" />
            <h1 className="text-xl font-bold font-mono text-fuchsia-400 tracking-[0.2em]">ARTIST INTELLIGENCE</h1>
          </div>
          <p className="text-gray-600 text-[11px] font-mono tracking-[0.2em] ml-4">
            SINGLE SOURCE OF TRUTH — IDENTITY, LINKS, BUSINESS, RIGHTS
          </p>
        </div>
        {canWrite && (
          <button
            onClick={() => setCreateOpen(true)}
            className="text-[10px] font-mono tracking-widest px-4 py-1.5 border border-fuchsia-400/40 text-fuchsia-400 hover:bg-fuchsia-400/10 rounded transition-colors"
          >
            + CREATE ARTIST
          </button>
        )}
      </div>

      {artistsList.length === 0 ? (
        <EmptyState
          icon="⬟"
          title="No artists yet"
          message="Create an artist to start building their Artist Intelligence profile — identity, platform links, business metadata, distribution, and rights."
          hint={canWrite ? 'Use the + CREATE ARTIST button above to begin.' : undefined}
          color="fuchsia"
        />
      ) : (
        <>
          <div className="flex items-center gap-3 border border-fuchsia-400/10 rounded-lg bg-[#0a0a0a] px-4 py-3">
            <span className="text-[9px] font-mono text-gray-700 tracking-widest">ARTIST</span>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="bg-[#0d0d0d] border border-white/10 rounded px-3 py-1.5 text-[11px] font-mono text-fuchsia-400 focus:outline-none focus:border-fuchsia-400/40"
            >
              {artistsList.map(a => <option key={a.id} value={a.id}>{a.stage_name}</option>)}
            </select>
          </div>

          {snapshotLoading && <div className="flex justify-center py-16"><LoadingSpinner text="LOADING ARTIST INTELLIGENCE..." /></div>}
          {!snapshotLoading && snapshotError && <ErrorMessage message={snapshotError} onRetry={() => loadSnapshot(selectedId)} />}

          {!snapshotLoading && !snapshotError && snapshot && (
            <>
              <ArtistTabBar tabs={ARTIST_INTEL_TABS} activeTab={activeTab} onSelect={setActiveTab} />

              {activeTab === 'overview' && (
                <ArtistOverviewTab profile={snapshot.profile} stats={snapshot.stats} canWrite={canWrite} onSave={handleSave} saving={saving} />
              )}
              {activeTab === 'platforms' && (
                <ArtistPlatformsTab
                  artistId={selectedId}
                  groups={snapshot.links}
                  canWrite={canWrite}
                  onCreate={handleCreateLink}
                  onUpdate={handleUpdateLink}
                  onDelete={handleDeleteLink}
                />
              )}
              {activeTab === 'business' && (
                <ArtistBusinessRightsTab profile={snapshot.profile} canWrite={canWrite} onSave={handleSave} saving={saving} />
              )}
              {activeTab === 'distribution' && (
                <ArtistDistributionTab profile={snapshot.profile} canWrite={canWrite} onSave={handleSave} saving={saving} />
              )}
              {activeTab === 'releases' && (
                <ArtistReleasesTab releases={snapshot.releases} />
              )}
              {activeTab === 'automation' && (
                <ArtistAutomationTab canWrite={canWrite} onDispatch={handleDispatchAutomation} />
              )}
            </>
          )}
        </>
      )}

      <Modal
        isOpen={createOpen}
        onClose={() => !creating && setCreateOpen(false)}
        title="CREATE ARTIST"
        subtitle="ARTIST INTELLIGENCE"
        color="fuchsia"
        footer={
          <>
            <button
              onClick={() => setCreateOpen(false)}
              disabled={creating}
              className="text-[10px] font-mono tracking-widest px-4 py-2 border border-white/10 text-gray-500 hover:text-gray-400 rounded transition-colors disabled:opacity-50"
            >
              CANCEL
            </button>
            <button
              onClick={handleCreateArtist}
              disabled={creating}
              className="text-[10px] font-mono tracking-widest px-5 py-2 border border-fuchsia-400/40 text-fuchsia-400 hover:bg-fuchsia-400/10 rounded transition-colors disabled:opacity-50"
            >
              {creating ? 'CREATING...' : 'CREATE ARTIST'}
            </button>
          </>
        }
      >
        <Field label="Stage Name" required>
          <Input value={newStageName} onChange={(e) => setNewStageName(e.target.value)} placeholder="e.g. DATIAM" autoFocus />
        </Field>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  )
}
