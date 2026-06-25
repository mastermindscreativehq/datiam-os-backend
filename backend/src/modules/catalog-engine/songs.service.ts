import { eq, ilike, and, desc, asc, sql, count } from 'drizzle-orm';
import { db } from '../../db';
import {
  songs,
  song_assets,
  artist_profiles,
  catalog_credits,
  catalog_documents,
  catalog_identifiers,
} from '../../db/schema';
import { AppError } from '../../middleware/errorHandler';
import { dispatchEvent } from '../automation/automation.service';
import type {
  CreateSongInputV2,
  UpdateSongInputV2,
  CreateCreditInput,
  UpdateCreditInput,
  CreateDocumentInput,
  CreateIdentifierInput,
  CatalogQuery,
} from './catalog-engine.schema';

// ── helpers ───────────────────────────────────────────────────────────────────

function buildOrder(sort: string, order: 'asc' | 'desc') {
  const dir = order === 'asc' ? asc : desc;
  switch (sort) {
    case 'title':      return dir(songs.title);
    case 'updated_at': return dir(songs.updated_at);
    default:           return dir(songs.created_at);
  }
}

// ── createSong ────────────────────────────────────────────────────────────────

export const createSong = async (input: CreateSongInputV2) => {
  const { writers, producers, tags, ...rest } = input;

  const [song] = await db
    .insert(songs)
    .values(rest)
    .returning();

  // Set migration-added array columns
  await db.execute(sql`
    UPDATE songs
    SET
      writers   = ${JSON.stringify(writers ?? [])}::text[],
      producers = ${JSON.stringify(producers ?? [])}::text[],
      tags      = ${JSON.stringify(tags ?? [])}::text[]
    WHERE id = ${song.id}
  `);

  dispatchEvent('song.created', { song_id: song.id, title: song.title, artist_id: song.artist_id }).catch(() => {});

  return getSongById(song.id);
};

// ── getSongs ──────────────────────────────────────────────────────────────────

export const getSongs = async (query: CatalogQuery) => {
  const page  = query.page  ?? 1;
  const limit = query.limit ?? 20;
  const order = query.order ?? 'desc';
  const sort  = query.sort  ?? 'created_at';
  const offset = (page - 1) * limit;

  const conditions = [];
  if (query.search)    conditions.push(ilike(songs.title, `%${query.search}%`));
  if (query.artist_id) conditions.push(eq(songs.artist_id, query.artist_id));
  if (query.status)    conditions.push(eq(songs.release_status, query.status as 'draft' | 'registered' | 'distributed' | 'released' | 'archived'));
  if (query.genre)     conditions.push(eq(songs.genre, query.genre));

  const where = conditions.length ? and(...conditions) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db.execute<Record<string, unknown>>(sql`
      SELECT
        s.*,
        COALESCE(s.writers, '{}')   AS writers,
        COALESCE(s.producers, '{}') AS producers,
        COALESCE(s.tags, '{}')      AS tags,
        ap.stage_name               AS artist_name
      FROM songs s
      LEFT JOIN artist_profiles ap ON ap.id = s.artist_id
      ${where ? sql`WHERE ${where}` : sql``}
      ORDER BY s.${sql.raw(sort === 'title' ? 'title' : sort === 'updated_at' ? 'updated_at' : 'created_at')} ${sql.raw(order === 'asc' ? 'ASC' : 'DESC')}
      LIMIT ${limit} OFFSET ${offset}
    `),
    db.select({ total: count() }).from(songs).where(where),
  ]);

  return {
    data: rows,
    pagination: { page, limit, total: Number(total), pages: Math.ceil(Number(total) / limit) },
  };
};

// ── getSongById ───────────────────────────────────────────────────────────────

export const getSongById = async (id: string) => {
  const [song] = await db.execute<Record<string, unknown>>(sql`
    SELECT
      s.*,
      COALESCE(s.writers, '{}')   AS writers,
      COALESCE(s.producers, '{}') AS producers,
      COALESCE(s.tags, '{}')      AS tags,
      ap.stage_name               AS artist_name,
      ap.profile_image            AS artist_image
    FROM songs s
    LEFT JOIN artist_profiles ap ON ap.id = s.artist_id
    WHERE s.id = ${id}
    LIMIT 1
  `);

  if (!song) throw new AppError('Song not found', 404);

  const [credits, identifiers, assets] = await Promise.all([
    getSongCredits(id),
    getSongIdentifiers(id),
    getSongAssets(id),
  ]);

  return { ...song, credits, identifiers, assets };
};

// ── updateSong ────────────────────────────────────────────────────────────────

export const updateSong = async (id: string, input: UpdateSongInputV2) => {
  const existing = await db.select({ id: songs.id }).from(songs).where(eq(songs.id, id)).limit(1);
  if (!existing.length) throw new AppError('Song not found', 404);

  const { writers, producers, tags, ...rest } = input;

  const coreUpdate: Record<string, unknown> = { ...rest, updated_at: new Date() };
  if (Object.keys(coreUpdate).length > 1) {
    await db.update(songs).set(coreUpdate).where(eq(songs.id, id));
  }

  const hasArrayCols = writers !== undefined || producers !== undefined || tags !== undefined;
  if (hasArrayCols) {
    await db.execute(sql`
      UPDATE songs
      SET
        writers   = CASE WHEN ${writers !== undefined}   THEN ${JSON.stringify(writers ?? [])}::text[]   ELSE writers   END,
        producers = CASE WHEN ${producers !== undefined} THEN ${JSON.stringify(producers ?? [])}::text[] ELSE producers END,
        tags      = CASE WHEN ${tags !== undefined}      THEN ${JSON.stringify(tags ?? [])}::text[]      ELSE tags      END
      WHERE id = ${id}
    `);
  }

  dispatchEvent('song.updated', { song_id: id }).catch(() => {});

  return getSongById(id);
};

// ── deleteSong ────────────────────────────────────────────────────────────────

export const deleteSong = async (id: string) => {
  const [deleted] = await db
    .delete(songs)
    .where(eq(songs.id, id))
    .returning({ id: songs.id });

  if (!deleted) throw new AppError('Song not found', 404);
  return { id: deleted.id, deleted: true };
};

// ── Song Assets ───────────────────────────────────────────────────────────────

export const getSongAssets = async (id: string) => {
  return db
    .select()
    .from(song_assets)
    .where(eq(song_assets.song_id, id))
    .orderBy(desc(song_assets.created_at));
};

export const addSongAsset = async (songId: string, data: { asset_type: string; file_url: string; storage_provider?: string; notes?: string }) => {
  const [existing] = await db.select({ id: songs.id }).from(songs).where(eq(songs.id, songId)).limit(1);
  if (!existing) throw new AppError('Song not found', 404);

  const [asset] = await db
    .insert(song_assets)
    .values({
      song_id:          songId,
      asset_type:       data.asset_type as 'wav' | 'mp3' | 'stem' | 'instrumental' | 'clean' | 'acapella' | 'cover_art' | 'visualizer' | 'lyrics_doc',
      file_url:         data.file_url,
      storage_provider: data.storage_provider,
      notes:            data.notes,
    })
    .returning();

  return asset;
};

// ── Song Credits ──────────────────────────────────────────────────────────────

export const getSongCredits = async (id: string) => {
  return db
    .select()
    .from(catalog_credits)
    .where(eq(catalog_credits.song_id, id))
    .orderBy(asc(catalog_credits.created_at));
};

export const addSongCredit = async (songId: string, input: CreateCreditInput) => {
  const [existing] = await db.select({ id: songs.id }).from(songs).where(eq(songs.id, songId)).limit(1);
  if (!existing) throw new AppError('Song not found', 404);

  const [credit] = await db
    .insert(catalog_credits)
    .values({
      ...input,
      song_id: songId,
      split_percentage: input.split_percentage != null ? String(input.split_percentage) : undefined,
    })
    .returning();

  dispatchEvent('credit.updated', { song_id: songId, credit_id: credit.id }).catch(() => {});

  return credit;
};

export const updateSongCredit = async (creditId: string, input: UpdateCreditInput) => {
  const [existing] = await db
    .select({ id: catalog_credits.id })
    .from(catalog_credits)
    .where(eq(catalog_credits.id, creditId))
    .limit(1);

  if (!existing) throw new AppError('Credit not found', 404);

  const [updated] = await db
    .update(catalog_credits)
    .set({
      ...input,
      updated_at: new Date(),
      split_percentage: input.split_percentage != null ? String(input.split_percentage) : undefined,
    })
    .where(eq(catalog_credits.id, creditId))
    .returning();

  return updated;
};

export const deleteSongCredit = async (creditId: string) => {
  const [deleted] = await db
    .delete(catalog_credits)
    .where(eq(catalog_credits.id, creditId))
    .returning({ id: catalog_credits.id });

  if (!deleted) throw new AppError('Credit not found', 404);
  return { id: deleted.id, deleted: true };
};

// ── Song Documents ────────────────────────────────────────────────────────────

export const getSongDocuments = async (id: string) => {
  return db
    .select()
    .from(catalog_documents)
    .where(eq(catalog_documents.song_id, id))
    .orderBy(desc(catalog_documents.created_at));
};

export const addSongDocument = async (songId: string, input: CreateDocumentInput) => {
  const [existing] = await db.select({ id: songs.id }).from(songs).where(eq(songs.id, songId)).limit(1);
  if (!existing) throw new AppError('Song not found', 404);

  const [doc] = await db
    .insert(catalog_documents)
    .values({ ...input, song_id: songId })
    .returning();

  dispatchEvent('document.uploaded', { song_id: songId, document_id: doc.id, document_type: input.document_type }).catch(() => {});

  return doc;
};

// ── Song Identifiers ──────────────────────────────────────────────────────────

export const getSongIdentifiers = async (id: string) => {
  return db
    .select()
    .from(catalog_identifiers)
    .where(eq(catalog_identifiers.song_id, id))
    .orderBy(desc(catalog_identifiers.created_at));
};

export const addSongIdentifier = async (songId: string, input: CreateIdentifierInput) => {
  const [existing] = await db.select({ id: songs.id }).from(songs).where(eq(songs.id, songId)).limit(1);
  if (!existing) throw new AppError('Song not found', 404);

  const [identifier] = await db
    .insert(catalog_identifiers)
    .values({
      song_id:         songId,
      identifier_type: input.identifier_type,
      value:           input.value,
      assigned_by:     input.assigned_by,
      assigned_at:     input.assigned_at ? new Date(input.assigned_at) : undefined,
    })
    .returning();

  return identifier;
};
