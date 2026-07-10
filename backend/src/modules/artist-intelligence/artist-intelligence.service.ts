import { eq, count } from 'drizzle-orm';
import { db } from '../../db';
import { artist_profiles, songs, releases } from '../../db/schema';
import { AppError } from '../../middleware/errorHandler';
import { dispatchEvent } from '../automation/automation.service';
import { AUTOMATION_CATEGORY_EVENTS, type AutomationCategory } from '../automation/automation-categories';
import { getLinksByArtist } from '../music-links/music-links.service';
import type { CreateArtistIntelligenceInput, UpdateArtistIntelligenceInput } from './artist-intelligence.schema';

// Normalizes optional email/url fields that zod allows as '' (for clearing a
// field in a form) into null before hitting the DB.
const blankToNull = <T extends Record<string, unknown>>(input: T): T => {
  const out = { ...input } as Record<string, unknown>;
  for (const key of Object.keys(out)) {
    if (out[key] === '') out[key] = null;
  }
  return out as T;
};

// ── createArtistProfile ───────────────────────────────────────────────────────

export const createArtistProfile = async (input: CreateArtistIntelligenceInput) => {
  const values = blankToNull(input);

  const [artist] = await db
    .insert(artist_profiles)
    .values({
      stage_name: values.stage_name,
      legal_name: values.legal_name,
      bio: values.bio,
      genre: values.genre,
      genres: values.genres ?? [],
      country: values.country,
      countries: values.countries ?? [],
      city: values.city,
      region: values.region,
      verified: values.verified ?? false,
      primary_color: values.primary_color,
      mood_profile: values.mood_profile,
      profile_image: values.profile_image,
      social_links: values.social_links ?? null,
      catalog_status: values.catalog_status ?? 'active',
      management_company: values.management_company,
      management_contact_name: values.management_contact_name,
      management_contact_email: values.management_contact_email,
      management_contact_phone: values.management_contact_phone,
      booking_agent: values.booking_agent,
      booking_contact_email: values.booking_contact_email,
      booking_contact_phone: values.booking_contact_phone,
      label_name: values.label_name,
      publisher_name: values.publisher_name,
      pro_affiliation: values.pro_affiliation,
      press_contact_email: values.press_contact_email,
      distributor_name: values.distributor_name,
      distributor_artist_id: values.distributor_artist_id,
      primary_territory: values.primary_territory,
      territories: values.territories ?? [],
      ipi_number: values.ipi_number,
      isni_code: values.isni_code,
      master_rights_owner: values.master_rights_owner,
      publishing_rights_owner: values.publishing_rights_owner,
      rights_notes: values.rights_notes,
    })
    .returning();

  dispatchEvent('artist.created', { artist_id: artist.id, stage_name: artist.stage_name }).catch(() => {});

  return artist;
};

// ── getArtistIntelligence ─────────────────────────────────────────────────────

export const getArtistIntelligence = async (id: string) => {
  const [profile] = await db.select().from(artist_profiles).where(eq(artist_profiles.id, id)).limit(1);
  if (!profile) throw new AppError('Artist not found', 404);

  const [links, artistReleases, [{ songCount }], [{ releaseCount }]] = await Promise.all([
    getLinksByArtist(id),
    db.select().from(releases).where(eq(releases.artist_id, id)),
    db.select({ songCount: count() }).from(songs).where(eq(songs.artist_id, id)),
    db.select({ releaseCount: count() }).from(releases).where(eq(releases.artist_id, id)),
  ]);

  return {
    profile,
    links,
    releases: artistReleases,
    stats: {
      song_count: Number(songCount),
      release_count: Number(releaseCount),
    },
  };
};

// ── updateArtistProfile ───────────────────────────────────────────────────────

export const updateArtistProfile = async (id: string, input: UpdateArtistIntelligenceInput) => {
  const existing = await db.select({ id: artist_profiles.id }).from(artist_profiles).where(eq(artist_profiles.id, id)).limit(1);
  if (!existing.length) throw new AppError('Artist not found', 404);

  const values = blankToNull(input);

  await db
    .update(artist_profiles)
    .set({ ...values, updated_at: new Date() })
    .where(eq(artist_profiles.id, id));

  dispatchEvent('artist.updated', { artist_id: id }).catch(() => {});

  return getArtistIntelligence(id);
};

// ── dispatchArtistAutomation ──────────────────────────────────────────────────

export const dispatchArtistAutomation = async (
  id: string,
  category: AutomationCategory,
  extra: { notes?: string; metadata?: Record<string, unknown> },
) => {
  const [artist] = await db.select().from(artist_profiles).where(eq(artist_profiles.id, id)).limit(1);
  if (!artist) throw new AppError('Artist not found', 404);

  const event = AUTOMATION_CATEGORY_EVENTS[category];
  const result = await dispatchEvent(event, {
    category,
    artist_id: artist.id,
    stage_name: artist.stage_name,
    notes: extra.notes,
    ...extra.metadata,
  });

  return { category, ...result };
};
