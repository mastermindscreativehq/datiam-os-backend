import { useEffect, useState } from 'react'
import { Field, Input } from '../Modal'
import type { ArtistProfile } from './types'

interface Props {
  profile: ArtistProfile
  canWrite: boolean
  onSave: (patch: Record<string, unknown>) => Promise<void>
  saving: boolean
}

export default function ArtistDistributionTab({ profile, canWrite, onSave, saving }: Props) {
  const [form, setForm] = useState({
    distributor_name: profile.distributor_name ?? '',
    distributor_artist_id: profile.distributor_artist_id ?? '',
    primary_territory: profile.primary_territory ?? '',
    territories: (profile.territories ?? []).join(', '),
  })

  useEffect(() => {
    setForm({
      distributor_name: profile.distributor_name ?? '',
      distributor_artist_id: profile.distributor_artist_id ?? '',
      primary_territory: profile.primary_territory ?? '',
      territories: (profile.territories ?? []).join(', '),
    })
  }, [profile])

  const handleSave = () => onSave({
    distributor_name: form.distributor_name,
    distributor_artist_id: form.distributor_artist_id,
    primary_territory: form.primary_territory,
    territories: form.territories.split(',').map(t => t.trim()).filter(Boolean),
  })

  return (
    <div className="space-y-5">
      <div className="border border-fuchsia-400/10 rounded-lg bg-[#0a0a0a] p-5 space-y-4">
        <p className="text-[10px] font-mono text-fuchsia-400/60 tracking-widest">DISTRIBUTION</p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Distributor">
            <Input
              value={form.distributor_name}
              onChange={(e) => setForm(f => ({ ...f, distributor_name: e.target.value }))}
              placeholder="e.g. DistroKid, Amuse, Vydia"
              disabled={!canWrite}
            />
          </Field>
          <Field label="Distributor Artist ID">
            <Input
              value={form.distributor_artist_id}
              onChange={(e) => setForm(f => ({ ...f, distributor_artist_id: e.target.value }))}
              disabled={!canWrite}
            />
          </Field>
        </div>
        <Field label="Primary Territory">
          <Input
            value={form.primary_territory}
            onChange={(e) => setForm(f => ({ ...f, primary_territory: e.target.value }))}
            placeholder="e.g. US, NG, Global"
            disabled={!canWrite}
          />
        </Field>
        <Field label="Territories" hint="Comma-separated list, e.g. US, GB, NG, ZA">
          <Input
            value={form.territories}
            onChange={(e) => setForm(f => ({ ...f, territories: e.target.value }))}
            disabled={!canWrite}
          />
        </Field>
      </div>

      {canWrite && (
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-[10px] font-mono tracking-widest px-5 py-2 border border-fuchsia-400/40 text-fuchsia-400 hover:bg-fuchsia-400/10 rounded transition-colors disabled:opacity-50"
          >
            {saving ? 'SAVING...' : 'SAVE DISTRIBUTION'}
          </button>
        </div>
      )}
    </div>
  )
}
