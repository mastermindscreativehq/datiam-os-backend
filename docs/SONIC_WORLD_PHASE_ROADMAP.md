# SONIC WORLD ENGINE — PHASE ROADMAP
**DATIAM OS | Phase 2 Implementation Plan**
**Version:** 1.0.0
**Status:** Architecture Review — Pre-Implementation
**Date:** 2026-05-27

---

## OVERVIEW

This roadmap defines the exact scope boundaries for each implementation phase. Nothing in a later phase should be started until the prior phase is stable. Each phase has explicit entry criteria (what must be true before starting) and exit criteria (what must be true before declaring done).

---

## PHASE DEPENDENCY CHAIN

```
DMIE Phase 1 (COMPLETE)
        │
        ▼
Sonic World MVP (Phase 2 — This Document)
        │
        ├── Phase 2A: Genre DNA Depth + Instrumentation Library
        │
        └── Phase 2B: Sync Intelligence + Artist Identity Memory
                │
                └── Phase 3: WAV Analysis + MIDI + DAW Export (Future)
```

---

## SONIC WORLD MVP

**Goal:** A fully functional Sonic World Engine that takes an existing creative session and generates a complete 16-dimension blueprint with producer brief.

**Entry Criteria:**
- DMIE Phase 1 is stable in production (creative sessions, song blueprints, artist memory all working)
- Architecture documents (this set) reviewed and approved
- Bug ledger sign-off items resolved

**Exit Criteria:**
- All 8 dimension engines computing output for all 12 emotions
- `sonic_world_blueprints` table live in production DB
- `/api/sonic-world` endpoints passing integration tests
- `/sonic-world` page rendering on desktop and mobile
- Session ownership security check verified (API-01)
- Coherence engine producing scores

---

### MVP — Backend Work

**M-BE-01** — Migration 0013
- Add `sonic_world_mode` enum to PostgreSQL
- Create `sonic_world_blueprints` table with all 32 dimension columns
- Add Phase 1 snapshot columns (`phase1_bpm`, `phase1_musical_key`, `phase1_scale`)
- Add `preferred_genres`, `preferred_sonic_modes`, `sonic_world_count` to `artist_memory`
- Add all required indexes including composite `(artist_id, genre_primary)`
- Fully idempotent (all `IF NOT EXISTS`)

**M-BE-02** — Sonic World Engine Module
- `sonic-world-engine/index.ts` — entry point, `computeSonicWorld(input)` function
- `genre-dna.engine.ts` — full table for all 12 emotions × intention/transformation modifiers
- `instrumentation.engine.ts` — full table for all 12 emotions
- `vocal-energy.engine.ts` — full table for all 12 emotions
- `cinematic-env.engine.ts` — full table for all 12 emotions
- `rhythm.engine.ts` — full table for all 12 emotions
- `harmonic-emotion.engine.ts` — full table for all 12 emotions
- `hook-strategy.engine.ts` — full table for all 12 emotions
- `production-density.engine.ts` — full table for all 12 emotions
- `coherence.engine.ts` — 5 cross-dimension rules, produces 0–1 score
- `producer-brief.assembler.ts` — template-driven narrative, 150–250 words
- `sonic-world-modes.table.ts` — mode modifier vocabulary per each of 7 modes

**M-BE-03** — Sonic World Service + Controller + Routes
- `sonic-world.service.ts` with session ownership verification (AR-01 / API-01)
- `sonic-world.controller.ts` with proper error handling
- `sonic-world.routes.ts` with all 4 endpoints
- `sonic-world.schema.ts` with Zod validation for all inputs
- `SONIC_WORLD_ENABLED` env var feature gate in route handler
- Activity logging on blueprint generation

**M-BE-04** — Route Registration
- Register `/api/sonic-world` in `app.ts`
- Add to existing API documentation

**M-BE-05** — Startup Validation
- `validateDimensionTableCoverage()` called on server boot
- Asserts all 12 emotions have entries in all 8 dimension tables
- Logs a critical warning (not a crash) if any gap found

**M-BE-06** — Integration Tests
- Test: generate blueprint for session owned by artist → 200 + valid blueprint
- Test: generate blueprint for session NOT owned by artist → 403
- Test: generate blueprint for session with no Phase 1 blueprint → 409
- Test: all 12 emotions produce non-empty output in all 8 dimensions
- Test: coherence score is between 0.00 and 1.00
- Test: dashboard stats query returns in < 50ms

---

### MVP — Frontend Work

**M-FE-01** — `useSonicWorldStore.ts`
- Zustand store with all state slices defined in architecture doc
- `reset()` called on `sessionId` change
- No persistence (session state, not persisted state)

**M-FE-02** — API Client Extension
- Add `sonicWorld` object to `frontend/src/api/client.ts`
- All 4 endpoints wired

**M-FE-03** — `SonicWorld.tsx` Page
- Route at `/sonic-world` with `?sessionId=` query param handling
- `useEffect` on sessionId change loads session + Phase 1 blueprint
- Default view: Producer Brief + Genre DNA + Instrumentation (primary view)
- "Show all dimensions" toggle reveals remaining 5 panels
- Skeleton loading on all panels
- Error state handling (session not found, no Phase 1 blueprint)

**M-FE-04** — Dimension Panel Components (8)
- Each panel: consistent card layout with dimension name header, 4 sub-fields
- Field label + value layout (not prose — scannable)
- Copy-to-clipboard on individual fields
- Subtle hover state on fields

**M-FE-05** — Producer Brief Panel
- Full-width card
- Cinematic typography (larger, letterbox-style)
- Copy entire brief to clipboard

**M-FE-06** — Sonic World Generate Form
- `SonicWorldModeSelector.tsx` — 7 horizontal pill chips with icons
- Genre preference: freetext input, 50-char max
- Reference artists: up to 3 tag-input chips
- Generate button with loading spinner
- Form disabled while generating

**M-FE-07** — Session Header
- Displays Phase 1 context: emotion badge, intention, BPM, key, scale
- Pulled from Phase 1 snapshot stored on blueprint (not live session)
- "Back to Music Intelligence" link

**M-FE-08** — Blueprint History
- Simple list: version number, timestamp, sonic mode badge
- Click to load historical blueprint (replaces current view)
- Visual indicator for currently displayed version

**M-FE-09** — Navigation Link
- Add "Sonic World" entry to existing sidebar/nav
- Add "Generate Sonic World →" CTA to session rows in `MusicIntelligence.tsx`

**M-FE-10** — Security Audit
- Verify no `dangerouslySetInnerHTML` used for any blueprint fields
- Verify all text is rendered as React text nodes

---

### MVP — Out of Scope (Do Not Build)

- Genre browsing / genre library page
- Instrumentation library browser
- Blueprint comparison (side-by-side diff)
- Export to PDF or Markdown
- Sharing blueprints publicly
- Producer brief quality rating
- Artist identity memory deep patterns
- Sync scoring

---

## PHASE 2A: GENRE DNA DEPTH + INSTRUMENTATION LIBRARY

**Entry Criteria:** Sonic World MVP stable for 2+ weeks in production. User feedback collected.

**Goal:** Elevate the Genre DNA and Instrumentation dimensions from single-value outputs to navigable, detail-rich intelligence systems.

---

### Phase 2A Features

**2A-01 — Genre Library System**
- New DB table: `genre_library`
  - `id`, `name`, `sub_genres` (JSONB array), `era_origin`, `sonic_characteristics` (TEXT), `reference_artists` (JSONB array), `bpm_range_min`, `bpm_range_max`, `emotional_affinities` (JSONB array of EmotionType)
- Seed with 50+ genres covering all primary music markets
- API: `GET /api/sonic-world/genre-library` — paginated list with search
- API: `GET /api/sonic-world/genre-library/:id` — genre detail
- Frontend: Genre DNA panel gains "Explore Genre" link → Genre Detail page or modal
- Genre DNA engine uses library as lookup source for deeper output

**2A-02 — Instrumentation Library**
- New DB table: `instrument_library`
  - `id`, `name`, `category` (bass/keys/drums/strings/...), `sonic_character` (TEXT), `genre_affinities` (JSONB), `emotion_affinities` (JSONB), `mix_role` (TEXT)
- Seed with 100+ instruments
- Instrumentation engine returns structured output: array of `{ instrument, role, mixRole }` instead of TEXT
- Frontend: Instrumentation panel renders as a visual role map (rhythm section / harmonic layer / texture layer / top-line)
- Schema: `instrument_roles` column changes from TEXT to JSONB structure (migration 0014)

**2A-03 — Genre Preference Auto-Suggest**
- Frontend: genre preference input gains auto-suggest from `genre_library.name` + `sub_genres` values
- Replaces raw freetext with constrained-but-flexible input (user can still type anything; suggestions are hints)

**2A-04 — Blueprint Tagging**
- Add `tags` JSONB column to `sonic_world_blueprints`
- Users can add tags (e.g., "album intro", "single candidate", "sync pitch")
- Filter blueprints by tag in history view

---

## PHASE 2B: SYNC INTELLIGENCE + ARTIST IDENTITY MEMORY

**Entry Criteria:** Phase 2A shipped and stable. Artist_memory data has meaningful volume (30+ blueprints per artist typical).

**Goal:** Activate the sync intelligence and artist identity systems that the current architecture seeds.

---

### Phase 2B Features

**2B-01 — Sync Intelligence Scoring**
- New computed field: `sync_score` on `sonic_world_blueprints` (computed post-generation, not in main pipeline)
- Sync scoring engine: maps genre + BPM range + emotion + sonic mode → sync category suitability scores
- Sync categories: `trailer_epic`, `tv_drama`, `tv_comedy`, `ad_product`, `ad_emotion`, `film_indie`, `game_ambient`
- API: `GET /api/sonic-world/sessions/:sessionId/sync-scores` — returns suitability for each category
- Frontend: New "Sync Potential" card added below Producer Brief showing sync category scores as a visual grid

**2B-02 — Artist Identity Memory Deep Patterns**
- New API: `GET /api/sonic-world/artist-identity`
- Returns: dominant genre, sonic mode evolution over time (chronological list), emotional range breadth, BPM center of gravity, recurring sonic signatures
- Frontend: New "Artist Identity" panel in the Sonic World page (or its own page under `/artist-identity`)
- Uses `artist_memory` + `sonic_world_blueprints` aggregation query

**2B-03 — Blueprint Quality Feedback**
- Add `quality_rating` (1–5 integer, nullable) to `sonic_world_blueprints`
- Frontend: Thumbs up / thumbs down on Producer Brief panel (maps to 5 / 1)
- Dashboard: shows avg quality score per genre / sonic mode (data quality signal for table improvement)

**2B-04 — Session Series Intelligence**
- Detect when multiple sessions share emotional arcs (e.g., 3 sessions with "grief → peace" transformation)
- Surface as "Arc Pattern" insight: "Your last 3 sessions follow a healing arc"
- Basis for future album concept intelligence

---

## DELAYED INFRASTRUCTURE

These items are pre-designed in the architecture (schema is forward-compatible) but explicitly deferred past Phase 2B.

### DI-01 — WAV Analysis Pipeline

**Deferred to Phase 3**
**Requires:** Audio processing backend (Python service or Node.js audio library), file storage (S3/Supabase Storage)

What's needed:
- Audio upload endpoint with file validation
- Audio analysis service: BPM detection, key detection, spectral analysis, energy profile
- New table: `audio_analyses` with FK to `songs` and `sonic_world_blueprints`
- Blueprint matching: compare analyzed audio to blueprint spec, compute match score

Schema compatibility: `sonic_world_blueprints` has nullable `phase1_blueprint_id` — extend to nullable `audio_analysis_id`.

---

### DI-02 — MIDI Generation

**Deferred to Phase 3**
**Requires:** MIDI library integration (Tone.js or server-side `midi` package), DAW export format research

What's needed:
- Parse `chord_function_map` field into structured chord notation
- Generate MIDI note events from chord progression + BPM
- New endpoint: `GET /api/sonic-world/sessions/:id/export/midi` → returns `.mid` file

---

### DI-03 — DAW Export

**Deferred to Phase 3+**
**Requires:** MIDI (DI-02) complete, DAW format research, potentially partnerships

Scope:
- Ableton Live `.als` template generation
- Logic Pro session template
- Universal DAW XML (Reaper, Studio One)

---

### DI-04 — DB-Backed Dimension Tables

**Deferred to Phase 3**
**Requires:** Admin CMS or internal tool

Current dimension tables are hardcoded TypeScript. Moving to DB-backed tables enables:
- Non-developer content updates
- A/B testing different mappings
- Quality scoring from feedback data

---

## FUTURE EXPANSION PLACEHOLDERS

These are conceptual features with no committed timeline. Architecture is designed to not obstruct them.

| Feature | Architecture Impact |
|---------|-------------------|
| Multi-language output | Add `output_language` field to generate request; dimension tables gain localized variants |
| Collaborative sessions | `creative_sessions.collaborators` JSONB array; blueprint generation requires contributor resolution |
| Playlist intelligence | Cross-session blueprint grouping; "album sonic coherence" score |
| Fan-song matching | Connect `fan_intelligence` module to `sonic_world_blueprints` via emotion/genre affinity scoring |
| Public blueprint sharing | Add `is_public` boolean to `sonic_world_blueprints`; public share URL |
| Blueprint NFT/provenance | Hash-based blueprint fingerprint; timestamp certificate |
| Real-time DSP preview | WebAudio API integration; requires significant audio infrastructure |
| Stem generation | Requires AI music generation API (out of scope for intelligence platform) |
| Mastering recommendations | EQ/compression targets derived from production density + frequency range fields |

---

## NON-MVP FEATURES (Explicitly Excluded)

The following features have been requested or are implied by the system's direction but are explicitly **not** in any current phase. They will only be considered after the features above are stable.

| Feature | Reason Excluded |
|---------|----------------|
| AI audio generation | Product positioning: this is intelligence, not generation |
| Stem generation | Requires audio synthesis; different infrastructure category |
| Real-time DSP | WebAudio complexity is a separate engineering workstream |
| Mastering chain recommendations | Too close to audio processing; no data to base recommendations on yet |
| Direct sync licensing submission | Requires sync partner API agreements and legal review |
| Community/social features | Out of scope for v1 OS; separate product decision required |
| Mobile native app | Web-first strategy; native after web is stable |
| Offline mode | Requires service worker + IndexedDB architecture; not needed for current usage |
| Voice input for story context | Interesting but adds significant infra complexity |
| Video sync analysis | WAV analysis must come first |

---

## TIMELINE GUIDANCE

This roadmap does not include specific dates (they belong in the project management system). However, complexity guidance:

| Phase | Estimated Backend Complexity | Estimated Frontend Complexity |
|-------|------------------------------|-------------------------------|
| MVP | High (8 engine tables, 5 services) | High (8 panels, new store, new page) |
| Phase 2A | Medium (2 new DB tables, library APIs) | Medium (2 enhanced panels, genre search) |
| Phase 2B | Medium (3 features, 1 new store slice) | Medium (2 new panels, identity view) |
| Phase 3 (WAV/MIDI) | Very High (audio pipeline) | Medium (upload UI, analysis display) |
