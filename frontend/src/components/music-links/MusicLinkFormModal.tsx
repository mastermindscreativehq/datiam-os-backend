import { useEffect, useState } from 'react'
import Modal, { Field, Input, Select } from '../Modal'
import { MUSIC_LINK_CATEGORIES, MUSIC_LINK_CATEGORY_LABELS } from './types'
import type { MusicLink, MusicLinkCategory } from './types'

interface OwnerOption { id: string; label: string }

export interface MusicLinkFormPayload {
  artist_id?: string
  release_id?: string
  link_category: MusicLinkCategory
  platform: string
  url: string
  label?: string
  territory?: string
  is_primary: boolean
  is_active: boolean
  display_order: number
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onSubmit: (payload: MusicLinkFormPayload) => void
  initial?: MusicLink | null
  defaultOwner?: { type: 'artist' | 'release'; id: string }
  artistOptions?: OwnerOption[]
  releaseOptions?: OwnerOption[]
  submitting?: boolean
  color?: 'cyan' | 'fuchsia'
}

const EMPTY_FORM = {
  owner_type: 'artist' as 'artist' | 'release',
  owner_id: '',
  link_category: 'music_platform' as MusicLinkCategory,
  platform: '',
  url: '',
  label: '',
  territory: '',
  is_primary: false,
  is_active: true,
  display_order: 0,
}

export default function MusicLinkFormModal({
  isOpen, onClose, onSubmit, initial, defaultOwner, artistOptions = [], releaseOptions = [], submitting, color = 'cyan',
}: Props) {
  const [form, setForm] = useState(EMPTY_FORM)

  useEffect(() => {
    if (!isOpen) return
    if (initial) {
      setForm({
        owner_type: initial.artist_id ? 'artist' : 'release',
        owner_id: initial.artist_id ?? initial.release_id ?? '',
        link_category: initial.link_category,
        platform: initial.platform,
        url: initial.url,
        label: initial.label ?? '',
        territory: initial.territory ?? '',
        is_primary: initial.is_primary,
        is_active: initial.is_active,
        display_order: initial.display_order,
      })
    } else {
      setForm({
        ...EMPTY_FORM,
        owner_type: defaultOwner?.type ?? 'artist',
        owner_id: defaultOwner?.id ?? '',
      })
    }
  }, [isOpen, initial, defaultOwner])

  const handleSubmit = () => {
    if (!form.owner_id || !form.platform.trim() || !form.url.trim()) return
    onSubmit({
      artist_id: form.owner_type === 'artist' ? form.owner_id : undefined,
      release_id: form.owner_type === 'release' ? form.owner_id : undefined,
      link_category: form.link_category,
      platform: form.platform.trim(),
      url: form.url.trim(),
      label: form.label.trim() || undefined,
      territory: form.territory.trim() || undefined,
      is_primary: form.is_primary,
      is_active: form.is_active,
      display_order: form.display_order,
    })
  }

  const ownerLocked = Boolean(defaultOwner)

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !submitting && onClose()}
      title={initial ? 'EDIT LINK' : 'ADD LINK'}
      subtitle="MUSIC LINKS HUB"
      color={color}
      footer={
        <>
          <button
            onClick={onClose}
            disabled={submitting}
            className="text-[10px] font-mono tracking-widest px-4 py-2 border border-white/10 text-gray-500 hover:text-gray-400 rounded transition-colors disabled:opacity-50"
          >
            CANCEL
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className={`text-[10px] font-mono tracking-widest px-5 py-2 rounded transition-colors disabled:opacity-50 border ${
              color === 'fuchsia'
                ? 'border-fuchsia-400/40 text-fuchsia-400 hover:bg-fuchsia-400/10'
                : 'border-[#00d4ff]/40 text-[#00d4ff] hover:bg-[#00d4ff]/10'
            }`}
          >
            {submitting ? 'SAVING...' : initial ? 'SAVE CHANGES' : 'ADD LINK'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {!ownerLocked && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Owner Type" required>
              <Select
                value={form.owner_type}
                onChange={(e) => setForm(f => ({ ...f, owner_type: e.target.value as 'artist' | 'release', owner_id: '' }))}
              >
                <option value="artist">Artist</option>
                <option value="release">Release</option>
              </Select>
            </Field>
            <Field label={form.owner_type === 'artist' ? 'Artist' : 'Release'} required>
              <Select value={form.owner_id} onChange={(e) => setForm(f => ({ ...f, owner_id: e.target.value }))}>
                <option value="">Select...</option>
                {(form.owner_type === 'artist' ? artistOptions : releaseOptions).map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </Select>
            </Field>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Category" required>
            <Select
              value={form.link_category}
              onChange={(e) => setForm(f => ({ ...f, link_category: e.target.value as MusicLinkCategory }))}
            >
              {MUSIC_LINK_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{MUSIC_LINK_CATEGORY_LABELS[cat]}</option>
              ))}
            </Select>
          </Field>
          <Field label="Platform" required>
            <Input
              value={form.platform}
              onChange={(e) => setForm(f => ({ ...f, platform: e.target.value }))}
              placeholder="e.g. spotify, instagram"
            />
          </Field>
        </div>
        <Field label="URL" required>
          <Input
            value={form.url}
            onChange={(e) => setForm(f => ({ ...f, url: e.target.value }))}
            placeholder="https://..."
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Label">
            <Input
              value={form.label}
              onChange={(e) => setForm(f => ({ ...f, label: e.target.value }))}
              placeholder="Optional display name"
            />
          </Field>
          <Field label="Territory">
            <Input
              value={form.territory}
              onChange={(e) => setForm(f => ({ ...f, territory: e.target.value }))}
              placeholder="e.g. US, Global"
            />
          </Field>
        </div>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 text-[10px] font-mono tracking-widest text-gray-500">
            <input
              type="checkbox"
              checked={form.is_primary}
              onChange={(e) => setForm(f => ({ ...f, is_primary: e.target.checked }))}
            />
            PRIMARY
          </label>
          <label className="flex items-center gap-2 text-[10px] font-mono tracking-widest text-gray-500">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm(f => ({ ...f, is_active: e.target.checked }))}
            />
            ACTIVE
          </label>
        </div>
      </div>
    </Modal>
  )
}
