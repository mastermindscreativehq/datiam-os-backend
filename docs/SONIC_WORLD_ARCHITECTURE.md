# SONIC WORLD ENGINE — ARCHITECTURE DOCUMENT
**DATIAM OS | Phase 2 Music Intelligence Expansion**
**Version:** 2.0.0-draft
**Status:** Architecture Review — Pre-Implementation
**Date:** 2026-05-27

---

## TABLE OF CONTENTS

1. [System Overview](#1-system-overview)
2. [Feature Boundaries](#2-feature-boundaries)
3. [Backend Architecture](#3-backend-architecture)
4. [Frontend Architecture](#4-frontend-architecture)
5. [State Management](#5-state-management)
6. [Database Schema Changes](#6-database-schema-changes)
7. [API Contract Design](#7-api-contract-design)
8. [Modular Intelligence Pipeline](#8-modular-intelligence-pipeline)
9. [Scalability Considerations](#9-scalability-considerations)
10. [Future Compatibility](#10-future-compatibility)

---

## 1. SYSTEM OVERVIEW

### What This Is

The **Sonic World Engine** is an emotional music intelligence infrastructure system. It takes the four emotional inputs already present in the DMIE Phase 1 creative session — emotion, intention, listener transformation, and story context — and expands the output from 8 fundamental dimensions into a complete **16-dimension sonic world blueprint**.

Phase 1 answers: *What key, tempo, and feeling should this music have?*
Phase 2 answers: *What world does this music inhabit, and how is it constructed?*

The output is not AI-generated audio. It is **producer-grade sonic architecture** — a complete specification that a professional producer, arranger, or artist can take directly into a DAW session, creative brief, or sync pitch deck. Every output field is a creative decision described with professional vocabulary, not a toy recommendation.

### Core Design Principles

- **Deterministic-first:** Same inputs yield the same core blueprint. Story context introduces controlled variance through hashing (matching Phase 1 behavior). No randomness.
- **Emotionally coherent:** All 8 new dimensions are derived from and consistent with each other and with Phase 1 outputs. The engine enforces cross-dimensional coherence.
- **Zero external dependencies:** All intelligence is computed in-process. No third-party AI APIs, no network calls during generation. Immediate, offline-capable output.
- **Producer vocabulary:** Output language mirrors how professional producers, music supervisors, and A&R executives actually speak. Not consumer-grade descriptions.
- **Layered on Phase 1:** A Sonic World Blueprint always references a `creative_session` that already has a Phase 1 `song_blueprint`. Phase 2 never replaces Phase 1 — it extends it.

### The 8 New Output Dimensions

| # | Dimension | What It Produces |
|---|-----------|-----------------|
| 1 | **Genre DNA** | Primary genre, sub-genre blend, genre lineage, sonic references |
| 2 | **Instrumentation Architecture** | Core instruments, role mapping, layering strategy, technique |
| 3 | **Vocal Energy Design** | Vocal style, delivery intensity, harmonic stacking, mix presence |
| 4 | **Cinematic Environment** | Sonic landscape, spatial feel, reverb character, color palette |
| 5 | **Rhythm Intelligence** | Groove feel, rhythmic pattern, syncopation level, pocket |
| 6 | **Harmonic Emotion System** | Chord function map, tension/resolution, harmonic rhythm, arc |
| 7 | **Hook Strategy** | Placement, payoff structure, memorability approach, sonic signature |
| 8 | **Production Density** | Arrangement density, frequency range, mix balance, sonic space |

Combined with Phase 1's 8 fields (BPM, key, scale, atmosphere, cadence energy, chord direction, vocal energy, hook intensity), this produces a **complete 16-dimension sonic world blueprint**.

---

## 2. FEATURE BOUNDARIES

### IN SCOPE — Phase 2 MVP

- Full Sonic World Blueprint computation engine (8 new dimensions)
- Producer Brief: auto-assembled narrative paragraph summarizing the sonic world
- Sonic World Mode selector (dark / atmospheric / cinematic / raw / transcendent / anthemic / intimate)
- Optional genre preference input (freetext, used to bias Genre DNA output)
- Optional reference artist input (up to 3, used to color sonic reference field)
- New DB table: `sonic_world_blueprints`
- New API module: `/api/sonic-world`
- New frontend page: `/sonic-world`
- Blueprint history (versioned, all generations stored)
- Coherence score (internal consistency metric, 0–1)
- Genre distribution analytics in dashboard

### EXPLICITLY OUT OF SCOPE — Current Phase

| Feature | Reason Deferred |
|---------|----------------|
| WAV file upload / analysis | Requires audio processing pipeline (Phase 3) |
| AI audio generation | Product positioning — this is not a generator |
| MIDI output / export | DAW integration layer not yet built |
| DAW export formats | Requires format negotiation with specific DAW targets |
| Stem generation | Requires audio synthesis backend |
| Real-time DSP | Requires WebAudio API integration |
| Mastering recommendations | Too close to audio processing boundary |
| Sync licensing direct submission | Requires sync partner API integrations |
| Artist identity memory (deep) | Schema exists (artist_memory table) but full pattern inference deferred |

### BOUNDARY: What "Intelligence" Means Here

This engine does not use an LLM or generative AI at generation time. Intelligence is encoded in:
1. The **dimension computation tables** — curated, hand-authored mappings from emotional inputs to sonic descriptors
2. The **coherence engine** — rule-based cross-dimension consistency enforcement
3. The **story analysis layer** — deterministic hashing of narrative context to create variance
4. The **producer brief assembler** — template-driven narrative composition (no LLM calls)

This is deliberate. LLM-based generation introduces latency, cost, non-determinism, and prompt injection risk. The value here is in the curated intelligence of the mapping tables, not in generative AI output.

---

## 3. BACKEND ARCHITECTURE

### Module Location

```
backend/src/modules/sonic-world/
├── sonic-world.routes.ts          ← Express route definitions
├── sonic-world.controller.ts      ← HTTP request handlers
├── sonic-world.service.ts         ← DB operations, session management
├── sonic-world.schema.ts          ← Zod schemas + TypeScript types
└── sonic-world-engine/
    ├── index.ts                   ← Main engine entry point
    ├── genre-dna.engine.ts        ← Dimension 1: Genre DNA computation
    ├── instrumentation.engine.ts  ← Dimension 2: Instrumentation Architecture
    ├── vocal-energy.engine.ts     ← Dimension 3: Vocal Energy Design
    ├── cinematic-env.engine.ts    ← Dimension 4: Cinematic Environment
    ├── rhythm.engine.ts           ← Dimension 5: Rhythm Intelligence
    ← harmonic-emotion.engine.ts  ← Dimension 6: Harmonic Emotion System
    ├── hook-strategy.engine.ts    ← Dimension 7: Hook Strategy
    ├── production-density.engine.ts← Dimension 8: Production Density
    ├── coherence.engine.ts        ← Cross-dimension consistency enforcement
    ├── producer-brief.assembler.ts← Narrative summary generation
    └── tables/
        ├── genre-dna.table.ts     ← Curated genre mapping data
        ├── instrumentation.table.ts
        ├── vocal-energy.table.ts
        ├── cinematic-env.table.ts
        ├── rhythm.table.ts
        ├── harmonic-emotion.table.ts
        ├── hook-strategy.table.ts
        ├── production-density.table.ts
        └── sonic-world-modes.table.ts
```

### Module Registration

Added to `backend/src/app.ts` alongside existing music-intelligence router:

```typescript
import sonicWorldRoutes from './modules/sonic-world/sonic-world.routes';
app.use('/api/sonic-world', authenticate, sonicWorldRoutes);
```

### Engine Architecture

The engine is a pure TypeScript module with no side effects. It takes a `SonicWorldInput` and returns a `SonicWorldOutput`. It has no DB dependency and can be unit-tested in isolation.

```typescript
// sonic-world-engine/index.ts
export interface SonicWorldInput {
  // From creative_session (Phase 1)
  emotion: EmotionType;
  intention: IntentionType;
  listenerTransformation: TransformationType;
  story: string | null;
  // Phase 1 output (already computed)
  bpm: number;
  musicalKey: string;
  scale: string;
  // Phase 2 optional context
  sonicWorldMode?: SonicWorldMode;
  genrePreference?: string;
  referenceArtists?: string[];  // max 3
}

export interface SonicWorldOutput {
  sonicWorldMode: SonicWorldMode;
  // Dimension 1: Genre DNA
  genrePrimary: string;
  genreSubBlend: string;
  genreLineage: string;
  sonicReferences: string;
  // Dimension 2: Instrumentation Architecture
  coreInstruments: string;
  instrumentRoles: string;
  layeringStrategy: string;
  productionTechnique: string;
  // Dimension 3: Vocal Energy Design
  vocalStyle: string;
  vocalDeliveryIntensity: string;
  harmonicStacking: string;
  vocalPresence: string;
  // Dimension 4: Cinematic Environment
  sonicLandscape: string;
  spatialFeel: string;
  reverbCharacter: string;
  sonicColorPalette: string;
  // Dimension 5: Rhythm Intelligence
  grooveFeel: string;
  rhythmicPattern: string;
  syncopationLevel: string;
  pocketDescriptor: string;
  // Dimension 6: Harmonic Emotion System
  chordFunctionMap: string;
  tensionResolution: string;
  harmonicRhythm: string;
  emotionalProgressionArc: string;
  // Dimension 7: Hook Strategy
  hookPlacement: string;
  payoffStructure: string;
  memorabilityApproach: string;
  sonicSignature: string;
  // Dimension 8: Production Density
  arrangementDensity: string;
  frequencyRange: string;
  mixBalance: string;
  sonicSpace: string;
  // Assembly
  producerBrief: string;
  coherenceScore: number;  // 0.00–1.00
  engineVersion: string;   // 'v2'
}

export function computeSonicWorld(input: SonicWorldInput): SonicWorldOutput { ... }
```

### Computation Strategy

Each dimension engine follows the same pattern as Phase 1's `blueprint-engine.ts`:

1. **Primary key lookup:** `emotion` maps to a base entry in the dimension table
2. **Modifier application:** `intention` and `listenerTransformation` apply deltas or suffix overrides
3. **Mode coloring:** `sonicWorldMode` adjusts vocabulary (e.g., "raw" mode darkens all descriptions)
4. **Variance injection:** `storyHash(story)` selects among 2–4 variants per field where multiple options exist
5. **Genre bias:** if `genrePreference` is provided, it constrains Genre DNA output; otherwise emotion infers genre
6. **Reference artist injection:** appended to `sonicReferences` field when provided, validated against a safe list

### Error Handling

All engine computations are wrapped in try/catch in the service layer. A computation failure returns a 500 with `AppError('Sonic world computation failed', 500)`. Partial failures (one dimension errors) do not produce partial output — the full computation is atomic.

### Service Layer Responsibilities

```typescript
// sonic-world.service.ts
class SonicWorldService {
  async generateBlueprint(sessionId: string, artistId: string, options: GenerateOptions): Promise<SonicWorldBlueprint>
  async getLatestBlueprint(sessionId: string): Promise<SonicWorldBlueprint | null>
  async getBlueprintHistory(sessionId: string): Promise<SonicWorldBlueprint[]>
  async getDashboardStats(artistId: string): Promise<SonicWorldDashboardStats>
  async getGenreDistribution(artistId: string): Promise<GenreDistributionEntry[]>
}
```

The service:
1. Verifies `creative_session` exists and belongs to `artistId` (ownership check)
2. Fetches the existing Phase 1 `song_blueprint` for the session
3. Calls `computeSonicWorld(input)` — pure engine call
4. Persists result to `sonic_world_blueprints`
5. Updates `artist_memory` with genre and sonic mode patterns
6. Logs activity via `logActivity()`
7. Returns formatted response

---

## 4. FRONTEND ARCHITECTURE

### New Page

```
frontend/src/pages/SonicWorld.tsx
```

Accessible at route `/sonic-world`. This is a **dedicated immersive page**, not a panel within Music Intelligence. The Music Intelligence page gains a "Generate Sonic World" CTA button on any session row, which navigates to `/sonic-world?sessionId=<id>`.

### Component Structure

```
frontend/src/pages/SonicWorld.tsx
frontend/src/components/sonic-world/
├── SonicWorldHeader.tsx           ← Session context strip (emotion, BPM, key from Phase 1)
├── SonicWorldModeSelector.tsx     ← 7-mode selector with cinematic visual feedback
├── GenreDNAPanel.tsx              ← Dimension 1 display card
├── InstrumentationPanel.tsx       ← Dimension 2 display card
├── VocalEnergyPanel.tsx           ← Dimension 3 display card
├── CinematicEnvironmentPanel.tsx  ← Dimension 4 display card
├── RhythmIntelligencePanel.tsx    ← Dimension 5 display card
├── HarmonicEmotionPanel.tsx       ← Dimension 6 display card
├── HookStrategyPanel.tsx          ← Dimension 7 display card
├── ProductionDensityPanel.tsx     ← Dimension 8 display card
├── ProducerBriefPanel.tsx         ← Full narrative summary card (full width)
├── SonicWorldGenerateForm.tsx     ← Input form (mode, genre preference, ref artists)
├── SonicWorldBlueprintHistory.tsx ← Version history list
└── CoherenceScoreBadge.tsx        ← Visual coherence indicator
```

### Page Layout

```
┌─────────────────────────────────────────────────────────────┐
│  SONIC WORLD ENGINE                                          │
│  [Session: "Album Title — Grief/Heal Listener"]  [BPM: 68]  │ ← SonicWorldHeader
│  [Eb minor] [natural minor]                                  │
├─────────────────────────────────────────────────────────────┤
│  [MODE: CINEMATIC ▼]  [Genre: ...] [Ref Artists: ...]       │ ← SonicWorldGenerateForm
│  [GENERATE SONIC WORLD]                    [Coherence: 0.94]│
├──────────────┬──────────────┬──────────────┬────────────────┤
│ GENRE DNA    │ INSTRUMEN-   │ VOCAL ENERGY │ CINEMATIC ENV  │ ← Row 1 (4 cards)
│              │ TATION       │ DESIGN       │                │
├──────────────┼──────────────┼──────────────┼────────────────┤
│ RHYTHM       │ HARMONIC     │ HOOK         │ PRODUCTION     │ ← Row 2 (4 cards)
│ INTELLIGENCE │ EMOTION      │ STRATEGY     │ DENSITY        │
├─────────────────────────────────────────────────────────────┤
│                    PRODUCER BRIEF                           │ ← Full-width narrative
│  [Full paragraph sonic world description]                   │
├─────────────────────────────────────────────────────────────┤
│  BLUEPRINT HISTORY  [v3] [v2] [v1]                          │ ← Version history
└─────────────────────────────────────────────────────────────┘
```

### API Client Extension

```typescript
// frontend/src/api/client.ts — new section
export const sonicWorld = {
  generate:       (sessionId, body) => apiClient.post(`/sonic-world/sessions/${sessionId}/generate`, body),
  getLatest:      (sessionId) => apiClient.get(`/sonic-world/sessions/${sessionId}/blueprint`),
  getHistory:     (sessionId) => apiClient.get(`/sonic-world/sessions/${sessionId}/blueprints`),
  dashboard:      (artistId?) => apiClient.get('/sonic-world/dashboard', { params: { artistId } }),
}
```

---

## 5. STATE MANAGEMENT

### New Zustand Store

```typescript
// frontend/src/store/useSonicWorldStore.ts

interface SonicWorldStore {
  // Session context (loaded from Music Intelligence)
  activeSessionId: string | null;
  activeSession: CreativeSession | null;
  phase1Blueprint: SongBlueprint | null;

  // Generation form state
  sonicWorldMode: SonicWorldMode;
  genrePreference: string;
  referenceArtists: string[];

  // Blueprint state
  currentBlueprint: SonicWorldBlueprint | null;
  blueprintHistory: SonicWorldBlueprint[];

  // Loading states (granular — each panel can show its own skeleton)
  isGenerating: boolean;
  isLoadingHistory: boolean;

  // Dashboard stats
  dashboardStats: SonicWorldDashboardStats | null;

  // Actions
  setActiveSession: (sessionId: string) => void;
  setSonicWorldMode: (mode: SonicWorldMode) => void;
  setGenrePreference: (genre: string) => void;
  addReferenceArtist: (artist: string) => void;
  removeReferenceArtist: (artist: string) => void;
  generateBlueprint: () => Promise<void>;
  loadBlueprintHistory: (sessionId: string) => Promise<void>;
  selectHistoricalBlueprint: (blueprintId: string) => void;
  reset: () => void;
}
```

### State Integration Pattern

The Sonic World page is always entered from a Music Intelligence session. State flow:

1. User clicks "Generate Sonic World" on a session row in `/music-intelligence`
2. Navigate to `/sonic-world?sessionId=<id>`
3. `SonicWorld.tsx` reads `sessionId` from query params
4. Calls `setActiveSession(sessionId)` which loads session + Phase 1 blueprint
5. User adjusts mode/genre/references
6. Calls `generateBlueprint()` which POSTs to API and updates `currentBlueprint`

No circular dependencies between `useSonicWorldStore` and `useMusicIntelligenceStore`. The Sonic World store fetches its own copy of session data.

---

## 6. DATABASE SCHEMA CHANGES

### Migration File

`backend/drizzle/0013_sonic_world_engine.sql`

### New Enum

```sql
CREATE TYPE sonic_world_mode AS ENUM (
  'dark',
  'atmospheric',
  'cinematic',
  'raw',
  'transcendent',
  'anthemic',
  'intimate'
);
```

### New Table: sonic_world_blueprints

```sql
CREATE TABLE IF NOT EXISTS sonic_world_blueprints (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id                  UUID NOT NULL REFERENCES creative_sessions(id) ON DELETE CASCADE,
  artist_id                   UUID NOT NULL REFERENCES artist_profiles(id) ON DELETE CASCADE,
  phase1_blueprint_id         UUID REFERENCES song_blueprints(id) ON DELETE SET NULL,

  -- World mode
  sonic_world_mode            sonic_world_mode NOT NULL DEFAULT 'cinematic',

  -- Dimension 1: Genre DNA
  genre_primary               TEXT NOT NULL,
  genre_sub_blend             TEXT NOT NULL,
  genre_lineage               TEXT NOT NULL,
  sonic_references            TEXT NOT NULL,

  -- Dimension 2: Instrumentation Architecture
  core_instruments            TEXT NOT NULL,
  instrument_roles            TEXT NOT NULL,
  layering_strategy           TEXT NOT NULL,
  production_technique        TEXT NOT NULL,

  -- Dimension 3: Vocal Energy Design
  vocal_style                 TEXT NOT NULL,
  vocal_delivery_intensity    TEXT NOT NULL,
  harmonic_stacking           TEXT NOT NULL,
  vocal_presence              TEXT NOT NULL,

  -- Dimension 4: Cinematic Environment
  sonic_landscape             TEXT NOT NULL,
  spatial_feel                TEXT NOT NULL,
  reverb_character            TEXT NOT NULL,
  sonic_color_palette         TEXT NOT NULL,

  -- Dimension 5: Rhythm Intelligence
  groove_feel                 TEXT NOT NULL,
  rhythmic_pattern            TEXT NOT NULL,
  syncopation_level           TEXT NOT NULL,
  pocket_descriptor           TEXT NOT NULL,

  -- Dimension 6: Harmonic Emotion System
  chord_function_map          TEXT NOT NULL,
  tension_resolution          TEXT NOT NULL,
  harmonic_rhythm             TEXT NOT NULL,
  emotional_progression_arc   TEXT NOT NULL,

  -- Dimension 7: Hook Strategy
  hook_placement              TEXT NOT NULL,
  payoff_structure            TEXT NOT NULL,
  memorability_approach       TEXT NOT NULL,
  sonic_signature             TEXT NOT NULL,

  -- Dimension 8: Production Density
  arrangement_density         TEXT NOT NULL,
  frequency_range             TEXT NOT NULL,
  mix_balance                 TEXT NOT NULL,
  sonic_space                 TEXT NOT NULL,

  -- Assembly
  producer_brief              TEXT,
  coherence_score             NUMERIC(3, 2),

  -- Optional inputs stored for reproducibility
  genre_preference_input      TEXT,
  reference_artists_input     JSONB DEFAULT '[]'::jsonb,

  -- Metadata
  engine_version              TEXT NOT NULL DEFAULT 'v2',
  created_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_swb_session_id   ON sonic_world_blueprints(session_id);
CREATE INDEX idx_swb_artist_id    ON sonic_world_blueprints(artist_id);
CREATE INDEX idx_swb_genre        ON sonic_world_blueprints(genre_primary);
CREATE INDEX idx_swb_mode         ON sonic_world_blueprints(sonic_world_mode);
CREATE INDEX idx_swb_created_at   ON sonic_world_blueprints(created_at DESC);
```

### artist_memory Table Extension

The existing `artist_memory` table gains two new JSONB columns:

```sql
ALTER TABLE artist_memory
  ADD COLUMN IF NOT EXISTS preferred_genres     JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS preferred_sonic_modes JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS sonic_world_count    INTEGER DEFAULT 0;
```

### Drizzle ORM Schema Addition

New schema definition added to `backend/src/db/schema.ts`:

```typescript
export const sonicWorldModeEnum = pgEnum('sonic_world_mode', [
  'dark', 'atmospheric', 'cinematic', 'raw', 'transcendent', 'anthemic', 'intimate'
]);

export const sonicWorldBlueprints = pgTable('sonic_world_blueprints', {
  id:                        uuid('id').primaryKey().defaultRandom(),
  sessionId:                 uuid('session_id').notNull().references(() => creativeSessions.id, { onDelete: 'cascade' }),
  artistId:                  uuid('artist_id').notNull().references(() => artistProfiles.id, { onDelete: 'cascade' }),
  phase1BlueprintId:         uuid('phase1_blueprint_id').references(() => songBlueprints.id, { onDelete: 'set null' }),
  sonicWorldMode:            sonicWorldModeEnum('sonic_world_mode').notNull().default('cinematic'),
  // ... all 32 text fields ...
  producerBrief:             text('producer_brief'),
  coherenceScore:            numeric('coherence_score', { precision: 3, scale: 2 }),
  genrePreferenceInput:      text('genre_preference_input'),
  referenceArtistsInput:     jsonb('reference_artists_input').default([]),
  engineVersion:             text('engine_version').notNull().default('v2'),
  createdAt:                 timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
```

---

## 7. API CONTRACT DESIGN

### Base Path

`/api/sonic-world`

All routes require JWT authentication via the existing `authenticate` middleware.

### Endpoint Definitions

#### POST `/api/sonic-world/sessions/:sessionId/generate`

Generates a new Sonic World Blueprint for an existing creative session. The session must belong to the authenticated artist.

**Request Body (Zod validated):**
```typescript
{
  sonicWorldMode?: SonicWorldMode;      // default: 'cinematic'
  genrePreference?: string;             // freetext, max 50 chars
  referenceArtists?: string[];          // max 3 items, each max 50 chars
}
```

**Response `200 OK`:**
```typescript
{
  success: true,
  data: {
    blueprint: SonicWorldBlueprint,  // full 32-field output + metadata
    session: {                        // phase 1 context
      id: string, name: string, emotion: string, intention: string,
      bpm: number, musicalKey: string, scale: string
    }
  }
}
```

**Errors:**
- `404` — session not found or not owned by artist
- `409` — session has no Phase 1 blueprint (must compute Phase 1 first)
- `500` — computation failure

#### GET `/api/sonic-world/sessions/:sessionId/blueprint`

Returns the most recent Sonic World Blueprint for the session.

**Response `200 OK`:** `{ success: true, data: SonicWorldBlueprint | null }`

#### GET `/api/sonic-world/sessions/:sessionId/blueprints`

Returns all Sonic World Blueprint versions for the session, newest first.

**Query params:** `limit?: number` (default 10, max 50)

**Response `200 OK`:** `{ success: true, data: SonicWorldBlueprint[] }`

#### GET `/api/sonic-world/dashboard`

Returns aggregate stats for the artist's Sonic World usage.

**Query params:** `artistId?: string`

**Response `200 OK`:**
```typescript
{
  success: true,
  data: {
    totalBlueprints: number,
    topGenres: { genre: string, count: number }[],       // top 5
    sonicModeDistribution: { mode: string, count: number }[],
    recentBlueprints: SonicWorldBlueprintSummary[],       // last 5
    avgCoherenceScore: number
  }
}
```

### Zod Validation Schemas

```typescript
// sonic-world.schema.ts

export const generateSonicWorldSchema = z.object({
  sonicWorldMode: z.enum(['dark','atmospheric','cinematic','raw','transcendent','anthemic','intimate']).optional(),
  genrePreference: z.string().max(50).optional(),
  referenceArtists: z.array(z.string().max(50)).max(3).optional(),
});

export const sonicWorldQuerySchema = z.object({
  artistId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});
```

### HTTP Status Codes

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 400 | Validation failure (Zod error) |
| 401 | No/invalid JWT |
| 403 | Session belongs to different artist |
| 404 | Session or blueprint not found |
| 409 | Prerequisite (Phase 1 blueprint) missing |
| 500 | Engine computation failure |

---

## 8. MODULAR INTELLIGENCE PIPELINE

### Pipeline Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  INPUT LAYER                                                      │
│  emotion + intention + listenerTransformation + story             │
│  + sonicWorldMode + genrePreference + referenceArtists            │
│  + bpm + musicalKey + scale  (from Phase 1 blueprint)             │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 1: INPUT ENRICHMENT                                        │
│  ├─ storyHash(story)       → deterministicVarianceKey: number    │
│  ├─ emotion + intention    → emotionalArchetype: string          │
│  └─ sonicWorldMode         → modeModifier: ModeModifier          │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 2: PHASE 1 BLUEPRINT (already computed, passed in)         │
│  bpm, musicalKey, scale, atmosphere, cadenceEnergy,              │
│  chordDirection, vocalEnergy, hookIntensity                       │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 3: DIMENSION COMPUTATION (8 parallel computations)         │
│  All engines receive: { emotion, intention, transformation,       │
│    storyHash, sonicWorldMode, bpm, scale, genrePreference }       │
│                                                                   │
│  ├─ genre-dna.engine         → GenreDNA                          │
│  ├─ instrumentation.engine   → InstrumentationArch               │
│  ├─ vocal-energy.engine      → VocalEnergyDesign                 │
│  ├─ cinematic-env.engine     → CinematicEnvironment              │
│  ├─ rhythm.engine            → RhythmIntelligence                │
│  ├─ harmonic-emotion.engine  → HarmonicEmotionSystem             │
│  ├─ hook-strategy.engine     → HookStrategy                      │
│  └─ production-density.engine → ProductionDensity                │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 4: COHERENCE ENFORCEMENT                                   │
│  coherence.engine checks cross-dimension contradictions:         │
│  ├─ BPM vs groove feel consistency                               │
│  ├─ Scale vs harmonic system alignment                           │
│  ├─ Production density vs instrumentation count                  │
│  ├─ Vocal energy vs vocal design alignment                       │
│  └─ Generates coherence_score (0.00–1.00)                        │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 5: PRODUCER BRIEF ASSEMBLY                                 │
│  producer-brief.assembler.ts                                     │
│  Template-driven narrative paragraph from all 8 dimensions       │
│  Output: 3–5 sentence sonic world description in producer voice  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  OUTPUT: SonicWorldOutput (32 fields + brief + coherence score)  │
└─────────────────────────────────────────────────────────────────┘
```

### Dimension Table Structure (per engine)

Each engine's table follows this pattern:

```typescript
// Example: genre-dna.table.ts
interface GenreDNAEntry {
  // Indexed by emotion
  emotions: EmotionType[];
  // Base output
  primary: string;
  subBlend: string;
  lineage: string;
  // Variants (indexed by storyHash % variants.length)
  sonicReferenceVariants: string[];
  // Mode overrides
  modeOverrides: Partial<Record<SonicWorldMode, Partial<GenreDNAEntry>>>;
  // Intention modifiers
  intentionMods: Partial<Record<IntentionType, { primarySuffix?: string }>>;
}
```

### Coherence Rules

The coherence engine enforces these cross-dimension rules:

| Rule | Check |
|------|-------|
| BPM-Groove | BPM > 100 → groove should not be "half-time, laid back" |
| Scale-Harmony | Minor scale → harmonic system should not suggest "major II–V–I" without modifier |
| Density-Instruments | "sparse" density → core instruments count should not exceed 4 |
| Vocal-Energy | Phase 1 "whispered" vocal energy → vocal design should not be "aggressive delivery" |
| Mode-Environment | "raw" mode → cinematic environment should not be "lush orchestral" |

Violations reduce coherence score by 0.05–0.15 each. Perfect coherence is 1.00. Score below 0.70 triggers a warning flag in the response (not an error — the blueprint is still valid).

---

## 9. SCALABILITY CONSIDERATIONS

### Computation

All Sonic World computation is synchronous and in-process. Benchmark target: < 5ms per blueprint generation (no I/O, no network calls). This makes the endpoint effectively compute-bound, with negligible latency overhead vs. Phase 1.

At scale (1000 concurrent users), the engine adds no meaningful load. The bottleneck remains DB write throughput for `sonic_world_blueprints`.

### Database

- **Write pattern:** One row per blueprint generation. Expected: 5–20 blueprints per session lifetime.
- **Read pattern:** `getLatest` is the hot path (reads 1 row by `session_id` ordered by `created_at DESC`). Covered by `idx_swb_session_id` + partial sort.
- **Storage estimate:** ~1KB per row (all TEXT fields, moderate length). 1M blueprints ≈ 1GB. Not a concern for current scale.
- **Index strategy:** Compound index `(session_id, created_at DESC)` for the hot-path `getLatest` query.
- **Query budget:** All service queries must complete in < 50ms at p99.

### API

- **Rate limiting:** The generate endpoint inherits the existing API rate limiter. No special per-endpoint limiting needed in MVP.
- **Caching:** Blueprint results are immutable once written. Client-side caching of `getLatest` by `sessionId` is safe and recommended.
- **Pagination:** `getBlueprintHistory` is paginated (default 10, max 50) to prevent large payload returns on heavily-versioned sessions.

### Frontend

- **Skeleton loading:** Each of the 8 dimension panels renders a skeleton while the API call is in-flight. The page is never blank.
- **No streaming required:** The full blueprint is returned in a single API response. No SSE or WebSocket needed.
- **Bundle impact:** All new components should be lazy-loaded under the `/sonic-world` route to avoid impacting initial dashboard load.

---

## 10. FUTURE COMPATIBILITY

The following future features are explicitly designed-for but not implemented in Phase 2.

### WAV Analysis Integration

The `sonic_world_blueprints` table includes no audio fields today, but the schema is designed to receive them:
- Future: `audio_analysis_id UUID REFERENCES audio_analyses(id)` (nullable FK added in migration)
- Future: `waveform_match_score NUMERIC(3,2)` — how well a produced audio file matches the blueprint
- The engine's output vocabulary is intentionally chosen to map to audio analysis dimensions (BPM ↔ tempo detection, key ↔ pitch class detection, groove feel ↔ rhythm complexity)

### MIDI Generation

The Harmonic Emotion System dimension outputs a `chord_function_map` (e.g., `"i – VI – III – VII"`) in a structured enough format to be parsed by a future MIDI generation layer. The migration should preserve this field as TEXT (not normalized into a chord table) until the MIDI layer design is finalized.

### DAW Export

The Producer Brief and all dimension fields are designed to be exportable as a human-readable creative brief (Markdown, PDF). A future DAW export layer would:
1. Parse `chordFunctionMap` → MIDI note events
2. Parse `coreInstruments` + `instrumentRoles` → track template
3. Parse `bpm` → project tempo
4. Export as `.als` (Ableton), `.logicx` template, or Universal DAW XML

The current schema stores all needed fields. No schema changes required for DAW export.

### Artist Identity Memory

The `artist_memory` table already has `preferred_genres` and `preferred_sonic_modes` (JSONB arrays, added in this migration). Future identity memory features:
- Genre affinity scoring across all sessions
- Sonic mode evolution tracking (how artist mood evolves over time)
- Stylistic consistency flagging ("you've moved away from your signature dark/cinematic mode")

### Sync Intelligence

The Genre DNA dimension's `sonicReferences` and `genrePrimary` fields are directly usable by a sync licensing intelligence layer. Future sync features:
- Match blueprints to sync brief requirements (genre, mood, BPM range)
- Score a blueprint's suitability for trailer vs. TV vs. ad sync
- `sync_score` column on `sonic_world_blueprints` (nullable, computed by sync intelligence module)
