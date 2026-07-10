import { eq, and, asc, sql } from 'drizzle-orm';
import { db } from '../../db';
import { music_links } from '../../db/schema';
import { AppError } from '../../middleware/errorHandler';
import { dispatchEvent } from '../automation/automation.service';
import type {
  CreateMusicLinkInput,
  UpdateMusicLinkInput,
  ReorderMusicLinksInput,
  MusicLinkQuery,
} from './music-links.schema';
import { MUSIC_LINK_CATEGORIES } from './music-links.schema';

type GroupedLinks = Record<(typeof MUSIC_LINK_CATEGORIES)[number], (typeof music_links.$inferSelect)[]>;

const emptyGroups = (): GroupedLinks =>
  MUSIC_LINK_CATEGORIES.reduce((acc, cat) => {
    acc[cat] = [];
    return acc;
  }, {} as GroupedLinks);

const groupByCategory = (rows: (typeof music_links.$inferSelect)[]): GroupedLinks => {
  const groups = emptyGroups();
  for (const row of rows) {
    groups[row.link_category].push(row);
  }
  return groups;
};

// ── list (filterable) ────────────────────────────────────────────────────────

export const listMusicLinks = async (query: MusicLinkQuery) => {
  const conditions = [];
  if (query.artist_id) conditions.push(eq(music_links.artist_id, query.artist_id));
  if (query.release_id) conditions.push(eq(music_links.release_id, query.release_id));
  if (query.link_category) conditions.push(eq(music_links.link_category, query.link_category));
  if (query.platform) conditions.push(eq(music_links.platform, query.platform));
  if (query.is_active !== undefined) conditions.push(eq(music_links.is_active, query.is_active === 'true'));

  const where = conditions.length ? and(...conditions) : undefined;

  return db
    .select()
    .from(music_links)
    .where(where)
    .orderBy(asc(music_links.display_order), asc(music_links.created_at));
};

// ── grouped-by-category convenience getters ─────────────────────────────────

export const getLinksByArtist = async (artistId: string) => {
  const rows = await db
    .select()
    .from(music_links)
    .where(eq(music_links.artist_id, artistId))
    .orderBy(asc(music_links.display_order), asc(music_links.created_at));

  return groupByCategory(rows);
};

export const getLinksByRelease = async (releaseId: string) => {
  const rows = await db
    .select()
    .from(music_links)
    .where(eq(music_links.release_id, releaseId))
    .orderBy(asc(music_links.display_order), asc(music_links.created_at));

  return groupByCategory(rows);
};

// ── CRUD ──────────────────────────────────────────────────────────────────────

export const getMusicLinkById = async (id: string) => {
  const [row] = await db.select().from(music_links).where(eq(music_links.id, id)).limit(1);
  if (!row) throw new AppError('Music link not found', 404);
  return row;
};

export const createMusicLink = async (input: CreateMusicLinkInput) => {
  const [row] = await db
    .insert(music_links)
    .values({
      artist_id: input.artist_id ?? null,
      release_id: input.release_id ?? null,
      link_category: input.link_category,
      platform: input.platform,
      url: input.url,
      label: input.label ?? null,
      is_primary: input.is_primary,
      is_active: input.is_active,
      territory: input.territory ?? null,
      display_order: input.display_order,
      metadata: input.metadata,
    })
    .returning();

  dispatchEvent('music_links.created', {
    link_id: row.id,
    artist_id: row.artist_id,
    release_id: row.release_id,
    link_category: row.link_category,
    platform: row.platform,
  }).catch(() => {});

  return row;
};

export const updateMusicLink = async (id: string, input: UpdateMusicLinkInput) => {
  const existing = await db.select({ id: music_links.id }).from(music_links).where(eq(music_links.id, id)).limit(1);
  if (!existing.length) throw new AppError('Music link not found', 404);

  const [row] = await db
    .update(music_links)
    .set({ ...input, updated_at: new Date() })
    .where(eq(music_links.id, id))
    .returning();

  dispatchEvent('music_links.updated', {
    link_id: row.id,
    artist_id: row.artist_id,
    release_id: row.release_id,
    link_category: row.link_category,
    platform: row.platform,
  }).catch(() => {});

  return row;
};

export const deleteMusicLink = async (id: string) => {
  const [deleted] = await db.delete(music_links).where(eq(music_links.id, id)).returning();
  if (!deleted) throw new AppError('Music link not found', 404);

  dispatchEvent('music_links.deleted', {
    link_id: deleted.id,
    artist_id: deleted.artist_id,
    release_id: deleted.release_id,
    link_category: deleted.link_category,
    platform: deleted.platform,
  }).catch(() => {});

  return { id: deleted.id, deleted: true };
};

export const reorderMusicLinks = async (order: ReorderMusicLinksInput) => {
  await Promise.all(
    order.map(({ id, display_order }) =>
      db.update(music_links).set({ display_order, updated_at: new Date() }).where(eq(music_links.id, id)),
    ),
  );
  return { reordered: order.length };
};
