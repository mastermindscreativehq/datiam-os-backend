import { useEffect, useState } from 'react'
import { Field, Input, Textarea } from '../Modal'
import type { ArtistProfile } from './types'

interface Props {
  profile: ArtistProfile
  canWrite: boolean
  onSave: (patch: Record<string, unknown>) => Promise<void>
  saving: boolean
}

const FIELD_KEYS = [
  'management_company', 'management_contact_name', 'management_contact_email', 'management_contact_phone',
  'booking_agent', 'booking_contact_email', 'booking_contact_phone',
  'label_name', 'publisher_name', 'pro_affiliation', 'press_contact_email',
  'ipi_number', 'isni_code', 'master_rights_owner', 'publishing_rights_owner', 'rights_notes',
] as const

type FormState = Record<typeof FIELD_KEYS[number], string>

function buildForm(profile: ArtistProfile): FormState {
  const form = {} as FormState
  for (const key of FIELD_KEYS) form[key] = (profile[key] as string | null) ?? ''
  return form
}

export default function ArtistBusinessRightsTab({ profile, canWrite, onSave, saving }: Props) {
  const [form, setForm] = useState<FormState>(buildForm(profile))

  useEffect(() => { setForm(buildForm(profile)) }, [profile])

  const set = (key: typeof FIELD_KEYS[number]) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }))

  return (
    <div className="space-y-5">
      <div className="border border-fuchsia-400/10 rounded-lg bg-[#0a0a0a] p-5 space-y-4">
        <p className="text-[10px] font-mono text-fuchsia-400/60 tracking-widest">MANAGEMENT &amp; BOOKING</p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Management Company">
            <Input value={form.management_company} onChange={set('management_company')} disabled={!canWrite} />
          </Field>
          <Field label="Management Contact">
            <Input value={form.management_contact_name} onChange={set('management_contact_name')} disabled={!canWrite} />
          </Field>
          <Field label="Management Email">
            <Input value={form.management_contact_email} onChange={set('management_contact_email')} disabled={!canWrite} />
          </Field>
          <Field label="Management Phone">
            <Input value={form.management_contact_phone} onChange={set('management_contact_phone')} disabled={!canWrite} />
          </Field>
          <Field label="Booking Agent">
            <Input value={form.booking_agent} onChange={set('booking_agent')} disabled={!canWrite} />
          </Field>
          <Field label="Booking Email">
            <Input value={form.booking_contact_email} onChange={set('booking_contact_email')} disabled={!canWrite} />
          </Field>
          <Field label="Booking Phone">
            <Input value={form.booking_contact_phone} onChange={set('booking_contact_phone')} disabled={!canWrite} />
          </Field>
          <Field label="Press Contact Email">
            <Input value={form.press_contact_email} onChange={set('press_contact_email')} disabled={!canWrite} />
          </Field>
        </div>
      </div>

      <div className="border border-fuchsia-400/10 rounded-lg bg-[#0a0a0a] p-5 space-y-4">
        <p className="text-[10px] font-mono text-fuchsia-400/60 tracking-widest">LABEL &amp; PUBLISHING</p>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Label Name">
            <Input value={form.label_name} onChange={set('label_name')} disabled={!canWrite} />
          </Field>
          <Field label="Publisher Name">
            <Input value={form.publisher_name} onChange={set('publisher_name')} disabled={!canWrite} />
          </Field>
          <Field label="PRO Affiliation">
            <Input value={form.pro_affiliation} onChange={set('pro_affiliation')} placeholder="e.g. ASCAP, BMI, PRS" disabled={!canWrite} />
          </Field>
        </div>
      </div>

      <div className="border border-fuchsia-400/10 rounded-lg bg-[#0a0a0a] p-5 space-y-4">
        <p className="text-[10px] font-mono text-fuchsia-400/60 tracking-widest">RIGHTS MANAGEMENT</p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="IPI Number">
            <Input value={form.ipi_number} onChange={set('ipi_number')} disabled={!canWrite} />
          </Field>
          <Field label="ISNI Code">
            <Input value={form.isni_code} onChange={set('isni_code')} disabled={!canWrite} />
          </Field>
          <Field label="Master Rights Owner">
            <Input value={form.master_rights_owner} onChange={set('master_rights_owner')} disabled={!canWrite} />
          </Field>
          <Field label="Publishing Rights Owner">
            <Input value={form.publishing_rights_owner} onChange={set('publishing_rights_owner')} disabled={!canWrite} />
          </Field>
        </div>
        <Field label="Rights Notes">
          <Textarea value={form.rights_notes} onChange={set('rights_notes')} rows={3} disabled={!canWrite} />
        </Field>
      </div>

      {canWrite && (
        <div className="flex justify-end">
          <button
            onClick={() => onSave(form)}
            disabled={saving}
            className="text-[10px] font-mono tracking-widest px-5 py-2 border border-fuchsia-400/40 text-fuchsia-400 hover:bg-fuchsia-400/10 rounded transition-colors disabled:opacity-50"
          >
            {saving ? 'SAVING...' : 'SAVE BUSINESS & RIGHTS'}
          </button>
        </div>
      )}
    </div>
  )
}
