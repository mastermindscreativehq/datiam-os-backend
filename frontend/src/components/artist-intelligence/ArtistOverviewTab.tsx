import { useEffect, useState } from 'react'
import { Field, Input, Textarea } from '../Modal'
import type { ArtistProfile } from './types'

interface Props {
  profile: ArtistProfile
  stats: { song_count: number; release_count: number }
  canWrite: boolean
  onSave: (patch: Record<string, unknown>) => Promise<void>
  saving: boolean
}

export default function ArtistOverviewTab({ profile, stats, canWrite, onSave, saving }: Props) {
  const [form, setForm] = useState({
    stage_name: profile.stage_name,
    legal_name: profile.legal_name ?? '',
    bio: profile.bio ?? '',
    genre: profile.genre ?? '',
    country: profile.country ?? '',
    city: profile.city ?? '',
    region: profile.region ?? '',
    mood_profile: profile.mood_profile ?? '',
    verified: profile.verified,
  })

  useEffect(() => {
    setForm({
      stage_name: profile.stage_name,
      legal_name: profile.legal_name ?? '',
      bio: profile.bio ?? '',
      genre: profile.genre ?? '',
      country: profile.country ?? '',
      city: profile.city ?? '',
      region: profile.region ?? '',
      mood_profile: profile.mood_profile ?? '',
      verified: profile.verified,
    })
  }, [profile])

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <div className="border border-fuchsia-400/10 rounded-lg bg-[#0a0a0a] px-5 py-4">
          <p className="text-[9px] font-mono text-gray-700 tracking-widest mb-1">SONGS</p>
          <p className="text-2xl font-mono text-fuchsia-400">{stats.song_count}</p>
        </div>
        <div className="border border-fuchsia-400/10 rounded-lg bg-[#0a0a0a] px-5 py-4">
          <p className="text-[9px] font-mono text-gray-700 tracking-widest mb-1">RELEASES</p>
          <p className="text-2xl font-mono text-fuchsia-400">{stats.release_count}</p>
        </div>
        <div className="border border-fuchsia-400/10 rounded-lg bg-[#0a0a0a] px-5 py-4">
          <p className="text-[9px] font-mono text-gray-700 tracking-widest mb-1">STATUS</p>
          <p className="text-[13px] font-mono text-fuchsia-400 mt-1">
            {profile.verified ? 'VERIFIED' : (profile.catalog_status ?? 'active').toUpperCase()}
          </p>
        </div>
      </div>

      <div className="border border-fuchsia-400/10 rounded-lg bg-[#0a0a0a] p-5 space-y-4">
        <p className="text-[10px] font-mono text-fuchsia-400/60 tracking-widest">IDENTITY</p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Stage Name" required>
            <Input value={form.stage_name} onChange={(e) => setForm(f => ({ ...f, stage_name: e.target.value }))} disabled={!canWrite} />
          </Field>
          <Field label="Legal Name">
            <Input value={form.legal_name} onChange={(e) => setForm(f => ({ ...f, legal_name: e.target.value }))} disabled={!canWrite} />
          </Field>
        </div>
        <Field label="Bio">
          <Textarea value={form.bio} onChange={(e) => setForm(f => ({ ...f, bio: e.target.value }))} rows={3} disabled={!canWrite} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Genre">
            <Input value={form.genre} onChange={(e) => setForm(f => ({ ...f, genre: e.target.value }))} disabled={!canWrite} />
          </Field>
          <Field label="Mood / Sound Identity">
            <Input value={form.mood_profile} onChange={(e) => setForm(f => ({ ...f, mood_profile: e.target.value }))} disabled={!canWrite} />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Country">
            <Input value={form.country} onChange={(e) => setForm(f => ({ ...f, country: e.target.value }))} disabled={!canWrite} />
          </Field>
          <Field label="City">
            <Input value={form.city} onChange={(e) => setForm(f => ({ ...f, city: e.target.value }))} disabled={!canWrite} />
          </Field>
          <Field label="Region">
            <Input value={form.region} onChange={(e) => setForm(f => ({ ...f, region: e.target.value }))} disabled={!canWrite} />
          </Field>
        </div>
        {canWrite && (
          <div className="flex justify-end pt-2">
            <button
              onClick={() => onSave(form)}
              disabled={saving}
              className="text-[10px] font-mono tracking-widest px-5 py-2 border border-fuchsia-400/40 text-fuchsia-400 hover:bg-fuchsia-400/10 rounded transition-colors disabled:opacity-50"
            >
              {saving ? 'SAVING...' : 'SAVE IDENTITY'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
