import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { artist_profiles } from '../../db/schema';
import { AppError } from '../../middleware/errorHandler';
import { dispatchEvent } from '../automation/automation.service';
import type { CreateArtistInput, UpdateArtistInput } from './artists.schema';

// ── Shared artist write core ──────────────────────────────────────────────────
//
// This is the ONE place that INSERTs/UPDATEs/DELETEs `artist_profiles`.
// catalog-engine's `/api/catalog/artists` v2 API used to run its own
// independent write logic against the same table (this module's legacy
// `/api/artists` never set genres/countries/catalog_status; v2 never
// dispatched `artist.created`/`artist.updated` through this module) — same
// divergence pattern already fixed once for `songs`. catalog-engine still
// owns its own request-schema validation and read-side enrichment
// (getArtistById, getArtistStats, etc.); it just delegates the write here.
//
// `genres`/`countries`/`catalog_status` are real typed columns on the
// Drizzle `artist_profiles` model — a prior version of this file cast them
// via raw sql`` (`${JSON.stringify(genres)}::text[]`), which throws a
// Postgres "malformed array literal" error since JSON array syntax isn't
// Postgres array syntax. Found via live testing during Phase 4; removed —
// they now flow through the normal `.values()`/`.set()` path like every
// other column.

export interface ArtistCoreWriteInput {
  stage_name?: string;
  legal_name?: string;
  bio?: string;
  genre?: string;
  country?: string;
  primary_color?: string;
  mood_profile?: string;
  social_links?: Record<string, unknown> | null;
  profile_image?: string;
  is_active?: boolean;
  genres?: string[];
  countries?: string[];
  catalog_status?: 'active' | 'inactive' | 'archived';
  // Artist Intelligence v1 (migration 0051) fields — plain typed columns on
  // artist_profiles, unlike genres/countries/catalog_status above, so they
  // flow through the normal insert/update `rest` spread, no raw sql`` needed.
  city?: string;
  region?: string;
  verified?: boolean;
  management_company?: string;
  management_contact_name?: string;
  management_contact_email?: string;
  management_contact_phone?: string;
  booking_agent?: string;
  booking_contact_email?: string;
  booking_contact_phone?: string;
  label_name?: string;
  publisher_name?: string;
  pro_affiliation?: string;
  press_contact_email?: string;
  distributor_name?: string;
  distributor_artist_id?: string;
  primary_territory?: string;
  territories?: unknown[];
  ipi_number?: string;
  isni_code?: string;
  master_rights_owner?: string;
  publishing_rights_owner?: string;
  rights_notes?: string;
}

export const createArtistCore = async (input: ArtistCoreWriteInput) => {
  // genres/countries/catalog_status are real typed columns on artist_profiles
  // (text[]/text[]/text) — no raw sql`` cast needed, unlike the comment above
  // used to claim. An earlier version of this function cast them via
  // `${JSON.stringify(genres)}::text[]`, which throws a Postgres "malformed
  // array literal" error (JSON array syntax isn't Postgres array syntax) —
  // found via live testing during Phase 4. Plain `.values()` handles a JS
  // array for a text[] column correctly.
  const [artist] = await db
    .insert(artist_profiles)
    .values(input as typeof artist_profiles.$inferInsert)
    .returning();

  dispatchEvent('artist.created', { artist_id: artist.id, stage_name: artist.stage_name }).catch(() => {});

  return artist;
};

export const updateArtistCore = async (id: string, input: ArtistCoreWriteInput) => {
  const existing = await db
    .select({ id: artist_profiles.id })
    .from(artist_profiles)
    .where(eq(artist_profiles.id, id))
    .limit(1);
  if (!existing.length) throw new AppError('Artist not found', 404);

  const coreUpdate: Record<string, unknown> = { ...input, updated_at: new Date() };

  if (Object.keys(coreUpdate).length > 1) {
    await db.update(artist_profiles).set(coreUpdate).where(eq(artist_profiles.id, id));
  }

  dispatchEvent('artist.updated', { artist_id: id }).catch(() => {});

  const [row] = await db.select().from(artist_profiles).where(eq(artist_profiles.id, id)).limit(1);
  return row;
};

export const deleteArtistCore = async (id: string) => {
  const [deleted] = await db.delete(artist_profiles).where(eq(artist_profiles.id, id)).returning();
  if (!deleted) throw new AppError('Artist not found', 404);
  return deleted;
};

// ── Legacy `/api/artists` surface — validates via artists.schema, delegates
// the actual write to the core above ──────────────────────────────────────────

export const listArtists = async () => {
  return db.select().from(artist_profiles).orderBy(artist_profiles.created_at);
};

export const createProfile = async (input: CreateArtistInput) => {
  return createArtistCore(input);
};

export const updateProfile = async (id: string, input: UpdateArtistInput) => {
  return updateArtistCore(id, input);
};

export const deleteProfile = async (id: string) => {
  return deleteArtistCore(id);
};
