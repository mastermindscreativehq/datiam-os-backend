import { eq, and, isNull, inArray } from 'drizzle-orm';
import { db } from '../../db';
import {
  distribution_identifiers,
  distribution_deliveries,
  distribution_territories,
  distribution_takedowns,
  distribution_health,
  delivery_logs,
} from '../../db/schema';
import { AppError } from '../../middleware/errorHandler';
import type {
  CreateIdentifierInput,
  CreateDeliveryInput,
  UpdateDeliveryStatusInput,
  AddTerritoryInput,
  UpdateTerritoryStatusInput,
  RequestTakedownInput,
  UpdateTakedownStatusInput,
  UpsertHealthInput,
  LogDeliveryEventInput,
} from './distribution.schema';

// ── identifiers ───────────────────────────────────────────────────────────────
// The sole canonical source of ISRC/UPC/ISWC/catalog-number (Phase 7). Every
// other module resolves identifiers by calling the functions below — never by
// querying `distribution_identifiers` directly. `catalog_identifiers` and the
// isrc/upc/primary_isrc columns on `releases`/`songs` are deprecated
// rollback references, kept in sync by dual-write until Phase 7d.
//
// A release's "lead ISRC" (the recording that represents the release for
// chart/DDEX purposes — the replacement for the old bare `releases.primary_isrc`
// string) is NOT a second copy of an ISRC value. It is the `is_lead` flag set
// on that song's own canonical isrc row, with `release_id` on that same row
// identifying which release it's the lead for. One row, one value, always
// consistent — there is nothing else to keep in sync.

const isUniqueViolation = (err: unknown): boolean =>
  typeof err === 'object' && err !== null && (err as { code?: string }).code === '23505';

export const createIdentifier = async (input: CreateIdentifierInput) => {
  const { song_id, release_id, identifier_type, value, assigned_by } = input;

  // isrc (per song) and upc (per release) are Distribution's single-value
  // canonical identifiers — re-assigning one updates the existing canonical
  // row instead of creating a duplicate that the unique indexes would reject.
  if (identifier_type === 'isrc' && song_id) {
    return setIsrcForSong(song_id, value, { assignedBy: assigned_by });
  }
  if (identifier_type === 'upc' && release_id) {
    return setUpcForRelease(release_id, value, { assignedBy: assigned_by });
  }

  try {
    const [identifier] = await db
      .insert(distribution_identifiers)
      .values({ song_id, release_id, identifier_type, value, assigned_by, assigned_at: new Date() })
      .returning();
    return identifier;
  } catch (err) {
    if (isUniqueViolation(err)) throw new AppError('An identifier of this type already exists for this song/release', 409);
    throw err;
  }
};

export const getIdentifiersBySong = async (songId: string) => {
  return db.select().from(distribution_identifiers).where(eq(distribution_identifiers.song_id, songId));
};

export const getIdentifiersByRelease = async (releaseId: string) => {
  return db.select().from(distribution_identifiers).where(eq(distribution_identifiers.release_id, releaseId));
};

export const deleteIdentifier = async (id: string) => {
  const [deleted] = await db.delete(distribution_identifiers).where(eq(distribution_identifiers.id, id)).returning();
  if (!deleted) throw new AppError('Distribution identifier not found', 404);
  return { deleted: true, id };
};

// ── canonical UPC (per release) ─────────────────────────────────────────────

export const getUpcForRelease = async (releaseId: string) => {
  const [row] = await db.select().from(distribution_identifiers)
    .where(and(eq(distribution_identifiers.release_id, releaseId), eq(distribution_identifiers.identifier_type, 'upc')))
    .limit(1);
  return row ?? null;
};

export const setUpcForRelease = async (releaseId: string, value: string, opts: { assignedBy?: string } = {}) => {
  const [existing] = await db.select().from(distribution_identifiers)
    .where(and(eq(distribution_identifiers.release_id, releaseId), eq(distribution_identifiers.identifier_type, 'upc')))
    .limit(1);

  if (existing) {
    const [updated] = await db.update(distribution_identifiers)
      .set({ value, assigned_by: opts.assignedBy ?? existing.assigned_by, assigned_at: new Date(), updated_at: new Date() })
      .where(eq(distribution_identifiers.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db.insert(distribution_identifiers)
    .values({ release_id: releaseId, identifier_type: 'upc', value, assigned_by: opts.assignedBy, assigned_at: new Date() })
    .returning();
  return created;
};

export const getUpcMapForReleases = async (releaseIds: string[]): Promise<Map<string, string>> => {
  if (!releaseIds.length) return new Map();
  const rows = await db.select().from(distribution_identifiers)
    .where(and(inArray(distribution_identifiers.release_id, releaseIds), eq(distribution_identifiers.identifier_type, 'upc')));
  return new Map(rows.filter((r): r is typeof r & { release_id: string } => r.release_id !== null).map(r => [r.release_id, r.value]));
};

// ── canonical ISRC (per song) ────────────────────────────────────────────────

export const getIsrcForSong = async (songId: string) => {
  const [row] = await db.select().from(distribution_identifiers)
    .where(and(eq(distribution_identifiers.song_id, songId), eq(distribution_identifiers.identifier_type, 'isrc')))
    .limit(1);
  return row ?? null;
};

export const setIsrcForSong = async (songId: string, value: string, opts: { assignedBy?: string } = {}) => {
  const [existing] = await db.select().from(distribution_identifiers)
    .where(and(eq(distribution_identifiers.song_id, songId), eq(distribution_identifiers.identifier_type, 'isrc')))
    .limit(1);

  if (existing) {
    const [updated] = await db.update(distribution_identifiers)
      .set({ value, assigned_by: opts.assignedBy ?? existing.assigned_by, assigned_at: new Date(), updated_at: new Date() })
      .where(eq(distribution_identifiers.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db.insert(distribution_identifiers)
    .values({ song_id: songId, identifier_type: 'isrc', value, assigned_by: opts.assignedBy, assigned_at: new Date() })
    .returning();
  return created;
};

export const getIsrcMapForSongs = async (songIds: string[]): Promise<Map<string, string>> => {
  if (!songIds.length) return new Map();
  const rows = await db.select().from(distribution_identifiers)
    .where(and(inArray(distribution_identifiers.song_id, songIds), eq(distribution_identifiers.identifier_type, 'isrc')));
  return new Map(rows.filter((r): r is typeof r & { song_id: string } => r.song_id !== null).map(r => [r.song_id, r.value]));
};

// ── lead ISRC (per release) ──────────────────────────────────────────────────
// Replaces `releases.primary_isrc`. See file header — this flags an existing
// song-scoped isrc row rather than storing a second copy of the value.

export const getLeadIsrcForRelease = async (releaseId: string) => {
  const [row] = await db.select().from(distribution_identifiers)
    .where(and(
      eq(distribution_identifiers.release_id, releaseId),
      eq(distribution_identifiers.identifier_type, 'isrc'),
      eq(distribution_identifiers.is_lead, true),
    ))
    .limit(1);
  return row ?? null;
};

export const getLeadIsrcMapForReleases = async (releaseIds: string[]): Promise<Map<string, string>> => {
  if (!releaseIds.length) return new Map();
  const rows = await db.select().from(distribution_identifiers)
    .where(and(
      inArray(distribution_identifiers.release_id, releaseIds),
      eq(distribution_identifiers.identifier_type, 'isrc'),
      eq(distribution_identifiers.is_lead, true),
    ));
  return new Map(rows.filter((r): r is typeof r & { release_id: string } => r.release_id !== null).map(r => [r.release_id, r.value]));
};

// Designates the lead recording for a release. If `songId` is known, the
// flag (and, if given, a new value) is applied to that song's own canonical
// isrc row. If not, a release-scoped row (song_id null) holds the value —
// still a single row, just without song attribution — so the value is never
// lost even when the caller only has a bare ISRC string (e.g. a legacy
// `primary_isrc` write with no song reference).
export const setLeadIsrcForRelease = async (
  releaseId: string,
  value: string,
  opts: { songId?: string; assignedBy?: string } = {},
) => {
  await db.update(distribution_identifiers)
    .set({ is_lead: false, updated_at: new Date() })
    .where(and(
      eq(distribution_identifiers.release_id, releaseId),
      eq(distribution_identifiers.identifier_type, 'isrc'),
      eq(distribution_identifiers.is_lead, true),
    ));

  if (opts.songId) {
    const [existing] = await db.select().from(distribution_identifiers)
      .where(and(eq(distribution_identifiers.song_id, opts.songId), eq(distribution_identifiers.identifier_type, 'isrc')))
      .limit(1);

    if (existing) {
      const [updated] = await db.update(distribution_identifiers)
        .set({
          release_id: releaseId,
          is_lead: true,
          value,
          assigned_by: opts.assignedBy ?? existing.assigned_by,
          assigned_at: new Date(),
          updated_at: new Date(),
        })
        .where(eq(distribution_identifiers.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await db.insert(distribution_identifiers)
      .values({
        song_id: opts.songId,
        release_id: releaseId,
        identifier_type: 'isrc',
        value,
        is_lead: true,
        assigned_by: opts.assignedBy,
        assigned_at: new Date(),
      })
      .returning();
    return created;
  }

  const [existingReleaseRow] = await db.select().from(distribution_identifiers)
    .where(and(
      eq(distribution_identifiers.release_id, releaseId),
      eq(distribution_identifiers.identifier_type, 'isrc'),
      isNull(distribution_identifiers.song_id),
    ))
    .limit(1);

  if (existingReleaseRow) {
    const [updated] = await db.update(distribution_identifiers)
      .set({ value, is_lead: true, assigned_by: opts.assignedBy ?? existingReleaseRow.assigned_by, assigned_at: new Date(), updated_at: new Date() })
      .where(eq(distribution_identifiers.id, existingReleaseRow.id))
      .returning();
    return updated;
  }

  const [created] = await db.insert(distribution_identifiers)
    .values({ release_id: releaseId, identifier_type: 'isrc', value, is_lead: true, assigned_by: opts.assignedBy, assigned_at: new Date() })
    .returning();
  return created;
};

// ── identifier readiness ─────────────────────────────────────────────────────
// Seam for a future phase: `release_checklists.isrc_ready`/`upc_ready` stay
// manually-toggled for now (no behavior change in Phase 7), but they can be
// swapped to call this instead — without any further schema or data work —
// once that's a deliberate product decision rather than a migration side effect.
export const getIdentifierReadiness = async (releaseId: string) => {
  const [lead, upc] = await Promise.all([getLeadIsrcForRelease(releaseId), getUpcForRelease(releaseId)]);
  return { isrc_ready: !!lead, upc_ready: !!upc };
};

// ── deliveries ────────────────────────────────────────────────────────────────

export const createDelivery = async (input: CreateDeliveryInput) => {
  const [delivery] = await db.insert(distribution_deliveries).values(input).returning();
  return delivery;
};

export const getDeliveriesByRelease = async (releaseId: string) => {
  return db.select().from(distribution_deliveries).where(eq(distribution_deliveries.release_id, releaseId));
};

export const getDeliveryById = async (id: string) => {
  const [delivery] = await db.select().from(distribution_deliveries).where(eq(distribution_deliveries.id, id));
  if (!delivery) throw new AppError('Distribution delivery not found', 404);
  return delivery;
};

export const updateDeliveryStatus = async (id: string, input: UpdateDeliveryStatusInput) => {
  const [updated] = await db
    .update(distribution_deliveries)
    .set({
      status: input.status,
      delivered_at: input.status === 'delivered' ? new Date() : undefined,
      updated_at: new Date(),
    })
    .where(eq(distribution_deliveries.id, id))
    .returning();
  if (!updated) throw new AppError('Distribution delivery not found', 404);
  return updated;
};

// ── territories ───────────────────────────────────────────────────────────────

export const addTerritory = async (input: AddTerritoryInput) => {
  const [territory] = await db
    .insert(distribution_territories)
    .values({
      ...input,
      effective_at: input.status === 'available' ? new Date() : undefined,
    })
    .returning();
  return territory;
};

export const getTerritoriesByDelivery = async (deliveryId: string) => {
  return db.select().from(distribution_territories).where(eq(distribution_territories.delivery_id, deliveryId));
};

export const updateTerritoryStatus = async (id: string, input: UpdateTerritoryStatusInput) => {
  const [updated] = await db
    .update(distribution_territories)
    .set({
      status: input.status,
      effective_at: input.status === 'available' ? new Date() : undefined,
    })
    .where(eq(distribution_territories.id, id))
    .returning();
  if (!updated) throw new AppError('Distribution territory not found', 404);
  return updated;
};

// ── takedowns ─────────────────────────────────────────────────────────────────

export const requestTakedown = async (input: RequestTakedownInput) => {
  const [takedown] = await db.insert(distribution_takedowns).values(input).returning();
  return takedown;
};

export const getTakedownsByDelivery = async (deliveryId: string) => {
  return db.select().from(distribution_takedowns).where(eq(distribution_takedowns.delivery_id, deliveryId));
};

export const updateTakedownStatus = async (id: string, input: UpdateTakedownStatusInput) => {
  const [updated] = await db
    .update(distribution_takedowns)
    .set({
      status: input.status,
      completed_at: input.status === 'completed' ? new Date() : undefined,
    })
    .where(eq(distribution_takedowns.id, id))
    .returning();
  if (!updated) throw new AppError('Distribution takedown not found', 404);
  return updated;
};

// ── health ────────────────────────────────────────────────────────────────────

export const upsertHealth = async (input: UpsertHealthInput) => {
  const [health] = await db
    .insert(distribution_health)
    .values({
      release_id: input.release_id,
      overall_status: input.overall_status,
      details: input.details ?? {},
    })
    .onConflictDoUpdate({
      target: distribution_health.release_id,
      set: {
        overall_status: input.overall_status,
        details: input.details ?? {},
        last_checked_at: new Date(),
        updated_at: new Date(),
      },
    })
    .returning();
  return health;
};

export const getHealthByRelease = async (releaseId: string) => {
  const [health] = await db.select().from(distribution_health).where(eq(distribution_health.release_id, releaseId));
  return health ?? null;
};

// ── delivery logs ─────────────────────────────────────────────────────────────

export const logDeliveryEvent = async (input: LogDeliveryEventInput) => {
  const [log] = await db
    .insert(delivery_logs)
    .values({ ...input, payload: input.payload ?? {} })
    .returning();
  return log;
};

export const getLogsByDelivery = async (deliveryId: string) => {
  return db.select().from(delivery_logs).where(eq(delivery_logs.delivery_id, deliveryId));
};
