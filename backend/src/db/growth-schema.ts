import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  bigint,
  numeric,
  timestamp,
  jsonb,
  pgEnum,
  date,
  index,
  primaryKey,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';

import {
  users,
  artist_profiles,
  songs,
  releases,
  content_ideas,
  crm_contacts,
} from './schema';

// ── Enums ────────────────────────────────────────────────────────────────────

export const growthCampaignTypeEnum = pgEnum('growth_campaign_type', [
  'awareness', 'release', 'playlist_push', 'press', 'social',
  'advertising', 'sync', 'custom',
]);

export const growthCampaignStageEnum = pgEnum('growth_campaign_stage', [
  'pre_release', 'release_day', 'week_1', 'week_2', 'week_3',
  'month_1', 'month_2', 'month_3',
]);

export const growthCampaignStatusEnum = pgEnum('growth_campaign_status', [
  'draft', 'active', 'paused', 'completed', 'cancelled',
]);

export const campaignTaskStatusEnum = pgEnum('campaign_task_status', [
  'todo', 'in_progress', 'done', 'blocked',
]);

export const campaignTaskPriorityEnum = pgEnum('campaign_task_priority', [
  'low', 'medium', 'high', 'urgent',
]);

export const socialAccountStatusEnum = pgEnum('social_account_status', [
  'active', 'inactive', 'revoked', 'pending',
]);

export const scheduledPostStatusEnum = pgEnum('scheduled_post_status', [
  'draft', 'scheduled', 'publishing', 'published', 'failed', 'cancelled',
]);

export const captionSourceEnum = pgEnum('caption_source', [
  'ai', 'manual', 'template',
]);

export const trendCategoryEnum = pgEnum('trend_category', [
  'sound', 'hashtag', 'challenge', 'meme', 'dance',
  'format', 'topic', 'edit', 'transition', 'filter',
]);

export const trendReportStatusEnum = pgEnum('trend_report_status', [
  'active', 'expired', 'archived',
]);

export const conversationChannelEnum = pgEnum('conversation_channel', [
  'email', 'dm', 'call', 'meeting', 'whatsapp', 'other',
]);

export const conversationDirectionEnum = pgEnum('conversation_direction', [
  'inbound', 'outbound',
]);

export const notificationTypeEnum = pgEnum('notification_type', [
  'info', 'success', 'warning', 'alert',
]);

export const notificationCategoryEnum = pgEnum('notification_category', [
  'campaign', 'content', 'analytics', 'trend', 'fan',
  'publishing', 'system', 'deal', 'release', 'payment',
]);

export const generalTaskStatusEnum = pgEnum('general_task_status', [
  'todo', 'in_progress', 'done', 'blocked', 'cancelled',
]);

export const generalTaskPriorityEnum = pgEnum('general_task_priority', [
  'low', 'medium', 'high', 'urgent',
]);

// ── Content Vault ────────────────────────────────────────────────────────────

export const content_versions = pgTable(
  'content_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    content_id: uuid('content_id')
      .notNull()
      .references(() => content_ideas.id, { onDelete: 'cascade' }),
    version_number: integer('version_number').notNull().default(1),
    snapshot: jsonb('snapshot').notNull().default('{}'),
    change_note: text('change_note'),
    created_by: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    contentIdx: index('content_versions_content_id_idx').on(t.content_id),
    versionIdx: index('content_versions_number_idx').on(t.content_id, t.version_number),
  }),
);

export const content_tags = pgTable(
  'content_tags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    color: text('color').notNull().default('#6366f1'),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    slugIdx: index('content_tags_slug_idx').on(t.slug),
  }),
);

export const content_tag_map = pgTable(
  'content_tag_map',
  {
    content_id: uuid('content_id')
      .notNull()
      .references(() => content_ideas.id, { onDelete: 'cascade' }),
    tag_id: uuid('tag_id')
      .notNull()
      .references(() => content_tags.id, { onDelete: 'cascade' }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.content_id, t.tag_id] }),
    tagIdx: index('content_tag_map_tag_id_idx').on(t.tag_id),
  }),
);

// ── Campaign Manager ─────────────────────────────────────────────────────────

export const campaigns = pgTable(
  'campaigns',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    artist_id: uuid('artist_id').references(() => artist_profiles.id, { onDelete: 'cascade' }),
    song_id: uuid('song_id').references(() => songs.id, { onDelete: 'set null' }),
    release_id: uuid('release_id').references(() => releases.id, { onDelete: 'set null' }),
    name: text('name').notNull(),
    description: text('description'),
    campaign_type: growthCampaignTypeEnum('campaign_type').notNull().default('custom'),
    status: growthCampaignStatusEnum('status').notNull().default('draft'),
    current_stage: growthCampaignStageEnum('current_stage'),
    start_date: date('start_date'),
    end_date: date('end_date'),
    budget: numeric('budget', { precision: 12, scale: 2 }),
    budget_spent: numeric('budget_spent', { precision: 12, scale: 2 }).notNull().default('0'),
    target_streams: bigint('target_streams', { mode: 'number' }),
    target_followers: bigint('target_followers', { mode: 'number' }),
    target_reach: bigint('target_reach', { mode: 'number' }),
    actual_streams: bigint('actual_streams', { mode: 'number' }).notNull().default(0),
    actual_followers: bigint('actual_followers', { mode: 'number' }).notNull().default(0),
    actual_reach: bigint('actual_reach', { mode: 'number' }).notNull().default(0),
    ai_notes: text('ai_notes'),
    metadata: jsonb('metadata').notNull().default('{}'),
    created_by: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    artistIdx: index('campaigns_artist_id_idx').on(t.artist_id),
    statusIdx: index('campaigns_status_idx').on(t.status),
    typeIdx: index('campaigns_type_idx').on(t.campaign_type),
    songIdx: index('campaigns_song_id_idx').on(t.song_id),
    releaseIdx: index('campaigns_release_id_idx').on(t.release_id),
  }),
);

export const campaign_stages = pgTable(
  'campaign_stages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    campaign_id: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),
    stage: growthCampaignStageEnum('stage').notNull(),
    started_at: timestamp('started_at'),
    completed_at: timestamp('completed_at'),
    notes: text('notes'),
    metadata: jsonb('metadata').notNull().default('{}'),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    campaignIdx: index('campaign_stages_campaign_id_idx').on(t.campaign_id),
    stageIdx: index('campaign_stages_stage_idx').on(t.stage),
  }),
);

export const campaign_tasks = pgTable(
  'campaign_tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    campaign_id: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),
    stage: growthCampaignStageEnum('stage'),
    title: text('title').notNull(),
    description: text('description'),
    assigned_to: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
    priority: campaignTaskPriorityEnum('priority').notNull().default('medium'),
    status: campaignTaskStatusEnum('status').notNull().default('todo'),
    due_date: date('due_date'),
    completed_at: timestamp('completed_at'),
    metadata: jsonb('metadata').notNull().default('{}'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    campaignIdx: index('campaign_tasks_campaign_id_idx').on(t.campaign_id),
    statusIdx: index('campaign_tasks_status_idx').on(t.status),
    assignedIdx: index('campaign_tasks_assigned_to_idx').on(t.assigned_to),
  }),
);

export const campaign_kpis = pgTable(
  'campaign_kpis',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    campaign_id: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),
    metric_name: text('metric_name').notNull(),
    target_value: numeric('target_value', { precision: 18, scale: 4 }),
    actual_value: numeric('actual_value', { precision: 18, scale: 4 }).notNull().default('0'),
    unit: text('unit'),
    platform: text('platform'),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    campaignIdx: index('campaign_kpis_campaign_id_idx').on(t.campaign_id),
  }),
);

export const campaign_content = pgTable(
  'campaign_content',
  {
    campaign_id: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),
    content_id: uuid('content_id')
      .notNull()
      .references(() => content_ideas.id, { onDelete: 'cascade' }),
    added_at: timestamp('added_at').defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.campaign_id, t.content_id] }),
    contentIdx: index('campaign_content_content_id_idx').on(t.content_id),
  }),
);

// ── Social Accounts ───────────────────────────────────────────────────────────

export const platform_definitions = pgTable(
  'platform_definitions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    icon_url: text('icon_url'),
    base_url: text('base_url'),
    supports_scheduling: boolean('supports_scheduling').notNull().default(false),
    supports_analytics: boolean('supports_analytics').notNull().default(false),
    is_streaming: boolean('is_streaming').notNull().default(false),
    is_social: boolean('is_social').notNull().default(true),
    is_active: boolean('is_active').notNull().default(true),
    metadata: jsonb('metadata').notNull().default('{}'),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    slugIdx: index('platform_definitions_slug_idx').on(t.slug),
    activeIdx: index('platform_definitions_is_active_idx').on(t.is_active),
  }),
);

export const countries = pgTable(
  'countries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    iso_code: text('iso_code').notNull().unique(),
    region: text('region'),
    is_music_market: boolean('is_music_market').notNull().default(true),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    isoIdx: index('countries_iso_code_idx').on(t.iso_code),
    regionIdx: index('countries_region_idx').on(t.region),
  }),
);

export const social_accounts = pgTable(
  'social_accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    artist_id: uuid('artist_id')
      .notNull()
      .references(() => artist_profiles.id, { onDelete: 'cascade' }),
    platform_id: uuid('platform_id')
      .notNull()
      .references(() => platform_definitions.id, { onDelete: 'restrict' }),
    username: text('username').notNull(),
    display_name: text('display_name'),
    profile_url: text('profile_url'),
    profile_image_url: text('profile_image_url'),
    status: socialAccountStatusEnum('status').notNull().default('active'),
    followers_count: bigint('followers_count', { mode: 'number' }).notNull().default(0),
    following_count: bigint('following_count', { mode: 'number' }).notNull().default(0),
    posts_count: bigint('posts_count', { mode: 'number' }).notNull().default(0),
    avg_views: bigint('avg_views', { mode: 'number' }).notNull().default(0),
    avg_likes: bigint('avg_likes', { mode: 'number' }).notNull().default(0),
    avg_comments: bigint('avg_comments', { mode: 'number' }).notNull().default(0),
    engagement_rate: numeric('engagement_rate', { precision: 6, scale: 4 }).notNull().default('0'),
    access_token_encrypted: text('access_token_encrypted'),
    refresh_token_encrypted: text('refresh_token_encrypted'),
    token_expires_at: timestamp('token_expires_at'),
    last_synced_at: timestamp('last_synced_at'),
    metadata: jsonb('metadata').notNull().default('{}'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    artistIdx: index('social_accounts_artist_id_idx').on(t.artist_id),
    platformIdx: index('social_accounts_platform_id_idx').on(t.platform_id),
    statusIdx: index('social_accounts_status_idx').on(t.status),
    followersIdx: index('social_accounts_followers_count_idx').on(t.followers_count),
  }),
);

// ── Publishing Engine ─────────────────────────────────────────────────────────

export const scheduled_posts = pgTable(
  'scheduled_posts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    content_id: uuid('content_id').references(() => content_ideas.id, { onDelete: 'set null' }),
    social_account_id: uuid('social_account_id')
      .notNull()
      .references(() => social_accounts.id, { onDelete: 'cascade' }),
    campaign_id: uuid('campaign_id').references((): AnyPgColumn => campaigns.id, { onDelete: 'set null' }),
    status: scheduledPostStatusEnum('status').notNull().default('draft'),
    caption: text('caption'),
    caption_source: captionSourceEnum('caption_source').notNull().default('manual'),
    hashtags: jsonb('hashtags').notNull().default('[]'),
    media_urls: jsonb('media_urls').notNull().default('[]'),
    scheduled_for: timestamp('scheduled_for').notNull(),
    publish_attempts: integer('publish_attempts').notNull().default(0),
    last_attempt_at: timestamp('last_attempt_at'),
    last_error: text('last_error'),
    metadata: jsonb('metadata').notNull().default('{}'),
    created_by: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    accountIdx: index('scheduled_posts_social_account_id_idx').on(t.social_account_id),
    statusIdx: index('scheduled_posts_status_idx').on(t.status),
    scheduledForIdx: index('scheduled_posts_scheduled_for_idx').on(t.scheduled_for),
    campaignIdx: index('scheduled_posts_campaign_id_idx').on(t.campaign_id),
    contentIdx: index('scheduled_posts_content_id_idx').on(t.content_id),
  }),
);

export const published_posts = pgTable(
  'published_posts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    scheduled_post_id: uuid('scheduled_post_id')
      .notNull()
      .references(() => scheduled_posts.id, { onDelete: 'cascade' }),
    social_account_id: uuid('social_account_id')
      .notNull()
      .references(() => social_accounts.id, { onDelete: 'cascade' }),
    platform_post_id: text('platform_post_id'),
    platform_post_url: text('platform_post_url'),
    published_at: timestamp('published_at').defaultNow().notNull(),
    raw_response: jsonb('raw_response').notNull().default('{}'),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    scheduledPostIdx: index('published_posts_scheduled_post_id_idx').on(t.scheduled_post_id),
    accountIdx: index('published_posts_social_account_id_idx').on(t.social_account_id),
    publishedAtIdx: index('published_posts_published_at_idx').on(t.published_at),
  }),
);

export const post_captions = pgTable(
  'post_captions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    scheduled_post_id: uuid('scheduled_post_id')
      .notNull()
      .references(() => scheduled_posts.id, { onDelete: 'cascade' }),
    caption: text('caption').notNull(),
    caption_source: captionSourceEnum('caption_source').notNull().default('ai'),
    is_approved: boolean('is_approved').notNull().default(false),
    approved_by: uuid('approved_by').references(() => users.id, { onDelete: 'set null' }),
    approved_at: timestamp('approved_at'),
    ai_model: text('ai_model'),
    ai_prompt_hash: text('ai_prompt_hash'),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    postIdx: index('post_captions_scheduled_post_id_idx').on(t.scheduled_post_id),
    approvedIdx: index('post_captions_approved_idx').on(t.scheduled_post_id, t.is_approved),
  }),
);

// ── Analytics Hub ─────────────────────────────────────────────────────────────

export const analytics_snapshots = pgTable(
  'analytics_snapshots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    social_account_id: uuid('social_account_id')
      .notNull()
      .references(() => social_accounts.id, { onDelete: 'cascade' }),
    platform_id: uuid('platform_id')
      .notNull()
      .references(() => platform_definitions.id, { onDelete: 'restrict' }),
    snapshot_date: date('snapshot_date').notNull(),
    views: bigint('views', { mode: 'number' }).notNull().default(0),
    reach: bigint('reach', { mode: 'number' }).notNull().default(0),
    watch_time_seconds: bigint('watch_time_seconds', { mode: 'number' }).notNull().default(0),
    likes: bigint('likes', { mode: 'number' }).notNull().default(0),
    comments: bigint('comments', { mode: 'number' }).notNull().default(0),
    shares: bigint('shares', { mode: 'number' }).notNull().default(0),
    saves: bigint('saves', { mode: 'number' }).notNull().default(0),
    impressions: bigint('impressions', { mode: 'number' }).notNull().default(0),
    followers: bigint('followers', { mode: 'number' }).notNull().default(0),
    followers_gained: integer('followers_gained').notNull().default(0),
    streams: bigint('streams', { mode: 'number' }).notNull().default(0),
    playlist_adds: integer('playlist_adds').notNull().default(0),
    ctr: numeric('ctr', { precision: 6, scale: 4 }).notNull().default('0'),
    profile_visits: bigint('profile_visits', { mode: 'number' }).notNull().default(0),
    country_breakdown: jsonb('country_breakdown').notNull().default('{}'),
    device_breakdown: jsonb('device_breakdown').notNull().default('{}'),
    traffic_breakdown: jsonb('traffic_breakdown').notNull().default('{}'),
    raw_data: jsonb('raw_data').notNull().default('{}'),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    accountDateIdx: index('analytics_snapshots_account_date_idx').on(t.social_account_id, t.snapshot_date),
    platformIdx: index('analytics_snapshots_platform_id_idx').on(t.platform_id),
    dateIdx: index('analytics_snapshots_snapshot_date_idx').on(t.snapshot_date),
  }),
);

export const post_analytics = pgTable(
  'post_analytics',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    published_post_id: uuid('published_post_id')
      .notNull()
      .references(() => published_posts.id, { onDelete: 'cascade' }),
    snapshot_date: date('snapshot_date').notNull(),
    views: bigint('views', { mode: 'number' }).notNull().default(0),
    reach: bigint('reach', { mode: 'number' }).notNull().default(0),
    likes: bigint('likes', { mode: 'number' }).notNull().default(0),
    comments: bigint('comments', { mode: 'number' }).notNull().default(0),
    shares: bigint('shares', { mode: 'number' }).notNull().default(0),
    saves: bigint('saves', { mode: 'number' }).notNull().default(0),
    watch_time_seconds: bigint('watch_time_seconds', { mode: 'number' }).notNull().default(0),
    engagement_rate: numeric('engagement_rate', { precision: 6, scale: 4 }).notNull().default('0'),
    raw_data: jsonb('raw_data').notNull().default('{}'),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    postIdx: index('post_analytics_published_post_id_idx').on(t.published_post_id),
    dateIdx: index('post_analytics_snapshot_date_idx').on(t.snapshot_date),
  }),
);

export const platform_metrics = pgTable(
  'platform_metrics',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    artist_id: uuid('artist_id')
      .notNull()
      .references(() => artist_profiles.id, { onDelete: 'cascade' }),
    platform_id: uuid('platform_id')
      .notNull()
      .references(() => platform_definitions.id, { onDelete: 'restrict' }),
    song_id: uuid('song_id').references(() => songs.id, { onDelete: 'set null' }),
    period_start: date('period_start').notNull(),
    period_end: date('period_end').notNull(),
    total_streams: bigint('total_streams', { mode: 'number' }).notNull().default(0),
    total_views: bigint('total_views', { mode: 'number' }).notNull().default(0),
    total_reach: bigint('total_reach', { mode: 'number' }).notNull().default(0),
    avg_engagement_rate: numeric('avg_engagement_rate', { precision: 6, scale: 4 }).notNull().default('0'),
    followers_end: bigint('followers_end', { mode: 'number' }).notNull().default(0),
    followers_change: integer('followers_change').notNull().default(0),
    top_country: text('top_country'),
    metadata: jsonb('metadata').notNull().default('{}'),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    artistIdx: index('platform_metrics_artist_id_idx').on(t.artist_id),
    platformIdx: index('platform_metrics_platform_id_idx').on(t.platform_id),
    periodIdx: index('platform_metrics_period_idx').on(t.period_start, t.period_end),
    songIdx: index('platform_metrics_song_id_idx').on(t.song_id),
  }),
);

// ── Trend Intelligence ────────────────────────────────────────────────────────

export const trend_reports = pgTable(
  'trend_reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    platform_id: uuid('platform_id').references(() => platform_definitions.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    description: text('description'),
    category: trendCategoryEnum('category').notNull(),
    status: trendReportStatusEnum('status').notNull().default('active'),
    trend_score: integer('trend_score').notNull().default(0),
    relevance_score: integer('relevance_score').notNull().default(0),
    difficulty_score: integer('difficulty_score').notNull().default(0),
    audience_overlap: integer('audience_overlap').notNull().default(0),
    hashtags: jsonb('hashtags').notNull().default('[]'),
    example_urls: jsonb('example_urls').notNull().default('[]'),
    regions: jsonb('regions').notNull().default('[]'),
    expires_at: timestamp('expires_at'),
    ai_analysis: text('ai_analysis'),
    raw_data: jsonb('raw_data').notNull().default('{}'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    categoryIdx: index('trend_reports_category_idx').on(t.category),
    statusIdx: index('trend_reports_status_idx').on(t.status),
    trendScoreIdx: index('trend_reports_trend_score_idx').on(t.trend_score),
    platformIdx: index('trend_reports_platform_id_idx').on(t.platform_id),
    expiresAtIdx: index('trend_reports_expires_at_idx').on(t.expires_at),
  }),
);

export const trend_content_recommendations = pgTable(
  'trend_content_recommendations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    trend_id: uuid('trend_id')
      .notNull()
      .references(() => trend_reports.id, { onDelete: 'cascade' }),
    content_id: uuid('content_id').references(() => content_ideas.id, { onDelete: 'set null' }),
    artist_id: uuid('artist_id').references(() => artist_profiles.id, { onDelete: 'set null' }),
    relevance_score: integer('relevance_score').notNull().default(0),
    suggestion: text('suggestion'),
    is_acted_on: boolean('is_acted_on').notNull().default(false),
    acted_on_at: timestamp('acted_on_at'),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    trendIdx: index('trend_content_recs_trend_id_idx').on(t.trend_id),
    artistIdx: index('trend_content_recs_artist_id_idx').on(t.artist_id),
    scoreIdx: index('trend_content_recs_relevance_score_idx').on(t.relevance_score),
  }),
);

// ── Music Growth CRM Extension ────────────────────────────────────────────────

export const contact_groups = pgTable(
  'contact_groups',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    artist_id: uuid('artist_id').references(() => artist_profiles.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    color: text('color').notNull().default('#6366f1'),
    criteria: jsonb('criteria').notNull().default('{}'),
    created_by: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    artistIdx: index('contact_groups_artist_id_idx').on(t.artist_id),
  }),
);

export const contact_group_members = pgTable(
  'contact_group_members',
  {
    group_id: uuid('group_id')
      .notNull()
      .references(() => contact_groups.id, { onDelete: 'cascade' }),
    contact_id: uuid('contact_id')
      .notNull()
      .references(() => crm_contacts.id, { onDelete: 'cascade' }),
    added_by: uuid('added_by').references(() => users.id, { onDelete: 'set null' }),
    added_at: timestamp('added_at').defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.group_id, t.contact_id] }),
    contactIdx: index('contact_group_members_contact_id_idx').on(t.contact_id),
  }),
);

export const conversation_history = pgTable(
  'conversation_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contact_id: uuid('contact_id')
      .notNull()
      .references(() => crm_contacts.id, { onDelete: 'cascade' }),
    channel: conversationChannelEnum('channel').notNull().default('email'),
    direction: conversationDirectionEnum('direction').notNull().default('outbound'),
    subject: text('subject'),
    body: text('body').notNull(),
    sent_at: timestamp('sent_at').defaultNow().notNull(),
    metadata: jsonb('metadata').notNull().default('{}'),
    created_by: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    contactIdx: index('conversation_history_contact_id_idx').on(t.contact_id),
    sentAtIdx: index('conversation_history_sent_at_idx').on(t.sent_at),
    channelIdx: index('conversation_history_channel_idx').on(t.channel),
  }),
);

// ── Notifications ─────────────────────────────────────────────────────────────

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: notificationTypeEnum('type').notNull().default('info'),
    category: notificationCategoryEnum('category').notNull().default('system'),
    title: text('title').notNull(),
    body: text('body'),
    entity_type: text('entity_type'),
    entity_id: uuid('entity_id'),
    action_url: text('action_url'),
    icon: text('icon'),
    read_at: timestamp('read_at'),
    dismissed_at: timestamp('dismissed_at'),
    metadata: jsonb('metadata').notNull().default('{}'),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index('notifications_user_id_idx').on(t.user_id),
    categoryIdx: index('notifications_category_idx').on(t.category),
    typeIdx: index('notifications_type_idx').on(t.type),
    createdAtIdx: index('notifications_created_at_idx').on(t.created_at),
    entityIdx: index('notifications_entity_idx').on(t.entity_type, t.entity_id),
  }),
);

// ── System Settings ───────────────────────────────────────────────────────────

export const system_settings = pgTable(
  'system_settings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    key: text('key').notNull().unique(),
    value: jsonb('value').notNull().default('{}'),
    description: text('description'),
    is_public: boolean('is_public').notNull().default(false),
    updated_by: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    keyIdx: index('system_settings_key_idx').on(t.key),
    publicIdx: index('system_settings_public_idx').on(t.is_public),
  }),
);

export const general_tasks = pgTable(
  'general_tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    artist_id: uuid('artist_id').references(() => artist_profiles.id, { onDelete: 'set null' }),
    campaign_id: uuid('campaign_id').references((): AnyPgColumn => campaigns.id, { onDelete: 'set null' }),
    assigned_to: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
    created_by: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    description: text('description'),
    due_date: date('due_date'),
    priority: generalTaskPriorityEnum('priority').notNull().default('medium'),
    status: generalTaskStatusEnum('status').notNull().default('todo'),
    tags: jsonb('tags').notNull().default('[]'),
    completed_at: timestamp('completed_at'),
    metadata: jsonb('metadata').notNull().default('{}'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    artistIdx: index('general_tasks_artist_id_idx').on(t.artist_id),
    campaignIdx: index('general_tasks_campaign_id_idx').on(t.campaign_id),
    assignedIdx: index('general_tasks_assigned_to_idx').on(t.assigned_to),
    statusIdx: index('general_tasks_status_idx').on(t.status),
    priorityIdx: index('general_tasks_priority_idx').on(t.priority),
    dueDateIdx: index('general_tasks_due_date_idx').on(t.due_date),
  }),
);
