import { eq, count } from 'drizzle-orm';
import { db } from '../../db';
import { artist_profiles, songs, releases } from '../../db/schema';
import { AppError } from '../../middleware/errorHandler';
import { createArtistCore, updateArtistCore } from '../artists/artists.service';
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
  return createArtistCore({
    ...values,
    genres: values.genres ?? [],
    countries: values.countries ?? [],
    verified: values.verified ?? false,
    social_links: values.social_links ?? null,
    catalog_status: values.catalog_status ?? 'active',
    territories: values.territories ?? [],
  });
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
  const values = blankToNull(input);
  await updateArtistCore(id, values);
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
