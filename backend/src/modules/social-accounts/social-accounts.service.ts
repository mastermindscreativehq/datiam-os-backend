import { eq, desc, and } from 'drizzle-orm';
import { db } from '../../db';
import {
  social_accounts,
  platform_definitions,
  countries,
} from '../../db/growth-schema';
import { AppError } from '../../middleware/errorHandler';

export interface CreateSocialAccountInput {
  artist_id: string;
  platform_id: string;
  username: string;
  display_name?: string;
  profile_url?: string;
  profile_image_url?: string;
  access_token_encrypted?: string;
  refresh_token_encrypted?: string;
  token_expires_at?: Date;
  metadata?: unknown;
}

export interface UpdateMetricsInput {
  followers_count?: number;
  following_count?: number;
  posts_count?: number;
  avg_views?: number;
  avg_likes?: number;
  avg_comments?: number;
  engagement_rate?: string;
}

export class SocialAccountService {
  async create(input: CreateSocialAccountInput) {
    const [row] = await db
      .insert(social_accounts)
      .values(input as any)
      .returning();
    return row;
  }

  async list(artistId?: string) {
    const query = db
      .select({
        account: social_accounts,
        platform: platform_definitions,
      })
      .from(social_accounts)
      .innerJoin(platform_definitions, eq(social_accounts.platform_id, platform_definitions.id))
      .orderBy(desc(social_accounts.followers_count));

    if (artistId) {
      return query.where(eq(social_accounts.artist_id, artistId));
    }
    return query;
  }

  async getById(id: string) {
    const [row] = await db
      .select({
        account: social_accounts,
        platform: platform_definitions,
      })
      .from(social_accounts)
      .innerJoin(platform_definitions, eq(social_accounts.platform_id, platform_definitions.id))
      .where(eq(social_accounts.id, id));
    if (!row) throw new AppError('Social account not found', 404);
    return row;
  }

  async update(id: string, input: Partial<CreateSocialAccountInput> & { status?: string }) {
    const [row] = await db
      .update(social_accounts)
      .set({ ...(input as any), updated_at: new Date() })
      .where(eq(social_accounts.id, id))
      .returning();
    if (!row) throw new AppError('Social account not found', 404);
    return row;
  }

  async delete(id: string) {
    const [row] = await db
      .delete(social_accounts)
      .where(eq(social_accounts.id, id))
      .returning();
    if (!row) throw new AppError('Social account not found', 404);
  }

  async updateMetrics(accountId: string, metrics: UpdateMetricsInput) {
    const [row] = await db
      .update(social_accounts)
      .set({
        ...(metrics as any),
        last_synced_at: new Date(),
        updated_at: new Date(),
      })
      .where(eq(social_accounts.id, accountId))
      .returning();
    if (!row) throw new AppError('Social account not found', 404);
    return row;
  }

  async markSynced(accountId: string) {
    await db
      .update(social_accounts)
      .set({ last_synced_at: new Date(), updated_at: new Date() })
      .where(eq(social_accounts.id, accountId));
  }

  async getPlatforms(onlyActive = true) {
    const query = db.select().from(platform_definitions).orderBy(platform_definitions.name);
    if (onlyActive) {
      return query.where(eq(platform_definitions.is_active, true));
    }
    return query;
  }

  async getPlatformBySlug(slug: string) {
    const [row] = await db
      .select()
      .from(platform_definitions)
      .where(eq(platform_definitions.slug, slug));
    if (!row) throw new AppError('Platform not found', 404);
    return row;
  }

  async getCountries() {
    return db
      .select()
      .from(countries)
      .where(eq(countries.is_music_market, true))
      .orderBy(countries.name);
  }

  async getCountryByIso(isoCode: string) {
    const [row] = await db
      .select()
      .from(countries)
      .where(eq(countries.iso_code, isoCode.toUpperCase()));
    return row ?? null;
  }
}

export const socialAccountService = new SocialAccountService();
