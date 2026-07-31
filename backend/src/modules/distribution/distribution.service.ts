import { eq } from 'drizzle-orm';
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
// Canonical source of ISRC/UPC/ISWC going forward. `catalog_identifiers` and
// `releases.isrc/upc/primary_isrc` are not written by this module — that
// consolidation is Phase 7 of the architecture roadmap, not part of this build.

export const createIdentifier = async (input: CreateIdentifierInput) => {
  const [identifier] = await db
    .insert(distribution_identifiers)
    .values({ ...input, assigned_at: new Date() })
    .returning();
  return identifier;
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
