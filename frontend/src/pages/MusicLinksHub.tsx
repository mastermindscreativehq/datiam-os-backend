import { useCallback, useEffect, useMemo, useState } from 'react'
import { musicLinks as musicLinksApi, artists as artistsApi, releases as releasesApi, isCriticalError } from '../api/client'
import { useAuthStore } from '../store/authStore'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import EmptyState from '../components/EmptyState'
import Toast from '../components/Toast'
import ConfirmModal from '../components/ConfirmModal'
import MusicLinkGroupList from '../components/music-links/MusicLinkGroupList'
import MusicLinkFormModal, { type MusicLinkFormPayload } from '../components/music-links/MusicLinkFormModal'
import { MUSIC_LINK_CATEGORIES, MUSIC_LINK_CATEGORY_LABELS } from '../components/music-links/types'
import type { GroupedMusicLinks, MusicLink, MusicLinkCategory } from '../components/music-links/types'

interface OwnerOption { id: string; label: string }

function normaliseList(raw: any, key?: string): any[] {
  if (Array.isArray(raw)) return raw
  if (key && Array.isArray(raw?.[key])) return raw[key]
  if (Array.isArray(raw?.data)) return raw.data
  return []
}

function groupLinks(links: MusicLink[]): GroupedMusicLinks {
  const groups = MUSIC_LINK_CATEGORIES.reduce((acc, cat) => {
    acc[cat] = []
    return acc
  }, {} as GroupedMusicLinks)
  for (const link of links) groups[link.link_category].push(link)
  return groups
}

export default function MusicLinksHub() {
  const { user } = useAuthStore()
  const canWrite = ['owner', 'admin', 'editor', 'team'].includes(user?.role ?? '')

  const [links, setLinks] = useState<MusicLink[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [artistOptions, setArtistOptions] = useState<OwnerOption[]>([])
  const [releaseOptions, setReleaseOptions] = useState<OwnerOption[]>([])

  const [ownerFilter, setOwnerFilter] = useState<'all' | 'artist' | 'release'>('all')
  const [categoryFilter, setCategoryFilter] = useState<MusicLinkCategory | 'all'>('all')

  const [formOpen, setFormOpen] = useState(false)
  const [editItem, setEditItem] = useState<MusicLink | null>(null)
  const [deleteItem, setDeleteItem] = useState<MusicLink | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [linksRes, artistsRes, releasesRes] = await Promise.all([
        musicLinksApi.list(),
        artistsApi.list().catch(() => null),
        releasesApi.list().catch(() => null),
      ])
      setLinks(normaliseList(linksRes.data) as MusicLink[])
      if (artistsRes) {
        const rows = normaliseList(artistsRes.data, 'artists')
        setArtistOptions(rows.map((a: any) => ({ id: a.id, label: a.stage_name })))
      }
      if (releasesRes) {
        const rows = normaliseList(releasesRes.data, 'releases')
        setReleaseOptions(rows.map((r: any) => ({ id: r.id, label: r.release_title })))
      }
    } catch (err: any) {
      if (isCriticalError(err)) setError(err.response?.data?.message || 'Failed to load music links')
      else setLinks([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const artistNameById = useMemo(() => new Map(artistOptions.map(a => [a.id, a.label])), [artistOptions])
  const releaseNameById = useMemo(() => new Map(releaseOptions.map(r => [r.id, r.label])), [releaseOptions])

  const filteredLinks = useMemo(() => {
    return links.filter((l) => {
      if (ownerFilter === 'artist' && !l.artist_id) return false
      if (ownerFilter === 'release' && !l.release_id) return false
      if (categoryFilter !== 'all' && l.link_category !== categoryFilter) return false
      return true
    })
  }, [links, ownerFilter, categoryFilter])

  const grouped = useMemo(() => groupLinks(filteredLinks), [filteredLinks])

  const getOwnerLabel = useCallback((link: MusicLink) => {
    if (link.artist_id) return `ARTIST: ${artistNameById.get(link.artist_id) ?? link.artist_id.slice(0, 8)}`
    if (link.release_id) return `RELEASE: ${releaseNameById.get(link.release_id) ?? link.release_id.slice(0, 8)}`
    return ''
  }, [artistNameById, releaseNameById])

  const openCreate = () => { setEditItem(null); setFormOpen(true) }
  const openEdit = (link: MusicLink) => { setEditItem(link); setFormOpen(true) }

  const handleSubmit = async (payload: MusicLinkFormPayload) => {
    setSubmitting(true)
    try {
      if (editItem) {
        await musicLinksApi.update(editItem.id, payload as unknown as Record<string, unknown>)
        setToast({ message: 'Link updated', type: 'success' })
      } else {
        await musicLinksApi.create(payload as unknown as Record<string, unknown>)
        setToast({ message: 'Link added', type: 'success' })
      }
      setFormOpen(false)
      fetchData()
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || err.response?.data?.error || 'Failed to save link', type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteItem) return
    setDeleting(true)
    try {
      await musicLinksApi.remove(deleteItem.id)
      setToast({ message: 'Link deleted', type: 'success' })
      setDeleteItem(null)
      fetchData()
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || 'Failed to delete link', type: 'error' })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-1 h-6 bg-[#00d4ff] rounded-full" />
            <h1 className="text-xl font-bold font-mono text-[#00d4ff] tracking-[0.2em]">MUSIC LINKS HUB</h1>
          </div>
          <p className="text-gray-600 text-[11px] font-mono tracking-[0.2em] ml-4">
            EVERY ARTIST &amp; RELEASE URL — ONE PLACE
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!loading && !error && (
            <div className="text-[#00d4ff]/50 text-[10px] font-mono border border-[#00d4ff]/20 rounded px-3 py-1.5 tracking-widest">
              {filteredLinks.length} {filteredLinks.length === 1 ? 'LINK' : 'LINKS'}
            </div>
          )}
          {canWrite && (
            <button
              onClick={openCreate}
              className="text-[10px] font-mono tracking-widest px-4 py-1.5 border border-[#00d4ff]/40 text-[#00d4ff] hover:bg-[#00d4ff]/10 rounded transition-colors"
            >
              + ADD LINK
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 border-b border-[#111] pb-4">
        <span className="text-[9px] font-mono text-gray-700 tracking-widest">OWNER</span>
        {(['all', 'artist', 'release'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setOwnerFilter(v)}
            className={`text-[10px] font-mono tracking-widest px-2.5 py-1 rounded border transition-colors ${
              ownerFilter === v
                ? 'border-[#00d4ff]/40 text-[#00d4ff]'
                : 'border-white/10 text-gray-600 hover:text-gray-400'
            }`}
          >
            {v.toUpperCase()}
          </button>
        ))}
        <span className="text-[9px] font-mono text-gray-700 tracking-widest ml-4">CATEGORY</span>
        <button
          onClick={() => setCategoryFilter('all')}
          className={`text-[10px] font-mono tracking-widest px-2.5 py-1 rounded border transition-colors ${
            categoryFilter === 'all' ? 'border-[#00d4ff]/40 text-[#00d4ff]' : 'border-white/10 text-gray-600 hover:text-gray-400'
          }`}
        >
          ALL
        </button>
        {MUSIC_LINK_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`text-[10px] font-mono tracking-widest px-2.5 py-1 rounded border transition-colors ${
              categoryFilter === cat ? 'border-[#00d4ff]/40 text-[#00d4ff]' : 'border-white/10 text-gray-600 hover:text-gray-400'
            }`}
          >
            {MUSIC_LINK_CATEGORY_LABELS[cat].toUpperCase()}
          </button>
        ))}
      </div>

      {loading && <div className="flex justify-center py-24"><LoadingSpinner text="LOADING MUSIC LINKS..." /></div>}
      {error && <ErrorMessage message={error} onRetry={fetchData} />}

      {!loading && !error && (
        filteredLinks.length === 0 ? (
          <EmptyState
            icon="◈"
            title="No links match this filter"
            message="Add artist or release URLs — music platforms, social media, smart links, pre-saves — to build out the Hub."
            hint={canWrite ? 'Use the + ADD LINK button above to begin.' : undefined}
            color="cyan"
          />
        ) : (
          <div className="border border-[#00d4ff]/10 rounded-lg bg-[#0a0a0a] p-5">
            <MusicLinkGroupList
              groups={grouped}
              accent="cyan"
              onEdit={canWrite ? openEdit : undefined}
              onDelete={canWrite ? setDeleteItem : undefined}
              getOwnerLabel={getOwnerLabel}
            />
          </div>
        )
      )}

      <MusicLinkFormModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        initial={editItem}
        artistOptions={artistOptions}
        releaseOptions={releaseOptions}
        submitting={submitting}
        color="cyan"
      />

      <ConfirmModal
        isOpen={!!deleteItem}
        title="DELETE LINK"
        message={`Are you sure you want to delete this ${deleteItem?.link_category.replace('_', ' ')} link (${deleteItem?.platform})?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteItem(null)}
        loading={deleting}
      />

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  )
}
