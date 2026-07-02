import { eq, desc, and, sql, count } from 'drizzle-orm';
import { db } from '../../db';
import {
  campaigns,
  campaign_stages,
  campaign_tasks,
  campaign_kpis,
  campaign_content,
} from '../../db/growth-schema';
import { AppError } from '../../middleware/errorHandler';

export interface CreateCampaignInput {
  artist_id?: string;
  song_id?: string;
  release_id?: string;
  name: string;
  description?: string;
  campaign_type?: string;
  start_date?: string;
  end_date?: string;
  budget?: string;
  target_streams?: number;
  target_followers?: number;
  target_reach?: number;
  metadata?: unknown;
  created_by?: string;
}

export interface CampaignFilter {
  artist_id?: string;
  status?: string;
  campaign_type?: string;
  song_id?: string;
  release_id?: string;
  limit?: number;
  offset?: number;
}

export interface CreateTaskInput {
  stage?: string;
  title: string;
  description?: string;
  assigned_to?: string;
  priority?: string;
  due_date?: string;
  metadata?: unknown;
}

export interface CreateKpiInput {
  metric_name: string;
  target_value?: string;
  unit?: string;
  platform?: string;
}

export class CampaignManagerService {
  async create(input: CreateCampaignInput) {
    const [row] = await db
      .insert(campaigns)
      .values(input as any)
      .returning();
    return row;
  }

  async list(filters: CampaignFilter) {
    const conditions = [];
    if (filters.artist_id) conditions.push(eq(campaigns.artist_id, filters.artist_id));
    if (filters.status) conditions.push(eq(campaigns.status, filters.status as any));
    if (filters.campaign_type) conditions.push(eq(campaigns.campaign_type, filters.campaign_type as any));
    if (filters.song_id) conditions.push(eq(campaigns.song_id, filters.song_id));
    if (filters.release_id) conditions.push(eq(campaigns.release_id, filters.release_id));

    return db
      .select()
      .from(campaigns)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(campaigns.updated_at))
      .limit(filters.limit ?? 50)
      .offset(filters.offset ?? 0);
  }

  async getById(id: string) {
    const [row] = await db.select().from(campaigns).where(eq(campaigns.id, id));
    if (!row) throw new AppError('Campaign not found', 404);
    return row;
  }

  async update(id: string, input: Partial<CreateCampaignInput> & { status?: string; current_stage?: string; actual_streams?: number; actual_followers?: number; actual_reach?: number; budget_spent?: string }) {
    await this.getById(id);
    const [row] = await db
      .update(campaigns)
      .set({ ...(input as any), updated_at: new Date() })
      .where(eq(campaigns.id, id))
      .returning();
    return row;
  }

  async delete(id: string) {
    await this.getById(id);
    await db.delete(campaigns).where(eq(campaigns.id, id));
  }

  async transitionStage(campaignId: string, stage: string) {
    const campaign = await this.getById(campaignId);

    // Close any open stage record for this campaign
    await db
      .update(campaign_stages)
      .set({ completed_at: new Date() })
      .where(
        and(
          eq(campaign_stages.campaign_id, campaignId),
          sql`${campaign_stages.completed_at} IS NULL`,
        ),
      );

    // Open new stage record
    const [stageRow] = await db
      .insert(campaign_stages)
      .values({
        campaign_id: campaignId,
        stage: stage as any,
        started_at: new Date(),
      })
      .returning();

    // Update campaign current_stage
    await db
      .update(campaigns)
      .set({ current_stage: stage as any, updated_at: new Date() })
      .where(eq(campaigns.id, campaignId));

    return stageRow;
  }

  async getStages(campaignId: string) {
    return db
      .select()
      .from(campaign_stages)
      .where(eq(campaign_stages.campaign_id, campaignId))
      .orderBy(campaign_stages.started_at);
  }

  async createTask(campaignId: string, input: CreateTaskInput) {
    await this.getById(campaignId);
    const [row] = await db
      .insert(campaign_tasks)
      .values({ campaign_id: campaignId, ...(input as any) })
      .returning();
    return row;
  }

  async getTasks(campaignId: string) {
    return db
      .select()
      .from(campaign_tasks)
      .where(eq(campaign_tasks.campaign_id, campaignId))
      .orderBy(campaign_tasks.due_date, campaign_tasks.priority);
  }

  async updateTask(taskId: string, input: Partial<CreateTaskInput> & { status?: string; completed_at?: Date }) {
    const [row] = await db
      .update(campaign_tasks)
      .set({ ...(input as any), updated_at: new Date() })
      .where(eq(campaign_tasks.id, taskId))
      .returning();
    if (!row) throw new AppError('Task not found', 404);
    return row;
  }

  async createKpi(campaignId: string, input: CreateKpiInput) {
    await this.getById(campaignId);
    const [row] = await db
      .insert(campaign_kpis)
      .values({ campaign_id: campaignId, ...(input as any) })
      .returning();
    return row;
  }

  async getKpis(campaignId: string) {
    return db
      .select()
      .from(campaign_kpis)
      .where(eq(campaign_kpis.campaign_id, campaignId));
  }

  async updateKpiValue(kpiId: string, actualValue: string) {
    const [row] = await db
      .update(campaign_kpis)
      .set({ actual_value: actualValue, updated_at: new Date() })
      .where(eq(campaign_kpis.id, kpiId))
      .returning();
    if (!row) throw new AppError('KPI not found', 404);
    return row;
  }

  async linkContent(campaignId: string, contentId: string) {
    await this.getById(campaignId);
    await db
      .insert(campaign_content)
      .values({ campaign_id: campaignId, content_id: contentId })
      .onConflictDoNothing();
  }

  async unlinkContent(campaignId: string, contentId: string) {
    await db
      .delete(campaign_content)
      .where(
        and(
          eq(campaign_content.campaign_id, campaignId),
          eq(campaign_content.content_id, contentId),
        ),
      );
  }

  async getLinkedContent(campaignId: string) {
    return db
      .select()
      .from(campaign_content)
      .where(eq(campaign_content.campaign_id, campaignId))
      .orderBy(desc(campaign_content.added_at));
  }

  async getPerformanceSummary(campaignId: string) {
    const campaign = await this.getById(campaignId);
    const [taskCounts] = await db
      .select({
        total: count(),
        done: sql<number>`count(*) filter (where ${campaign_tasks.status} = 'done')`,
      })
      .from(campaign_tasks)
      .where(eq(campaign_tasks.campaign_id, campaignId));

    const kpis = await this.getKpis(campaignId);

    return {
      campaign,
      task_completion: {
        total: taskCounts?.total ?? 0,
        done: taskCounts?.done ?? 0,
      },
      kpis,
    };
  }

  async autoCreateFromSong(songId: string, artistId: string, songTitle: string, createdBy?: string) {
    const [row] = await db
      .insert(campaigns)
      .values({
        artist_id: artistId,
        song_id: songId,
        name: `${songTitle} — Launch Campaign`,
        description: `Auto-generated growth campaign for "${songTitle}"`,
        campaign_type: 'release' as any,
        status: 'draft' as any,
        created_by: createdBy,
      })
      .returning();
    return row;
  }
}

export const campaignManagerService = new CampaignManagerService();
