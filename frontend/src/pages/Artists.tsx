import { useEffect, useState, useCallback } from 'react'
import EmptyState from '../components/EmptyState'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import Modal, { Field, Input, Textarea } from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'
import Toast from '../components/Toast'
import { artists, isCriticalError } from '../api/client'
import { useAuthStore } from '../store/authStore'

interface SocialLinks {
  instagram?: string
  tiktok?: string
  youtube?: string
  spotify?: string
  website?: string
}

interface ArtistProfile {
  id: string
  stage_name: string
  legal_name?: string | null
  bio?: string | null
  genre?: string | null
  country?: string | null
  mood_profile?: string | null
  social_links?: SocialLinks | null
  profile_image?: string | null
  primary_color?: string | null
  is_active?: boolean
  created_at: string
  updated_at: string
}

const EMPTY_FORM = {
  stage_name: '',
  legal_name: '',
  bio: '',
  genre: '',
  country: '',
  mood_profile: '',
  instagram: '',
  tiktok: '',
  youtube: '',
  spotify: '',
  website: '',
}

export default function Artists() {
  const { user } = useAuthStore()
  const canWrite  = ['owner', 'admin', 'editor', 'team'].includes(user?.role ?? '')
  const canDelete = ['owner', 'admin'].includes(user?.role ?? '')

  const [artistData,  setArtistData]  = useState<ArtistProfile[] | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const [modalOpen,   setModalOpen]   = useState(false)
  const [editItem,    setEditItem]    = useState<ArtistProfile | null>(null)
  const [deleteItem,  setDeleteItem]  = useState<ArtistProfile | null>(null)
  const [form,        setForm]        = useState(EMPTY_FORM)
  const [submitting,  setSubmitting]  = useState(false)
  const [deleting,    setDeleting]    = useState(false)
  const [toast,       setToast]       = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await artists.list()
      const raw = res.data
      const list: ArtistProfile[] = Array.isArray(raw) ? raw : (raw?.data ?? [])
      setArtistData(list)
    } catch (err: any) {
      if (isCriticalError(err)) setError(err.response?.data?.message || 'Failed to load artist profiles')
      else setArtistData([])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const openCreate = () => {
    setForm(EMPTY_FORM)
    setEditItem(null)
    setModalOpen(true)
  }

  const openEdit = (artist: ArtistProfile) => {
    const links = artist.social_links || {}
    setEditItem(artist)
    setForm({
      stage_name:   artist.stage_name ?? '',
      legal_name:   artist.legal_name ?? '',
      bio:          artist.bio ?? '',
      genre:        artist.genre ?? '',
      country:      artist.country ?? '',
      mood_profile: artist.mood_profile ?? '',
      instagram:    links.instagram ?? '',
      tiktok:       links.tiktok ?? '',
      youtube:      links.youtube ?? '',
      spotify:      links.spotify ?? '',
      website:      links.website ?? '',
    })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.stage_name.trim()) {
      setToast({ message: 'Stage name is required', type: 'error' })
      return
    }
    setSubmitting(true)
    try {
      const rawLinks: Record<string, string> = {}
      if (form.instagram.trim()) rawLinks.instagram = form.instagram.trim()
      if (form.tiktok.trim())    rawLinks.tiktok    = form.tiktok.trim()
      if (form.youtube.trim())   rawLinks.youtube   = form.youtube.trim()
      if (form.spotify.trim())   rawLinks.spotify   = form.spotify.trim()
      if (form.website.trim())   rawLinks.website   = form.website.trim()

      const body: Record<string, unknown> = {
        stage_name: form.stage_name.trim(),
      }
      if (form.legal_name.trim())   body.legal_name   = form.legal_name.trim()
      if (form.bio.trim())          body.bio          = form.bio.trim()
      if (form.genre.trim())        body.genre        = form.genre.trim()
      if (form.country.trim())      body.country      = form.country.trim()
      if (form.mood_profile.trim()) body.mood_profile = form.mood_profile.trim()
      if (Object.keys(rawLinks).length > 0) body.social_links = rawLinks

      if (editItem) {
        await artists.update(editItem.id, body)
        setToast({ message: 'Artist profile updated', type: 'success' })
      } else {
        await artists.create(body)
        setToast({ message: 'Artist profile created', type: 'success' })
      }
      setModalOpen(false)
      fetchData()
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || 'Failed to save artist profile', type: 'error' })
    } finally { setSubmitting(false) }
  }

  const handleDelete = async () => {
    if (!deleteItem) return
    setDeleting(true)
    try {
      await artists.remove(deleteItem.id)
      setToast({ message: 'Artist profile deleted', type: 'success' })
      setDeleteItem(null)
      fetchData()
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || 'Failed to delete artist profile', type: 'error' })
    } finally { setDeleting(false) }
  }

  const set = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<any>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const items = artistData ?? []

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-1 h-6 bg-purple-400 rounded-full" />
            <h1 className="text-xl font-bold font-mono text-purple-400 tracking-[0.2em]">ARTIST</h1>
          </div>
          <p className="text-gray-600 text-[11px] font-mono tracking-[0.2em] ml-4">IDENTITY REGISTRY</p>
        </div>
        <div className="flex items-center gap-3">
          {!loading && !error && artistData && (
            <div className="text-purple-400/50 text-[10px] font-mono border border-purple-400/20 rounded px-3 py-1.5 tracking-widest">
              {items.length} {items.length === 1 ? 'PROFILE' : 'PROFILES'}
            </div>
          )}
          {canWrite && (
            <button
              onClick={openCreate}
              className="text-[10px] font-mono tracking-widest px-4 py-1.5 border border-purple-400/40 text-purple-400 hover:bg-purple-400/10 rounded transition-colors"
            >
              + CREATE ARTIST
            </button>
          )}
        </div>
      </div>

      {loading && <div className="flex justify-center py-24"><LoadingSpinner text="LOADING ARTIST PROFILE..." /></div>}
      {error && <ErrorMessage message={error} onRetry={fetchData} />}

      {!loading && !error && artistData && (
        items.length === 0 ? (
          <EmptyState
            icon="◈"
            title="No artist profile created yet"
            message="Create an artist profile to get started. All songs and releases will be linked to this identity."
            hint={canWrite ? 'Use the + CREATE ARTIST button above to begin.' : undefined}
            color="purple"
          />
        ) : (
          <div className="space-y-4">
            {items.map((artist) => {
              const links = artist.social_links || {}
              const hasLinks = Object.values(links).some(Boolean)
              return (
                <div key={artist.id} className="border border-purple-400/20 rounded-lg bg-[#0d0d0d] overflow-hidden">
                  <div className="px-6 py-4 border-b border-purple-400/10 flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <div className="w-1 h-5 bg-purple-400 rounded-full flex-shrink-0" />
                        <h2 className="text-[15px] font-bold font-mono text-purple-400 tracking-[0.15em]">
                          {artist.stage_name}
                        </h2>
                        {artist.is_active !== false && (
                          <span className="text-[9px] font-mono tracking-widest text-purple-400/50 border border-purple-400/20 rounded px-2 py-0.5">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      {artist.legal_name && (
                        <p className="text-gray-600 text-[10px] font-mono ml-4 mt-0.5 tracking-widest">
                          {artist.legal_name}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {canWrite && (
                        <button
                          onClick={() => openEdit(artist)}
                          className="text-[10px] font-mono tracking-widest px-2.5 py-1 border border-white/10 text-gray-500 hover:text-gray-300 hover:border-white/20 rounded transition-colors"
                        >
                          EDIT
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => setDeleteItem(artist)}
                          className="text-[10px] font-mono tracking-widest px-2.5 py-1 border border-red-500/20 text-red-500/60 hover:text-red-400 hover:border-red-500/40 rounded transition-colors"
                        >
                          DEL
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="px-6 py-5 space-y-4">
                    {(artist.genre || artist.country || artist.mood_profile) && (
                      <div className="grid grid-cols-3 gap-6">
                        {artist.genre && (
                          <div>
                            <p className="text-[9px] font-mono text-gray-700 tracking-widest mb-1">GENRE</p>
                            <p className="text-[11px] font-mono text-gray-400">{artist.genre}</p>
                          </div>
                        )}
                        {artist.country && (
                          <div>
                            <p className="text-[9px] font-mono text-gray-700 tracking-widest mb-1">COUNTRY</p>
                            <p className="text-[11px] font-mono text-gray-400">{artist.country}</p>
                          </div>
                        )}
                        {artist.mood_profile && (
                          <div>
                            <p className="text-[9px] font-mono text-gray-700 tracking-widest mb-1">MOOD / SOUND</p>
                            <p className="text-[11px] font-mono text-gray-400">{artist.mood_profile}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {artist.bio && (
                      <div>
                        <p className="text-[9px] font-mono text-gray-700 tracking-widest mb-1.5">BIO</p>
                        <p className="text-[11px] font-mono text-gray-500 leading-relaxed">{artist.bio}</p>
                      </div>
                    )}

                    {hasLinks && (
                      <div>
                        <p className="text-[9px] font-mono text-gray-700 tracking-widest mb-2">SOCIAL LINKS</p>
                        <div className="flex flex-wrap gap-2">
                          {links.instagram && (
                            <a href={links.instagram} target="_blank" rel="noopener noreferrer"
                               className="text-[9px] font-mono text-gray-500 border border-white/10 rounded px-2.5 py-1 hover:text-purple-400 hover:border-purple-400/30 transition-colors">
                              INSTAGRAM
                            </a>
                          )}
                          {links.tiktok && (
                            <a href={links.tiktok} target="_blank" rel="noopener noreferrer"
                               className="text-[9px] font-mono text-gray-500 border border-white/10 rounded px-2.5 py-1 hover:text-purple-400 hover:border-purple-400/30 transition-colors">
                              TIKTOK
                            </a>
                          )}
                          {links.youtube && (
                            <a href={links.youtube} target="_blank" rel="noopener noreferrer"
                               className="text-[9px] font-mono text-gray-500 border border-white/10 rounded px-2.5 py-1 hover:text-purple-400 hover:border-purple-400/30 transition-colors">
                              YOUTUBE
                            </a>
                          )}
                          {links.spotify && (
                            <a href={links.spotify} target="_blank" rel="noopener noreferrer"
                               className="text-[9px] font-mono text-gray-500 border border-white/10 rounded px-2.5 py-1 hover:text-purple-400 hover:border-purple-400/30 transition-colors">
                              SPOTIFY
                            </a>
                          )}
                          {links.website && (
                            <a href={links.website} target="_blank" rel="noopener noreferrer"
                               className="text-[9px] font-mono text-gray-500 border border-white/10 rounded px-2.5 py-1 hover:text-purple-400 hover:border-purple-400/30 transition-colors">
                              WEBSITE
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => !submitting && setModalOpen(false)}
        title={editItem ? 'EDIT ARTIST' : 'CREATE ARTIST'}
        subtitle={editItem ? 'UPDATE IDENTITY PROFILE' : 'REGISTER ARTIST IDENTITY'}
        color="purple"
        footer={
          <>
            <button
              onClick={() => setModalOpen(false)}
              disabled={submitting}
              className="text-[10px] font-mono tracking-widest px-4 py-2 border border-white/10 text-gray-500 hover:text-gray-400 rounded transition-colors disabled:opacity-50"
            >
              CANCEL
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="text-[10px] font-mono tracking-widest px-5 py-2 border border-purple-400/40 text-purple-400 hover:bg-purple-400/10 rounded transition-colors disabled:opacity-50"
            >
              {submitting ? 'SAVING...' : editItem ? 'SAVE CHANGES' : 'CREATE ARTIST'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Stage Name" required>
            <Input value={form.stage_name} onChange={set('stage_name')} placeholder="e.g. DATIAM" autoFocus />
          </Field>
          <Field label="Bio">
            <Textarea value={form.bio} onChange={set('bio')} placeholder="Short bio or artist statement" rows={3} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Genre">
              <Input value={form.genre} onChange={set('genre')} placeholder="e.g. Afrobeats" />
            </Field>
            <Field label="Country">
              <Input value={form.country} onChange={set('country')} placeholder="e.g. Nigeria" />
            </Field>
          </div>
          <Field label="Mood / Sound Identity">
            <Input value={form.mood_profile} onChange={set('mood_profile')} placeholder="e.g. Dark, cinematic, introspective" />
          </Field>
          <div className="pt-2 border-t border-white/5">
            <p className="text-[9px] font-mono text-gray-700 tracking-widest mb-3">SOCIAL LINKS</p>
            <div className="space-y-3">
              <Field label="Instagram">
                <Input value={form.instagram} onChange={set('instagram')} placeholder="https://instagram.com/..." />
              </Field>
              <Field label="TikTok">
                <Input value={form.tiktok} onChange={set('tiktok')} placeholder="https://tiktok.com/@..." />
              </Field>
              <Field label="YouTube">
                <Input value={form.youtube} onChange={set('youtube')} placeholder="https://youtube.com/..." />
              </Field>
              <Field label="Spotify">
                <Input value={form.spotify} onChange={set('spotify')} placeholder="https://open.spotify.com/artist/..." />
              </Field>
              <Field label="Website">
                <Input value={form.website} onChange={set('website')} placeholder="https://..." />
              </Field>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteItem}
        title="DELETE ARTIST PROFILE"
        message={`Are you sure you want to delete "${deleteItem?.stage_name}"? This will also remove all linked songs, releases, and catalog data.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteItem(null)}
        loading={deleting}
      />

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  )
}
