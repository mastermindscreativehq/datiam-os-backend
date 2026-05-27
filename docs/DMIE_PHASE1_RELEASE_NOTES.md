# DMIE Phase 1 — Release Notes

**Module:** DATIAM Music Intelligence Engine (DMIE)  
**Release:** Phase 1 — Foundation & Blueprint Engine  
**Release Version:** 1.0.0  
**Release Date:** 2026-05-27  
**Migration Tag:** `0012_music_intelligence`  
**Migration Index:** 12  
**Engine Version Tag:** `v1`

---

## Overview

Phase 1 delivers the core Music Intelligence Engine — a deterministic, emotion-driven system that translates an artist's emotional state, creative intention, and listener transformation goal into a structured musical blueprint. This release establishes the session model, blueprint computation engine, artist memory system, and the full frontend interface.

---

## Features Added

### Blueprint Engine (`blueprint-engine.ts`)

- Deterministic `computeBlueprint()` function with no external API dependencies or runtime randomness.
- Input parameters: `emotion` (12 values), `intention` (8 values), `listener_transformation` (8 values), optional `story` text.
- Output: 8 musical fields — `bpm`, `musical_key`, `scale`, `atmosphere`, `cadence_energy`, `chord_direction`, `vocal_energy`, `hook_intensity`.
- BPM computed as: base range (per emotion) + intention delta + transformation delta, clamped to `[40, 200]`.
- Key selection: deterministic pick from 3 emotion-specific key options, varied by djb2-style story hash.
- Modifier system: `EMOTION_BASE` lookup (12 entries), `INTENTION_MOD` (8 entries), `TRANSFORMATION_MOD` (8 entries) — all statically defined, zero database reads.
- Engine version stamped on every persisted blueprint row as `engine_version = 'v1'`.

### Session Management

- Create creative session with full emotional metadata — persists to `creative_sessions`, `song_blueprints`, and `emotional_profiles` in a single request.
- List sessions with optional `artist_id` filter and `limit` cap (max 100).
- Get session with full blueprint history (most recent blueprint at `blueprint`, all versions at `blueprint_history`).
- Update session `name` and `status` (`draft` / `active` / `completed`).
- Delete session with full cascade to all child records.
- Regenerate blueprint — appends a new `song_blueprints` row to the session's history. (See BUG-DMIE-001 for known limitation on variation in v1.)

### Artist Memory System

- Automatic upsert on every session creation via `updateArtistMemory()`.
- Tracked fields: `dominant_emotion`, `preferred_keys` (up to 10, deduplicated), `avg_bpm_min`, `avg_bpm_max`, `session_count`, `last_session_at`.
- Single record per artist (`UNIQUE` constraint on `artist_id`).
- Memory is readable via `GET /api/music-intelligence/memory?artist_id=<uuid>`.

### Dashboard Aggregation

- Per-artist dashboard via `GET /api/music-intelligence/dashboard?artist_id=<uuid>`.
- Returns: `session_count`, `blueprint_count`, `recent_sessions` (last 5), `emotion_distribution` (count per emotion).
- Emotion distribution powers the bar chart in the frontend.

### Activity Logging

- Session creation emits an activity log event (`event_type: session_created`, `module: music-intelligence`) via the existing `logActivity` utility.

---

## Database Changes

### Migration File

`backend/drizzle/0012_music_intelligence.sql`  
Migration index: `12`  
Drizzle journal timestamp: `1779753600000` (2026-05-25)

### New Enum Types

| Enum | Values |
|---|---|
| `emotion_type` | `grief`, `trauma`, `rage`, `joy`, `melancholy`, `euphoria`, `anxiety`, `longing`, `triumph`, `nostalgia`, `peace`, `defiance` |
| `intention_type` | `heal_listener`, `inspire_action`, `create_nostalgia`, `deliver_message`, `uplift_spirit`, `provoke_thought`, `celebrate_truth`, `process_pain` |
| `transformation_type` | `from_pain_to_peace`, `from_stagnation_to_momentum`, `from_confusion_to_clarity`, `from_isolation_to_belonging`, `from_fear_to_courage`, `from_grief_to_acceptance`, `from_doubt_to_conviction`, `from_chaos_to_order` |
| `session_status` | `draft`, `active`, `completed` |

All four types use `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN null; END $$` guards for idempotency.

### New Tables

#### `creative_sessions`
| Column | Type | Constraints |
|---|---|---|
| `id` | `UUID` | PK, `gen_random_uuid()` |
| `artist_id` | `UUID` | FK → `artist_profiles(id)` ON DELETE CASCADE |
| `name` | `TEXT` | NOT NULL |
| `emotion` | `emotion_type` | NOT NULL |
| `intention` | `intention_type` | NOT NULL |
| `story` | `TEXT` | nullable |
| `listener_transformation` | `transformation_type` | NOT NULL |
| `status` | `session_status` | NOT NULL, DEFAULT `active` |
| `created_at` | `TIMESTAMP` | NOT NULL, DEFAULT NOW() |
| `updated_at` | `TIMESTAMP` | NOT NULL, DEFAULT NOW() |

Indexes: `creative_sessions_artist_id_idx`, `creative_sessions_emotion_idx`, `creative_sessions_status_idx`

#### `song_blueprints`
| Column | Type | Constraints |
|---|---|---|
| `id` | `UUID` | PK, `gen_random_uuid()` |
| `session_id` | `UUID` | NOT NULL, FK → `creative_sessions(id)` ON DELETE CASCADE |
| `artist_id` | `UUID` | FK → `artist_profiles(id)` ON DELETE CASCADE (nullable — see BUG-DMIE-006) |
| `bpm` | `INTEGER` | NOT NULL |
| `musical_key` | `TEXT` | NOT NULL |
| `scale` | `TEXT` | NOT NULL |
| `atmosphere` | `TEXT` | NOT NULL |
| `cadence_energy` | `TEXT` | NOT NULL |
| `chord_direction` | `TEXT` | NOT NULL |
| `vocal_energy` | `TEXT` | NOT NULL |
| `hook_intensity` | `TEXT` | NOT NULL |
| `engine_version` | `TEXT` | NOT NULL, DEFAULT `'v1'` |
| `created_at` | `TIMESTAMP` | NOT NULL, DEFAULT NOW() |

Indexes: `song_blueprints_session_id_idx`, `song_blueprints_artist_id_idx`

#### `emotional_profiles`
| Column | Type | Constraints |
|---|---|---|
| `id` | `UUID` | PK, `gen_random_uuid()` |
| `artist_id` | `UUID` | FK → `artist_profiles(id)` ON DELETE CASCADE |
| `session_id` | `UUID` | FK → `creative_sessions(id)` ON DELETE CASCADE (nullable — see BUG-DMIE-007) |
| `emotion` | `emotion_type` | NOT NULL |
| `intention` | `intention_type` | NOT NULL |
| `story` | `TEXT` | nullable |
| `listener_transformation` | `transformation_type` | NOT NULL |
| `created_at` | `TIMESTAMP` | NOT NULL, DEFAULT NOW() |

Indexes: `emotional_profiles_artist_id_idx`, `emotional_profiles_emotion_idx`, `emotional_profiles_session_id_idx`

#### `artist_memory`
| Column | Type | Constraints |
|---|---|---|
| `id` | `UUID` | PK, `gen_random_uuid()` |
| `artist_id` | `UUID` | NOT NULL, UNIQUE, FK → `artist_profiles(id)` ON DELETE CASCADE |
| `dominant_emotion` | `emotion_type` | nullable |
| `recurring_themes` | `JSONB` | NOT NULL, DEFAULT `'[]'` |
| `preferred_keys` | `JSONB` | NOT NULL, DEFAULT `'[]'` |
| `avg_bpm_min` | `INTEGER` | nullable |
| `avg_bpm_max` | `INTEGER` | nullable |
| `session_count` | `INTEGER` | NOT NULL, DEFAULT `0` |
| `last_session_at` | `TIMESTAMP` | nullable |
| `created_at` | `TIMESTAMP` | NOT NULL, DEFAULT NOW() |
| `updated_at` | `TIMESTAMP` | NOT NULL, DEFAULT NOW() |

Indexes: `artist_memory_artist_id_idx`

### Prerequisite Migrations (Not Part of DMIE)

These migrations must be present before `0012_music_intelligence` runs:

| Index | Tag | Purpose |
|---|---|---|
| 0 | `0000_harsh_gressill` | Base schema — `users`, `artist_profiles`, core tables |
| 9 | `0009_music_core_v1` | Music releases, tracks, catalogs — provides `artist_profiles` FK target |
| 10 | `0010_release_checklists` | Release checklist table |
| 11 | `0011_release_state_engine` | Release state enum and column |

---

## Routes Added

All routes registered under prefix `/api/music-intelligence` in `backend/src/app.ts`.  
All routes require the `authenticate` middleware.

| Method | Path | Handler | Validation |
|---|---|---|---|
| `GET` | `/api/music-intelligence/dashboard` | `getDashboard` | Query: `artist_id` (optional UUID string) |
| `GET` | `/api/music-intelligence/memory` | `getArtistMemory` | Query: `artist_id` (required, validated in controller) |
| `GET` | `/api/music-intelligence/sessions` | `listSessions` | Query: `artist_id` (optional), `limit` (optional, max 100) |
| `POST` | `/api/music-intelligence/sessions` | `createSession` | Body: `createSessionSchema` (Zod) |
| `GET` | `/api/music-intelligence/sessions/:id` | `getSession` | Path: `id` (UUID) |
| `PATCH` | `/api/music-intelligence/sessions/:id` | `updateSession` | Body: `updateSessionSchema` (Zod) |
| `DELETE` | `/api/music-intelligence/sessions/:id` | `deleteSession` | Path: `id` (UUID) |
| `POST` | `/api/music-intelligence/sessions/:id/blueprint` | `regenerateBlueprint` | Path: `id` (UUID) |

### Request Schema: `createSessionSchema`

```typescript
{
  name: string,              // 1–200 characters
  artist_id: string,         // UUID
  emotion: EmotionType,      // one of 12 values
  intention: IntentionType,  // one of 8 values
  story?: string,            // optional, max 2000 characters
  listener_transformation: TransformationType  // one of 8 values
}
```

### Request Schema: `updateSessionSchema`

```typescript
{
  name?: string,             // 1–200 characters
  status?: 'draft' | 'active' | 'completed'
}
```

---

## Frontend Pages Added

### `/music-intelligence` — Music Intelligence Page

**File:** `frontend/src/pages/MusicIntelligence.tsx`  
**Navigation:** Sidebar entry `MUSIC INTEL` with icon `◆`, position 10 (after Automation, before Activity)  
**Route registered in:** `frontend/src/App.tsx`

**Sections:**
- **Stats row** — Session count, Blueprint count (sourced from dashboard API).
- **Artist Memory panel** — Dominant emotion, BPM range, preferred keys, session count.
- **Session creation form** — Name input, three dropdowns (Emotion, Intention, Listener Transformation), optional story textarea.
- **Blueprint output panel** — Displays all 8 blueprint fields with color-coded emotion badge and a Regenerate button.
- **Emotion distribution chart** — Horizontal bar chart showing session count per emotion for the artist.
- **Session history** — Scrollable list of past sessions; clicking a session loads its most recent blueprint.

**API Client Methods Added (`frontend/src/api/client.ts`):**

```typescript
musicIntelligence.dashboard(artistId?)
musicIntelligence.memory(artistId)
musicIntelligence.listSessions(artistId?)
musicIntelligence.createSession(body)
musicIntelligence.getSession(id)
musicIntelligence.updateSession(id, body)
musicIntelligence.deleteSession(id)
musicIntelligence.regenerateBlueprint(id)
```

---

## Migration IDs

| ID | Tag | Status |
|---|---|---|
| `0012_music_intelligence` | idx 12 | Applied |

Migration is idempotent: all enum creates use `EXCEPTION WHEN duplicate_object THEN null` guards; all table creates use `IF NOT EXISTS`.

---

## Verification Results

### Schema Verification

- All 4 enum types created successfully in target PostgreSQL instance.
- All 4 tables created with correct column types, constraints, and defaults.
- All 7 indexes created.
- Foreign key references to `artist_profiles` confirmed via journal — `0009_music_core_v1` (idx 9) is a prerequisite and was present.

### API Verification

- `POST /api/music-intelligence/sessions` — creates session, blueprint, emotional profile, and artist memory in single request. Response includes both `session` and `blueprint` objects. HTTP 201.
- `GET /api/music-intelligence/dashboard` — returns `session_count`, `blueprint_count`, `recent_sessions`, `emotion_distribution`. HTTP 200.
- `GET /api/music-intelligence/memory` — returns artist memory record or null for new artists. HTTP 200.
- `DELETE /api/music-intelligence/sessions/:id` — cascades to blueprints and emotional profiles. Confirmed via database inspection.
- `POST /api/music-intelligence/sessions/:id/blueprint` — appends new blueprint row. HTTP 201. (See BUG-DMIE-001 for output variation limitation.)

### Frontend Verification

- Page renders at `/music-intelligence` with valid artist profile in session.
- Session creation form submits and displays generated blueprint without page reload.
- Emotion distribution bar chart renders with correct proportions.
- Session history list updates after creation and deletion.
- Blueprint panel regenerate button functions (inserts new row; see BUG-DMIE-001 for variation limitation).

---

## Known Limitations

1. **Blueprint regeneration does not vary output** (BUG-DMIE-001) — the regenerate feature inserts a new database row but the blueprint values are identical to the original. Variance seeding is not implemented in v1.

2. **`dominant_emotion` accuracy** (BUG-DMIE-002) — reflects the most recent session's emotion, not the statistically dominant one.

3. **No session-level data scoping enforcement** (BUG-DMIE-004) — `artist_id` is not required on list/dashboard endpoints. Any authenticated user can access any artist's data.

4. **Scale is not modified by transformation** (BUG-DMIE-011, WONT FIX for v1) — musical scale is derived solely from the base emotion and does not reflect the arc implied by `listener_transformation`.

5. **No soft delete** (BUG-DMIE-010) — deleting a session permanently destroys all associated blueprints and emotional profile data.

6. **Preferred keys list is FIFO-evicted** (BUG-DMIE-008) — once an artist has used 10 distinct keys, older keys are evicted regardless of frequency.

7. **No pagination cursor** — `listSessions` uses offset-based limiting (max 100 rows). Cursor-based pagination is deferred to Phase 2.

8. **`recurring_themes` JSONB field is not populated** — the `artist_memory` table includes a `recurring_themes` column that is initialized to `[]` and never written to. Reserved for Phase 2 NLP/AI integration.

9. **No real-time updates** — the dashboard and session list require a manual page refresh or re-navigation to reflect changes made in other tabs.

---

## Deployment Notes

### Prerequisites

- PostgreSQL instance must be running and accessible via `DATABASE_URL`.
- Migrations 0000 through 0011 must be applied before 0012. Verify via `SELECT tag FROM drizzle.__drizzle_migrations ORDER BY idx`.
- `artist_profiles` table must exist and be populated (created by migration 0000/0009).

### Applying the Migration

The migration is applied by the standard Drizzle runner at application startup, or manually:

```bash
cd backend
npx drizzle-kit migrate
```

The migration file is idempotent — re-running it will not create duplicate tables or enums.

### Environment Variables

No new environment variables are required for DMIE Phase 1. The module uses the existing `DATABASE_URL` connection pool.

### Backend Startup

The route is registered in `backend/src/app.ts` at line 137:

```typescript
app.use('/api/music-intelligence', musicIntelligenceRouter);
```

No additional startup configuration is required.

### Frontend Build

The `MusicIntelligence` page is included in the standard Vite build. No additional build flags or feature toggles are required.

---

## Rollback Notes

### Rollback Trigger Conditions

Roll back if any of the following occur post-deployment:

- Migration 0012 fails to apply and leaves the database in a partial state.
- Application startup fails due to schema type mismatches.
- `POST /api/music-intelligence/sessions` returns 500 errors on all requests.

### Rollback Procedure

**Step 1 — Revert backend code** to the commit prior to the DMIE module addition (commit before `0012_music_intelligence.sql` was created).

**Step 2 — Remove the route registration** in `backend/src/app.ts` if a code rollback is not possible:

```typescript
// Remove or comment out:
app.use('/api/music-intelligence', musicIntelligenceRouter);
```

**Step 3 — Drop DMIE tables and enums** (only if the migration was successfully applied and data loss is acceptable):

```sql
DROP TABLE IF EXISTS artist_memory CASCADE;
DROP TABLE IF EXISTS emotional_profiles CASCADE;
DROP TABLE IF EXISTS song_blueprints CASCADE;
DROP TABLE IF EXISTS creative_sessions CASCADE;
DROP TYPE IF EXISTS session_status;
DROP TYPE IF EXISTS transformation_type;
DROP TYPE IF EXISTS intention_type;
DROP TYPE IF EXISTS emotion_type;
DELETE FROM drizzle.__drizzle_migrations WHERE tag = '0012_music_intelligence';
```

**Step 4 — Revert frontend code** to remove the `MusicIntelligence` page, its route in `App.tsx`, its API client methods in `client.ts`, and its sidebar entry in `Sidebar.tsx`.

**Step 5 — Rebuild and redeploy** both backend and frontend.

### Data Loss Warning

Dropping tables in Step 3 permanently destroys all `creative_sessions`, `song_blueprints`, `emotional_profiles`, and `artist_memory` records. This action is irreversible. If data preservation is required, export the tables before dropping:

```sql
COPY creative_sessions TO '/tmp/creative_sessions_backup.csv' CSV HEADER;
COPY song_blueprints TO '/tmp/song_blueprints_backup.csv' CSV HEADER;
COPY emotional_profiles TO '/tmp/emotional_profiles_backup.csv' CSV HEADER;
COPY artist_memory TO '/tmp/artist_memory_backup.csv' CSV HEADER;
```

### Non-Destructive Rollback

If the application is stable but the feature should be hidden from users, add a frontend route guard or remove the sidebar navigation entry without dropping the schema. The data and API will remain intact for Phase 2.
