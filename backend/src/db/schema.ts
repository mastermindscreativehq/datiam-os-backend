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
  uniqueIndex,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ---- Enums ----

export const userRoleEnum = pgEnum('user_role', ['owner', 'admin', 'editor', 'team', 'viewer']);

export const songReleaseStatusEnum = pgEnum('song_release_status', [
  'draft',
  'registered',
  'distributed',
  'released',
  'archived',
]);

export const releaseTypeEnum = pgEnum('release_type', ['single', 'ep', 'album']);

export const releasePublishStatusEnum = pgEnum('release_publish_status', [
  'planning',
  'submitted',
  'approved',
  'live',
]);

export const taskStatusEnum = pgEnum('task_status', ['todo', 'doing', 'done', 'blocked']);

export const taskCategoryEnum = pgEnum('task_category', [
  'registration',
  'distribution',
  'content',
  'marketing',
  'sync',
  'royalty',
]);

export const assetTypeEnum = pgEnum('asset_type', [
  'wav',
  'mp3',
  'stem',
  'instrumental',
  'clean',
  'acapella',
  'cover_art',
  'visualizer',
  'lyrics_doc',
]);

export const contributorRoleEnum = pgEnum('contributor_role', [
  'writer',
  'producer',
  'composer',
  'mixer',
  'mastering_engineer',
  'featured_artist',
]);

export const royaltyTypeEnum = pgEnum('royalty_type', [
  'master',
  'publishing',
  'mechanical',
  'performance',
  'neighboring',
  'sync',
]);

export const syncOpportunityTypeEnum = pgEnum('sync_opportunity_type', [
  'film',
  'tv',
  'ad',
  'game',
  'trailer',
  'youtube',
  'library',
]);

export const syncStatusEnum = pgEnum('sync_status', [
  'prospect',
  'pitched',
  'follow_up',
  'accepted',
  'rejected',
]);

export const fanEventTypeEnum = pgEnum('fan_event_type', [
  'joined_telegram',
  'clicked_link',
  'commented',
  'shared',
  'pre_saved',
  'streamed',
  'replied',
  'purchased',
  'content_viewed',
  'link_referral',
  'playlist_saved',
  'merch_purchased',
]);

export const contentTypeEnum = pgEnum('content_type', [
  'short_video',
  'interview',
  'post',
  'thread',
  'live_script',
  'reel',
  'tiktok',
  'youtube_short',
  'story',
  'carousel',
  'photo',
  'lyric_video',
  'visualizer',
  'behind_the_scenes',
  'studio_session',
  'quote',
  'meme',
  'fan_question',
  'dance_prompt',
  'instrumental_clip',
  'acapella',
  'countdown',
  'cover_reveal',
  'wallpaper',
  'blog',
  'newsletter',
]);

export const contentStatusEnum = pgEnum('content_status', [
  'idea',
  'scripted',
  'recorded',
  'edited',
  'scheduled',
  'posted',
]);

export const contactTypeEnum = pgEnum('contact_type', [
  'playlist_curator',
  'blogger',
  'dj',
  'influencer',
  'music_supervisor',
  'radio',
  'podcast',
  'press',
  'dance_creator',
  'choreographer',
  'content_creator',
  'manager',
  'label',
  'publisher',
  'brand',
  'festival',
  'promoter',
  'producer',
  'photographer',
  'videographer',
]);

export const crmContactPriorityEnum = pgEnum('crm_contact_priority', ['low', 'medium', 'high', 'vip']);

export const automationSourceEnum = pgEnum('automation_source', [
  'backend',
  'n8n',
  'cron',
  'manual',
]);

export const automationStatusEnum = pgEnum('automation_status', [
  'success',
  'failed',
  'running',
]);

export const jobStatusEnum = pgEnum('job_status', ['active', 'paused', 'completed', 'failed']);

export const jobTypeEnum = pgEnum('job_type', [
  'fan_sync',
  'release_reminder',
  'content_suggestion',
  'royalty_import',
  'sync_follow_up',
  'analytics_snapshot',
]);

export const recommendationTypeEnum = pgEnum('recommendation_type', [
  'content',
  'release_timing',
  'sync_pitch',
  'fan_engagement',
  'marketing',
]);

export const recEntityTypeEnum = pgEnum('rec_entity_type', [
  'song',
  'release',
  'fan',
  'content_idea',
  'sync_pitch',
]);

// Music Core v1 — release lifecycle status
export const musicReleaseStatusEnum = pgEnum('music_release_status', [
  'draft',
  'scheduled',
  'released',
]);

// Release State Engine — computed lifecycle state
export const releaseStateEnum = pgEnum('release_state', [
  'draft',
  'blocked',
  'almost_ready',
  'ready_for_distribution',
  'scheduled',
  'released',
]);

// ---- Tables ----

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  full_name: text('full_name').notNull(),
  role: userRoleEnum('role').notNull().default('team'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const artist_profiles = pgTable('artist_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  stage_name: text('stage_name').notNull(),
  legal_name: text('legal_name'),
  bio: text('bio'),
  genre: text('genre'),
  country: text('country'),
  primary_color: text('primary_color'),
  mood_profile: text('mood_profile'),
  social_links: jsonb('social_links'),
  profile_image: text('profile_image'),
  is_active: boolean('is_active').default(true).notNull(),
  // legacy fields kept for compatibility
  genre_primary: text('genre_primary'),
  genre_secondary: text('genre_secondary'),
  brand_statement: text('brand_statement'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const songs = pgTable(
  'songs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    artist_id: uuid('artist_id')
      .notNull()
      .references(() => artist_profiles.id, { onDelete: 'cascade' }),
    // Music Core v1 — release link (nullable; standalone songs have no release)
    release_id: uuid('release_id').references((): AnyPgColumn => releases.id, { onDelete: 'set null' }),
    // Core metadata
    title: text('title').notNull(),
    slug: text('slug'),
    genre: text('genre'),
    bpm: integer('bpm'),
    musical_key: text('musical_key'),
    duration_seconds: integer('duration_seconds'),
    lyrics: text('lyrics'),
    // Media URLs
    audio_url: text('audio_url'),
    waveform_url: text('waveform_url'),
    cover_art_url: text('cover_art_url'),
    // Tagging
    mood: text('mood'),
    language: text('language'),
    explicit: boolean('explicit').default(false),
    track_number: integer('track_number'),
    disk_number: integer('disk_number'),
    isrc: text('isrc'),
    release_status: songReleaseStatusEnum('release_status').default('draft').notNull(),
    // AI intelligence scores (0.00–1.00)
    energy_score: numeric('energy_score', { precision: 3, scale: 2 }),
    emotion_score: numeric('emotion_score', { precision: 3, scale: 2 }),
    viral_score: numeric('viral_score', { precision: 3, scale: 2 }),
    commercial_score: numeric('commercial_score', { precision: 3, scale: 2 }),
    spiritual_score: numeric('spiritual_score', { precision: 3, scale: 2 }),
    // Legacy fields (kept for backwards compatibility)
    alternate_title: text('alternate_title'),
    version: text('version'),
    key: text('key'),
    energy_level: integer('energy_level'),
    master_owner: text('master_owner'),
    publishing_owner: text('publishing_owner'),
    sync_ready: boolean('sync_ready').default(false),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    artistIdx: index('songs_artist_id_idx').on(t.artist_id),
    statusIdx: index('songs_release_status_idx').on(t.release_status),
    releaseIdx: index('songs_release_id_idx').on(t.release_id),
    slugIdx: index('songs_slug_idx').on(t.slug),
  }),
);

export const song_assets = pgTable(
  'song_assets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    song_id: uuid('song_id')
      .notNull()
      .references(() => songs.id, { onDelete: 'cascade' }),
    asset_type: assetTypeEnum('asset_type').notNull(),
    file_url: text('file_url').notNull(),
    storage_provider: text('storage_provider'),
    notes: text('notes'),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    songIdx: index('song_assets_song_id_idx').on(t.song_id),
  }),
);

export const contributors = pgTable(
  'contributors',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    song_id: uuid('song_id')
      .notNull()
      .references(() => songs.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    role: contributorRoleEnum('role').notNull(),
    ownership_percentage: numeric('ownership_percentage', { precision: 5, scale: 2 }),
    publishing_percentage: numeric('publishing_percentage', { precision: 5, scale: 2 }),
    master_percentage: numeric('master_percentage', { precision: 5, scale: 2 }),
    pro_affiliation: text('pro_affiliation'),
    ipi_number: text('ipi_number'),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    songIdx: index('contributors_song_id_idx').on(t.song_id),
  }),
);

export const releases = pgTable(
  'releases',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Music Core v1 fields
    artist_id: uuid('artist_id').references(() => artist_profiles.id, { onDelete: 'cascade' }),
    release_title: text('release_title').notNull(),
    release_type: releaseTypeEnum('release_type').notNull(),
    slug: text('slug'),
    music_status: musicReleaseStatusEnum('music_status').default('draft').notNull(),
    genre: text('genre'),
    release_date: date('release_date'),
    cover_art_url: text('cover_art_url'),
    description: text('description'),
    upc: text('upc'),
    total_tracks: integer('total_tracks'),
    // Legacy fields (song_id was the old single-song link; now nullable)
    song_id: uuid('song_id').references(() => songs.id, { onDelete: 'cascade' }),
    distributor: text('distributor'),
    pre_save_url: text('pre_save_url'),
    smart_link: text('smart_link'),
    spotify_url: text('spotify_url'),
    apple_music_url: text('apple_music_url'),
    audiomack_url: text('audiomack_url'),
    boomplay_url: text('boomplay_url'),
    youtube_url: text('youtube_url'),
    status: releasePublishStatusEnum('status').default('planning').notNull(),
    release_state: releaseStateEnum('release_state').default('draft').notNull(),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    songIdx: index('releases_song_id_idx').on(t.song_id),
    statusIdx: index('releases_status_idx').on(t.status),
    artistIdx: index('releases_artist_id_idx').on(t.artist_id),
    slugIdx: index('releases_slug_idx').on(t.slug),
    releaseDateIdx: index('releases_release_date_idx').on(t.release_date),
    musicStatusIdx: index('releases_music_status_idx').on(t.music_status),
    releaseStateIdx: index('releases_release_state_idx').on(t.release_state),
  }),
);

export const release_checklists = pgTable(
  'release_checklists',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    release_id: uuid('release_id')
      .notNull()
      .references(() => releases.id, { onDelete: 'cascade' })
      .unique(),
    lyrics_ready: boolean('lyrics_ready').notNull().default(false),
    cover_art_ready: boolean('cover_art_ready').notNull().default(false),
    mix_ready: boolean('mix_ready').notNull().default(false),
    master_ready: boolean('master_ready').notNull().default(false),
    metadata_ready: boolean('metadata_ready').notNull().default(false),
    isrc_ready: boolean('isrc_ready').notNull().default(false),
    upc_ready: boolean('upc_ready').notNull().default(false),
    distributor_ready: boolean('distributor_ready').notNull().default(false),
    release_date_ready: boolean('release_date_ready').notNull().default(false),
    promo_assets_ready: boolean('promo_assets_ready').notNull().default(false),
    sync_assets_ready: boolean('sync_assets_ready').notNull().default(false),
    final_approval: boolean('final_approval').notNull().default(false),
    notes: text('notes'),
    readiness_status: text('readiness_status').notNull().default('not_ready'),
    completion_percent: integer('completion_percent').notNull().default(0),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    releaseIdx: index('release_checklists_release_id_idx').on(t.release_id),
    readinessIdx: index('release_checklists_readiness_idx').on(t.readiness_status),
  }),
);

export const release_tasks = pgTable(
  'release_tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    release_id: uuid('release_id')
      .notNull()
      .references(() => releases.id, { onDelete: 'cascade' }),
    task_name: text('task_name').notNull(),
    task_category: taskCategoryEnum('task_category').notNull(),
    status: taskStatusEnum('status').default('todo').notNull(),
    due_date: date('due_date'),
    notes: text('notes'),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    releaseIdx: index('release_tasks_release_id_idx').on(t.release_id),
    statusIdx: index('release_tasks_status_idx').on(t.status),
  }),
);

export const royalty_sources = pgTable(
  'royalty_sources',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    song_id: uuid('song_id')
      .notNull()
      .references(() => songs.id, { onDelete: 'cascade' }),
    platform: text('platform').notNull(),
    royalty_type: royaltyTypeEnum('royalty_type').notNull(),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    currency: text('currency').default('USD').notNull(),
    period_start: date('period_start'),
    period_end: date('period_end'),
    source_file_url: text('source_file_url'),
    imported_at: timestamp('imported_at').defaultNow().notNull(),
  },
  (t) => ({
    songIdx: index('royalty_sources_song_id_idx').on(t.song_id),
    platformIdx: index('royalty_sources_platform_idx').on(t.platform),
  }),
);

export const sync_pitches = pgTable(
  'sync_pitches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    song_id: uuid('song_id')
      .notNull()
      .references(() => songs.id, { onDelete: 'cascade' }),
    pitch_target: text('pitch_target').notNull(),
    contact_name: text('contact_name'),
    contact_email: text('contact_email'),
    opportunity_type: syncOpportunityTypeEnum('opportunity_type').notNull(),
    mood_fit: text('mood_fit'),
    status: syncStatusEnum('status').default('prospect').notNull(),
    pitch_date: date('pitch_date'),
    follow_up_date: date('follow_up_date'),
    notes: text('notes'),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    songIdx: index('sync_pitches_song_id_idx').on(t.song_id),
    statusIdx: index('sync_pitches_status_idx').on(t.status),
  }),
);

export const fan_profiles = pgTable(
  'fan_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    email: text('email'),
    phone: text('phone'),
    telegram_id: text('telegram_id'),
    instagram_handle: text('instagram_handle'),
    tiktok_handle: text('tiktok_handle'),
    youtube_handle: text('youtube_handle'),
    country: text('country'),
    city: text('city'),
    source: text('source'),
    emotional_segment: text('emotional_segment'),
    superfan_score: integer('superfan_score').default(0),
    ambassador_score: numeric('ambassador_score', { precision: 5, scale: 2 }).notNull().default('0'),
    dsp_listener_count: bigint('dsp_listener_count', { mode: 'number' }).notNull().default(0),
    referral_count: integer('referral_count').notNull().default(0),
    community_score: numeric('community_score', { precision: 5, scale: 2 }).notNull().default('0'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    emailIdx: index('fan_profiles_email_idx').on(t.email),
  }),
);

export const fan_events = pgTable(
  'fan_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fan_id: uuid('fan_id')
      .notNull()
      .references(() => fan_profiles.id, { onDelete: 'cascade' }),
    event_type: fanEventTypeEnum('event_type').notNull(),
    platform: text('platform'),
    metadata: jsonb('metadata'),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    fanIdx: index('fan_events_fan_id_idx').on(t.fan_id),
    eventTypeIdx: index('fan_events_event_type_idx').on(t.event_type),
  }),
);

export const content_ideas = pgTable(
  'content_ideas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    song_id: uuid('song_id').references(() => songs.id, { onDelete: 'set null' }),
    content_type: contentTypeEnum('content_type').notNull(),
    hook: text('hook'),
    script: text('script'),
    caption: text('caption'),
    platform: text('platform'),
    status: contentStatusEnum('status').default('idea').notNull(),
    scheduled_date: date('scheduled_date'),
    title: text('title'),
    description: text('description'),
    artist_id: uuid('artist_id').references(() => artist_profiles.id, { onDelete: 'set null' }),
    release_id: uuid('release_id').references(() => releases.id, { onDelete: 'set null' }),
    campaign_id: uuid('campaign_id'),
    language: text('language'),
    country_targets: jsonb('country_targets'),
    platform_targets: jsonb('platform_targets'),
    mood: text('mood'),
    genre: text('genre'),
    bpm: integer('bpm'),
    musical_key: text('musical_key'),
    cta: text('cta'),
    hashtags: jsonb('hashtags'),
    thumbnail_url: text('thumbnail_url'),
    asset_url: text('asset_url'),
    video_duration_seconds: integer('video_duration_seconds'),
    performance_score: numeric('performance_score', { precision: 5, scale: 2 }).notNull().default('0'),
    last_published_at: timestamp('last_published_at'),
    publish_count: integer('publish_count').notNull().default(0),
    best_platform: text('best_platform'),
    best_country: text('best_country'),
    ai_notes: text('ai_notes'),
    tags: jsonb('tags'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    songIdx: index('content_ideas_song_id_idx').on(t.song_id),
    statusIdx: index('content_ideas_status_idx').on(t.status),
  }),
);

export const crm_contacts = pgTable(
  'crm_contacts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    company: text('company'),
    role: text('role'),
    email: text('email'),
    phone: text('phone'),
    platform: text('platform'),
    contact_type: contactTypeEnum('contact_type').notNull(),
    relationship_status: text('relationship_status'),
    notes: text('notes'),
    followers: bigint('followers', { mode: 'number' }).notNull().default(0),
    engagement_rate: numeric('engagement_rate', { precision: 6, scale: 4 }).notNull().default('0'),
    website: text('website'),
    social_links: jsonb('social_links').notNull().default('{}'),
    genres: jsonb('genres').notNull().default('[]'),
    priority: crmContactPriorityEnum('priority').notNull().default('medium'),
    tags: jsonb('tags').notNull().default('[]'),
    collaboration_score: numeric('collaboration_score', { precision: 5, scale: 2 }).notNull().default('0'),
    city: text('city'),
    country: text('country'),
    country_id: uuid('country_id'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    contactTypeIdx: index('crm_contacts_contact_type_idx').on(t.contact_type),
    emailIdx: index('crm_contacts_email_idx').on(t.email),
  }),
);

export const workflow_registry = pgTable(
  'workflow_registry',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull().unique(),
    description: text('description'),
    event_triggers: text('event_triggers').array().notNull().default([]),
    n8n_workflow_id: text('n8n_workflow_id'),
    webhook_path: text('webhook_path'),
    is_active: boolean('is_active').notNull().default(true),
    last_run_at: timestamp('last_run_at', { withTimezone: true }),
    last_run_status: text('last_run_status'),
    total_runs: integer('total_runs').notNull().default(0),
    success_count: integer('success_count').notNull().default(0),
    failed_count: integer('failed_count').notNull().default(0),
    metadata: jsonb('metadata'),
    // Mission Dispatcher (migration 0049) — per-workflow execution contract.
    retry_policy: jsonb('retry_policy').notNull().default({ max_retries: 3, backoff: 'exponential', base_delay_ms: 2000 }),
    timeout_ms: integer('timeout_ms').notNull().default(8000),
    priority: integer('priority').notNull().default(0),
    required_inputs: jsonb('required_inputs').notNull().default([]),
    expected_outputs: jsonb('expected_outputs').notNull().default([]),
    health_status: text('health_status').notNull().default('unknown'),
    version: text('version').notNull().default('v1'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    nameIdx:   index('workflow_registry_name_idx').on(t.name),
    activeIdx: index('workflow_registry_active_idx').on(t.is_active),
  }),
);

export const automation_runs = pgTable(
  'automation_runs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workflow_name: text('workflow_name').notNull(),
    source: automationSourceEnum('source').notNull(),
    status: automationStatusEnum('status').notNull(),
    payload: jsonb('payload'),
    result: jsonb('result'),
    retry_count: integer('retry_count').notNull().default(0),
    max_retries: integer('max_retries').notNull().default(3),
    error_message: text('error_message'),
    duration_ms: integer('duration_ms'),
    triggered_by_event: text('triggered_by_event'),
    workflow_registry_id: uuid('workflow_registry_id').references(() => workflow_registry.id, { onDelete: 'set null' }),
    // Mission Dispatcher (migration 0049) — links a run back to the mission
    // that dispatched it, so a mission's execution_history is a query
    // (WHERE mission_id = ...) instead of a duplicated column.
    mission_id: uuid('mission_id').references((): AnyPgColumn => release_missions.id, { onDelete: 'set null' }),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    statusIdx:      index('automation_runs_status_idx').on(t.status),
    workflowIdx:    index('automation_runs_workflow_name_idx').on(t.workflow_name),
    registryIdx:    index('automation_runs_registry_id_idx').on(t.workflow_registry_id),
    eventIdx:       index('automation_runs_triggered_by_idx').on(t.triggered_by_event),
    createdAtIdx:   index('automation_runs_created_at_idx').on(t.created_at),
    missionIdx:     index('automation_runs_mission_id_idx').on(t.mission_id),
  }),
);

export const scheduled_jobs = pgTable(
  'scheduled_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    job_name: text('job_name').notNull(),
    job_type: jobTypeEnum('job_type').notNull(),
    cron_expression: text('cron_expression'),
    run_once_at: timestamp('run_once_at'),
    payload: jsonb('payload'),
    status: jobStatusEnum('status').default('active').notNull(),
    last_run_at: timestamp('last_run_at'),
    next_run_at: timestamp('next_run_at'),
    run_count: integer('run_count').default(0).notNull(),
    last_error: text('last_error'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    statusIdx: index('scheduled_jobs_status_idx').on(t.status),
    typeIdx: index('scheduled_jobs_type_idx').on(t.job_type),
    nextRunIdx: index('scheduled_jobs_next_run_idx').on(t.next_run_at),
  }),
);

export const ai_recommendations = pgTable(
  'ai_recommendations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    recommendation_type: recommendationTypeEnum('recommendation_type').notNull(),
    entity_type: recEntityTypeEnum('entity_type').notNull(),
    entity_id: uuid('entity_id'),
    title: text('title').notNull(),
    body: text('body').notNull(),
    action_items: jsonb('action_items'),
    confidence_score: numeric('confidence_score', { precision: 3, scale: 2 }),
    accepted: boolean('accepted'),
    dismissed: boolean('dismissed').default(false).notNull(),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    typeIdx: index('ai_recs_type_idx').on(t.recommendation_type),
    entityIdx: index('ai_recs_entity_type_idx').on(t.entity_type),
  }),
);

export const activity_log = pgTable(
  'activity_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    // Legacy columns — nullable for backwards compat with pre-v2 rows
    user_email: text('user_email'),
    user_name: text('user_name'),
    action: text('action'),
    entity_name: text('entity_name'),
    // v2 columns
    event_type: text('event_type'),
    module: text('module'),
    entity_type: text('entity_type'),
    entity_id: text('entity_id'),
    title: text('title'),
    description: text('description'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
    severity: text('severity').default('info').notNull(),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index('activity_log_user_id_idx').on(t.user_id),
    actionIdx: index('activity_log_action_idx').on(t.action),
    entityTypeIdx: index('activity_log_entity_type_idx').on(t.entity_type),
    createdAtIdx: index('activity_log_created_at_idx').on(t.created_at),
    eventTypeIdx: index('activity_log_event_type_idx').on(t.event_type),
    moduleIdx: index('activity_log_module_idx').on(t.module),
    severityIdx: index('activity_log_severity_idx').on(t.severity),
  }),
);

export type ActivityLogEntry = typeof activity_log.$inferSelect;

// ---- Relations ----

export const artistProfilesRelations = relations(artist_profiles, ({ many }) => ({
  songs: many(songs),
}));

export const songsRelations = relations(songs, ({ one, many }) => ({
  artist: one(artist_profiles, {
    fields: [songs.artist_id],
    references: [artist_profiles.id],
  }),
  release: one(releases, {
    fields: [songs.release_id],
    references: [releases.id],
  }),
  assets: many(song_assets),
  contributors: many(contributors),
  royaltySources: many(royalty_sources),
  syncPitches: many(sync_pitches),
  contentIdeas: many(content_ideas),
}));

export const songAssetsRelations = relations(song_assets, ({ one }) => ({
  song: one(songs, {
    fields: [song_assets.song_id],
    references: [songs.id],
  }),
}));

export const contributorsRelations = relations(contributors, ({ one }) => ({
  song: one(songs, {
    fields: [contributors.song_id],
    references: [songs.id],
  }),
}));

export const releasesRelations = relations(releases, ({ one, many }) => ({
  artist: one(artist_profiles, {
    fields: [releases.artist_id],
    references: [artist_profiles.id],
  }),
  // Legacy single-song link
  song: one(songs, {
    fields: [releases.song_id],
    references: [songs.id],
  }),
  songs: many(songs),
  tasks: many(release_tasks),
  checklist: one(release_checklists, {
    fields: [releases.id],
    references: [release_checklists.release_id],
  }),
}));

export const releaseChecklistsRelations = relations(release_checklists, ({ one }) => ({
  release: one(releases, {
    fields: [release_checklists.release_id],
    references: [releases.id],
  }),
}));

export const releaseTasksRelations = relations(release_tasks, ({ one }) => ({
  release: one(releases, {
    fields: [release_tasks.release_id],
    references: [releases.id],
  }),
}));

export const royaltySourcesRelations = relations(royalty_sources, ({ one }) => ({
  song: one(songs, {
    fields: [royalty_sources.song_id],
    references: [songs.id],
  }),
}));

export const syncPitchesRelations = relations(sync_pitches, ({ one }) => ({
  song: one(songs, {
    fields: [sync_pitches.song_id],
    references: [songs.id],
  }),
}));

export const fanProfilesRelations = relations(fan_profiles, ({ many }) => ({
  events: many(fan_events),
}));

export const fanEventsRelations = relations(fan_events, ({ one }) => ({
  fan: one(fan_profiles, {
    fields: [fan_events.fan_id],
    references: [fan_profiles.id],
  }),
}));

// ---- Music Intelligence — Enums ----

export const emotionTypeEnum = pgEnum('emotion_type', [
  'grief', 'trauma', 'rage', 'joy', 'melancholy', 'euphoria',
  'anxiety', 'longing', 'triumph', 'nostalgia', 'peace', 'defiance',
]);

export const intentionTypeEnum = pgEnum('intention_type', [
  'heal_listener', 'inspire_action', 'create_nostalgia', 'deliver_message',
  'uplift_spirit', 'provoke_thought', 'celebrate_truth', 'process_pain',
]);

export const transformationTypeEnum = pgEnum('transformation_type', [
  'from_pain_to_peace', 'from_stagnation_to_momentum', 'from_confusion_to_clarity',
  'from_isolation_to_belonging', 'from_fear_to_courage', 'from_grief_to_acceptance',
  'from_doubt_to_conviction', 'from_chaos_to_order',
]);

export const sessionStatusEnum = pgEnum('session_status', ['draft', 'active', 'completed']);

// ---- Music Intelligence — Tables ----

export const creative_sessions = pgTable(
  'creative_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    artist_id: uuid('artist_id').references(() => artist_profiles.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    emotion: emotionTypeEnum('emotion').notNull(),
    intention: intentionTypeEnum('intention').notNull(),
    story: text('story'),
    listener_transformation: transformationTypeEnum('listener_transformation').notNull(),
    status: sessionStatusEnum('status').default('active').notNull(),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    artistIdx:  index('creative_sessions_artist_id_idx').on(t.artist_id),
    emotionIdx: index('creative_sessions_emotion_idx').on(t.emotion),
    statusIdx:  index('creative_sessions_status_idx').on(t.status),
  }),
);

export const song_blueprints = pgTable(
  'song_blueprints',
  {
    id:              uuid('id').primaryKey().defaultRandom(),
    session_id:      uuid('session_id').notNull().references(() => creative_sessions.id, { onDelete: 'cascade' }),
    artist_id:       uuid('artist_id').references(() => artist_profiles.id, { onDelete: 'cascade' }),
    bpm:             integer('bpm').notNull(),
    musical_key:     text('musical_key').notNull(),
    scale:           text('scale').notNull(),
    atmosphere:      text('atmosphere').notNull(),
    cadence_energy:  text('cadence_energy').notNull(),
    chord_direction: text('chord_direction').notNull(),
    vocal_energy:    text('vocal_energy').notNull(),
    hook_intensity:  text('hook_intensity').notNull(),
    engine_version:  text('engine_version').default('v1').notNull(),
    created_at:      timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    sessionIdx: index('song_blueprints_session_id_idx').on(t.session_id),
    artistIdx:  index('song_blueprints_artist_id_idx').on(t.artist_id),
  }),
);

export const emotional_profiles = pgTable(
  'emotional_profiles',
  {
    id:                      uuid('id').primaryKey().defaultRandom(),
    artist_id:               uuid('artist_id').references(() => artist_profiles.id, { onDelete: 'cascade' }),
    session_id:              uuid('session_id').references(() => creative_sessions.id, { onDelete: 'cascade' }),
    emotion:                 emotionTypeEnum('emotion').notNull(),
    intention:               intentionTypeEnum('intention').notNull(),
    story:                   text('story'),
    listener_transformation: transformationTypeEnum('listener_transformation').notNull(),
    created_at:              timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    artistIdx:  index('emotional_profiles_artist_id_idx').on(t.artist_id),
    emotionIdx: index('emotional_profiles_emotion_idx').on(t.emotion),
    sessionIdx: index('emotional_profiles_session_id_idx').on(t.session_id),
  }),
);

export const artist_memory = pgTable(
  'artist_memory',
  {
    id:               uuid('id').primaryKey().defaultRandom(),
    artist_id:        uuid('artist_id').notNull().unique().references(() => artist_profiles.id, { onDelete: 'cascade' }),
    dominant_emotion: emotionTypeEnum('dominant_emotion'),
    recurring_themes: jsonb('recurring_themes').$type<string[]>().default([]).notNull(),
    preferred_keys:   jsonb('preferred_keys').$type<string[]>().default([]).notNull(),
    avg_bpm_min:      integer('avg_bpm_min'),
    avg_bpm_max:      integer('avg_bpm_max'),
    session_count:    integer('session_count').default(0).notNull(),
    last_session_at:  timestamp('last_session_at'),
    created_at:       timestamp('created_at').defaultNow().notNull(),
    updated_at:       timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    artistIdx: index('artist_memory_artist_id_idx').on(t.artist_id),
  }),
);

// ---- Music Intelligence — Relations ----

export const creativeSessionsRelations = relations(creative_sessions, ({ one, many }) => ({
  artist:            one(artist_profiles, { fields: [creative_sessions.artist_id], references: [artist_profiles.id] }),
  blueprints:        many(song_blueprints),
  emotional_profile: one(emotional_profiles, { fields: [creative_sessions.id], references: [emotional_profiles.session_id] }),
}));

export const songBlueprintsRelations = relations(song_blueprints, ({ one }) => ({
  session: one(creative_sessions, { fields: [song_blueprints.session_id], references: [creative_sessions.id] }),
  artist:  one(artist_profiles, { fields: [song_blueprints.artist_id], references: [artist_profiles.id] }),
}));

export const emotionalProfilesRelations = relations(emotional_profiles, ({ one }) => ({
  session: one(creative_sessions, { fields: [emotional_profiles.session_id], references: [creative_sessions.id] }),
  artist:  one(artist_profiles, { fields: [emotional_profiles.artist_id], references: [artist_profiles.id] }),
}));

export const artistMemoryRelations = relations(artist_memory, ({ one }) => ({
  artist: one(artist_profiles, { fields: [artist_memory.artist_id], references: [artist_profiles.id] }),
}));

export const contentIdeasRelations = relations(content_ideas, ({ one }) => ({
  song: one(songs, {
    fields: [content_ideas.song_id],
    references: [songs.id],
  }),
}));

// ---- Inferred Types ----

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type ArtistProfile = typeof artist_profiles.$inferSelect;
export type NewArtistProfile = typeof artist_profiles.$inferInsert;
export type Song = typeof songs.$inferSelect;
export type NewSong = typeof songs.$inferInsert;
export type SongAsset = typeof song_assets.$inferSelect;
export type NewSongAsset = typeof song_assets.$inferInsert;
export type Contributor = typeof contributors.$inferSelect;
export type NewContributor = typeof contributors.$inferInsert;
export type Release = typeof releases.$inferSelect;
export type NewRelease = typeof releases.$inferInsert;
export type ReleaseTask = typeof release_tasks.$inferSelect;
export type NewReleaseTask = typeof release_tasks.$inferInsert;
export type ReleaseChecklist = typeof release_checklists.$inferSelect;
export type NewReleaseChecklist = typeof release_checklists.$inferInsert;
export type RoyaltySource = typeof royalty_sources.$inferSelect;
export type NewRoyaltySource = typeof royalty_sources.$inferInsert;
export type SyncPitch = typeof sync_pitches.$inferSelect;
export type NewSyncPitch = typeof sync_pitches.$inferInsert;
export type FanProfile = typeof fan_profiles.$inferSelect;
export type NewFanProfile = typeof fan_profiles.$inferInsert;
export type FanEvent = typeof fan_events.$inferSelect;
export type NewFanEvent = typeof fan_events.$inferInsert;
export type ContentIdea = typeof content_ideas.$inferSelect;
export type NewContentIdea = typeof content_ideas.$inferInsert;
export type CrmContact = typeof crm_contacts.$inferSelect;
export type NewCrmContact = typeof crm_contacts.$inferInsert;
export type WorkflowRegistry = typeof workflow_registry.$inferSelect;
export type NewWorkflowRegistry = typeof workflow_registry.$inferInsert;
export type AutomationRun = typeof automation_runs.$inferSelect;
export type NewAutomationRun = typeof automation_runs.$inferInsert;
export type ScheduledJob = typeof scheduled_jobs.$inferSelect;
export type NewScheduledJob = typeof scheduled_jobs.$inferInsert;
export type AiRecommendation = typeof ai_recommendations.$inferSelect;
export type NewAiRecommendation = typeof ai_recommendations.$inferInsert;

export const schema_migrations = pgTable('schema_migrations', {
  id: uuid('id').primaryKey().defaultRandom(),
  migration_name: text('migration_name').notNull().unique(),
  executed_at: timestamp('executed_at', { withTimezone: true }).defaultNow(),
});

export type SchemaMigration = typeof schema_migrations.$inferSelect;

// Music Core v1 inferred types
export type MusicRelease = typeof releases.$inferSelect;
export type NewMusicRelease = typeof releases.$inferInsert;
export type MusicSong = typeof songs.$inferSelect;
export type NewMusicSong = typeof songs.$inferInsert;

// ---- Sonic World Engine ----

export const sonic_world_blueprints = pgTable(
  'sonic_world_blueprints',
  {
    id:                        uuid('id').primaryKey().defaultRandom(),
    session_id:                uuid('session_id').notNull().references(() => creative_sessions.id, { onDelete: 'cascade' }),
    artist_id:                 uuid('artist_id').notNull().references(() => artist_profiles.id, { onDelete: 'cascade' }),
    // Genre DNA
    primary_genre:             text('primary_genre').notNull(),
    secondary_genre:           text('secondary_genre').notNull(),
    rhythm_influence:          text('rhythm_influence').notNull(),
    sonic_fusion_identity:     text('sonic_fusion_identity').notNull(),
    // Instrumentation
    drum_style:                text('drum_style').notNull(),
    percussion_textures:       text('percussion_textures').notNull(),
    bass_character:            text('bass_character').notNull(),
    melodic_instruments:       text('melodic_instruments').notNull(),
    ambient_layers:            text('ambient_layers').notNull(),
    organic_synthetic_ratio:   text('organic_synthetic_ratio').notNull(),
    // Vocal Architecture
    vocal_texture:             text('vocal_texture').notNull(),
    cadence_energy:            text('cadence_energy').notNull(),
    harmony_behavior:          text('harmony_behavior').notNull(),
    emotional_intensity:       text('emotional_intensity').notNull(),
    vocal_atmosphere:          text('vocal_atmosphere').notNull(),
    // Cinematic Environment
    visual_sonic_atmosphere:   text('visual_sonic_atmosphere').notNull(),
    emotional_weather:         text('emotional_weather').notNull(),
    scene_energy:              text('scene_energy').notNull(),
    cinematic_references:      text('cinematic_references').notNull(),
    // Rhythm Intelligence
    bpm:                       integer('bpm').notNull(),
    groove_behavior:           text('groove_behavior').notNull(),
    movement_energy:           text('movement_energy').notNull(),
    percussion_complexity:     text('percussion_complexity').notNull(),
    swing_characteristics:     text('swing_characteristics').notNull(),
    // Harmonic Emotion System
    musical_key:               text('musical_key').notNull(),
    scale:                     text('scale').notNull(),
    chord_behavior:            text('chord_behavior').notNull(),
    emotional_progression:     text('emotional_progression').notNull(),
    tension_release_behavior:  text('tension_release_behavior').notNull(),
    // Hook Strategy
    hook_intensity:            text('hook_intensity').notNull(),
    chant_potential:           text('chant_potential').notNull(),
    replayability:             text('replayability').notNull(),
    anthem_potential:          text('anthem_potential').notNull(),
    crowd_engagement_energy:   text('crowd_engagement_energy').notNull(),
    // Production Density (0-100)
    cinematic_density:         integer('cinematic_density').notNull().default(50),
    spiritual_intensity:       integer('spiritual_intensity').notNull().default(50),
    emotional_rawness:         integer('emotional_rawness').notNull().default(50),
    commercial_accessibility:  integer('commercial_accessibility').notNull().default(50),
    darkness_vs_hope:          integer('darkness_vs_hope').notNull().default(50),
    underground_vs_mainstream: integer('underground_vs_mainstream').notNull().default(50),
    organic_vs_synthetic:      integer('organic_vs_synthetic').notNull().default(50),
    // Assembly
    producer_brief:            text('producer_brief').notNull(),
    coherence_score:           numeric('coherence_score', { precision: 4, scale: 2 }).notNull().default('0.85'),
    engine_version:            text('engine_version').notNull().default('sw-v2'),
    // Stabilization audit trail
    raw_generation:            jsonb('raw_generation'),
    repaired_generation:       jsonb('repaired_generation'),
    validation_report:         jsonb('validation_report'),
    // Generation metadata
    confidence_score:          numeric('confidence_score', { precision: 4, scale: 2 }).notNull().default('1.00'),
    repair_count:              integer('repair_count').notNull().default(0),
    fallback_used:             boolean('fallback_used').notNull().default(false),
    generation_quality:        text('generation_quality').notNull().default('excellent'),
    created_at:                timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    sessionIdx:   index('sw_blueprints_session_id_idx').on(t.session_id),
    artistIdx:    index('sw_blueprints_artist_id_idx').on(t.artist_id),
    createdAtIdx: index('sw_blueprints_created_at_idx').on(t.created_at),
  }),
);

export const sonicWorldBlueprintsRelations = relations(sonic_world_blueprints, ({ one }) => ({
  session: one(creative_sessions, { fields: [sonic_world_blueprints.session_id], references: [creative_sessions.id] }),
  artist:  one(artist_profiles,   { fields: [sonic_world_blueprints.artist_id],  references: [artist_profiles.id] }),
}));

export type SonicWorldBlueprint = typeof sonic_world_blueprints.$inferSelect;
export type NewSonicWorldBlueprint = typeof sonic_world_blueprints.$inferInsert;

// ---- Sonic Memory Engine (Phase 3) ----

export const sonic_memory = pgTable(
  'sonic_memory',
  {
    id:                          uuid('id').primaryKey().defaultRandom(),
    blueprint_id:                uuid('blueprint_id').notNull().unique().references(() => sonic_world_blueprints.id, { onDelete: 'cascade' }),
    artist_id:                   uuid('artist_id').notNull().references(() => artist_profiles.id, { onDelete: 'cascade' }),
    emotion_at_generation:       text('emotion_at_generation').notNull().default(''),
    intention_at_generation:     text('intention_at_generation').notNull().default(''),
    bpm:                         integer('bpm').notNull().default(90),
    musical_key:                 text('musical_key').notNull().default('C'),
    scale:                       text('scale').notNull().default('Minor'),
    primary_genre:               text('primary_genre').notNull().default(''),
    secondary_genre:             text('secondary_genre').notNull().default(''),
    cinematic_density:           integer('cinematic_density').notNull().default(50),
    spiritual_intensity:         integer('spiritual_intensity').notNull().default(50),
    emotional_rawness:           integer('emotional_rawness').notNull().default(50),
    commercial_accessibility:    integer('commercial_accessibility').notNull().default(50),
    darkness_vs_hope:            integer('darkness_vs_hope').notNull().default(50),
    underground_vs_mainstream:   integer('underground_vs_mainstream').notNull().default(50),
    organic_vs_synthetic:        integer('organic_vs_synthetic').notNull().default(50),
    coherence_score:             numeric('coherence_score', { precision: 4, scale: 2 }).notNull().default('0.85'),
    confidence_score:            numeric('confidence_score', { precision: 4, scale: 2 }).notNull().default('1.00'),
    generation_quality:          text('generation_quality').notNull().default('excellent'),
    emotional_intensity_score:   numeric('emotional_intensity_score', { precision: 4, scale: 2 }).notNull().default('0.50'),
    commercial_potential_score:  numeric('commercial_potential_score', { precision: 4, scale: 2 }).notNull().default('0.50'),
    spiritual_alignment_score:   numeric('spiritual_alignment_score', { precision: 4, scale: 2 }).notNull().default('0.50'),
    replayability_score:         numeric('replayability_score', { precision: 4, scale: 2 }).notNull().default('0.50'),
    memory_vector:               jsonb('memory_vector'),
    rl_weight:                   numeric('rl_weight', { precision: 4, scale: 2 }).notNull().default('1.00'),
    ingested_at:                 timestamp('ingested_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    blueprintIdx: index('sonic_memory_blueprint_id_idx').on(t.blueprint_id),
    artistIdx:    index('sonic_memory_artist_id_idx').on(t.artist_id),
    ingestedIdx:  index('sonic_memory_ingested_at_idx').on(t.ingested_at),
  }),
);

export const sonicMemoryRelations = relations(sonic_memory, ({ one }) => ({
  blueprint: one(sonic_world_blueprints, { fields: [sonic_memory.blueprint_id], references: [sonic_world_blueprints.id] }),
  artist:    one(artist_profiles,        { fields: [sonic_memory.artist_id],    references: [artist_profiles.id] }),
}));

export type SonicMemory = typeof sonic_memory.$inferSelect;
export type NewSonicMemory = typeof sonic_memory.$inferInsert;

export const sonic_preferences = pgTable(
  'sonic_preferences',
  {
    id:              uuid('id').primaryKey().defaultRandom(),
    blueprint_id:    uuid('blueprint_id').notNull().references(() => sonic_world_blueprints.id, { onDelete: 'cascade' }),
    artist_id:       uuid('artist_id').notNull().references(() => artist_profiles.id, { onDelete: 'cascade' }),
    preference_type: text('preference_type').notNull(),
    metadata:        jsonb('metadata'),
    created_at:      timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    blueprintIdx: index('sonic_preferences_blueprint_id_idx').on(t.blueprint_id),
    artistIdx:    index('sonic_preferences_artist_id_idx').on(t.artist_id),
    typeIdx:      index('sonic_preferences_type_idx').on(t.preference_type),
  }),
);

export const sonicPreferencesRelations = relations(sonic_preferences, ({ one }) => ({
  blueprint: one(sonic_world_blueprints, { fields: [sonic_preferences.blueprint_id], references: [sonic_world_blueprints.id] }),
  artist:    one(artist_profiles,        { fields: [sonic_preferences.artist_id],    references: [artist_profiles.id] }),
}));

export type SonicPreference = typeof sonic_preferences.$inferSelect;
export type NewSonicPreference = typeof sonic_preferences.$inferInsert;

export const sonic_patterns = pgTable(
  'sonic_patterns',
  {
    id:                           uuid('id').primaryKey().defaultRandom(),
    artist_id:                    uuid('artist_id').notNull().unique().references(() => artist_profiles.id, { onDelete: 'cascade' }),
    bpm_distribution:             jsonb('bpm_distribution'),
    key_distribution:             jsonb('key_distribution'),
    scale_distribution:           jsonb('scale_distribution'),
    emotion_tendencies:           jsonb('emotion_tendencies'),
    commercial_tendencies:        jsonb('commercial_tendencies'),
    atmospheric_patterns:         jsonb('atmospheric_patterns'),
    vocal_architecture_trends:    jsonb('vocal_architecture_trends'),
    dominant_emotion:             text('dominant_emotion'),
    dominant_key:                 text('dominant_key'),
    dominant_scale:               text('dominant_scale'),
    dominant_genre:               text('dominant_genre'),
    avg_bpm:                      numeric('avg_bpm', { precision: 6, scale: 2 }),
    avg_coherence:                numeric('avg_coherence', { precision: 4, scale: 2 }),
    avg_commercial_accessibility: numeric('avg_commercial_accessibility', { precision: 4, scale: 2 }),
    avg_spiritual_intensity:      numeric('avg_spiritual_intensity', { precision: 4, scale: 2 }),
    avg_emotional_rawness:        numeric('avg_emotional_rawness', { precision: 4, scale: 2 }),
    total_blueprints_analyzed:    integer('total_blueprints_analyzed').notNull().default(0),
    last_analyzed_at:             timestamp('last_analyzed_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    artistIdx: index('sonic_patterns_artist_id_idx').on(t.artist_id),
  }),
);

export const sonicPatternsRelations = relations(sonic_patterns, ({ one }) => ({
  artist: one(artist_profiles, { fields: [sonic_patterns.artist_id], references: [artist_profiles.id] }),
}));

export type SonicPattern = typeof sonic_patterns.$inferSelect;
export type NewSonicPattern = typeof sonic_patterns.$inferInsert;

export const sonic_artist_profiles = pgTable(
  'sonic_artist_profiles',
  {
    id:                             uuid('id').primaryKey().defaultRandom(),
    artist_id:                      uuid('artist_id').notNull().unique().references(() => artist_profiles.id, { onDelete: 'cascade' }),
    profile_summary:                text('profile_summary').notNull().default(''),
    sonic_identity_tags:            jsonb('sonic_identity_tags'),
    dominant_genres:                jsonb('dominant_genres'),
    evolution_stage:                text('evolution_stage').notNull().default('emerging'),
    strongest_coherence_id:         uuid('strongest_coherence_id').references(() => sonic_world_blueprints.id, { onDelete: 'set null' }),
    highest_emotional_intensity_id: uuid('highest_emotional_intensity_id').references(() => sonic_world_blueprints.id, { onDelete: 'set null' }),
    highest_commercial_id:          uuid('highest_commercial_id').references(() => sonic_world_blueprints.id, { onDelete: 'set null' }),
    most_spiritual_id:              uuid('most_spiritual_id').references(() => sonic_world_blueprints.id, { onDelete: 'set null' }),
    most_replayable_id:             uuid('most_replayable_id').references(() => sonic_world_blueprints.id, { onDelete: 'set null' }),
    computed_at:                    timestamp('computed_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    artistIdx: index('sonic_artist_profiles_artist_id_idx').on(t.artist_id),
  }),
);

export const sonicArtistProfilesRelations = relations(sonic_artist_profiles, ({ one }) => ({
  artist: one(artist_profiles, { fields: [sonic_artist_profiles.artist_id], references: [artist_profiles.id] }),
}));

export type SonicArtistProfile = typeof sonic_artist_profiles.$inferSelect;
export type NewSonicArtistProfile = typeof sonic_artist_profiles.$inferInsert;

// ---- Sonic Director Engine (Phase 4) ----

export const sonic_director_recommendations = pgTable(
  'sonic_director_recommendations',
  {
    id:                   uuid('id').primaryKey().defaultRandom(),
    artist_id:            uuid('artist_id').notNull().references(() => artist_profiles.id, { onDelete: 'cascade' }),
    recommendation_type:  text('recommendation_type').notNull(),
    title:                text('title').notNull().default(''),
    description:          text('description').notNull().default(''),
    rationale:            text('rationale').notNull().default(''),
    confidence_score:     numeric('confidence_score', { precision: 4, scale: 2 }).notNull().default('0.75'),
    priority_rank:        integer('priority_rank').notNull().default(1),
    target_emotion:       text('target_emotion'),
    target_bpm_min:       integer('target_bpm_min'),
    target_bpm_max:       integer('target_bpm_max'),
    target_key:           text('target_key'),
    target_scale:         text('target_scale'),
    target_genre:         text('target_genre'),
    direction_parameters: jsonb('direction_parameters'),
    based_on_count:       integer('based_on_count').notNull().default(0),
    rl_metadata:          jsonb('rl_metadata'),
    generated_at:             timestamp('generated_at', { withTimezone: true }).defaultNow().notNull(),
    recommendation_version:   text('recommendation_version').notNull().default('rec-v1'),
    accepted:                 boolean('accepted').notNull().default(false),
    accepted_at:              timestamp('accepted_at', { withTimezone: true }),
  },
  (t) => ({
    artistIdx:      index('sonic_director_recs_artist_id_idx').on(t.artist_id),
    typeIdx:        index('sonic_director_recs_type_idx').on(t.recommendation_type),
    generatedAtIdx: index('sonic_director_recs_generated_at_idx').on(t.generated_at),
  }),
);

export const sonicDirectorRecommendationsRelations = relations(sonic_director_recommendations, ({ one }) => ({
  artist: one(artist_profiles, { fields: [sonic_director_recommendations.artist_id], references: [artist_profiles.id] }),
}));

export type SonicDirectorRecommendation    = typeof sonic_director_recommendations.$inferSelect;
export type NewSonicDirectorRecommendation = typeof sonic_director_recommendations.$inferInsert;

export const sonic_missions = pgTable(
  'sonic_missions',
  {
    id:                       uuid('id').primaryKey().defaultRandom(),
    artist_id:                uuid('artist_id').notNull().references(() => artist_profiles.id, { onDelete: 'cascade' }),
    mission_type:             text('mission_type').notNull(),
    title:                    text('title').notNull().default(''),
    description:              text('description').notNull().default(''),
    status:                   text('status').notNull().default('active'),
    start_score:              numeric('start_score', { precision: 5, scale: 2 }).notNull().default('0'),
    current_score:            numeric('current_score', { precision: 5, scale: 2 }).notNull().default('0'),
    target_score:             numeric('target_score', { precision: 5, scale: 2 }).notNull().default('75'),
    progress_percentage:      numeric('progress_percentage', { precision: 5, scale: 2 }).notNull().default('0'),
    blueprint_count_at_start: integer('blueprint_count_at_start').notNull().default(0),
    blueprint_milestones:     jsonb('blueprint_milestones'),
    mission_parameters:       jsonb('mission_parameters'),
    created_at:               timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at:               timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    completed_at:             timestamp('completed_at', { withTimezone: true }),
    scoring_version:          text('scoring_version').notNull().default('scoring-v1'),
  },
  (t) => ({
    artistIdx: index('sonic_missions_artist_id_idx').on(t.artist_id),
    statusIdx: index('sonic_missions_status_idx').on(t.status),
    typeIdx:   index('sonic_missions_type_idx').on(t.mission_type),
  }),
);

export const sonicMissionsRelations = relations(sonic_missions, ({ one }) => ({
  artist: one(artist_profiles, { fields: [sonic_missions.artist_id], references: [artist_profiles.id] }),
}));

export type SonicMission    = typeof sonic_missions.$inferSelect;
export type NewSonicMission = typeof sonic_missions.$inferInsert;

export const sonic_gap_analysis = pgTable(
  'sonic_gap_analysis',
  {
    id:                        uuid('id').primaryKey().defaultRandom(),
    artist_id:                 uuid('artist_id').notNull().unique().references(() => artist_profiles.id, { onDelete: 'cascade' }),
    underexplored_emotions:    jsonb('underexplored_emotions'),
    overused_bpm_ranges:       jsonb('overused_bpm_ranges'),
    repetitive_atmospheres:    jsonb('repetitive_atmospheres'),
    harmonic_stagnation:       jsonb('harmonic_stagnation'),
    gap_score:                 numeric('gap_score', { precision: 4, scale: 2 }).notNull().default('0'),
    total_blueprints_analyzed: integer('total_blueprints_analyzed').notNull().default(0),
    analyzed_at:               timestamp('analyzed_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    artistIdx: index('sonic_gap_analysis_artist_id_idx').on(t.artist_id),
  }),
);

export const sonicGapAnalysisRelations = relations(sonic_gap_analysis, ({ one }) => ({
  artist: one(artist_profiles, { fields: [sonic_gap_analysis.artist_id], references: [artist_profiles.id] }),
}));

export type SonicGapAnalysis    = typeof sonic_gap_analysis.$inferSelect;
export type NewSonicGapAnalysis = typeof sonic_gap_analysis.$inferInsert;

export const sonic_release_simulations = pgTable(
  'sonic_release_simulations',
  {
    id:                       uuid('id').primaryKey().defaultRandom(),
    blueprint_id:             uuid('blueprint_id').notNull().unique().references(() => sonic_world_blueprints.id, { onDelete: 'cascade' }),
    artist_id:                uuid('artist_id').notNull().references(() => artist_profiles.id, { onDelete: 'cascade' }),
    commercial_score:         numeric('commercial_score', { precision: 5, scale: 2 }).notNull().default('0'),
    sync_score:               numeric('sync_score', { precision: 5, scale: 2 }).notNull().default('0'),
    crowd_energy:             numeric('crowd_energy', { precision: 5, scale: 2 }).notNull().default('0'),
    replayability_prediction: numeric('replayability_prediction', { precision: 5, scale: 2 }).notNull().default('0'),
    emotional_stickiness:     numeric('emotional_stickiness', { precision: 5, scale: 2 }).notNull().default('0'),
    cinematic_potential:      numeric('cinematic_potential', { precision: 5, scale: 2 }).notNull().default('0'),
    overall_release_score:    numeric('overall_release_score', { precision: 5, scale: 2 }).notNull().default('0'),
    sync_tags:                jsonb('sync_tags'),
    producer_compatibility:   jsonb('producer_compatibility'),
    simulation_notes:         text('simulation_notes').notNull().default(''),
    confidence_score:         numeric('confidence_score', { precision: 4, scale: 2 }).notNull().default('0.80'),
    rl_metadata:              jsonb('rl_metadata'),
    algorithm_version:        text('algorithm_version').notNull().default('sim-v1'),
    simulated_at:             timestamp('simulated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    blueprintIdx: index('sonic_release_sims_blueprint_id_idx').on(t.blueprint_id),
    artistIdx:    index('sonic_release_sims_artist_id_idx').on(t.artist_id),
  }),
);

export const sonicReleaseSimulationsRelations = relations(sonic_release_simulations, ({ one }) => ({
  blueprint: one(sonic_world_blueprints, { fields: [sonic_release_simulations.blueprint_id], references: [sonic_world_blueprints.id] }),
  artist:    one(artist_profiles,        { fields: [sonic_release_simulations.artist_id],    references: [artist_profiles.id] }),
}));

export type SonicReleaseSimulation    = typeof sonic_release_simulations.$inferSelect;
export type NewSonicReleaseSimulation = typeof sonic_release_simulations.$inferInsert;

// ---- Phase 5: Execution Engine ----

export const sonic_execution_plans = pgTable(
  'sonic_execution_plans',
  {
    id:                 uuid('id').primaryKey().defaultRandom(),
    artist_id:          uuid('artist_id').notNull().references(() => artist_profiles.id, { onDelete: 'cascade' }),
    recommendation_id:  uuid('recommendation_id').references(() => sonic_director_recommendations.id, { onDelete: 'set null' }),
    mission_id:         uuid('mission_id').references(() => sonic_missions.id, { onDelete: 'set null' }),
    category:           text('category').notNull(),
    title:              text('title').notNull().default(''),
    objective:          text('objective').notNull().default(''),
    production_tasks:   jsonb('production_tasks'),
    timeline_days:      integer('timeline_days').notNull().default(14),
    status:             text('status').notNull().default('pending'),
    completion_score:   numeric('completion_score', { precision: 4, scale: 2 }).notNull().default('0'),
    scoring_version:    text('scoring_version').notNull().default('scoring-v1'),
    algorithm_version:  text('algorithm_version').notNull().default('exec-v1'),
    created_at:         timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at:         timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    completed_at:       timestamp('completed_at', { withTimezone: true }),
  },
  (t) => ({
    artistIdx:  index('sonic_exec_plans_artist_id_idx').on(t.artist_id),
    statusIdx:  index('sonic_exec_plans_status_idx').on(t.status),
    categoryIdx: index('sonic_exec_plans_category_idx').on(t.category),
    recIdx:     index('sonic_exec_plans_rec_id_idx').on(t.recommendation_id),
  }),
);

export const sonicExecutionPlansRelations = relations(sonic_execution_plans, ({ one, many }) => ({
  artist:         one(artist_profiles,              { fields: [sonic_execution_plans.artist_id],         references: [artist_profiles.id] }),
  recommendation: one(sonic_director_recommendations, { fields: [sonic_execution_plans.recommendation_id], references: [sonic_director_recommendations.id] }),
  mission:        one(sonic_missions,               { fields: [sonic_execution_plans.mission_id],        references: [sonic_missions.id] }),
  milestones:     many(sonic_execution_milestones),
  checkpoints:    many(sonic_execution_checkpoints),
}));

export type SonicExecutionPlan    = typeof sonic_execution_plans.$inferSelect;
export type NewSonicExecutionPlan = typeof sonic_execution_plans.$inferInsert;

export const sonic_execution_milestones = pgTable(
  'sonic_execution_milestones',
  {
    id:                   uuid('id').primaryKey().defaultRandom(),
    plan_id:              uuid('plan_id').notNull().references(() => sonic_execution_plans.id, { onDelete: 'cascade' }),
    artist_id:            uuid('artist_id').notNull().references(() => artist_profiles.id, { onDelete: 'cascade' }),
    title:                text('title').notNull().default(''),
    description:          text('description').notNull().default(''),
    target_day:           integer('target_day').notNull().default(7),
    completion_criteria:  jsonb('completion_criteria'),
    status:               text('status').notNull().default('pending'),
    completed_at:         timestamp('completed_at', { withTimezone: true }),
    created_at:           timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    planIdx:   index('sonic_exec_milestones_plan_id_idx').on(t.plan_id),
    statusIdx: index('sonic_exec_milestones_status_idx').on(t.status),
  }),
);

export const sonicExecutionMilestonesRelations = relations(sonic_execution_milestones, ({ one }) => ({
  plan:   one(sonic_execution_plans, { fields: [sonic_execution_milestones.plan_id],   references: [sonic_execution_plans.id] }),
  artist: one(artist_profiles,       { fields: [sonic_execution_milestones.artist_id], references: [artist_profiles.id] }),
}));

export type SonicExecutionMilestone    = typeof sonic_execution_milestones.$inferSelect;
export type NewSonicExecutionMilestone = typeof sonic_execution_milestones.$inferInsert;

export const sonic_execution_checkpoints = pgTable(
  'sonic_execution_checkpoints',
  {
    id:                   uuid('id').primaryKey().defaultRandom(),
    plan_id:              uuid('plan_id').notNull().references(() => sonic_execution_plans.id, { onDelete: 'cascade' }),
    milestone_id:         uuid('milestone_id').references(() => sonic_execution_milestones.id, { onDelete: 'set null' }),
    checkpoint_type:      text('checkpoint_type').notNull().default('manual'),
    data_snapshot:        jsonb('data_snapshot'),
    score_at_checkpoint:  numeric('score_at_checkpoint', { precision: 4, scale: 2 }).notNull().default('0'),
    notes:                text('notes').notNull().default(''),
    created_at:           timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    planIdx: index('sonic_exec_checkpoints_plan_id_idx').on(t.plan_id),
  }),
);

export const sonicExecutionCheckpointsRelations = relations(sonic_execution_checkpoints, ({ one }) => ({
  plan:      one(sonic_execution_plans,       { fields: [sonic_execution_checkpoints.plan_id],      references: [sonic_execution_plans.id] }),
  milestone: one(sonic_execution_milestones,  { fields: [sonic_execution_checkpoints.milestone_id], references: [sonic_execution_milestones.id] }),
}));

export type SonicExecutionCheckpoint    = typeof sonic_execution_checkpoints.$inferSelect;
export type NewSonicExecutionCheckpoint = typeof sonic_execution_checkpoints.$inferInsert;

export const sonic_session_diagnostics = pgTable(
  'sonic_session_diagnostics',
  {
    id:                            uuid('id').primaryKey().defaultRandom(),
    artist_id:                     uuid('artist_id').notNull().references(() => artist_profiles.id, { onDelete: 'cascade' }),
    session_id:                    uuid('session_id').references(() => creative_sessions.id, { onDelete: 'set null' }),
    stagnation_detected:           boolean('stagnation_detected').notNull().default(false),
    over_density_detected:         boolean('over_density_detected').notNull().default(false),
    emotional_flatness_detected:   boolean('emotional_flatness_detected').notNull().default(false),
    harmonic_repetition_detected:  boolean('harmonic_repetition_detected').notNull().default(false),
    weak_transitions_detected:     boolean('weak_transitions_detected').notNull().default(false),
    diagnostic_score:              numeric('diagnostic_score', { precision: 4, scale: 2 }).notNull().default('1.00'),
    recommendations:               jsonb('recommendations'),
    blueprint_window_size:         integer('blueprint_window_size').notNull().default(10),
    analyzed_at:                   timestamp('analyzed_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    artistIdx:     index('sonic_session_diagnostics_artist_id_idx').on(t.artist_id),
    analyzedAtIdx: index('sonic_session_diagnostics_analyzed_at_idx').on(t.analyzed_at),
  }),
);

export const sonicSessionDiagnosticsRelations = relations(sonic_session_diagnostics, ({ one }) => ({
  artist: one(artist_profiles,    { fields: [sonic_session_diagnostics.artist_id],  references: [artist_profiles.id] }),
  session: one(creative_sessions, { fields: [sonic_session_diagnostics.session_id], references: [creative_sessions.id] }),
}));

export type SonicSessionDiagnostic    = typeof sonic_session_diagnostics.$inferSelect;
export type NewSonicSessionDiagnostic = typeof sonic_session_diagnostics.$inferInsert;

export const sonic_events = pgTable(
  'sonic_events',
  {
    id:           uuid('id').primaryKey().defaultRandom(),
    artist_id:    uuid('artist_id').references(() => artist_profiles.id, { onDelete: 'set null' }),
    event_type:   text('event_type').notNull(),
    payload:      jsonb('payload'),
    processed:    boolean('processed').notNull().default(false),
    processed_at: timestamp('processed_at', { withTimezone: true }),
    created_at:   timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    artistIdx:    index('sonic_events_artist_id_idx').on(t.artist_id),
    eventTypeIdx: index('sonic_events_event_type_idx').on(t.event_type),
    processedIdx: index('sonic_events_processed_idx').on(t.processed),
    createdAtIdx: index('sonic_events_created_at_idx').on(t.created_at),
  }),
);

export const sonicEventsRelations = relations(sonic_events, ({ one }) => ({
  artist: one(artist_profiles, { fields: [sonic_events.artist_id], references: [artist_profiles.id] }),
}));

export type SonicEvent    = typeof sonic_events.$inferSelect;
export type NewSonicEvent = typeof sonic_events.$inferInsert;

export const sonic_queue_jobs = pgTable(
  'sonic_queue_jobs',
  {
    id:           uuid('id').primaryKey().defaultRandom(),
    queue_name:   text('queue_name').notNull(),
    job_id:       text('job_id'),
    job_type:     text('job_type').notNull(),
    artist_id:    uuid('artist_id').references(() => artist_profiles.id, { onDelete: 'set null' }),
    payload:      jsonb('payload'),
    status:       text('status').notNull().default('pending'),
    attempts:     integer('attempts').notNull().default(0),
    error:        text('error'),
    created_at:   timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    completed_at: timestamp('completed_at', { withTimezone: true }),
  },
  (t) => ({
    queueIdx:     index('sonic_queue_jobs_queue_name_idx').on(t.queue_name),
    statusIdx:    index('sonic_queue_jobs_status_idx').on(t.status),
    artistIdx:    index('sonic_queue_jobs_artist_id_idx').on(t.artist_id),
    createdAtIdx: index('sonic_queue_jobs_created_at_idx').on(t.created_at),
  }),
);

export const sonicQueueJobsRelations = relations(sonic_queue_jobs, ({ one }) => ({
  artist: one(artist_profiles, { fields: [sonic_queue_jobs.artist_id], references: [artist_profiles.id] }),
}));

export type SonicQueueJob    = typeof sonic_queue_jobs.$inferSelect;
export type NewSonicQueueJob = typeof sonic_queue_jobs.$inferInsert;

export const platform_ingestion_signals = pgTable(
  'platform_ingestion_signals',
  {
    id:          uuid('id').primaryKey().defaultRandom(),
    artist_id:   uuid('artist_id').notNull().references(() => artist_profiles.id, { onDelete: 'cascade' }),
    platform:    text('platform').notNull(),
    signal_type: text('signal_type').notNull(),
    track_id:    text('track_id'),
    track_title: text('track_title'),
    value:       numeric('value', { precision: 12, scale: 4 }).notNull().default('0'),
    recorded_at: timestamp('recorded_at', { withTimezone: true }).defaultNow().notNull(),
    ingested_at: timestamp('ingested_at', { withTimezone: true }).defaultNow().notNull(),
    metadata:    jsonb('metadata'),
  },
  (t) => ({
    artistIdx:     index('platform_signals_artist_id_idx').on(t.artist_id),
    platformIdx:   index('platform_signals_platform_idx').on(t.platform),
    signalTypeIdx: index('platform_signals_signal_type_idx').on(t.signal_type),
    recordedAtIdx: index('platform_signals_recorded_at_idx').on(t.recorded_at),
  }),
);

export const platformIngestionSignalsRelations = relations(platform_ingestion_signals, ({ one }) => ({
  artist: one(artist_profiles, { fields: [platform_ingestion_signals.artist_id], references: [artist_profiles.id] }),
}));

export type PlatformIngestionSignal    = typeof platform_ingestion_signals.$inferSelect;
export type NewPlatformIngestionSignal = typeof platform_ingestion_signals.$inferInsert;

// ── Audio Pipeline (Phase 6) ─────────────────────────────────────────────────

export const audio_uploads = pgTable(
  'audio_uploads',
  {
    id:               uuid('id').primaryKey().defaultRandom(),
    session_id:       uuid('session_id').notNull().defaultRandom(),
    artist_id:        uuid('artist_id').references(() => artist_profiles.id, { onDelete: 'set null' }),
    song_id:          uuid('song_id').references((): AnyPgColumn => songs.id, { onDelete: 'set null' }),
    file_name:        text('file_name').notNull(),
    file_size:        integer('file_size').notNull(),
    mime_type:        text('mime_type').notNull(),
    storage_path:     text('storage_path').notNull(),
    storage_url:      text('storage_url'),
    duration_seconds: numeric('duration_seconds', { precision: 10, scale: 3 }),
    status:           text('status').notNull().default('pending'),
    upload_version:   text('upload_version').notNull().default('v1'),
    created_at:       timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at:       timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    artistIdx:    index('audio_uploads_artist_id_idx').on(t.artist_id),
    sessionIdx:   index('audio_uploads_session_id_idx').on(t.session_id),
    statusIdx:    index('audio_uploads_status_idx').on(t.status),
    createdAtIdx: index('audio_uploads_created_at_idx').on(t.created_at),
  }),
);

export const audioUploadsRelations = relations(audio_uploads, ({ one, many }) => ({
  artist:   one(artist_profiles, { fields: [audio_uploads.artist_id], references: [artist_profiles.id] }),
  analysis: one(audio_analysis, { fields: [audio_uploads.id], references: [audio_analysis.upload_id] }),
  waveform: one(waveform_cache, { fields: [audio_uploads.id], references: [waveform_cache.upload_id] }),
  jobs:     many(audio_jobs),
  stems:    many(audio_stems),
}));

export type AudioUpload    = typeof audio_uploads.$inferSelect;
export type NewAudioUpload = typeof audio_uploads.$inferInsert;

export const audio_analysis = pgTable(
  'audio_analysis',
  {
    id:                  uuid('id').primaryKey().defaultRandom(),
    upload_id:           uuid('upload_id').notNull().references(() => audio_uploads.id, { onDelete: 'cascade' }),
    artist_id:           uuid('artist_id').references(() => artist_profiles.id, { onDelete: 'set null' }),
    bpm:                 numeric('bpm', { precision: 6, scale: 2 }),
    duration_seconds:    numeric('duration_seconds', { precision: 10, scale: 3 }),
    loudness_lufs:       numeric('loudness_lufs', { precision: 8, scale: 3 }),
    peak_db:             numeric('peak_db', { precision: 8, scale: 3 }),
    sample_rate:         integer('sample_rate'),
    bit_rate:            integer('bit_rate'),
    channels:            integer('channels'),
    format:              text('format'),
    spectral_centroid:   numeric('spectral_centroid', { precision: 10, scale: 3 }),
    emotional_profile:   jsonb('emotional_profile'),
    cinematic_score:     numeric('cinematic_score', { precision: 5, scale: 2 }),
    sync_categories:     jsonb('sync_categories'),
    genre_confidence:    jsonb('genre_confidence'),
    vocal_intensity:     numeric('vocal_intensity', { precision: 5, scale: 2 }),
    replay_score:        numeric('replay_score', { precision: 5, scale: 2 }),
    trailer_suitability: numeric('trailer_suitability', { precision: 5, scale: 2 }),
    ai_notes:            text('ai_notes'),
    ai_model_version:    text('ai_model_version').notNull().default('v1'),
    processing_version:  text('processing_version').notNull().default('v1'),
    created_at:          timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uploadIdx: index('audio_analysis_upload_id_idx').on(t.upload_id),
    artistIdx: index('audio_analysis_artist_id_idx').on(t.artist_id),
  }),
);

export const audioAnalysisRelations = relations(audio_analysis, ({ one }) => ({
  upload: one(audio_uploads, { fields: [audio_analysis.upload_id], references: [audio_uploads.id] }),
  artist: one(artist_profiles, { fields: [audio_analysis.artist_id], references: [artist_profiles.id] }),
}));

export type AudioAnalysis    = typeof audio_analysis.$inferSelect;
export type NewAudioAnalysis = typeof audio_analysis.$inferInsert;

export const audio_jobs = pgTable(
  'audio_jobs',
  {
    id:           uuid('id').primaryKey().defaultRandom(),
    upload_id:    uuid('upload_id').notNull().references(() => audio_uploads.id, { onDelete: 'cascade' }),
    queue_name:   text('queue_name').notNull(),
    job_id:       text('job_id'),
    job_type:     text('job_type').notNull(),
    status:       text('status').notNull().default('pending'),
    attempts:     integer('attempts').notNull().default(0),
    max_attempts: integer('max_attempts').notNull().default(3),
    error:        text('error'),
    payload:      jsonb('payload'),
    created_at:   timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    completed_at: timestamp('completed_at', { withTimezone: true }),
  },
  (t) => ({
    uploadIdx:    index('audio_jobs_upload_id_idx').on(t.upload_id),
    statusIdx:    index('audio_jobs_status_idx').on(t.status),
    queueIdx:     index('audio_jobs_queue_name_idx').on(t.queue_name),
    createdAtIdx: index('audio_jobs_created_at_idx').on(t.created_at),
  }),
);

export const audioJobsRelations = relations(audio_jobs, ({ one }) => ({
  upload: one(audio_uploads, { fields: [audio_jobs.upload_id], references: [audio_uploads.id] }),
}));

export type AudioJob    = typeof audio_jobs.$inferSelect;
export type NewAudioJob = typeof audio_jobs.$inferInsert;

export const audio_stems = pgTable(
  'audio_stems',
  {
    id:               uuid('id').primaryKey().defaultRandom(),
    upload_id:        uuid('upload_id').notNull().references(() => audio_uploads.id, { onDelete: 'cascade' }),
    artist_id:        uuid('artist_id').references(() => artist_profiles.id, { onDelete: 'set null' }),
    stem_type:        text('stem_type').notNull(),
    file_name:        text('file_name').notNull(),
    file_size:        integer('file_size').notNull(),
    storage_path:     text('storage_path').notNull(),
    storage_url:      text('storage_url'),
    duration_seconds: numeric('duration_seconds', { precision: 10, scale: 3 }),
    status:           text('status').notNull().default('pending'),
    created_at:       timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uploadIdx: index('audio_stems_upload_id_idx').on(t.upload_id),
    artistIdx: index('audio_stems_artist_id_idx').on(t.artist_id),
    typeIdx:   index('audio_stems_stem_type_idx').on(t.stem_type),
  }),
);

export const audioStemsRelations = relations(audio_stems, ({ one }) => ({
  upload: one(audio_uploads, { fields: [audio_stems.upload_id], references: [audio_uploads.id] }),
  artist: one(artist_profiles, { fields: [audio_stems.artist_id], references: [artist_profiles.id] }),
}));

export type AudioStem    = typeof audio_stems.$inferSelect;
export type NewAudioStem = typeof audio_stems.$inferInsert;

export const waveform_cache = pgTable(
  'waveform_cache',
  {
    id:               uuid('id').primaryKey().defaultRandom(),
    upload_id:        uuid('upload_id').notNull().unique().references(() => audio_uploads.id, { onDelete: 'cascade' }),
    waveform_data:    jsonb('waveform_data').notNull(),
    sample_count:     integer('sample_count').notNull(),
    duration_seconds: numeric('duration_seconds', { precision: 10, scale: 3 }).notNull(),
    generated_at:     timestamp('generated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uploadIdx: index('waveform_cache_upload_id_idx').on(t.upload_id),
  }),
);

export const waveformCacheRelations = relations(waveform_cache, ({ one }) => ({
  upload: one(audio_uploads, { fields: [waveform_cache.upload_id], references: [audio_uploads.id] }),
}));

export type WaveformCache    = typeof waveform_cache.$inferSelect;
export type NewWaveformCache = typeof waveform_cache.$inferInsert;

// ---------------------------------------------------------------------------
// Energy Intelligence Engine — Phase 7
// ---------------------------------------------------------------------------

export const energy_analysis = pgTable(
  'energy_analysis',
  {
    id:                uuid('id').primaryKey().defaultRandom(),
    upload_id:         uuid('upload_id').notNull().unique().references(() => audio_uploads.id, { onDelete: 'cascade' }),
    artist_id:         uuid('artist_id').references(() => artist_profiles.id, { onDelete: 'set null' }),

    // Global intelligence
    energy_arc:        text('energy_arc'),
    peak_moment:       text('peak_moment'),
    drop_strength:     numeric('drop_strength',     { precision: 5, scale: 2 }),
    energy_volatility: numeric('energy_volatility', { precision: 5, scale: 2 }),
    tension_curve:     text('tension_curve'),
    replay_retention:  numeric('replay_retention',  { precision: 5, scale: 2 }),

    // Compact energy curve for visualization (downsampled ~1 pt/sec)
    energy_curve:      jsonb('energy_curve'),

    // Processing provenance
    frame_size:        integer('frame_size'),
    hop_size:          integer('hop_size'),
    sample_rate:       integer('sample_rate'),
    analyzer_version:  text('analyzer_version'),

    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    artistIdx:  index('energy_analysis_artist_id_idx').on(t.artist_id),
    createdIdx: index('energy_analysis_created_at_idx').on(t.created_at),
  }),
);

export const energyAnalysisRelations = relations(energy_analysis, ({ one, many }) => ({
  upload:   one(audio_uploads,    { fields: [energy_analysis.upload_id], references: [audio_uploads.id] }),
  artist:   one(artist_profiles,  { fields: [energy_analysis.artist_id], references: [artist_profiles.id] }),
  sections: many(energy_sections),
}));

export type EnergyAnalysis    = typeof energy_analysis.$inferSelect;
export type NewEnergyAnalysis = typeof energy_analysis.$inferInsert;

// ---------------------------------------------------------------------------

export const energy_sections = pgTable(
  'energy_sections',
  {
    id:                    uuid('id').primaryKey().defaultRandom(),
    analysis_id:           uuid('analysis_id').notNull().references(() => energy_analysis.id, { onDelete: 'cascade' }),
    upload_id:             uuid('upload_id').notNull().references(() => audio_uploads.id,    { onDelete: 'cascade' }),

    section_type:          text('section_type').notNull(),
    section_index:         integer('section_index').notNull(),
    start_time:            numeric('start_time', { precision: 10, scale: 3 }).notNull(),
    end_time:              numeric('end_time',   { precision: 10, scale: 3 }).notNull(),
    duration:              numeric('duration',   { precision: 10, scale: 3 }).notNull(),

    avg_rms:               numeric('avg_rms',               { precision: 10, scale: 6 }),
    peak_rms:              numeric('peak_rms',              { precision: 10, scale: 6 }),
    avg_spectral_centroid: numeric('avg_spectral_centroid', { precision: 10, scale: 3 }),
    avg_spectral_flux:     numeric('avg_spectral_flux',     { precision: 10, scale: 6 }),
    avg_zcr:               numeric('avg_zcr',               { precision: 10, scale: 6 }),
    energy_score:          numeric('energy_score',          { precision: 5, scale: 2 }),
    tension_score:         numeric('tension_score',         { precision: 5, scale: 2 }),

    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    analysisIdx: index('energy_sections_analysis_id_idx').on(t.analysis_id),
    uploadIdx:   index('energy_sections_upload_id_idx').on(t.upload_id),
  }),
);

export const energySectionsRelations = relations(energy_sections, ({ one }) => ({
  analysis: one(energy_analysis, { fields: [energy_sections.analysis_id], references: [energy_analysis.id] }),
  upload:   one(audio_uploads,   { fields: [energy_sections.upload_id],   references: [audio_uploads.id] }),
}));

export type EnergySection    = typeof energy_sections.$inferSelect;
export type NewEnergySection = typeof energy_sections.$inferInsert;

// ---------------------------------------------------------------------------

export const energy_jobs = pgTable(
  'energy_jobs',
  {
    id:            uuid('id').primaryKey().defaultRandom(),
    upload_id:     uuid('upload_id').notNull().references(() => audio_uploads.id, { onDelete: 'cascade' }),
    queue_job_id:  text('queue_job_id'),
    status:        text('status').notNull().default('pending'),
    error_message: text('error_message'),
    started_at:    timestamp('started_at',   { withTimezone: true }),
    completed_at:  timestamp('completed_at', { withTimezone: true }),
    created_at:    timestamp('created_at',   { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uploadIdx:  index('energy_jobs_upload_id_idx').on(t.upload_id),
    statusIdx:  index('energy_jobs_status_idx').on(t.status),
    createdIdx: index('energy_jobs_created_at_idx').on(t.created_at),
  }),
);

export const energyJobsRelations = relations(energy_jobs, ({ one }) => ({
  upload: one(audio_uploads, { fields: [energy_jobs.upload_id], references: [audio_uploads.id] }),
}));

export type EnergyJob    = typeof energy_jobs.$inferSelect;
export type NewEnergyJob = typeof energy_jobs.$inferInsert;

// ── Audio DNA Engine (Phase 1 DATIAM Intelligence) ───────────────────────────

export const audio_dna = pgTable(
  'audio_dna',
  {
    id:         uuid('id').primaryKey().defaultRandom(),
    upload_id:  uuid('upload_id').notNull().references(() => audio_uploads.id, { onDelete: 'cascade' }),
    artist_id:  uuid('artist_id').references(() => artist_profiles.id, { onDelete: 'set null' }),

    primary_genre:   text('primary_genre').notNull().default('Unknown'),
    secondary_genre: text('secondary_genre'),
    genre_confidence: numeric('genre_confidence', { precision: 5, scale: 2 }),
    genre_tags:      jsonb('genre_tags'),

    mood_primary:   text('mood_primary'),
    mood_secondary: text('mood_secondary'),
    mood_profile:   jsonb('mood_profile'),

    emotional_fingerprint: jsonb('emotional_fingerprint'),
    sonic_fingerprint:     jsonb('sonic_fingerprint'),
    energy_fingerprint:    jsonb('energy_fingerprint'),

    danceability: numeric('danceability', { precision: 5, scale: 2 }),
    brightness:   numeric('brightness',   { precision: 5, scale: 2 }),
    warmth:       numeric('warmth',       { precision: 5, scale: 2 }),
    darkness:     numeric('darkness',     { precision: 5, scale: 2 }),
    aggression:   numeric('aggression',   { precision: 5, scale: 2 }),
    spirituality: numeric('spirituality', { precision: 5, scale: 2 }),
    romance:      numeric('romance',      { precision: 5, scale: 2 }),
    triumph:      numeric('triumph',      { precision: 5, scale: 2 }),
    melancholy:   numeric('melancholy',   { precision: 5, scale: 2 }),
    tension:      numeric('tension',      { precision: 5, scale: 2 }),

    analyzer_version:   text('analyzer_version').notNull().default('1.0.0'),
    processing_time_ms: integer('processing_time_ms'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uploadIdx: index('audio_dna_upload_id_idx').on(t.upload_id),
    artistIdx: index('audio_dna_artist_id_idx').on(t.artist_id),
    genreIdx:  index('audio_dna_primary_genre_idx').on(t.primary_genre),
  }),
);

export const audioDnaRelations = relations(audio_dna, ({ one }) => ({
  upload: one(audio_uploads, { fields: [audio_dna.upload_id], references: [audio_uploads.id] }),
  artist: one(artist_profiles, { fields: [audio_dna.artist_id], references: [artist_profiles.id] }),
}));

export type AudioDna    = typeof audio_dna.$inferSelect;
export type NewAudioDna = typeof audio_dna.$inferInsert;

export const audio_dna_jobs = pgTable(
  'audio_dna_jobs',
  {
    id:            uuid('id').primaryKey().defaultRandom(),
    upload_id:     uuid('upload_id').notNull().references(() => audio_uploads.id, { onDelete: 'cascade' }),
    queue_job_id:  text('queue_job_id'),
    status:        text('status').notNull().default('pending'),
    error_message: text('error_message'),
    started_at:    timestamp('started_at',   { withTimezone: true }),
    completed_at:  timestamp('completed_at', { withTimezone: true }),
    created_at:    timestamp('created_at',   { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uploadIdx: index('audio_dna_jobs_upload_id_idx').on(t.upload_id),
    statusIdx: index('audio_dna_jobs_status_idx').on(t.status),
  }),
);

export const audioDnaJobsRelations = relations(audio_dna_jobs, ({ one }) => ({
  upload: one(audio_uploads, { fields: [audio_dna_jobs.upload_id], references: [audio_uploads.id] }),
}));

export type AudioDnaJob    = typeof audio_dna_jobs.$inferSelect;
export type NewAudioDnaJob = typeof audio_dna_jobs.$inferInsert;

// ── Sync Intelligence Engine (Phase 1 DATIAM Intelligence) ──────────────────

export const sync_intelligence = pgTable(
  'sync_intelligence',
  {
    id:        uuid('id').primaryKey().defaultRandom(),
    upload_id: uuid('upload_id').notNull().references(() => audio_uploads.id, { onDelete: 'cascade' }),
    artist_id: uuid('artist_id').references(() => artist_profiles.id, { onDelete: 'set null' }),

    film_trailer:  numeric('film_trailer',  { precision: 5, scale: 2 }),
    netflix_drama: numeric('netflix_drama', { precision: 5, scale: 2 }),
    documentary:   numeric('documentary',   { precision: 5, scale: 2 }),
    sports_content: numeric('sports_content', { precision: 5, scale: 2 }),
    gaming:         numeric('gaming',         { precision: 5, scale: 2 }),
    fashion:        numeric('fashion',        { precision: 5, scale: 2 }),
    luxury_brands:  numeric('luxury_brands',  { precision: 5, scale: 2 }),
    travel_campaigns: numeric('travel_campaigns', { precision: 5, scale: 2 }),
    commercial_ads:   numeric('commercial_ads',   { precision: 5, scale: 2 }),
    social_content:   numeric('social_content',   { precision: 5, scale: 2 }),

    film_trailer_confidence:   numeric('film_trailer_confidence',   { precision: 5, scale: 2 }),
    netflix_drama_confidence:  numeric('netflix_drama_confidence',  { precision: 5, scale: 2 }),
    documentary_confidence:    numeric('documentary_confidence',    { precision: 5, scale: 2 }),
    sports_content_confidence: numeric('sports_content_confidence', { precision: 5, scale: 2 }),
    gaming_confidence:         numeric('gaming_confidence',         { precision: 5, scale: 2 }),
    fashion_confidence:        numeric('fashion_confidence',        { precision: 5, scale: 2 }),
    luxury_brands_confidence:  numeric('luxury_brands_confidence',  { precision: 5, scale: 2 }),
    travel_confidence:         numeric('travel_confidence',         { precision: 5, scale: 2 }),
    commercial_confidence:     numeric('commercial_confidence',     { precision: 5, scale: 2 }),
    social_confidence:         numeric('social_confidence',         { precision: 5, scale: 2 }),

    top_categories:     jsonb('top_categories'),
    sync_tags:          jsonb('sync_tags'),
    placement_notes:    text('placement_notes'),
    overall_sync_score: numeric('overall_sync_score', { precision: 5, scale: 2 }),

    analyzer_version:   text('analyzer_version').notNull().default('1.0.0'),
    processing_time_ms: integer('processing_time_ms'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uploadIdx:      index('sync_intel_upload_id_idx').on(t.upload_id),
    artistIdx:      index('sync_intel_artist_id_idx').on(t.artist_id),
    overallScoreIdx: index('sync_intel_overall_score_idx').on(t.overall_sync_score),
  }),
);

export const syncIntelligenceRelations = relations(sync_intelligence, ({ one }) => ({
  upload: one(audio_uploads, { fields: [sync_intelligence.upload_id], references: [audio_uploads.id] }),
  artist: one(artist_profiles, { fields: [sync_intelligence.artist_id], references: [artist_profiles.id] }),
}));

export type SyncIntelligence    = typeof sync_intelligence.$inferSelect;
export type NewSyncIntelligence = typeof sync_intelligence.$inferInsert;

export const sync_intelligence_jobs = pgTable(
  'sync_intelligence_jobs',
  {
    id:            uuid('id').primaryKey().defaultRandom(),
    upload_id:     uuid('upload_id').notNull().references(() => audio_uploads.id, { onDelete: 'cascade' }),
    queue_job_id:  text('queue_job_id'),
    status:        text('status').notNull().default('pending'),
    error_message: text('error_message'),
    started_at:    timestamp('started_at',   { withTimezone: true }),
    completed_at:  timestamp('completed_at', { withTimezone: true }),
    created_at:    timestamp('created_at',   { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uploadIdx: index('sync_intel_jobs_upload_idx').on(t.upload_id),
    statusIdx: index('sync_intel_jobs_status_idx').on(t.status),
  }),
);

export const syncIntelligenceJobsRelations = relations(sync_intelligence_jobs, ({ one }) => ({
  upload: one(audio_uploads, { fields: [sync_intelligence_jobs.upload_id], references: [audio_uploads.id] }),
}));

export type SyncIntelligenceJob    = typeof sync_intelligence_jobs.$inferSelect;
export type NewSyncIntelligenceJob = typeof sync_intelligence_jobs.$inferInsert;

// ── Monitoring: health check history ─────────────────────────────────────────

export const health_checks = pgTable(
  'health_checks',
  {
    id:               uuid('id').primaryKey().defaultRandom(),
    status:           text('status').notNull().default('healthy'),
    database_status:  text('database_status').notNull().default('unknown'),
    redis_status:     text('redis_status').notNull().default('unknown'),
    queue_status:     text('queue_status').notNull().default('unknown'),
    response_time_ms: integer('response_time_ms'),
    details:          jsonb('details'),
    created_at:       timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    createdAtIdx: index('health_checks_created_at_idx').on(t.created_at),
  }),
);

export type HealthCheck    = typeof health_checks.$inferSelect;
export type NewHealthCheck = typeof health_checks.$inferInsert;

// ── Monitoring: incidents ─────────────────────────────────────────────────────

export const incidents = pgTable(
  'incidents',
  {
    id:           uuid('id').primaryKey().defaultRandom(),
    incident_key: text('incident_key').notNull(),
    severity:     text('severity').notNull().default('warning'),
    title:        text('title').notNull(),
    description:  text('description'),
    status:       text('status').notNull().default('open'),
    started_at:   timestamp('started_at',  { withTimezone: true }).defaultNow().notNull(),
    resolved_at:  timestamp('resolved_at', { withTimezone: true }),
    metadata:     jsonb('metadata'),
    created_at:   timestamp('created_at',  { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    statusIdx:    index('incidents_status_idx').on(t.status),
    keyStatusIdx: index('incidents_key_status_idx').on(t.incident_key, t.status),
  }),
);

export type Incident    = typeof incidents.$inferSelect;
export type NewIncident = typeof incidents.$inferInsert;

// ── Phase 1.5 Grounding Foundation ───────────────────────────────────────────

export const companyTypeEnum = pgEnum('company_type', [
  'production_house', 'ad_agency', 'music_supervisor_firm', 'brand',
  'streaming_platform', 'game_studio', 'trailer_house', 'music_library',
  'tv_network', 'film_studio', 'other',
]);

export const companyTierEnum = pgEnum('company_tier', [
  'tier_a', 'tier_b', 'tier_c', 'unrated',
]);

export const contactRelationshipStatusEnum = pgEnum('contact_relationship_status', [
  'prospect', 'active', 'dormant', 'unresponsive', 'blacklisted',
]);

export const syncLicenseTypeEnum = pgEnum('sync_license_type', [
  'film_trailer', 'netflix_drama', 'documentary', 'sports_content', 'gaming',
  'fashion', 'luxury_brand', 'travel_campaign', 'commercial_ad', 'social_content',
  'tv_drama', 'tv_comedy', 'reality_tv', 'podcast', 'youtube', 'music_library',
]);

export const placementStatusEnum = pgEnum('placement_status', [
  'identified', 'pitched', 'negotiating', 'contracted', 'rejected', 'withdrawn', 'expired',
]);

export const placementSourceEnum = pgEnum('placement_source', [
  'inbound', 'outbound_pitch', 'agent', 'platform', 'network_referral',
]);

export const placementOutcomeTypeEnum = pgEnum('placement_outcome_type', [
  'placed', 'rejected', 'expired', 'negotiation_failed', 'withdrawn_by_artist',
]);

export const predictionTypeEnum = pgEnum('prediction_type', [
  'sync_suitability', 'placement_likelihood', 'fee_estimate', 'rejection_risk', 'time_to_placement',
]);

// ── companies ─────────────────────────────────────────────────────────────────

export const companies = pgTable(
  'companies',
  {
    id:                   uuid('id').primaryKey().defaultRandom(),
    org_id:               uuid('org_id'),
    name:                 text('name').notNull(),
    type:                 companyTypeEnum('type').notNull().default('other'),
    tier:                 companyTierEnum('tier').notNull().default('unrated'),
    website:              text('website'),
    country:              text('country'),
    city:                 text('city'),
    genre_focus:          jsonb('genre_focus'),
    deal_volume_per_year: integer('deal_volume_per_year'),
    avg_license_fee_usd:  numeric('avg_license_fee_usd', { precision: 12, scale: 2 }),
    notes:                text('notes'),
    deleted_at:           timestamp('deleted_at',  { withTimezone: true }),
    created_at:           timestamp('created_at',  { withTimezone: true }).defaultNow().notNull(),
    updated_at:           timestamp('updated_at',  { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    nameIdx:        index('companies_name_idx').on(t.name),
    typeIdx:        index('companies_type_idx').on(t.type),
    tierIdx:        index('companies_tier_idx').on(t.tier),
    orgIdIdx:       index('companies_org_id_idx').on(t.org_id),
    deletedAtIdx:   index('companies_deleted_at_idx').on(t.deleted_at),
    countryTypeIdx: index('companies_country_type_idx').on(t.country, t.type),
  }),
);

export type Company    = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;

// ── licensing_contacts ────────────────────────────────────────────────────────

export const licensing_contacts = pgTable(
  'licensing_contacts',
  {
    id:                  uuid('id').primaryKey().defaultRandom(),
    artist_id:           uuid('artist_id').references(() => artist_profiles.id, { onDelete: 'set null' }),
    company_id:          uuid('company_id').references((): AnyPgColumn => companies.id, { onDelete: 'set null' }),
    full_name:           text('full_name').notNull(),
    email:               text('email'),
    phone:               text('phone'),
    role:                text('role'),
    linkedin_url:        text('linkedin_url'),
    imdb_url:            text('imdb_url'),
    relationship_status: contactRelationshipStatusEnum('relationship_status').notNull().default('prospect'),
    relationship_score:  integer('relationship_score'),
    last_contacted_at:   timestamp('last_contacted_at',  { withTimezone: true }),
    next_follow_up_at:   timestamp('next_follow_up_at',  { withTimezone: true }),
    genre_preferences:   jsonb('genre_preferences'),
    placement_history:   jsonb('placement_history'),
    notes:               text('notes'),
    deleted_at:          timestamp('deleted_at',  { withTimezone: true }),
    created_at:          timestamp('created_at',  { withTimezone: true }).defaultNow().notNull(),
    updated_at:          timestamp('updated_at',  { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    artistIdIdx:           index('lc_artist_id_idx').on(t.artist_id),
    companyIdIdx:          index('lc_company_id_idx').on(t.company_id),
    emailIdx:              index('lc_email_idx').on(t.email),
    relationshipStatusIdx: index('lc_relationship_status_idx').on(t.relationship_status),
    nextFollowUpIdx:       index('lc_next_follow_up_idx').on(t.next_follow_up_at),
    deletedAtIdx:          index('lc_deleted_at_idx').on(t.deleted_at),
    artistCompanyIdx:      index('lc_artist_company_idx').on(t.artist_id, t.company_id),
  }),
);

export type LicensingContact    = typeof licensing_contacts.$inferSelect;
export type NewLicensingContact = typeof licensing_contacts.$inferInsert;

// ── sync_rate_benchmarks ──────────────────────────────────────────────────────

export const sync_rate_benchmarks = pgTable(
  'sync_rate_benchmarks',
  {
    id:                 uuid('id').primaryKey().defaultRandom(),
    org_id:             uuid('org_id'),
    license_type:       syncLicenseTypeEnum('license_type').notNull(),
    territory:          text('territory').notNull().default('worldwide'),
    artist_tier:        text('artist_tier').notNull().default('emerging'),
    genre:              text('genre'),
    track_duration_min: integer('track_duration_min'),
    track_duration_max: integer('track_duration_max'),
    min_fee_usd:        numeric('min_fee_usd', { precision: 12, scale: 2 }).notNull(),
    max_fee_usd:        numeric('max_fee_usd', { precision: 12, scale: 2 }).notNull(),
    avg_fee_usd:        numeric('avg_fee_usd', { precision: 12, scale: 2 }).notNull(),
    currency:           text('currency').notNull().default('USD'),
    source:             text('source').notNull().default('industry_report'),
    source_url:         text('source_url'),
    effective_from:     date('effective_from').notNull(),
    effective_to:       date('effective_to'),
    sample_size:        integer('sample_size'),
    notes:              text('notes'),
    created_at:         timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at:         timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    licenseTypeIdx:       index('srb_license_type_idx').on(t.license_type),
    territoryIdx:         index('srb_territory_idx').on(t.territory),
    artistTierIdx:        index('srb_artist_tier_idx').on(t.artist_tier),
    genreIdx:             index('srb_genre_idx').on(t.genre),
    effectiveFromIdx:     index('srb_effective_from_idx').on(t.effective_from),
    orgIdIdx:             index('srb_org_id_idx').on(t.org_id),
    typeTerritoryTierIdx: index('srb_type_territory_tier_idx').on(t.license_type, t.territory, t.artist_tier),
  }),
);

export type SyncRateBenchmark    = typeof sync_rate_benchmarks.$inferSelect;
export type NewSyncRateBenchmark = typeof sync_rate_benchmarks.$inferInsert;

// ── placement_opportunities ───────────────────────────────────────────────────

export const placement_opportunities = pgTable(
  'placement_opportunities',
  {
    id:                uuid('id').primaryKey().defaultRandom(),
    artist_id:         uuid('artist_id').notNull().references(() => artist_profiles.id, { onDelete: 'cascade' }),
    song_id:           uuid('song_id').references(() => songs.id, { onDelete: 'set null' }),
    upload_id:         uuid('upload_id').references((): AnyPgColumn => audio_uploads.id, { onDelete: 'set null' }),
    company_id:        uuid('company_id').references((): AnyPgColumn => companies.id, { onDelete: 'set null' }),
    contact_id:        uuid('contact_id').references((): AnyPgColumn => licensing_contacts.id, { onDelete: 'set null' }),
    title:             text('title').notNull(),
    license_type:      syncLicenseTypeEnum('license_type').notNull(),
    status:            placementStatusEnum('status').notNull().default('identified'),
    source:            placementSourceEnum('source').notNull().default('outbound_pitch'),
    territory:         text('territory').notNull().default('worldwide'),
    term_years:        integer('term_years'),
    exclusivity:       boolean('exclusivity').notNull().default(false),
    budget_min_usd:    numeric('budget_min_usd', { precision: 12, scale: 2 }),
    budget_max_usd:    numeric('budget_max_usd', { precision: 12, scale: 2 }),
    currency:          text('currency').notNull().default('USD'),
    ai_sync_score:     numeric('ai_sync_score',  { precision: 5, scale: 2 }),
    ai_confidence:     numeric('ai_confidence',  { precision: 5, scale: 2 }),
    ai_top_categories: jsonb('ai_top_categories'),
    pitched_at:        timestamp('pitched_at',       { withTimezone: true }),
    response_due_at:   timestamp('response_due_at',  { withTimezone: true }),
    contracted_at:     timestamp('contracted_at',    { withTimezone: true }),
    deadline_at:       timestamp('deadline_at',      { withTimezone: true }),
    notes:             text('notes'),
    metadata:          jsonb('metadata'),
    deleted_at:        timestamp('deleted_at',       { withTimezone: true }),
    created_at:        timestamp('created_at',       { withTimezone: true }).defaultNow().notNull(),
    updated_at:        timestamp('updated_at',       { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    artistIdIdx:    index('po_artist_id_idx').on(t.artist_id),
    songIdIdx:      index('po_song_id_idx').on(t.song_id),
    uploadIdIdx:    index('po_upload_id_idx').on(t.upload_id),
    companyIdIdx:   index('po_company_id_idx').on(t.company_id),
    contactIdIdx:   index('po_contact_id_idx').on(t.contact_id),
    statusIdx:      index('po_status_idx').on(t.status),
    licenseTypeIdx: index('po_license_type_idx').on(t.license_type),
    deletedAtIdx:   index('po_deleted_at_idx').on(t.deleted_at),
    responseDueIdx: index('po_response_due_idx').on(t.response_due_at),
    aiScoreIdx:     index('po_ai_score_idx').on(t.ai_sync_score),
    artistStatusIdx: index('po_artist_status_idx').on(t.artist_id, t.status),
  }),
);

export type PlacementOpportunity    = typeof placement_opportunities.$inferSelect;
export type NewPlacementOpportunity = typeof placement_opportunities.$inferInsert;

// ── placement_outcomes ────────────────────────────────────────────────────────

export const placement_outcomes = pgTable(
  'placement_outcomes',
  {
    id:                      uuid('id').primaryKey().defaultRandom(),
    opportunity_id:          uuid('opportunity_id').notNull().unique()
                               .references((): AnyPgColumn => placement_opportunities.id, { onDelete: 'cascade' }),
    artist_id:               uuid('artist_id').notNull().references(() => artist_profiles.id, { onDelete: 'cascade' }),
    song_id:                 uuid('song_id').references(() => songs.id, { onDelete: 'set null' }),
    outcome:                 placementOutcomeTypeEnum('outcome').notNull(),
    rejection_reason:        text('rejection_reason'),
    final_fee_usd:           numeric('final_fee_usd',           { precision: 12, scale: 2 }),
    currency:                text('currency').notNull().default('USD'),
    royalties_collected_usd: numeric('royalties_collected_usd', { precision: 12, scale: 2 }),
    license_type:            syncLicenseTypeEnum('license_type'),
    territory:               text('territory'),
    term_start:              date('term_start'),
    term_end:                date('term_end'),
    exclusivity:             boolean('exclusivity').default(false),
    contract_url:            text('contract_url'),
    contract_reference:      text('contract_reference'),
    ai_score_at_pitch:       numeric('ai_score_at_pitch',      { precision: 5, scale: 2 }),
    outcome_quality_score:   numeric('outcome_quality_score',  { precision: 5, scale: 2 }),
    notes:                   text('notes'),
    metadata:                jsonb('metadata'),
    created_at:              timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at:              timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    opportunityIdIdx: index('pout_opportunity_id_idx').on(t.opportunity_id),
    artistIdIdx:      index('pout_artist_id_idx').on(t.artist_id),
    songIdIdx:        index('pout_song_id_idx').on(t.song_id),
    outcomeIdx:       index('pout_outcome_idx').on(t.outcome),
    artistOutcomeIdx: index('pout_artist_outcome_idx').on(t.artist_id, t.outcome),
    termStartIdx:     index('pout_term_start_idx').on(t.term_start),
  }),
);

export type PlacementOutcome    = typeof placement_outcomes.$inferSelect;
export type NewPlacementOutcome = typeof placement_outcomes.$inferInsert;

// ── prediction_accuracy_log ───────────────────────────────────────────────────

export const prediction_accuracy_log = pgTable(
  'prediction_accuracy_log',
  {
    id:               uuid('id').primaryKey().defaultRandom(),
    model_version:    text('model_version').notNull(),
    prediction_type:  predictionTypeEnum('prediction_type').notNull(),
    analyzer_version: text('analyzer_version'),
    upload_id:        uuid('upload_id').references((): AnyPgColumn => audio_uploads.id,           { onDelete: 'set null' }),
    song_id:          uuid('song_id').references(() => songs.id,                                  { onDelete: 'set null' }),
    opportunity_id:   uuid('opportunity_id').references((): AnyPgColumn => placement_opportunities.id, { onDelete: 'set null' }),
    outcome_id:       uuid('outcome_id').references((): AnyPgColumn => placement_outcomes.id,     { onDelete: 'set null' }),
    predicted_value:  numeric('predicted_value', { precision: 10, scale: 4 }).notNull(),
    predicted_label:  text('predicted_label'),
    actual_value:     numeric('actual_value',    { precision: 10, scale: 4 }),
    actual_label:     text('actual_label'),
    actual_revenue:   numeric('actual_revenue',  { precision: 12, scale: 2 }),
    error_margin:     numeric('error_margin',    { precision: 10, scale: 4 }),
    accuracy_score:   numeric('accuracy_score',  { precision: 5,  scale: 2 }),
    feature_vector:   jsonb('feature_vector'),
    raw_model_output: jsonb('raw_model_output'),
    resolved:         boolean('resolved').notNull().default(false),
    resolved_at:      timestamp('resolved_at', { withTimezone: true }),
    notes:            text('notes'),
    created_at:       timestamp('created_at',  { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    modelVersionIdx:      index('pal_model_version_idx').on(t.model_version),
    predictionTypeIdx:    index('pal_prediction_type_idx').on(t.prediction_type),
    uploadIdIdx:          index('pal_upload_id_idx').on(t.upload_id),
    songIdIdx:            index('pal_song_id_idx').on(t.song_id),
    opportunityIdIdx:     index('pal_opportunity_id_idx').on(t.opportunity_id),
    outcomeIdIdx:         index('pal_outcome_id_idx').on(t.outcome_id),
    resolvedIdx:          index('pal_resolved_idx').on(t.resolved),
    createdAtIdx:         index('pal_created_at_idx').on(t.created_at),
    modelTypeResolvedIdx: index('pal_model_type_resolved_idx').on(t.model_version, t.prediction_type, t.resolved),
  }),
);

export type PredictionAccuracyLog    = typeof prediction_accuracy_log.$inferSelect;
export type NewPredictionAccuracyLog = typeof prediction_accuracy_log.$inferInsert;

// ── Phase 1.5 Relations ───────────────────────────────────────────────────────

export const companiesRelations = relations(companies, ({ many }) => ({
  contacts:      many(licensing_contacts),
  opportunities: many(placement_opportunities),
}));

export const licensingContactsRelations = relations(licensing_contacts, ({ one, many }) => ({
  artist:        one(artist_profiles, { fields: [licensing_contacts.artist_id],  references: [artist_profiles.id] }),
  company:       one(companies,       { fields: [licensing_contacts.company_id], references: [companies.id] }),
  opportunities: many(placement_opportunities),
}));

export const placementOpportunitiesRelations = relations(placement_opportunities, ({ one, many }) => ({
  artist:     one(artist_profiles,    { fields: [placement_opportunities.artist_id],  references: [artist_profiles.id] }),
  song:       one(songs,              { fields: [placement_opportunities.song_id],    references: [songs.id] }),
  company:    one(companies,          { fields: [placement_opportunities.company_id], references: [companies.id] }),
  contact:    one(licensing_contacts, { fields: [placement_opportunities.contact_id], references: [licensing_contacts.id] }),
  outcome:    many(placement_outcomes),
  predictions: many(prediction_accuracy_log),
}));

export const placementOutcomesRelations = relations(placement_outcomes, ({ one, many }) => ({
  opportunity: one(placement_opportunities, { fields: [placement_outcomes.opportunity_id], references: [placement_opportunities.id] }),
  artist:      one(artist_profiles,         { fields: [placement_outcomes.artist_id],      references: [artist_profiles.id] }),
  song:        one(songs,                   { fields: [placement_outcomes.song_id],         references: [songs.id] }),
  predictions: many(prediction_accuracy_log),
}));

export const predictionAccuracyLogRelations = relations(prediction_accuracy_log, ({ one }) => ({
  song:        one(songs,                   { fields: [prediction_accuracy_log.song_id],        references: [songs.id] }),
  opportunity: one(placement_opportunities, { fields: [prediction_accuracy_log.opportunity_id], references: [placement_opportunities.id] }),
  outcome:     one(placement_outcomes,      { fields: [prediction_accuracy_log.outcome_id],     references: [placement_outcomes.id] }),
}));

// ── Memory Layer v1 ───────────────────────────────────────────────────────────

export const company_memory = pgTable(
  'company_memory',
  {
    id:                      uuid('id').primaryKey().defaultRandom(),
    company_id:              uuid('company_id').notNull().unique().references((): AnyPgColumn => companies.id, { onDelete: 'cascade' }),
    total_opportunities:     integer('total_opportunities').notNull().default(0),
    total_placements:        integer('total_placements').notNull().default(0),
    total_revenue:           numeric('total_revenue', { precision: 14, scale: 2 }).notNull().default('0'),
    avg_deal_size:           numeric('avg_deal_size', { precision: 14, scale: 2 }).notNull().default('0'),
    preferred_genres:        jsonb('preferred_genres').$type<string[]>().notNull().default([]),
    preferred_bpm_ranges:    jsonb('preferred_bpm_ranges').$type<string[]>().notNull().default([]),
    preferred_moods:         jsonb('preferred_moods').$type<string[]>().notNull().default([]),
    preferred_license_types: jsonb('preferred_license_types').$type<string[]>().notNull().default([]),
    response_rate:           numeric('response_rate', { precision: 5, scale: 4 }).notNull().default('0'),
    placement_rate:          numeric('placement_rate', { precision: 5, scale: 4 }).notNull().default('0'),
    last_contacted_at:       timestamp('last_contacted_at', { withTimezone: true }),
    deals_created:           integer('deals_created').notNull().default(0),
    deals_won:               integer('deals_won').notNull().default(0),
    deals_lost:              integer('deals_lost').notNull().default(0),
    revenue_generated:       numeric('revenue_generated', { precision: 14, scale: 2 }).notNull().default('0'),
    contracts_created:       integer('contracts_created').notNull().default(0),
    contracts_sent:          integer('contracts_sent').notNull().default(0),
    contracts_signed:        integer('contracts_signed').notNull().default(0),
    payments_created:        integer('payments_created').notNull().default(0),
    payments_paid:           integer('payments_paid').notNull().default(0),
    revenue_received:        numeric('revenue_received', { precision: 14, scale: 2 }).notNull().default('0'),
    memory_updated_at:       timestamp('memory_updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    companyMemoryCompanyIdx: index('company_memory_company_id_idx').on(t.company_id),
  }),
);

export type CompanyMemory    = typeof company_memory.$inferSelect;
export type NewCompanyMemory = typeof company_memory.$inferInsert;

export const contact_memory = pgTable(
  'contact_memory',
  {
    id:                      uuid('id').primaryKey().defaultRandom(),
    contact_id:              uuid('contact_id').notNull().unique().references((): AnyPgColumn => licensing_contacts.id, { onDelete: 'cascade' }),
    opportunities_seen:      integer('opportunities_seen').notNull().default(0),
    placements_closed:       integer('placements_closed').notNull().default(0),
    avg_response_time_days:  numeric('avg_response_time_days', { precision: 8, scale: 2 }),
    preferred_genres:        jsonb('preferred_genres').$type<string[]>().notNull().default([]),
    preferred_license_types: jsonb('preferred_license_types').$type<string[]>().notNull().default([]),
    relationship_strength:   numeric('relationship_strength', { precision: 3, scale: 2 }).notNull().default('0'),
    success_rate:            numeric('success_rate', { precision: 5, scale: 4 }).notNull().default('0'),
    notes_summary:           text('notes_summary'),
    total_replies:            integer('total_replies').notNull().default(0),
    positive_replies:         integer('positive_replies').notNull().default(0),
    negative_replies:         integer('negative_replies').notNull().default(0),
    meetings_scheduled:       integer('meetings_scheduled').notNull().default(0),
    meetings_completed:       integer('meetings_completed').notNull().default(0),
    meetings_cancelled:       integer('meetings_cancelled').notNull().default(0),
    meeting_conversion_rate:  numeric('meeting_conversion_rate', { precision: 5, scale: 4 }).notNull().default('0'),
    deals_created:            integer('deals_created').notNull().default(0),
    deals_won:                integer('deals_won').notNull().default(0),
    deals_lost:               integer('deals_lost').notNull().default(0),
    revenue_generated:        numeric('revenue_generated', { precision: 14, scale: 2 }).notNull().default('0'),
    contracts_created:        integer('contracts_created').notNull().default(0),
    contracts_sent:           integer('contracts_sent').notNull().default(0),
    contracts_signed:         integer('contracts_signed').notNull().default(0),
    payments_created:         integer('payments_created').notNull().default(0),
    payments_paid:            integer('payments_paid').notNull().default(0),
    revenue_received:         numeric('revenue_received', { precision: 14, scale: 2 }).notNull().default('0'),
    memory_updated_at:        timestamp('memory_updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    contactMemoryContactIdx: index('contact_memory_contact_id_idx').on(t.contact_id),
  }),
);

export type ContactMemory    = typeof contact_memory.$inferSelect;
export type NewContactMemory = typeof contact_memory.$inferInsert;

// Distinct from artist_memory (creative/music intelligence). Captures sync
// commercial performance derived purely from placement data.
export const artist_sync_memory = pgTable(
  'artist_sync_memory',
  {
    id:                      uuid('id').primaryKey().defaultRandom(),
    artist_id:               uuid('artist_id').notNull().unique().references(() => artist_profiles.id, { onDelete: 'cascade' }),
    opportunities_submitted: integer('opportunities_submitted').notNull().default(0),
    placements_won:          integer('placements_won').notNull().default(0),
    total_sync_revenue:      numeric('total_sync_revenue', { precision: 14, scale: 2 }).notNull().default('0'),
    strongest_genres:        jsonb('strongest_genres').$type<string[]>().notNull().default([]),
    strongest_moods:         jsonb('strongest_moods').$type<string[]>().notNull().default([]),
    strongest_territories:   jsonb('strongest_territories').$type<string[]>().notNull().default([]),
    strongest_bpm_ranges:    jsonb('strongest_bpm_ranges').$type<string[]>().notNull().default([]),
    success_rate:            numeric('success_rate', { precision: 5, scale: 4 }).notNull().default('0'),
    memory_updated_at:       timestamp('memory_updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    artistSyncMemoryArtistIdx: index('artist_sync_memory_artist_id_idx').on(t.artist_id),
  }),
);

export type ArtistSyncMemory    = typeof artist_sync_memory.$inferSelect;
export type NewArtistSyncMemory = typeof artist_sync_memory.$inferInsert;

export const companyMemoryRelations = relations(company_memory, ({ one }) => ({
  company: one(companies, { fields: [company_memory.company_id], references: [companies.id] }),
}));

export const contactMemoryRelations = relations(contact_memory, ({ one }) => ({
  contact: one(licensing_contacts, { fields: [contact_memory.contact_id], references: [licensing_contacts.id] }),
}));

export const artistSyncMemoryRelations = relations(artist_sync_memory, ({ one }) => ({
  artist: one(artist_profiles, { fields: [artist_sync_memory.artist_id], references: [artist_profiles.id] }),
}));

// ── Adaptive Intelligence Engine ──────────────────────────────────────────────

export const adaptive_weight = pgTable(
  'adaptive_weight',
  {
    id:                   uuid('id').primaryKey().defaultRandom(),
    factor_name:          text('factor_name').notNull().unique(),
    current_weight:       numeric('current_weight',    { precision: 5, scale: 2 }).notNull().default('0'),
    previous_weight:      numeric('previous_weight',   { precision: 5, scale: 2 }),
    recommended_weight:   numeric('recommended_weight', { precision: 5, scale: 2 }),
    confidence:           numeric('confidence',        { precision: 3, scale: 2 }).notNull().default('0'),
    sample_size:          integer('sample_size').notNull().default(0),
    last_recalculated_at: timestamp('last_recalculated_at', { withTimezone: true }),
    updated_at:           timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    factorNameIdx: index('adaptive_weight_factor_name_idx').on(t.factor_name),
  }),
);

export type AdaptiveWeight    = typeof adaptive_weight.$inferSelect;
export type NewAdaptiveWeight = typeof adaptive_weight.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// DATIAM Outreach Engine v1
// ─────────────────────────────────────────────────────────────────────────────

export const outreachStatusEnum = pgEnum('outreach_status', [
  'draft',
  'queued',
  'sent',
  'replied',
  'closed',
]);

export const outreach_campaign = pgTable(
  'outreach_campaign',
  {
    id:                 uuid('id').primaryKey().defaultRandom().notNull(),
    artist_id:          uuid('artist_id').references(() => artist_profiles.id, { onDelete: 'set null' }),
    company_id:         uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
    contact_id:         uuid('contact_id').references(() => licensing_contacts.id, { onDelete: 'set null' }),
    opportunity_id:     uuid('opportunity_id').references(() => placement_opportunities.id, { onDelete: 'set null' }),
    opportunity_score:  numeric('opportunity_score', { precision: 5, scale: 2 }),
    territory:          text('territory').notNull().default('worldwide'),
    status:             outreachStatusEnum('status').notNull().default('draft'),
    notes:              text('notes'),
    created_at:         timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at:         timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    artistIdx:     index('oc_artist_id_idx').on(t.artist_id),
    companyIdx:    index('oc_company_id_idx').on(t.company_id),
    contactIdx:    index('oc_contact_id_idx').on(t.contact_id),
    statusIdx:     index('oc_status_idx').on(t.status),
    createdAtIdx:  index('oc_created_at_idx').on(t.created_at),
  }),
);

export type OutreachCampaign    = typeof outreach_campaign.$inferSelect;
export type NewOutreachCampaign = typeof outreach_campaign.$inferInsert;

export const outreach_message = pgTable(
  'outreach_message',
  {
    id:          uuid('id').primaryKey().defaultRandom().notNull(),
    campaign_id: uuid('campaign_id').notNull().references(() => outreach_campaign.id, { onDelete: 'cascade' }),
    pitch:       text('pitch').notNull(),
    reasoning:   text('reasoning').notNull(),
    status:      outreachStatusEnum('status').notNull().default('draft'),
    metadata:    jsonb('metadata'),
    created_at:  timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at:  timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    campaignIdx:  index('om_campaign_id_idx').on(t.campaign_id),
    statusIdx:    index('om_status_idx').on(t.status),
    createdAtIdx: index('om_created_at_idx').on(t.created_at),
  }),
);

export type OutreachMessage    = typeof outreach_message.$inferSelect;
export type NewOutreachMessage = typeof outreach_message.$inferInsert;

export const outreachCampaignRelations = relations(outreach_campaign, ({ one, many }) => ({
  company:        one(companies,               { fields: [outreach_campaign.company_id],   references: [companies.id] }),
  contact:        one(licensing_contacts,      { fields: [outreach_campaign.contact_id],   references: [licensing_contacts.id] }),
  opportunity:    one(placement_opportunities, { fields: [outreach_campaign.opportunity_id], references: [placement_opportunities.id] }),
  messages:       many(outreach_message),
  execution_logs: many(execution_log),
}));

export const outreachMessageRelations = relations(outreach_message, ({ one, many }) => ({
  campaign:       one(outreach_campaign, { fields: [outreach_message.campaign_id], references: [outreach_campaign.id] }),
  execution_logs: many(execution_log),
}));

// ─── Execution Engine ─────────────────────────────────────────────────────────

export const deliveryStatusEnum = pgEnum('delivery_status', [
  'pending',
  'sent',
  'failed',
  'bounced',
  'opened',
  'clicked',
]);

export const execution_log = pgTable(
  'execution_log',
  {
    id:                   uuid('id').primaryKey().defaultRandom().notNull(),
    campaign_id:          uuid('campaign_id').notNull().references(() => outreach_campaign.id, { onDelete: 'cascade' }),
    message_id:           uuid('message_id').references(() => outreach_message.id, { onDelete: 'set null' }),
    contact_id:           uuid('contact_id').references(() => licensing_contacts.id, { onDelete: 'set null' }),
    provider:             text('provider').notNull(),
    recipient_email:      text('recipient_email').notNull(),
    subject:              text('subject').notNull(),
    delivery_status:      deliveryStatusEnum('delivery_status').notNull().default('pending'),
    sent_at:              timestamp('sent_at', { withTimezone: true }),
    error_message:        text('error_message'),
    provider_message_id:  text('provider_message_id'),
    metadata:             jsonb('metadata'),
    created_at:           timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at:           timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    campaignIdx:        index('el_campaign_id_idx').on(t.campaign_id),
    contactIdx:         index('el_contact_id_idx').on(t.contact_id),
    deliveryStatusIdx:  index('el_delivery_status_idx').on(t.delivery_status),
    sentAtIdx:          index('el_sent_at_idx').on(t.sent_at),
    providerIdx:        index('el_provider_idx').on(t.provider),
    createdAtIdx:       index('el_created_at_idx').on(t.created_at),
  }),
);

export type ExecutionLog    = typeof execution_log.$inferSelect;
export type NewExecutionLog = typeof execution_log.$inferInsert;

export const executionLogRelations = relations(execution_log, ({ one }) => ({
  campaign: one(outreach_campaign, { fields: [execution_log.campaign_id], references: [outreach_campaign.id] }),
  message:  one(outreach_message,  { fields: [execution_log.message_id],  references: [outreach_message.id] }),
  contact:  one(licensing_contacts, { fields: [execution_log.contact_id], references: [licensing_contacts.id] }),
}));

// ─────────────────────────────────────────────────────────────────────────────
// DATIAM Reply Intelligence Engine v1
// ─────────────────────────────────────────────────────────────────────────────

export const replyStatusEnum = pgEnum('reply_status', [
  'positive',
  'interested',
  'meeting_requested',
  'needs_followup',
  'not_now',
  'rejected',
  'out_of_office',
  'unknown',
]);

export const reply_log = pgTable(
  'reply_log',
  {
    id:                      uuid('id').primaryKey().defaultRandom().notNull(),
    campaign_id:             uuid('campaign_id').notNull().references(() => outreach_campaign.id, { onDelete: 'cascade' }),
    contact_id:              uuid('contact_id').references(() => licensing_contacts.id, { onDelete: 'set null' }),
    subject:                 text('subject').notNull(),
    body:                    text('body').notNull(),
    status:                  replyStatusEnum('status').notNull().default('unknown'),
    confidence:              numeric('confidence', { precision: 3, scale: 2 }).notNull().default('0'),
    reasoning:               text('reasoning'),
    recommended_next_action: text('recommended_next_action'),
    raw_ai_response:         text('raw_ai_response'),
    created_at:              timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at:              timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    campaignIdx:  index('rl_campaign_id_idx').on(t.campaign_id),
    contactIdx:   index('rl_contact_id_idx').on(t.contact_id),
    statusIdx:    index('rl_status_idx').on(t.status),
    createdAtIdx: index('rl_created_at_idx').on(t.created_at),
  }),
);

export type ReplyLog    = typeof reply_log.$inferSelect;
export type NewReplyLog = typeof reply_log.$inferInsert;

export const replyLogRelations = relations(reply_log, ({ one }) => ({
  campaign: one(outreach_campaign, { fields: [reply_log.campaign_id], references: [outreach_campaign.id] }),
  contact:  one(licensing_contacts, { fields: [reply_log.contact_id],  references: [licensing_contacts.id] }),
}));

// ─────────────────────────────────────────────────────────────────────────────
// DATIAM Meeting Intelligence Engine v1
// ─────────────────────────────────────────────────────────────────────────────

export const meetingStatusEnum = pgEnum('meeting_status', [
  'scheduled',
  'confirmed',
  'completed',
  'cancelled',
  'no_show',
]);

export const meetingTypeEnum = pgEnum('meeting_type', [
  'discovery',
  'pitch',
  'licensing',
  'sync',
  'partnership',
  'followup',
]);

export const meetings = pgTable(
  'meetings',
  {
    id:                        uuid('id').primaryKey().defaultRandom().notNull(),
    campaign_id:               uuid('campaign_id').notNull().references(() => outreach_campaign.id, { onDelete: 'cascade' }),
    contact_id:                uuid('contact_id').references(() => licensing_contacts.id, { onDelete: 'set null' }),
    reply_log_id:              uuid('reply_log_id').references(() => reply_log.id, { onDelete: 'set null' }),
    meeting_title:             text('meeting_title').notNull(),
    meeting_type:              meetingTypeEnum('meeting_type').notNull().default('discovery'),
    scheduled_at:              timestamp('scheduled_at', { withTimezone: true }),
    timezone:                  text('timezone').notNull().default('UTC'),
    meeting_link:              text('meeting_link'),
    status:                    meetingStatusEnum('status').notNull().default('scheduled'),
    notes:                     text('notes'),
    meeting_brief:             jsonb('meeting_brief'),
    meeting_preparation_score: numeric('meeting_preparation_score', { precision: 3, scale: 2 }),
    recommended_next_action:   text('recommended_next_action'),
    contact_context:           jsonb('contact_context'),
    campaign_context:          jsonb('campaign_context'),
    reply_context:             jsonb('reply_context'),
    confidence_score:          numeric('confidence_score', { precision: 3, scale: 2 }),
    engine_version:            text('engine_version').notNull().default('meeting-intelligence-v1'),
    created_at:                timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at:                timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    campaignIdx:    index('meetings_campaign_id_idx').on(t.campaign_id),
    contactIdx:     index('meetings_contact_id_idx').on(t.contact_id),
    statusIdx:      index('meetings_status_idx').on(t.status),
    scheduledAtIdx: index('meetings_scheduled_at_idx').on(t.scheduled_at),
    replyLogIdx:    index('meetings_reply_log_id_idx').on(t.reply_log_id),
    createdAtIdx:   index('meetings_created_at_idx').on(t.created_at),
  }),
);

export const meetingsRelations = relations(meetings, ({ one }) => ({
  campaign:  one(outreach_campaign,  { fields: [meetings.campaign_id],  references: [outreach_campaign.id] }),
  contact:   one(licensing_contacts, { fields: [meetings.contact_id],   references: [licensing_contacts.id] }),
  reply_log: one(reply_log,          { fields: [meetings.reply_log_id], references: [reply_log.id] }),
}));

export type Meeting    = typeof meetings.$inferSelect;
export type NewMeeting = typeof meetings.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// DATIAM Deal Intelligence Engine v1
// ─────────────────────────────────────────────────────────────────────────────

export const dealStatusEnum = pgEnum('deal_status', [
  'open',
  'won',
  'lost',
  'cancelled',
]);

export const dealStageEnum = pgEnum('deal_stage', [
  'lead',
  'contacted',
  'replied',
  'meeting_scheduled',
  'meeting_completed',
  'proposal_sent',
  'negotiation',
  'contract_sent',
  'contract_signed',
  'won',
  'lost',
]);

export const deals = pgTable(
  'deals',
  {
    id:                      uuid('id').primaryKey().defaultRandom().notNull(),
    meeting_id:              uuid('meeting_id').references(() => meetings.id, { onDelete: 'set null' }),
    campaign_id:             uuid('campaign_id').references(() => outreach_campaign.id, { onDelete: 'set null' }),
    contact_id:              uuid('contact_id').references(() => licensing_contacts.id, { onDelete: 'set null' }),
    company_id:              uuid('company_id').references(() => companies.id, { onDelete: 'set null' }),
    deal_name:               text('deal_name').notNull(),
    deal_type:               text('deal_type'),
    status:                  dealStatusEnum('status').notNull().default('open'),
    stage:                   dealStageEnum('stage').notNull().default('meeting_completed'),
    projected_value:         numeric('projected_value', { precision: 14, scale: 2 }),
    actual_value:            numeric('actual_value', { precision: 14, scale: 2 }),
    probability:             numeric('probability', { precision: 5, scale: 2 }),
    expected_close_date:     date('expected_close_date'),
    closed_at:               timestamp('closed_at', { withTimezone: true }),
    notes:                   text('notes'),
    deal_score:              numeric('deal_score', { precision: 3, scale: 2 }),
    win_probability:         numeric('win_probability', { precision: 5, scale: 2 }),
    recommended_next_action: text('recommended_next_action'),
    revenue_forecast:        numeric('revenue_forecast', { precision: 14, scale: 2 }),
    intelligence_context:    jsonb('intelligence_context'),
    engine_version:          text('engine_version').notNull().default('deal-intelligence-v1'),
    created_at:              timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at:              timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    meetingIdx:    index('deals_meeting_id_idx').on(t.meeting_id),
    campaignIdx:   index('deals_campaign_id_idx').on(t.campaign_id),
    contactIdx:    index('deals_contact_id_idx').on(t.contact_id),
    companyIdx:    index('deals_company_id_idx').on(t.company_id),
    statusIdx:     index('deals_status_idx').on(t.status),
    stageIdx:      index('deals_stage_idx').on(t.stage),
    createdAtIdx:  index('deals_created_at_idx').on(t.created_at),
  }),
);

export type Deal    = typeof deals.$inferSelect;
export type NewDeal = typeof deals.$inferInsert;

export const dealsRelations = relations(deals, ({ one, many }) => ({
  meeting:   one(meetings,          { fields: [deals.meeting_id],  references: [meetings.id] }),
  campaign:  one(outreach_campaign, { fields: [deals.campaign_id], references: [outreach_campaign.id] }),
  contact:   one(licensing_contacts, { fields: [deals.contact_id], references: [licensing_contacts.id] }),
  company:   one(companies,         { fields: [deals.company_id],  references: [companies.id] }),
  contracts: many(contracts),
}));

// ─────────────────────────────────────────────────────────────────────────────
// DATIAM Contract Intelligence Engine v1
// ─────────────────────────────────────────────────────────────────────────────

export const contractStatusEnum = pgEnum('contract_status', [
  'draft',
  'generated',
  'sent',
  'viewed',
  'signed',
  'expired',
  'cancelled',
]);

export const contracts = pgTable(
  'contracts',
  {
    id:                 uuid('id').primaryKey().defaultRandom().notNull(),
    deal_id:            uuid('deal_id').references(() => deals.id, { onDelete: 'set null' }),
    company_id:         uuid('company_id').references(() => companies.id, { onDelete: 'set null' }),
    contact_id:         uuid('contact_id').references(() => licensing_contacts.id, { onDelete: 'set null' }),
    contract_title:     text('contract_title').notNull(),
    contract_type:      text('contract_type'),
    contract_value:     numeric('contract_value', { precision: 14, scale: 2 }),
    currency:           text('currency').notNull().default('USD'),
    status:             contractStatusEnum('status').notNull().default('draft'),
    generated_at:       timestamp('generated_at', { withTimezone: true }),
    sent_at:            timestamp('sent_at', { withTimezone: true }),
    viewed_at:          timestamp('viewed_at', { withTimezone: true }),
    signed_at:          timestamp('signed_at', { withTimezone: true }),
    expires_at:         timestamp('expires_at', { withTimezone: true }),
    file_url:           text('file_url'),
    signature_provider: text('signature_provider'),
    metadata:           jsonb('metadata'),
    created_at:         timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at:         timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    dealIdx:       index('contracts_deal_id_idx').on(t.deal_id),
    companyIdx:    index('contracts_company_id_idx').on(t.company_id),
    contactIdx:    index('contracts_contact_id_idx').on(t.contact_id),
    statusIdx:     index('contracts_status_idx').on(t.status),
    createdAtIdx:  index('contracts_created_at_idx').on(t.created_at),
  }),
);

export type Contract    = typeof contracts.$inferSelect;
export type NewContract = typeof contracts.$inferInsert;

export const contractsRelations = relations(contracts, ({ one, many }) => ({
  deal:     one(deals,              { fields: [contracts.deal_id],    references: [deals.id] }),
  company:  one(companies,          { fields: [contracts.company_id], references: [companies.id] }),
  contact:  one(licensing_contacts, { fields: [contracts.contact_id], references: [licensing_contacts.id] }),
  payments: many(payments),
}));

// ─────────────────────────────────────────────────────────────────────────────
// DATIAM Payment Intelligence Engine v1
// ─────────────────────────────────────────────────────────────────────────────

export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'invoice_sent',
  'partial',
  'paid',
  'overdue',
  'refunded',
  'cancelled',
]);

export const payments = pgTable(
  'payments',
  {
    id:                    uuid('id').primaryKey().defaultRandom().notNull(),
    contract_id:           uuid('contract_id').references(() => contracts.id, { onDelete: 'set null' }),
    deal_id:               uuid('deal_id').references(() => deals.id, { onDelete: 'set null' }),
    company_id:            uuid('company_id').references(() => companies.id, { onDelete: 'set null' }),
    contact_id:            uuid('contact_id').references(() => licensing_contacts.id, { onDelete: 'set null' }),
    invoice_number:        text('invoice_number').notNull().unique(),
    payment_amount:        numeric('payment_amount', { precision: 14, scale: 2 }).notNull().default('0'),
    currency:              text('currency').notNull().default('USD'),
    payment_status:        paymentStatusEnum('payment_status').notNull().default('pending'),
    invoice_sent_at:       timestamp('invoice_sent_at', { withTimezone: true }),
    due_date:              timestamp('due_date', { withTimezone: true }),
    paid_at:               timestamp('paid_at', { withTimezone: true }),
    payment_method:        text('payment_method'),
    transaction_reference: text('transaction_reference'),
    notes:                 text('notes'),
    metadata:              jsonb('metadata'),
    created_at:            timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at:            timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    contractIdx:    index('payments_contract_id_idx').on(t.contract_id),
    dealIdx:        index('payments_deal_id_idx').on(t.deal_id),
    companyIdx:     index('payments_company_id_idx').on(t.company_id),
    contactIdx:     index('payments_contact_id_idx').on(t.contact_id),
    statusIdx:      index('payments_status_idx').on(t.payment_status),
    dueDateIdx:     index('payments_due_date_idx').on(t.due_date),
    createdAtIdx:   index('payments_created_at_idx').on(t.created_at),
  }),
);

export type Payment    = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;

export const paymentsRelations = relations(payments, ({ one }) => ({
  contract: one(contracts,          { fields: [payments.contract_id], references: [contracts.id] }),
  deal:     one(deals,              { fields: [payments.deal_id],     references: [deals.id] }),
  company:  one(companies,          { fields: [payments.company_id],  references: [companies.id] }),
  contact:  one(licensing_contacts, { fields: [payments.contact_id],  references: [licensing_contacts.id] }),
}));

// ─────────────────────────────────────────────────────────────────────────────
// DATIAM Release Intelligence Engine v1
// ─────────────────────────────────────────────────────────────────────────────

export const releaseCampaignTypeEnum = pgEnum('release_campaign_type', [
  'marketing', 'playlist', 'blog', 'press', 'pre_save',
]);

export const releaseCampaignStatusEnum = pgEnum('release_campaign_status', [
  'planned', 'active', 'paused', 'completed', 'cancelled',
]);

export const releaseDspPlatformStatusEnum = pgEnum('release_dsp_platform_status', [
  'not_submitted', 'submitted', 'processing', 'live', 'rejected', 'taken_down',
]);

export const releaseAlertSeverityEnum = pgEnum('release_alert_severity', [
  'info', 'warning', 'critical',
]);

export const release_campaigns = pgTable(
  'release_campaigns',
  {
    id:            uuid('id').primaryKey().defaultRandom().notNull(),
    release_id:    uuid('release_id').notNull().references(() => releases.id, { onDelete: 'cascade' }),
    artist_id:     uuid('artist_id').references(() => artist_profiles.id, { onDelete: 'set null' }),
    campaign_type: releaseCampaignTypeEnum('campaign_type').notNull(),
    title:         text('title').notNull(),
    status:        releaseCampaignStatusEnum('status').notNull().default('planned'),
    target_date:   date('target_date'),
    budget:        numeric('budget', { precision: 12, scale: 2 }),
    currency:      text('currency').default('USD'),
    notes:         text('notes'),
    metadata:      jsonb('metadata'),
    created_at:    timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at:    timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    releaseIdx: index('release_campaigns_release_id_idx').on(t.release_id),
    artistIdx:  index('release_campaigns_artist_id_idx').on(t.artist_id),
    statusIdx:  index('release_campaigns_status_idx').on(t.status),
  }),
);

export type ReleaseCampaign    = typeof release_campaigns.$inferSelect;
export type NewReleaseCampaign = typeof release_campaigns.$inferInsert;

export const release_dsp_status = pgTable(
  'release_dsp_status',
  {
    id:           uuid('id').primaryKey().defaultRandom().notNull(),
    release_id:   uuid('release_id').notNull().references(() => releases.id, { onDelete: 'cascade' }),
    platform:     text('platform').notNull(),
    status:       releaseDspPlatformStatusEnum('status').notNull().default('not_submitted'),
    url:          text('url'),
    submitted_at: timestamp('submitted_at', { withTimezone: true }),
    live_at:      timestamp('live_at', { withTimezone: true }),
    notes:        text('notes'),
    created_at:   timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at:   timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    releaseIdx: index('release_dsp_status_release_id_idx').on(t.release_id),
  }),
);

export type ReleaseDspStatus    = typeof release_dsp_status.$inferSelect;
export type NewReleaseDspStatus = typeof release_dsp_status.$inferInsert;

export const release_alerts = pgTable(
  'release_alerts',
  {
    id:          uuid('id').primaryKey().defaultRandom().notNull(),
    release_id:  uuid('release_id').notNull().references(() => releases.id, { onDelete: 'cascade' }),
    alert_type:  text('alert_type').notNull(),
    severity:    releaseAlertSeverityEnum('severity').notNull().default('info'),
    title:       text('title').notNull(),
    message:     text('message').notNull(),
    is_resolved: boolean('is_resolved').notNull().default(false),
    resolved_at: timestamp('resolved_at', { withTimezone: true }),
    metadata:    jsonb('metadata'),
    created_at:  timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    releaseIdx:  index('release_alerts_release_id_idx').on(t.release_id),
    severityIdx: index('release_alerts_severity_idx').on(t.severity),
    resolvedIdx: index('release_alerts_is_resolved_idx').on(t.is_resolved),
  }),
);

export type ReleaseAlert    = typeof release_alerts.$inferSelect;
export type NewReleaseAlert = typeof release_alerts.$inferInsert;

export const release_ai_recs = pgTable(
  'release_ai_recs',
  {
    id:          uuid('id').primaryKey().defaultRandom().notNull(),
    release_id:  uuid('release_id').notNull().references(() => releases.id, { onDelete: 'cascade' }),
    rec_type:    text('rec_type').notNull(),
    title:       text('title').notNull(),
    description: text('description').notNull(),
    priority:    integer('priority').notNull().default(0),
    is_actioned: boolean('is_actioned').notNull().default(false),
    actioned_at: timestamp('actioned_at', { withTimezone: true }),
    metadata:    jsonb('metadata'),
    created_at:  timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    releaseIdx: index('release_ai_recs_release_id_idx').on(t.release_id),
  }),
);

export type ReleaseAiRec    = typeof release_ai_recs.$inferSelect;
export type NewReleaseAiRec = typeof release_ai_recs.$inferInsert;

export const releaseCampaignsRelations = relations(release_campaigns, ({ one }) => ({
  release: one(releases, { fields: [release_campaigns.release_id], references: [releases.id] }),
  artist:  one(artist_profiles, { fields: [release_campaigns.artist_id], references: [artist_profiles.id] }),
}));

export const releaseDspStatusRelations = relations(release_dsp_status, ({ one }) => ({
  release: one(releases, { fields: [release_dsp_status.release_id], references: [releases.id] }),
}));

export const releaseAlertsRelations = relations(release_alerts, ({ one }) => ({
  release: one(releases, { fields: [release_alerts.release_id], references: [releases.id] }),
}));

export const releaseAiRecsRelations = relations(release_ai_recs, ({ one }) => ({
  release: one(releases, { fields: [release_ai_recs.release_id], references: [releases.id] }),
}));

// ─────────────────────────────────────────────────────────────────────────────
// DATIAM Artist & Catalog Management Engine v1  (migration 0037)
// NOTE: genres/countries/catalog_status columns on artist_profiles, and
//       writers/producers/tags on songs, and preorder_date/catalog_release_type
//       on releases were added via ALTER TABLE in migration 0037 — they are not
//       redeclared here since those tables are already defined above.
// ─────────────────────────────────────────────────────────────────────────────

export const catalogArtworkTypeEnum = pgEnum('catalog_artwork_type', ['cover', 'social', 'animated', 'thumbnail']);
export const catalogDocumentTypeEnum = pgEnum('catalog_document_type', ['split_sheet', 'contract', 'lyric_sheet', 'publishing_agreement', 'copyright_certificate']);
export const catalogIdentifierTypeEnum = pgEnum('catalog_identifier_type', ['isrc', 'upc', 'iswc', 'catalog_number']);
export const catalogCreditRoleEnum = pgEnum('catalog_credit_role', ['writer', 'producer', 'engineer', 'composer', 'featured_artist', 'publisher', 'mixer', 'mastering_engineer', 'lyricist', 'arranger']);

// ── catalog_tracks ────────────────────────────────────────────────────────────

export const catalog_tracks = pgTable(
  'catalog_tracks',
  {
    id:           uuid('id').primaryKey().defaultRandom(),
    release_id:   uuid('release_id').notNull().references(() => releases.id, { onDelete: 'cascade' }),
    song_id:      uuid('song_id').notNull().references(() => songs.id, { onDelete: 'cascade' }),
    track_number: integer('track_number').notNull().default(1),
    is_single:    boolean('is_single').notNull().default(false),
    created_at:   timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    releaseIdx:         index('catalog_tracks_release_id_idx').on(t.release_id),
    songIdx:            index('catalog_tracks_song_id_idx').on(t.song_id),
    releaseTrackUnique: index('catalog_tracks_release_song_idx').on(t.release_id, t.song_id),
  }),
);

export type CatalogTrack    = typeof catalog_tracks.$inferSelect;
export type NewCatalogTrack = typeof catalog_tracks.$inferInsert;

// ── catalog_artwork_assets ────────────────────────────────────────────────────

export const catalog_artwork_assets = pgTable(
  'catalog_artwork_assets',
  {
    id:               uuid('id').primaryKey().defaultRandom(),
    release_id:       uuid('release_id').references(() => releases.id, { onDelete: 'cascade' }),
    song_id:          uuid('song_id').references(() => songs.id, { onDelete: 'cascade' }),
    artwork_type:     catalogArtworkTypeEnum('artwork_type').notNull(),
    storage_url:      text('storage_url').notNull(),
    filename:         text('filename'),
    file_size_bytes:  integer('file_size_bytes'),
    width_px:         integer('width_px'),
    height_px:        integer('height_px'),
    format:           text('format'),
    storage_provider: text('storage_provider').default('supabase'),
    created_at:       timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    releaseIdx: index('catalog_artwork_release_id_idx').on(t.release_id),
    songIdx:    index('catalog_artwork_song_id_idx').on(t.song_id),
    typeIdx:    index('catalog_artwork_type_idx').on(t.artwork_type),
  }),
);

export type CatalogArtworkAsset    = typeof catalog_artwork_assets.$inferSelect;
export type NewCatalogArtworkAsset = typeof catalog_artwork_assets.$inferInsert;

// ── catalog_documents ─────────────────────────────────────────────────────────

export const catalog_documents = pgTable(
  'catalog_documents',
  {
    id:              uuid('id').primaryKey().defaultRandom(),
    artist_id:       uuid('artist_id').references(() => artist_profiles.id, { onDelete: 'set null' }),
    song_id:         uuid('song_id').references(() => songs.id, { onDelete: 'set null' }),
    release_id:      uuid('release_id').references(() => releases.id, { onDelete: 'set null' }),
    document_type:   catalogDocumentTypeEnum('document_type').notNull(),
    title:           text('title').notNull(),
    storage_url:     text('storage_url').notNull(),
    filename:        text('filename'),
    file_size_bytes: integer('file_size_bytes'),
    notes:           text('notes'),
    uploaded_at:     timestamp('uploaded_at', { withTimezone: true }).defaultNow().notNull(),
    created_at:      timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    artistIdx:  index('catalog_documents_artist_id_idx').on(t.artist_id),
    songIdx:    index('catalog_documents_song_id_idx').on(t.song_id),
    releaseIdx: index('catalog_documents_release_id_idx').on(t.release_id),
    typeIdx:    index('catalog_documents_type_idx').on(t.document_type),
  }),
);

export type CatalogDocument    = typeof catalog_documents.$inferSelect;
export type NewCatalogDocument = typeof catalog_documents.$inferInsert;

// ── catalog_identifiers ───────────────────────────────────────────────────────

export const catalog_identifiers = pgTable(
  'catalog_identifiers',
  {
    id:              uuid('id').primaryKey().defaultRandom(),
    song_id:         uuid('song_id').references(() => songs.id, { onDelete: 'set null' }),
    release_id:      uuid('release_id').references(() => releases.id, { onDelete: 'set null' }),
    identifier_type: catalogIdentifierTypeEnum('identifier_type').notNull(),
    value:           text('value').notNull(),
    assigned_by:     text('assigned_by'),
    assigned_at:     timestamp('assigned_at', { withTimezone: true }),
    created_at:      timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    songIdx:    index('catalog_identifiers_song_id_idx').on(t.song_id),
    releaseIdx: index('catalog_identifiers_release_id_idx').on(t.release_id),
    typeIdx:    index('catalog_identifiers_type_idx').on(t.identifier_type),
    valueIdx:   index('catalog_identifiers_value_idx').on(t.value),
  }),
);

export type CatalogIdentifier    = typeof catalog_identifiers.$inferSelect;
export type NewCatalogIdentifier = typeof catalog_identifiers.$inferInsert;

// ── catalog_credits ───────────────────────────────────────────────────────────

export const catalog_credits = pgTable(
  'catalog_credits',
  {
    id:               uuid('id').primaryKey().defaultRandom(),
    song_id:          uuid('song_id').notNull().references(() => songs.id, { onDelete: 'cascade' }),
    name:             text('name').notNull(),
    role:             catalogCreditRoleEnum('role').notNull(),
    split_percentage: numeric('split_percentage', { precision: 5, scale: 2 }),
    pro_affiliation:  text('pro_affiliation'),
    ipi_number:       text('ipi_number'),
    isni:             text('isni'),
    notes:            text('notes'),
    created_at:       timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at:       timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    songIdx: index('catalog_credits_song_id_idx').on(t.song_id),
    roleIdx: index('catalog_credits_role_idx').on(t.role),
  }),
);

export type CatalogCredit    = typeof catalog_credits.$inferSelect;
export type NewCatalogCredit = typeof catalog_credits.$inferInsert;

// ── Catalog Relations ─────────────────────────────────────────────────────────

export const catalogTracksRelations = relations(catalog_tracks, ({ one }) => ({
  release: one(releases, { fields: [catalog_tracks.release_id], references: [releases.id] }),
  song:    one(songs,    { fields: [catalog_tracks.song_id],    references: [songs.id] }),
}));

export const catalogArtworkAssetsRelations = relations(catalog_artwork_assets, ({ one }) => ({
  release: one(releases, { fields: [catalog_artwork_assets.release_id], references: [releases.id] }),
  song:    one(songs,    { fields: [catalog_artwork_assets.song_id],    references: [songs.id] }),
}));

export const catalogDocumentsRelations = relations(catalog_documents, ({ one }) => ({
  artist:  one(artist_profiles, { fields: [catalog_documents.artist_id],  references: [artist_profiles.id] }),
  song:    one(songs,           { fields: [catalog_documents.song_id],    references: [songs.id] }),
  release: one(releases,        { fields: [catalog_documents.release_id], references: [releases.id] }),
}));

export const catalogIdentifiersRelations = relations(catalog_identifiers, ({ one }) => ({
  song:    one(songs,    { fields: [catalog_identifiers.song_id],    references: [songs.id] }),
  release: one(releases, { fields: [catalog_identifiers.release_id], references: [releases.id] }),
}));

export const catalogCreditsRelations = relations(catalog_credits, ({ one }) => ({
  song: one(songs, { fields: [catalog_credits.song_id], references: [songs.id] }),
}));

// ─────────────────────────────────────────────────────────────────────────────
// DATIAM Release Intel Engine v1  (migration 0048)
// Orchestration layer: fires on release creation, persists Intelligence Core
// output + an executive brief, and creates the six downstream missions that
// other modules (playlist, sync, fan growth, content, outreach, analytics)
// read and act on.
// ─────────────────────────────────────────────────────────────────────────────

export const releaseMissionTypeEnum = pgEnum('release_mission_type', [
  'playlist', 'sync', 'fan_growth', 'content', 'outreach', 'analytics',
]);

export const releaseMissionStatusEnum = pgEnum('release_mission_status', [
  'pending', 'active', 'blocked', 'completed', 'cancelled',
  // Mission Dispatcher (migration 0049) — automation-managed execution states.
  'queued', 'running', 'waiting', 'failed', 'retrying',
]);

export const releaseIntelStatusEnum = pgEnum('release_intel_status', [
  'pending', 'analyzing', 'complete', 'failed',
]);

export const releaseIntelDataCompletenessEnum = pgEnum('release_intel_data_completeness', [
  'full', 'metadata_only',
]);

export const release_intel_analysis = pgTable(
  'release_intel_analysis',
  {
    id:                         uuid('id').primaryKey().defaultRandom().notNull(),
    release_id:                 uuid('release_id').notNull().references(() => releases.id, { onDelete: 'cascade' }),
    status:                     releaseIntelStatusEnum('status').notNull().default('pending'),
    commercial_score:           numeric('commercial_score', { precision: 5, scale: 2 }),
    playlist_score:             numeric('playlist_score', { precision: 5, scale: 2 }),
    sync_score:                 numeric('sync_score', { precision: 5, scale: 2 }),
    viral_score:                numeric('viral_score', { precision: 5, scale: 2 }),
    data_completeness:          releaseIntelDataCompletenessEnum('data_completeness').notNull().default('metadata_only'),
    resolved_audio_upload_id:   uuid('resolved_audio_upload_id').references(() => audio_uploads.id, { onDelete: 'set null' }),
    recommended_release_window: jsonb('recommended_release_window'),
    recommended_countries:      jsonb('recommended_countries'),
    recommended_dsps:           jsonb('recommended_dsps'),
    rollout_strategy:           jsonb('rollout_strategy'),
    analysis_version:           text('analysis_version').notNull().default('v1'),
    failure_reason:             text('failure_reason'),
    analyzed_at:                timestamp('analyzed_at', { withTimezone: true }),
    created_at:                 timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at:                 timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    releaseIdx: index('release_intel_analysis_release_id_idx').on(t.release_id),
    statusIdx:  index('release_intel_analysis_status_idx').on(t.status),
    releaseUnique: uniqueIndex('release_intel_analysis_release_id_unique').on(t.release_id),
  }),
);

export type ReleaseIntelAnalysis    = typeof release_intel_analysis.$inferSelect;
export type NewReleaseIntelAnalysis = typeof release_intel_analysis.$inferInsert;

export const release_executive_briefs = pgTable(
  'release_executive_briefs',
  {
    id:                       uuid('id').primaryKey().defaultRandom().notNull(),
    release_id:               uuid('release_id').notNull().references(() => releases.id, { onDelete: 'cascade' }),
    summary:                  text('summary').notNull(),
    strengths:                jsonb('strengths').notNull().default([]),
    weaknesses:               jsonb('weaknesses').notNull().default([]),
    commercial_outlook:       text('commercial_outlook').notNull(),
    viral_outlook:            text('viral_outlook').notNull(),
    sync_outlook:             text('sync_outlook').notNull(),
    playlist_outlook:         text('playlist_outlook').notNull(),
    audience_recommendations: jsonb('audience_recommendations').notNull().default([]),
    priority_actions:         jsonb('priority_actions').notNull().default([]),
    risk_assessment:          text('risk_assessment').notNull(),
    execution_plan_30d:       jsonb('execution_plan_30d').notNull().default([]),
    used_ai:                  boolean('used_ai').notNull().default(false),
    confidence_score:         numeric('confidence_score', { precision: 3, scale: 2 }).notNull().default('0.70'),
    created_at:               timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    releaseIdx: index('release_executive_briefs_release_id_idx').on(t.release_id),
  }),
);

export type ReleaseExecutiveBrief    = typeof release_executive_briefs.$inferSelect;
export type NewReleaseExecutiveBrief = typeof release_executive_briefs.$inferInsert;

export const release_missions = pgTable(
  'release_missions',
  {
    id:                  uuid('id').primaryKey().defaultRandom().notNull(),
    release_id:          uuid('release_id').notNull().references(() => releases.id, { onDelete: 'cascade' }),
    artist_id:           uuid('artist_id').references(() => artist_profiles.id, { onDelete: 'set null' }),
    mission_type:        releaseMissionTypeEnum('mission_type').notNull(),
    title:               text('title').notNull(),
    description:         text('description').notNull(),
    status:              releaseMissionStatusEnum('status').notNull().default('pending'),
    priority:            integer('priority').notNull().default(0),
    target_metrics:      jsonb('target_metrics').notNull().default({}),
    progress_percentage: numeric('progress_percentage', { precision: 5, scale: 2 }).notNull().default('0'),
    due_date:            date('due_date'),
    mission_params:      jsonb('mission_params').notNull().default({}),
    // Mission Dispatcher (migration 0049) — execution tracking.
    owner:               text('owner'),
    started_at:          timestamp('started_at', { withTimezone: true }),
    workflow_id:         uuid('workflow_id').references(() => workflow_registry.id, { onDelete: 'set null' }),
    queue_job_id:        text('queue_job_id'),
    automation_run_id:   uuid('automation_run_id').references((): AnyPgColumn => automation_runs.id, { onDelete: 'set null' }),
    retry_count:         integer('retry_count').notNull().default(0),
    last_error:          text('last_error'),
    created_at:          timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at:          timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    completed_at:        timestamp('completed_at', { withTimezone: true }),
  },
  (t) => ({
    releaseIdx:      index('release_missions_release_id_idx').on(t.release_id),
    artistIdx:       index('release_missions_artist_id_idx').on(t.artist_id),
    statusIdx:       index('release_missions_status_idx').on(t.status),
    typeIdx:         index('release_missions_type_idx').on(t.mission_type),
    workflowIdx:     index('release_missions_workflow_id_idx').on(t.workflow_id),
    automationRunIdx: index('release_missions_automation_run_id_idx').on(t.automation_run_id),
  }),
);

export type ReleaseMission    = typeof release_missions.$inferSelect;
export type NewReleaseMission = typeof release_missions.$inferInsert;

export const releaseIntelAnalysisRelations = relations(release_intel_analysis, ({ one }) => ({
  release: one(releases, { fields: [release_intel_analysis.release_id], references: [releases.id] }),
  resolvedAudioUpload: one(audio_uploads, { fields: [release_intel_analysis.resolved_audio_upload_id], references: [audio_uploads.id] }),
}));

export const releaseExecutiveBriefsRelations = relations(release_executive_briefs, ({ one }) => ({
  release: one(releases, { fields: [release_executive_briefs.release_id], references: [releases.id] }),
}));

export const releaseMissionsRelations = relations(release_missions, ({ one }) => ({
  release: one(releases, { fields: [release_missions.release_id], references: [releases.id] }),
  artist:  one(artist_profiles, { fields: [release_missions.artist_id], references: [artist_profiles.id] }),
  workflow: one(workflow_registry, { fields: [release_missions.workflow_id], references: [workflow_registry.id] }),
  latestRun: one(automation_runs, { fields: [release_missions.automation_run_id], references: [automation_runs.id] }),
}));
