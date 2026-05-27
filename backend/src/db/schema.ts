import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  numeric,
  timestamp,
  jsonb,
  pgEnum,
  date,
  index,
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
]);

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
    created_at: timestamp('created_at').defaultNow().notNull(),
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
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    contactTypeIdx: index('crm_contacts_contact_type_idx').on(t.contact_type),
    emailIdx: index('crm_contacts_email_idx').on(t.email),
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
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    statusIdx: index('automation_runs_status_idx').on(t.status),
    workflowIdx: index('automation_runs_workflow_name_idx').on(t.workflow_name),
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
    engine_version:            text('engine_version').notNull().default('sw-v1'),
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
