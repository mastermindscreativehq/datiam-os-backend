import { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { catalog } from '../../api/catalog'
import LoadingSpinner from '../../components/LoadingSpinner'
import ErrorMessage from '../../components/ErrorMessage'
import Modal, { Field, Input, Textarea, Select } from '../../components/Modal'
import Toast from '../../components/Toast'
import { useAuthStore } from '../../store/authStore'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDuration(secs?: number | null) {
  if (!secs) return '—'
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function fmtBytes(bytes?: number | null) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function StatusBadge({ status }: { status?: string }) {
  if (!status) return null
  const cls =
    status === 'active'   ? 'bg-[#00ff41]/10 text-[#00ff41]' :
    status === 'inactive' ? 'bg-yellow-400/10 text-yellow-400' :
    status === 'archived' ? 'bg-gray-800 text-gray-500' :
    status === 'draft'    ? 'bg-gray-800 text-gray-500' :
                            'bg-gray-800 text-gray-500'
  return <span className={`text-[9px] font-mono tracking-widest px-2 py-0.5 rounded ${cls}`}>{status.toUpperCase()}</span>
}

function TypeBadge({ type, color = 'cyan' }: { type?: string; color?: string }) {
  if (!type) return null
  const cls = color === 'purple' ? 'bg-purple-500/10 text-purple-400' :
              color === 'orange' ? 'bg-orange-500/10 text-orange-400' :
              'bg-[#00d4ff]/10 text-[#00d4ff]'
  return <span className={`text-[9px] font-mono tracking-widest px-2 py-0.5 rounded ${cls}`}>{type.toUpperCase()}</span>
}

// ── Add Credit Modal ──────────────────────────────────────────────────────────

function AddCreditModal({ isOpen, onClose, songId, onSuccess }: any) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ role: '', name: '', split_percentage: '', pro_affiliation: '' })

  const mutation = useMutation({
    mutationFn: () => catalog.songs.addCredit(songId, {
      ...form,
      split_percentage: form.split_percentage ? Number(form.split_percentage) : undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['catalog-song-credits', songId] })
      onSuccess()
      onClose()
      setForm({ role: '', name: '', split_percentage: '', pro_affiliation: '' })
    },
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="ADD CREDIT" color="cyan"
      footer={
        <>
          <button onClick={onClose} disabled={mutation.isPending} className="text-[10px] font-mono tracking-widest px-4 py-2 border border-white/10 text-gray-500 hover:text-gray-400 rounded disabled:opacity-50">CANCEL</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.role || !form.name} className="text-[10px] font-mono tracking-widest px-5 py-2 border border-[#00ff41]/40 text-[#00ff41] hover:bg-[#00ff41]/10 rounded disabled:opacity-50">
            {mutation.isPending ? 'SAVING...' : 'SAVE'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Role" required><Input value={form.role} onChange={set('role')} placeholder="e.g. Producer, Writer" /></Field>
        <Field label="Name" required><Input value={form.name} onChange={set('name')} placeholder="Full name" /></Field>
        <Field label="Split %" hint="0-100"><Input type="number" value={form.split_percentage} onChange={set('split_percentage')} placeholder="50" /></Field>
        <Field label="PRO Affiliation"><Input value={form.pro_affiliation} onChange={set('pro_affiliation')} placeholder="e.g. ASCAP, BMI" /></Field>
      </div>
    </Modal>
  )
}

// ── Add Asset Modal ───────────────────────────────────────────────────────────

function AddAssetModal({ isOpen, onClose, songId, onSuccess }: any) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ asset_type: '', file_name: '', storage_url: '', notes: '' })

  const mutation = useMutation({
    mutationFn: () => catalog.songs.addAsset(songId, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['catalog-song-assets', songId] })
      onSuccess()
      onClose()
      setForm({ asset_type: '', file_name: '', storage_url: '', notes: '' })
    },
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="ADD ASSET" color="cyan"
      footer={
        <>
          <button onClick={onClose} disabled={mutation.isPending} className="text-[10px] font-mono tracking-widest px-4 py-2 border border-white/10 text-gray-500 hover:text-gray-400 rounded disabled:opacity-50">CANCEL</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.asset_type} className="text-[10px] font-mono tracking-widest px-5 py-2 border border-[#00ff41]/40 text-[#00ff41] hover:bg-[#00ff41]/10 rounded disabled:opacity-50">
            {mutation.isPending ? 'SAVING...' : 'SAVE'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Asset Type" required>
          <Select value={form.asset_type} onChange={set('asset_type')}>
            <option value="">Select type...</option>
            <option value="wav">WAV</option>
            <option value="mp3">MP3</option>
            <option value="stems">STEMS</option>
            <option value="midi">MIDI</option>
            <option value="artwork">ARTWORK</option>
            <option value="video">VIDEO</option>
            <option value="other">OTHER</option>
          </Select>
        </Field>
        <Field label="File Name"><Input value={form.file_name} onChange={set('file_name')} placeholder="filename.wav" /></Field>
        <Field label="Storage URL"><Input value={form.storage_url} onChange={set('storage_url')} placeholder="https://..." /></Field>
        <Field label="Notes"><Textarea value={form.notes} onChange={set('notes')} placeholder="Optional notes..." rows={2} /></Field>
      </div>
    </Modal>
  )
}

// ── Add Document Modal ────────────────────────────────────────────────────────

function AddDocumentModal({ isOpen, onClose, songId, onSuccess }: any) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ document_type: '', title: '', storage_url: '', notes: '' })

  const mutation = useMutation({
    mutationFn: () => catalog.songs.addDocument(songId, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['catalog-song-documents', songId] })
      onSuccess()
      onClose()
      setForm({ document_type: '', title: '', storage_url: '', notes: '' })
    },
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="ADD DOCUMENT" color="cyan"
      footer={
        <>
          <button onClick={onClose} disabled={mutation.isPending} className="text-[10px] font-mono tracking-widest px-4 py-2 border border-white/10 text-gray-500 hover:text-gray-400 rounded disabled:opacity-50">CANCEL</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.document_type || !form.title} className="text-[10px] font-mono tracking-widest px-5 py-2 border border-[#00ff41]/40 text-[#00ff41] hover:bg-[#00ff41]/10 rounded disabled:opacity-50">
            {mutation.isPending ? 'SAVING...' : 'SAVE'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Document Type" required>
          <Select value={form.document_type} onChange={set('document_type')}>
            <option value="">Select type...</option>
            <option value="contract">CONTRACT</option>
            <option value="license">LICENSE</option>
            <option value="lyrics_sheet">LYRICS SHEET</option>
            <option value="split_sheet">SPLIT SHEET</option>
            <option value="registration">REGISTRATION</option>
            <option value="other">OTHER</option>
          </Select>
        </Field>
        <Field label="Title" required><Input value={form.title} onChange={set('title')} placeholder="Document title" /></Field>
        <Field label="Storage URL"><Input value={form.storage_url} onChange={set('storage_url')} placeholder="https://..." /></Field>
        <Field label="Notes"><Textarea value={form.notes} onChange={set('notes')} placeholder="Optional notes..." rows={2} /></Field>
      </div>
    </Modal>
  )
}

// ── Add Identifier Modal ──────────────────────────────────────────────────────

function AddIdentifierModal({ isOpen, onClose, songId, onSuccess }: any) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ identifier_type: '', value: '', territory: '' })

  const mutation = useMutation({
    mutationFn: () => catalog.songs.addIdentifier(songId, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['catalog-song-identifiers', songId] })
      onSuccess()
      onClose()
      setForm({ identifier_type: '', value: '', territory: '' })
    },
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="ADD IDENTIFIER" color="cyan"
      footer={
        <>
          <button onClick={onClose} disabled={mutation.isPending} className="text-[10px] font-mono tracking-widest px-4 py-2 border border-white/10 text-gray-500 hover:text-gray-400 rounded disabled:opacity-50">CANCEL</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.identifier_type || !form.value} className="text-[10px] font-mono tracking-widest px-5 py-2 border border-[#00ff41]/40 text-[#00ff41] hover:bg-[#00ff41]/10 rounded disabled:opacity-50">
            {mutation.isPending ? 'SAVING...' : 'SAVE'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Identifier Type" required>
          <Select value={form.identifier_type} onChange={set('identifier_type')}>
            <option value="">Select type...</option>
            <option value="ISRC">ISRC</option>
            <option value="ISWC">ISWC</option>
            <option value="UPC">UPC</option>
          </Select>
        </Field>
        <Field label="Value" required><Input value={form.value} onChange={set('value')} placeholder="e.g. US-S1Z-99-00001" /></Field>
        <Field label="Territory"><Input value={form.territory} onChange={set('territory')} placeholder="e.g. WW, US, EU" /></Field>
      </div>
    </Modal>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const TABS = ['OVERVIEW', 'CREDITS', 'ASSETS', 'DOCUMENTS', 'IDENTIFIERS'] as const
type Tab = typeof TABS[number]

export default function CatalogSongDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const canWrite = ['owner', 'admin', 'editor', 'team'].includes(user?.role ?? '')

  const [activeTab, setActiveTab] = useState<Tab>('OVERVIEW')
  const [showAddCredit, setShowAddCredit] = useState(false)
  const [showAddAsset, setShowAddAsset] = useState(false)
  const [showAddDocument, setShowAddDocument] = useState(false)
  const [showAddIdentifier, setShowAddIdentifier] = useState(false)

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => setToast({ message, type }), [])

  const { data: songData, isLoading, isError, refetch } = useQuery({
    queryKey: ['catalog-song', id],
    queryFn: () => catalog.songs.get(id!).then(r => r.data),
    enabled: !!id,
  })

  const { data: creditsData } = useQuery({
    queryKey: ['catalog-song-credits', id],
    queryFn: () => catalog.songs.credits(id!).then(r => r.data),
    enabled: !!id,
  })

  const { data: assetsData } = useQuery({
    queryKey: ['catalog-song-assets', id],
    queryFn: () => catalog.songs.assets(id!).then(r => r.data),
    enabled: !!id,
  })

  const { data: documentsData } = useQuery({
    queryKey: ['catalog-song-documents', id],
    queryFn: () => catalog.songs.documents(id!).then(r => r.data),
    enabled: !!id,
  })

  const { data: identifiersData } = useQuery({
    queryKey: ['catalog-song-identifiers', id],
    queryFn: () => catalog.songs.identifiers(id!).then(r => r.data),
    enabled: !!id,
  })

  if (isLoading) return <div className="flex justify-center py-24"><LoadingSpinner text="LOADING..." /></div>
  if (isError) return <ErrorMessage message="Failed to load song" onRetry={() => refetch()} />

  const song: any = songData?.data ?? songData ?? {}
  const credits: any[] = creditsData?.data ?? creditsData ?? []
  const assets: any[] = assetsData?.data ?? assetsData ?? []
  const documents: any[] = documentsData?.data ?? documentsData ?? []
  const identifiers: any[] = identifiersData?.data ?? identifiersData ?? []
  const tags: string[] = Array.isArray(song.tags) ? song.tags : []

  return (
    <div className="space-y-6">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="text-[10px] font-mono text-gray-600 hover:text-[#00ff41] transition-colors tracking-widest">
        ← BACK
      </button>

      {/* Header */}
      <div className="border border-white/5 rounded p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-1 h-6 bg-[#00ff41] rounded-full" />
              <h1 className="text-xl font-bold font-mono text-[#00ff41] tracking-[0.2em]">{song.title}</h1>
              <StatusBadge status={song.status} />
              {song.explicit && (
                <span className="text-[9px] font-mono tracking-widest px-2 py-0.5 rounded bg-red-500/10 text-red-400">EXPLICIT</span>
              )}
            </div>
            <p className="text-gray-600 text-[11px] font-mono tracking-[0.1em] ml-4">{song.artist_name ?? '—'}</p>
          </div>
          <div className="flex items-center gap-6 text-right">
            {song.bpm && <div><div className="text-[9px] font-mono text-gray-600 tracking-widest">BPM</div><div className="text-[15px] font-mono text-[#00d4ff]">{song.bpm}</div></div>}
            {song.key && <div><div className="text-[9px] font-mono text-gray-600 tracking-widest">KEY</div><div className="text-[15px] font-mono text-[#00d4ff]">{song.key}</div></div>}
            {song.duration_seconds && <div><div className="text-[9px] font-mono text-gray-600 tracking-widest">DURATION</div><div className="text-[15px] font-mono text-[#00d4ff]">{fmtDuration(song.duration_seconds)}</div></div>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-white/5 pb-0">
        {TABS.map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`text-[10px] font-mono tracking-widest pb-3 transition-colors ${activeTab === t ? 'text-[#00ff41] border-b border-[#00ff41]' : 'text-gray-600 hover:text-gray-400'}`}
          >{t}</button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-4">
          {/* Metadata grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              { label: 'GENRE', val: song.genre },
              { label: 'MOOD', val: song.mood },
              { label: 'LANGUAGE', val: song.language },
              { label: 'EXPLICIT', val: song.explicit ? 'YES' : 'NO' },
            ].map(item => (
              <div key={item.label} className="border rounded p-4 border-white/5">
                <div className="text-[10px] font-mono tracking-widest text-gray-500 mb-1">{item.label}</div>
                <div className="text-[13px] font-mono text-gray-300">{item.val ?? '—'}</div>
              </div>
            ))}
          </div>
          {/* Tags */}
          {tags.length > 0 && (
            <div>
              <div className="text-[10px] font-mono tracking-widest text-gray-500 mb-2">TAGS</div>
              <div className="flex flex-wrap gap-1">
                {tags.map((tag: string) => (
                  <span key={tag} className="text-[9px] font-mono tracking-widest px-2 py-0.5 rounded bg-white/5 text-gray-500">{tag}</span>
                ))}
              </div>
            </div>
          )}
          {/* Lyrics */}
          {song.lyrics && (
            <div>
              <div className="text-[10px] font-mono tracking-widest text-gray-500 mb-2">LYRICS</div>
              <pre className="bg-[#0d0d0d] border border-white/5 rounded p-4 text-[11px] font-mono text-gray-400 leading-relaxed max-h-96 overflow-y-auto whitespace-pre-wrap">{song.lyrics}</pre>
            </div>
          )}
        </div>
      )}

      {/* CREDITS */}
      {activeTab === 'CREDITS' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            {canWrite && (
              <button onClick={() => setShowAddCredit(true)} className="text-[10px] font-mono tracking-widest px-4 py-1.5 border border-[#00d4ff]/40 text-[#00d4ff] hover:bg-[#00d4ff]/10 rounded transition-colors">
                + ADD CREDIT
              </button>
            )}
          </div>
          {credits.length === 0 ? (
            <div className="text-center py-12 text-gray-600 text-[11px] font-mono tracking-widest">NO CREDITS</div>
          ) : (
            <div className="border border-white/5 rounded overflow-hidden">
              <table className="w-full text-[10px] font-mono">
                <thead>
                  <tr className="border-b border-white/5 text-gray-600 tracking-widest">
                    <th className="text-left px-4 py-2">ROLE</th>
                    <th className="text-left px-4 py-2">NAME</th>
                    <th className="text-left px-4 py-2">SPLIT %</th>
                    <th className="text-left px-4 py-2">PRO AFFILIATION</th>
                  </tr>
                </thead>
                <tbody>
                  {credits.map((c: any) => (
                    <tr key={c.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-2 text-gray-400">{c.role}</td>
                      <td className="px-4 py-2 text-gray-300">{c.name}</td>
                      <td className="px-4 py-2 text-gray-500">{c.split_percentage != null ? `${c.split_percentage}%` : '—'}</td>
                      <td className="px-4 py-2 text-gray-500">{c.pro_affiliation ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ASSETS */}
      {activeTab === 'ASSETS' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            {canWrite && (
              <button onClick={() => setShowAddAsset(true)} className="text-[10px] font-mono tracking-widest px-4 py-1.5 border border-[#00d4ff]/40 text-[#00d4ff] hover:bg-[#00d4ff]/10 rounded transition-colors">
                + ADD ASSET
              </button>
            )}
          </div>
          {assets.length === 0 ? (
            <div className="text-center py-12 text-gray-600 text-[11px] font-mono tracking-widest">NO ASSETS</div>
          ) : (
            <div className="space-y-2">
              {assets.map((a: any) => (
                <div key={a.id} className="border border-white/5 rounded p-4 flex items-center gap-4">
                  <TypeBadge type={a.asset_type} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-mono text-gray-300 truncate">{a.file_name ?? '—'}</div>
                    {a.notes && <div className="text-[10px] font-mono text-gray-600 mt-0.5">{a.notes}</div>}
                  </div>
                  <div className="text-[10px] font-mono text-gray-600">{fmtBytes(a.file_size_bytes)}</div>
                  {a.storage_url && (
                    <a href={a.storage_url} target="_blank" rel="noopener noreferrer" className="text-[9px] font-mono text-[#00d4ff] hover:underline tracking-widest">VIEW</a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DOCUMENTS */}
      {activeTab === 'DOCUMENTS' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            {canWrite && (
              <button onClick={() => setShowAddDocument(true)} className="text-[10px] font-mono tracking-widest px-4 py-1.5 border border-[#00d4ff]/40 text-[#00d4ff] hover:bg-[#00d4ff]/10 rounded transition-colors">
                + ADD DOC
              </button>
            )}
          </div>
          {documents.length === 0 ? (
            <div className="text-center py-12 text-gray-600 text-[11px] font-mono tracking-widest">NO DOCUMENTS</div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc: any) => (
                <div key={doc.id} className="border border-white/5 rounded p-4 flex items-center gap-4">
                  <TypeBadge type={doc.document_type} color="purple" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-mono text-gray-300 truncate">{doc.title}</div>
                    {doc.notes && <div className="text-[10px] font-mono text-gray-600 mt-0.5">{doc.notes}</div>}
                  </div>
                  <div className="text-[10px] font-mono text-gray-600">
                    {doc.created_at ? new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                  </div>
                  {doc.storage_url && (
                    <a href={doc.storage_url} target="_blank" rel="noopener noreferrer" className="text-[9px] font-mono text-[#00d4ff] hover:underline tracking-widest">VIEW</a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* IDENTIFIERS */}
      {activeTab === 'IDENTIFIERS' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            {canWrite && (
              <button onClick={() => setShowAddIdentifier(true)} className="text-[10px] font-mono tracking-widest px-4 py-1.5 border border-[#00d4ff]/40 text-[#00d4ff] hover:bg-[#00d4ff]/10 rounded transition-colors">
                + ADD IDENTIFIER
              </button>
            )}
          </div>
          {identifiers.length === 0 ? (
            <div className="text-center py-12 text-gray-600 text-[11px] font-mono tracking-widest">NO IDENTIFIERS</div>
          ) : (
            <div className="space-y-2">
              {identifiers.map((ident: any) => (
                <div key={ident.id} className="border border-white/5 rounded p-4 flex items-center gap-4">
                  <TypeBadge type={ident.identifier_type} color="orange" />
                  <div className="flex-1 font-mono text-[12px] text-gray-300">{ident.value}</div>
                  <div className="text-[10px] font-mono text-gray-600">{ident.territory ?? 'WW'}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <AddCreditModal isOpen={showAddCredit} onClose={() => setShowAddCredit(false)} songId={id} onSuccess={() => showToast('Credit added')} />
      <AddAssetModal isOpen={showAddAsset} onClose={() => setShowAddAsset(false)} songId={id} onSuccess={() => showToast('Asset added')} />
      <AddDocumentModal isOpen={showAddDocument} onClose={() => setShowAddDocument(false)} songId={id} onSuccess={() => showToast('Document added')} />
      <AddIdentifierModal isOpen={showAddIdentifier} onClose={() => setShowAddIdentifier(false)} songId={id} onSuccess={() => showToast('Identifier added')} />

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  )
}
