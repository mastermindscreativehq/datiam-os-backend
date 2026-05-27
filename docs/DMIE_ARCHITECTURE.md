# DMIE Architecture — Phase 1

**Module:** DATIAM Music Intelligence Engine (DMIE)  
**Version:** 1.0.0  
**Engine Version:** v1  
**Last Updated:** 2026-05-27  
**Status:** Production (Phase 1)

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Backend Flow](#2-backend-flow)
3. [Frontend Flow](#3-frontend-flow)
4. [Database Schema](#4-database-schema)
5. [API Endpoints](#5-api-endpoints)
6. [Service Relationships](#6-service-relationships)
7. [Blueprint Engine Internals](#7-blueprint-engine-internals)
8. [Queue Architecture](#8-queue-architecture)
9. [Future Python Integration Points](#9-future-python-integration-points)
10. [Scaling Strategy](#10-scaling-strategy)
11. [Risks](#11-risks)

---

## 1. System Overview

DMIE is a deterministic musical intelligence layer embedded within the DATIAM OS platform. It accepts an artist's emotional state, creative intention, listener transformation goal, and optional narrative context — and outputs a structured musical blueprint specifying BPM, key, scale, and five qualitative dimensions of the song's energy.

The engine does not call any external APIs. All computation is done synchronously in-process using static lookup tables and a djb2-style hash function applied to the story text. This means blueprints are reproducible, offline-capable, and have zero latency beyond a single database write.

```
Artist Input
  (emotion, intention, transformation, story)
        │
        ▼
┌─────────────────────┐
│   Blueprint Engine  │  ◄── Static lookup tables (EMOTION_BASE, INTENTION_MOD, TRANSFORMATION_MOD)
│   computeBlueprint()│  ◄── storyHash(story) → deterministic variance
└─────────────────────┘
        │
        ▼
  BlueprintOutput
  (bpm, key, scale, atmosphere, cadence_energy,
   chord_direction, vocal_energy, hook_intensity)
        │
        ▼
┌─────────────────────┐
│   PostgreSQL        │  creative_sessions, song_blueprints,
│                     │  emotional_profiles, artist_memory
└─────────────────────┘
```

---

## 2. Backend Flow

### Module Location

```
backend/src/modules/music-intelligence/
├── blueprint-engine.ts          # Pure computation — no DB, no I/O
├── music-intelligence.schema.ts # Zod validation schemas + TypeScript types
├── music-intelligence.service.ts# Business logic + DB operations
├── music-intelligence.controller.ts # Express request/response handlers
└── music-intelligence.routes.ts # Route definitions + middleware wiring
```

### Session Creation Flow

```
POST /api/music-intelligence/sessions
        │
        ▼
authenticate middleware
        │
        ▼
validate(createSessionSchema)         ← Zod: name, artist_id, emotion,
        │                               intention, story?, listener_transformation
        ▼
createSession controller
        │
        ▼
createSession service
        │
        ├── 1. computeBlueprint(input)
        │         └── storyHash(story) → pick key from emotion.keys
        │         └── bpm = base + intentionDelta + transformDelta (clamped 40–200)
        │         └── compose 8 output fields from 3 modifier tables
        │
        ├── 2. INSERT creative_sessions → returns session row
        │
        ├── 3. INSERT song_blueprints (engine_version='v1') → returns blueprint row
        │
        ├── 4. INSERT emotional_profiles (denormalized copy of emotional inputs)
        │
        ├── 5. updateArtistMemory(artist_id, emotion, bpm, musical_key)
        │         └── SELECT existing memory row
        │         └── UPSERT: update preferred_keys (dedup, cap 10), BPM min/max,
        │                      session_count += 1, last_session_at = NOW()
        │
        └── 6. logActivity(...)      ← fire-and-forget (see BUG-DMIE-005)
                │
                └── returns { session, blueprint }
```

### Blueprint Regeneration Flow

```
POST /api/music-intelligence/sessions/:id/blueprint
        │
        ▼
authenticate middleware
        │
        ▼
regenerateBlueprint service
        │
        ├── 1. SELECT creative_sessions WHERE id = :id
        │
        ├── 2. computeBlueprint(session fields)
        │         └── NOTE: identical output to original in v1 (BUG-DMIE-001)
        │
        └── 3. INSERT song_blueprints (new row, same session_id)
                    └── returns { session, blueprint }
```

### Read Flows

```
GET /sessions?artist_id=<uuid>&limit=<n>
  → SELECT creative_sessions WHERE artist_id = ? ORDER BY created_at DESC LIMIT ?

GET /sessions/:id
  → SELECT creative_sessions WHERE id = ?
  → SELECT song_blueprints WHERE session_id = ? ORDER BY created_at DESC
  → returns { session, blueprint: blueprints[0], blueprint_history: blueprints }

GET /memory?artist_id=<uuid>
  → SELECT artist_memory WHERE artist_id = ?
  → returns record or null

GET /dashboard?artist_id=<uuid>
  → COUNT(creative_sessions) WHERE artist_id = ?
  → COUNT(song_blueprints) WHERE artist_id = ?
  → SELECT creative_sessions ORDER BY created_at DESC LIMIT 5
  → SELECT emotion, COUNT(*) FROM creative_sessions GROUP BY emotion
  → returns aggregated object
```

### Error Handling

All service functions throw `AppError` (with HTTP status code) for known error cases (e.g., session not found → 404). All controllers wrap service calls in `try/catch` and forward to `next(err)`, which is handled by the global `errorHandler` middleware.

Validation errors from Zod are caught by the `validate` middleware before reaching the controller.

---

## 3. Frontend Flow

### Component Hierarchy

```
App.tsx
  └── Route /music-intelligence
        └── MusicIntelligence.tsx
              ├── Stats Row
              │     ├── Session count (from dashboard API)
              │     └── Blueprint count (from dashboard API)
              │
              ├── Artist Memory Panel
              │     ├── Dominant emotion
              │     ├── BPM range (avg_bpm_min – avg_bpm_max)
              │     ├── Session count
              │     └── Preferred keys list
              │
              ├── Session Creation Form
              │     ├── Name input
              │     ├── MISelect: Emotion (12 options)
              │     ├── MISelect: Intention (8 options)
              │     ├── MISelect: Listener Transformation (8 options)
              │     └── Story textarea (optional, max 2000 chars)
              │
              ├── BlueprintPanel (conditionally rendered)
              │     ├── BPM, Musical Key, Scale
              │     ├── Atmosphere, Cadence Energy
              │     ├── Chord Direction, Vocal Energy, Hook Intensity
              │     └── Regenerate button
              │
              ├── EmotionDistribution Chart
              │     └── Horizontal bars, one per emotion, width = count / max
              │
              └── Session History List
                    └── SessionRow (name, emotion badge, created_at, delete button)
```

### Data Loading Strategy

On mount, `fetchAll()` is called. It uses `Promise.allSettled` to load the artist profile and then issues three parallel requests: dashboard, sessions, and memory. Individual failures do not block the page from rendering — each panel degrades independently.

```
fetchAll()
  │
  ├── GET /api/artist-profiles?user_id=<userId>  → artistId
  │
  └── (artistId resolved) → Promise.allSettled([
        GET /api/music-intelligence/dashboard?artist_id=<id>,
        GET /api/music-intelligence/sessions?artist_id=<id>,
        GET /api/music-intelligence/memory?artist_id=<id>
      ])
```

### Session Selection Flow

```
User clicks SessionRow
  │
  ├── setActiveSessionId(id)
  │
  └── GET /api/music-intelligence/sessions/:id
        └── setActiveBp(response.blueprint)
```

### Form Submission Flow

```
User submits session form
  │
  ├── setSubmitting(true)
  │
  ├── POST /api/music-intelligence/sessions → { session, blueprint }
  │
  ├── setActiveBp(blueprint)
  ├── setActiveSessionId(session.id)
  ├── setSessions([session, ...sessions])
  ├── Update dashboard counters in local state
  └── Reset form fields
```

### State Variables

| Variable | Type | Purpose |
|---|---|---|
| `artistId` | `string \| null` | Resolved artist profile UUID |
| `dashboard` | `object \| null` | Session/blueprint counts + emotion distribution |
| `memory` | `object \| null` | Artist memory record |
| `sessions` | `array` | Session history list |
| `activeBp` | `object \| null` | Currently displayed blueprint |
| `activeSessionId` | `string \| null` | Currently selected session |
| `loading` | `boolean` | Initial page load state |
| `submitting` | `boolean` | Form submission in-flight |
| `regenerating` | `boolean` | Regenerate button in-flight |
| `deletingId` | `string \| null` | Session delete in-flight (per-row) |
| `submitError` | `string \| null` | Form submission error message |

---

## 4. Database Schema

### Entity-Relationship Overview

```
artist_profiles (existing)
      │
      ├──< creative_sessions (N per artist)
      │          │
      │          ├──< song_blueprints (N per session — version history)
      │          │
      │          └──< emotional_profiles (1 per session — denormalized snapshot)
      │
      └──○ artist_memory (0..1 per artist — singleton upsert)
```

### Table: `creative_sessions`

Primary record representing one creative context. An artist may have many sessions, each anchored to a specific emotional state and intention.

```sql
id                    UUID PRIMARY KEY DEFAULT gen_random_uuid()
artist_id             UUID REFERENCES artist_profiles(id) ON DELETE CASCADE
name                  TEXT NOT NULL
emotion               emotion_type NOT NULL
intention             intention_type NOT NULL
story                 TEXT                              -- optional narrative input
listener_transformation transformation_type NOT NULL
status                session_status NOT NULL DEFAULT 'active'
created_at            TIMESTAMP NOT NULL DEFAULT NOW()
updated_at            TIMESTAMP NOT NULL DEFAULT NOW()
```

Indexes: `(artist_id)`, `(emotion)`, `(status)`

### Table: `song_blueprints`

Versioned output of the blueprint engine for a session. Multiple rows per session are created when the user regenerates. The most recent row (by `created_at`) is the active blueprint.

```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
session_id      UUID NOT NULL REFERENCES creative_sessions(id) ON DELETE CASCADE
artist_id       UUID REFERENCES artist_profiles(id) ON DELETE CASCADE   -- nullable (BUG-DMIE-006)
bpm             INTEGER NOT NULL
musical_key     TEXT NOT NULL
scale           TEXT NOT NULL
atmosphere      TEXT NOT NULL
cadence_energy  TEXT NOT NULL
chord_direction TEXT NOT NULL
vocal_energy    TEXT NOT NULL
hook_intensity  TEXT NOT NULL
engine_version  TEXT NOT NULL DEFAULT 'v1'
created_at      TIMESTAMP NOT NULL DEFAULT NOW()
```

Indexes: `(session_id)`, `(artist_id)`

The `engine_version` column enables the query layer to serve blueprints from a specific engine generation, supporting safe engine upgrades without reprocessing historical sessions.

### Table: `emotional_profiles`

Immutable snapshot of the emotional inputs at session creation time. Denormalized from `creative_sessions` to support future analytics queries that aggregate across artists without joining to the sessions table.

```sql
id                      UUID PRIMARY KEY DEFAULT gen_random_uuid()
artist_id               UUID REFERENCES artist_profiles(id) ON DELETE CASCADE
session_id              UUID REFERENCES creative_sessions(id) ON DELETE CASCADE  -- nullable (BUG-DMIE-007)
emotion                 emotion_type NOT NULL
intention               intention_type NOT NULL
story                   TEXT
listener_transformation transformation_type NOT NULL
created_at              TIMESTAMP NOT NULL DEFAULT NOW()
```

Indexes: `(artist_id)`, `(emotion)`, `(session_id)`

### Table: `artist_memory`

One row per artist. Updated on every session creation. Accumulates the artist's creative signature over time: emotional tendency, key preferences, BPM range.

```sql
id               UUID PRIMARY KEY DEFAULT gen_random_uuid()
artist_id        UUID NOT NULL UNIQUE REFERENCES artist_profiles(id) ON DELETE CASCADE
dominant_emotion emotion_type                           -- most recent session emotion (BUG-DMIE-002)
recurring_themes JSONB NOT NULL DEFAULT '[]'::jsonb    -- reserved, Phase 2
preferred_keys   JSONB NOT NULL DEFAULT '[]'::jsonb    -- array of strings, max 10
avg_bpm_min      INTEGER                               -- rolling minimum across all sessions
avg_bpm_max      INTEGER                               -- rolling maximum across all sessions
session_count    INTEGER NOT NULL DEFAULT 0
last_session_at  TIMESTAMP
created_at       TIMESTAMP NOT NULL DEFAULT NOW()
updated_at       TIMESTAMP NOT NULL DEFAULT NOW()
```

Indexes: `(artist_id)`

### Enum Types

| Type | Values |
|---|---|
| `emotion_type` | `grief`, `trauma`, `rage`, `joy`, `melancholy`, `euphoria`, `anxiety`, `longing`, `triumph`, `nostalgia`, `peace`, `defiance` |
| `intention_type` | `heal_listener`, `inspire_action`, `create_nostalgia`, `deliver_message`, `uplift_spirit`, `provoke_thought`, `celebrate_truth`, `process_pain` |
| `transformation_type` | `from_pain_to_peace`, `from_stagnation_to_momentum`, `from_confusion_to_clarity`, `from_isolation_to_belonging`, `from_fear_to_courage`, `from_grief_to_acceptance`, `from_doubt_to_conviction`, `from_chaos_to_order` |
| `session_status` | `draft`, `active`, `completed` |

---

## 5. API Endpoints

Base path: `/api/music-intelligence`  
Auth: All endpoints require `authenticate` middleware (JWT/session validation).

### `GET /dashboard`

Returns aggregate statistics for an artist or the entire platform.

**Query Parameters:**
- `artist_id` (optional) — UUID. If omitted, returns platform-wide aggregates (see BUG-DMIE-004).

**Response:**
```json
{
  "session_count": 42,
  "blueprint_count": 58,
  "recent_sessions": [ /* last 5 creative_sessions rows */ ],
  "emotion_distribution": [
    { "emotion": "joy", "total": "12" },
    { "emotion": "melancholy", "total": "8" }
  ]
}
```

---

### `GET /memory`

Returns the artist memory singleton.

**Query Parameters:**
- `artist_id` (required) — UUID. Returns 400 if absent.

**Response:** `artist_memory` row or `null` if no sessions exist yet.

---

### `GET /sessions`

Lists sessions ordered by `created_at DESC`.

**Query Parameters:**
- `artist_id` (optional) — UUID filter.
- `limit` (optional) — integer, default 50, max 100.

**Response:** Array of `creative_sessions` rows.

---

### `POST /sessions`

Creates a session, blueprint, emotional profile, and updates artist memory atomically within the service layer (no database transaction — see risks).

**Request Body:** `createSessionSchema`  
**Response (201):**
```json
{
  "session": { /* creative_sessions row */ },
  "blueprint": { /* song_blueprints row */ }
}
```

---

### `GET /sessions/:id`

Returns a session with its full blueprint history.

**Response:**
```json
{
  "session": { /* creative_sessions row */ },
  "blueprint": { /* most recent song_blueprints row or null */ },
  "blueprint_history": [ /* all song_blueprints rows, newest first */ ]
}
```

---

### `PATCH /sessions/:id`

Updates session name and/or status. Does not affect emotional inputs or blueprint.

**Request Body:** `updateSessionSchema` (`name?`, `status?`)  
**Response:** Updated `creative_sessions` row.

---

### `DELETE /sessions/:id`

Permanently deletes the session. Cascades to `song_blueprints` and `emotional_profiles`. Artist memory is not rolled back.

**Response:**
```json
{ "deleted": true }
```

---

### `POST /sessions/:id/blueprint`

Appends a new blueprint row to the session's history.

**Response (201):**
```json
{
  "session": { /* creative_sessions row */ },
  "blueprint": { /* new song_blueprints row */ }
}
```

Note: in v1, output is identical to the original blueprint (BUG-DMIE-001).

---

## 6. Service Relationships

```
music-intelligence.routes.ts
        │  wires authenticate, validate, controller
        ▼
music-intelligence.controller.ts
        │  req/res handling, query param extraction
        ▼
music-intelligence.service.ts
        │  business logic, orchestration
        ├──► blueprint-engine.ts        (pure function, no I/O)
        ├──► db (Drizzle ORM)           (PostgreSQL)
        └──► activityLogger             (shared lib/activityLogger)

music-intelligence.schema.ts
        │  Zod schemas, TypeScript types
        └── consumed by routes (validate middleware) and service (types)
```

### Dependencies on Shared Infrastructure

| Dependency | Import Path | Purpose |
|---|---|---|
| `db` | `../../db` | Drizzle ORM PostgreSQL client |
| `AppError` | `../../middleware/errorHandler` | Typed HTTP error with status code |
| `logActivity` | `../../lib/activityLogger` | Platform-wide activity audit log |
| `authenticate` | `../../middleware/auth` | JWT verification middleware |
| `validate` | `../../middleware/validate` | Zod schema enforcement middleware |
| `success` | `../../utils/response` | Standardized JSON response wrapper |

### Dependencies on Other Modules

| Dependency | Why |
|---|---|
| `artist_profiles` table | FK target for all four DMIE tables. Must exist before migration 0012 runs. |
| `activity_log` table | Written to by `logActivity` on session creation. Must exist (migration 0003+). |

### Modules That Depend on DMIE

None in Phase 1. DMIE is a leaf module with no consumers. Phase 2 Python integration will consume `creative_sessions` and `artist_memory`.

---

## 7. Blueprint Engine Internals

The engine is a pure function with no side effects. All logic is contained in `blueprint-engine.ts`.

### Computation Pipeline

```
Input: { emotion, intention, listener_transformation, story? }
        │
        ├── storyHash(story)          → h: u32 (djb2 variant)
        │
        ├── EMOTION_BASE[emotion]     → bpmMin, bpmMax, keys[], scale,
        │                               atmosphere, cadenceEnergy, chordDirection,
        │                               vocalEnergy, hookIntensity
        │
        ├── INTENTION_MOD[intention]  → bpmDelta, vocalSuffix, hookSuffix, atmosphereSuffix?
        │
        ├── TRANSFORMATION_MOD[lt]    → bpmDelta?, chordSuffix?, cadenceOverride?,
        │                               hookSuffix?, atmosphereSuffix?
        │
        ├── bpm = clamp(
        │         bpmMin + (h % (bpmMax - bpmMin + 1))
        │         + intentionMod.bpmDelta
        │         + (transformMod.bpmDelta ?? 0),
        │         40, 200
        │       )
        │
        ├── musical_key = keys[h % keys.length]
        │
        ├── scale = base.scale  (transformation does not modify in v1)
        │
        ├── atmosphere = base + intentionSuffix? + transformSuffix?
        │
        ├── cadence_energy = transformMod.cadenceOverride ?? base.cadenceEnergy
        │
        ├── chord_direction = base + transformMod.chordSuffix?
        │
        ├── vocal_energy = base + intentionMod.vocalSuffix
        │
        └── hook_intensity = base + intentionMod.hookSuffix + transformMod.hookSuffix?
```

### Hash Function

```typescript
function storyHash(story: string | null | undefined): number {
  const s = story ?? '';
  if (s.length === 0) return 0;
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h * 31) + s.charCodeAt(i)) >>> 0;  // unsigned 32-bit
  }
  return h;
}
```

An empty or absent story always returns `0`, which causes deterministic key selection (`keys[0]`) and BPM pinned to `bpmMin`. This is the lowest-variance output for any given emotion/intention/transformation combination.

### BPM Ranges by Emotion

| Emotion | Min BPM | Max BPM | Typical Genre Context |
|---|---|---|---|
| `trauma` | 48 | 65 | Dark ambient, experimental |
| `grief` | 55 | 70 | Slow ballad |
| `peace` | 52 | 72 | Ambient, meditation |
| `melancholy` | 60 | 80 | Soul, lo-fi |
| `longing` | 65 | 84 | R&B, indie |
| `nostalgia` | 72 | 90 | Pop, soft rock |
| `triumph` | 88 | 116 | Gospel, anthemic pop |
| `anxiety` | 88 | 112 | Electronic, neo-soul |
| `joy` | 96 | 128 | Pop, funk |
| `defiance` | 92 | 132 | Hip-hop, rock |
| `euphoria` | 118 | 140 | EDM, pop |
| `rage` | 128 | 155 | Hip-hop, trap, rock |

After intention and transformation deltas, BPM is clamped to `[40, 200]`.

---

## 8. Queue Architecture

### Current State (Phase 1)

DMIE Phase 1 has no asynchronous queue. All operations are synchronous within the request/response cycle:

- Blueprint computation is in-memory (< 1ms).
- All database writes complete before the HTTP response is sent.
- Activity logging is fire-and-forget (unqueued, unawaited — BUG-DMIE-005).

### Phase 2 Queue Requirements

When the Python AI layer is introduced (see Section 9), the following queued operations will be needed:

**Session Analysis Queue**  
Triggered on session creation. Sends session + story text to the Python service for NLP-based theme extraction. Result populates `artist_memory.recurring_themes`.

**Memory Recomputation Queue**  
Triggered when `session_count` crosses configurable thresholds (e.g., 10, 25, 50). Re-aggregates `dominant_emotion` using actual frequency counts instead of last-write semantics.

**Blueprint Enhancement Queue**  
Triggered on regeneration requests. Sends session emotional context to the Python service for ML-assisted BPM/key recommendations, supplementing or replacing the static lookup tables.

### Recommended Queue Infrastructure (Phase 2)

Given the existing DATIAM OS stack:

- **Broker:** PostgreSQL-backed queue (e.g., `pg-boss`) to avoid introducing a new infrastructure dependency in Phase 2. Redis/BullMQ if queue volume requires it.
- **Worker:** Dedicated Node.js worker process consuming from the queue and calling the Python service via HTTP.
- **Dead Letter:** Failed jobs after 3 retries move to a `failed_jobs` table for manual inspection.
- **Idempotency:** Each job carries the session UUID as the idempotency key. Re-processing a session replaces, not appends, its memory contributions.

---

## 9. Future Python Integration Points

DMIE is designed as the TypeScript foundation for a Python-based AI layer. The following integration points are reserved and partially stubbed.

### 9.1 `artist_memory.recurring_themes`

**Current State:** JSONB column, always `[]`. Never written by Phase 1 code.

**Phase 2 Integration:** When an artist creates a session, the `story` field is sent to a Python NLP microservice that extracts semantic themes (e.g., `["loss", "redemption", "identity"]`). The resulting array is stored in `recurring_themes`. The frontend Artist Memory panel will render these as tags.

**Integration Point:**  
`createSession()` in `music-intelligence.service.ts` should enqueue a `AnalyzeStoryThemes` job after saving the session. The Python worker processes it and issues a `PATCH` back to the service (or writes directly to `artist_memory`).

### 9.2 `dominant_emotion` Accuracy

**Current State:** Last-write value (BUG-DMIE-002).

**Phase 2 Integration:** The Python service periodically queries `emotional_profiles` for an artist and computes a weighted dominant emotion (recency-weighted frequency). This replaces the naive last-write approach with a learned emotional signature.

### 9.3 Blueprint Enhancement via ML

**Current State:** Blueprint is fully deterministic from static lookup tables.

**Phase 2 Integration:** An optional `enhanced` flag on the regeneration endpoint triggers a call to the Python service, which accepts the full emotional context and returns ML-suggested BPM, key, and qualitative descriptors. These are stored as a new `song_blueprints` row with `engine_version = 'v2'`.

The `engine_version` column on `song_blueprints` was added specifically to support this forward compatibility. v1 rows remain readable and usable indefinitely.

### 9.4 Artist Fingerprinting

**Phase 2 Integration:** The Python service reads an artist's `emotional_profiles`, `preferred_keys`, and `recurring_themes` to build an artist fingerprint — a vector embedding used for similarity search, recommendation, and collaborative filtering across the platform catalog.

**Integration Point:** New table `artist_fingerprints` (Phase 2 migration), populated by the Python service. DMIE provides the raw signal; Python builds the representation.

### 9.5 API Contract for Python Service

The Python service will communicate with the DATIAM OS backend via authenticated internal HTTP:

```
POST /internal/analyze-story        { session_id, story, emotion, intention }
POST /internal/compute-fingerprint  { artist_id }
POST /internal/enhance-blueprint    { session_id, emotion, intention, transformation, story }
```

Internal routes will require a service-to-service token (not user JWT). This internal routing layer does not exist in Phase 1.

---

## 10. Scaling Strategy

### Current Bottlenecks (Phase 1)

1. **`updateArtistMemory`** — two sequential DB round-trips on every session creation (SELECT + UPDATE/INSERT). At low volume (< 100 sessions/day per artist) this is not observable. At higher volumes, these should be merged into a single upsert.

2. **`getDashboard` COUNT queries** — four sequential queries on every dashboard load. Should be replaced with cached aggregates (Redis or Postgres materialized view) once per-artist session counts exceed ~1,000.

3. **`listSessions` without artist_id** — full table scan. At > 10,000 total sessions, this query will degrade. Mitigated by requiring `artist_id` (see BUG-DMIE-004) and adding a cursor-based pagination strategy.

### Horizontal Scaling

The DMIE backend is stateless. Blueprint computation is in-process with no shared mutable state. Multiple Node.js instances can serve the API concurrently without coordination.

The PostgreSQL connection pool (managed by the existing Drizzle configuration) should be sized to `10 * numInstances` as a starting point.

### Index Coverage

Current indexes support the primary access patterns:

| Query Pattern | Covered By |
|---|---|
| Sessions by artist, newest first | `creative_sessions_artist_id_idx` + `created_at` (implicit) |
| Blueprints by session | `song_blueprints_session_id_idx` |
| Emotion distribution for artist | `creative_sessions_artist_id_idx` + `creative_sessions_emotion_idx` |
| Artist memory lookup | `artist_memory_artist_id_idx` (unique, fast) |
| Emotional profiles by artist/emotion | `emotional_profiles_artist_id_idx`, `emotional_profiles_emotion_idx` |

Missing coverage for Phase 2:
- `creative_sessions (artist_id, created_at)` — composite index for paginated queries.
- `song_blueprints (artist_id, engine_version)` — for version-filtered blueprint queries.

### Cache Strategy (Phase 2)

| Data | Recommended Cache | TTL |
|---|---|---|
| Dashboard counts | Redis key per artist_id | 60 seconds |
| Artist memory | Redis key per artist_id | 5 minutes (invalidate on session creation) |
| Emotion distribution | Postgres materialized view | Refresh hourly or on-demand |

---

## 11. Risks

### R1 — No Database Transaction on Session Creation

**Severity:** High  
**Description:** `createSession()` performs four sequential database writes: `creative_sessions`, `song_blueprints`, `emotional_profiles`, and `artist_memory`. These are not wrapped in a transaction. If a write fails midway (e.g., `song_blueprints` insert fails after `creative_sessions` succeeds), the database is left in a partially consistent state — a session row exists with no blueprint.

**Mitigation:** Wrap the four writes in `db.transaction(async (tx) => { ... })` using Drizzle's transaction API. This is the highest priority schema-correctness fix for Phase 1.

---

### R2 — Cross-Artist Data Exposure

**Severity:** High  
**Description:** Authenticated users can query all artists' sessions and dashboard by omitting `artist_id` (BUG-DMIE-004). In a multi-artist production environment, this is a data privacy violation.

**Mitigation:** Enforce `artist_id` as a required parameter or derive it from the authenticated user context before Phase 1 goes to production with multiple users.

---

### R3 — Blueprint Regeneration Produces No Variation

**Severity:** Medium  
**Description:** The regenerate feature is non-functional as a creative tool (BUG-DMIE-001). Users clicking "Regenerate" receive an identical blueprint, consuming a database write with no benefit.

**Mitigation:** Implement variance seeding (timestamp or counter appended to story input before hashing) before the feature is presented to users.

---

### R4 — `dominant_emotion` Signal Corruption

**Severity:** Medium  
**Description:** Any downstream consumer of `artist_memory.dominant_emotion` — including the planned Python fingerprinting service — will receive a misleading signal. A single session in a new emotion permanently overwrites the artist's established emotional pattern (BUG-DMIE-002).

**Mitigation:** Recompute `dominant_emotion` via `GROUP BY` aggregation on every artist memory update. Low query cost at Phase 1 session volumes.

---

### R5 — Hard Delete Destroys Irreplaceable Blueprint History

**Severity:** Medium (grows over time)  
**Description:** As artists accumulate meaningful blueprint history, a misclick on "Delete Session" permanently destroys that history. There is no undo, archive, or soft-delete path (BUG-DMIE-010).

**Mitigation:** Add `deleted_at TIMESTAMP` soft-delete before user onboarding begins. Filter all read queries on `deleted_at IS NULL`.

---

### R6 — `recurring_themes` Field is Reserved but Unpopulated

**Severity:** Low  
**Description:** The `artist_memory.recurring_themes` JSONB column is present in the schema and shown (as an empty array) in the API response. There is no code path that writes to it. If a Phase 2 feature depends on this field being populated from existing data, historical sessions will have no theme data.

**Mitigation:** No action required for Phase 1. Document the gap and process historical sessions (via a backfill job) when the Phase 2 NLP service is deployed.

---

### R7 — Blueprint Engine Has No Versioning Guard on Stored Data

**Severity:** Low  
**Description:** If the static lookup tables in `blueprint-engine.ts` are modified (emotion BPM ranges, modifier values), existing `song_blueprints` rows become inconsistent with what would be computed today. An artist's blueprint history may reference `engine_version = 'v1'` but produce different output if the v1 tables changed.

**Mitigation:** The `engine_version` column exists to address this. Any modification to v1 lookup tables should increment the version to `v2`. v1 rows should be treated as immutable historical records, not re-derivable from current code.

---

### R8 — No Rate Limiting on Session Creation or Blueprint Regeneration

**Severity:** Low  
**Description:** An authenticated user can issue unlimited `POST /sessions` and `POST /sessions/:id/blueprint` requests, each producing a database write. There is no per-user or per-artist rate limit.

**Mitigation:** Add rate limiting middleware (e.g., express-rate-limit) scoped to the authenticated user on write endpoints before production exposure.
