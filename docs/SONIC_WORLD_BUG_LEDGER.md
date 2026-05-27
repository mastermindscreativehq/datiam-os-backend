# SONIC WORLD ENGINE — PRE-IMPLEMENTATION BUG LEDGER
**DATIAM OS | Phase 2 Risk Register**
**Version:** 1.0.0
**Status:** Architecture Review — Pre-Implementation
**Date:** 2026-05-27

---

## PURPOSE

This ledger identifies architecture risks, performance bottlenecks, and technical hazards **before** implementation begins. Every item here is a known risk that must be actively managed. Items are assigned a severity level (Critical / High / Medium / Low) and a mitigation strategy.

Items are not bugs — they are **predicted failure modes** based on architectural analysis of the design and the existing Phase 1 codebase.

---

## SEVERITY LEGEND

| Level | Meaning |
|-------|---------|
| **CRITICAL** | Will cause production failure or data loss if not addressed |
| **HIGH** | Will degrade user experience or system integrity significantly |
| **MEDIUM** | Will cause technical debt, performance issues, or UX problems |
| **LOW** | Acceptable risk; address in a future pass |

---

## SECTION 1: ARCHITECTURE RISKS

### AR-01 — Phase 1 / Phase 2 Blueprint Desync
**Severity:** HIGH
**Description:** A `creative_session` can have multiple `song_blueprints` (Phase 1 regenerations) and multiple `sonic_world_blueprints` (Phase 2 regenerations). There is no enforced FK that ties a specific Phase 2 blueprint to the Phase 1 blueprint it was generated from. The `phase1_blueprint_id` is nullable with `ON DELETE SET NULL`.

**Risk:** If the user regenerates their Phase 1 blueprint after generating a Phase 2 blueprint, the displayed Phase 1 data (BPM, key, scale) in the Sonic World page may no longer correspond to the Phase 2 output the user sees. A user could display a "grief / Eb minor" Phase 2 blueprint alongside a freshly regenerated "joy / G major" Phase 1 blueprint, which is incoherent.

**Mitigation:**
- When a Phase 2 blueprint is loaded, always render the Phase 1 context **from the stored snapshot** (`bpm`, `musicalKey`, `scale` stored on the session, not fetched live from `song_blueprints`)
- Display a warning badge if the session's most recent Phase 1 blueprint differs from the Phase 1 state at time of Phase 2 generation
- Add a `phase1_bpm`, `phase1_musical_key`, `phase1_scale` columns to `sonic_world_blueprints` as a snapshot

---

### AR-02 — No Canonical "Latest Blueprint" Cursor
**Severity:** MEDIUM
**Description:** Both `song_blueprints` (Phase 1) and `sonic_world_blueprints` (Phase 2) use `ORDER BY created_at DESC LIMIT 1` to get the "latest" blueprint. PostgreSQL timestamp resolution is microseconds, but in edge cases (two rapid regenerations in < 1ms, unlikely but theoretically possible), ordering could be ambiguous.

**Mitigation:**
- Add an `INTEGER` sequence column `version_number` to both blueprint tables, incremented per session via DB trigger or application-level counter
- `ORDER BY version_number DESC` is unambiguous

---

### AR-03 — Dimension Table Coverage Gaps
**Severity:** HIGH
**Description:** The intelligence engine must handle all 12 emotions × 8 intentions × 8 transformations × 7 sonic world modes = 5,376 possible input combinations. If any dimension table lacks an entry for a given emotion, the engine will either throw (uncaught key error) or silently return an empty string.

**Risk:** A release with incomplete dimension tables ships with a partially functional engine. Missing entries produce blank output fields, which are silently persisted to DB.

**Mitigation:**
- Each dimension engine must have exhaustive test coverage for all 12 emotions at minimum
- Add a startup validation pass: on server boot, run `validateDimensionTableCoverage()` which asserts that every `EmotionType` has a table entry in every engine
- CI test: for every engine, assert that `computeDimension({ emotion: e, ...defaults })` returns non-empty strings for all 12 emotion values

---

### AR-04 — Producer Brief Template Coverage
**Severity:** MEDIUM
**Description:** The producer brief assembler uses template strings that interpolate dimension outputs. If any dimension output contains unexpected characters (quotes, template delimiters), the brief could be malformed or truncated.

**Mitigation:**
- All dimension outputs must be sanitized before brief interpolation (strip quotes, newlines)
- The brief assembler should handle graceful fallback if any dimension field is empty

---

### AR-05 — artist_memory Upsert Race Condition
**Severity:** MEDIUM
**Description:** Phase 1 already has an `artist_memory` upsert on session creation. Phase 2 adds another upsert on blueprint generation. If two blueprint generations happen concurrently for the same artist, the JSONB append operations on `preferred_genres` and `preferred_sonic_modes` can produce duplicate entries.

**Risk:** `preferred_genres` array grows unbounded with duplicates; `sonic_world_count` increment can be lost.

**Mitigation:**
- Use PostgreSQL `jsonb_set` with deduplication, not simple array append
- `sonic_world_count` increment via `UPDATE artist_memory SET sonic_world_count = sonic_world_count + 1` (atomic, not read-modify-write)
- Cap JSONB arrays at 20 entries (matching Phase 1's `preferred_keys` cap of 10)

---

## SECTION 2: PERFORMANCE BOTTLENECKS

### PB-01 — Full Dimension Table Scan on Every Request
**Severity:** LOW
**Description:** The 8 dimension computation engines each look up their tables on every blueprint generation call. These are in-memory TypeScript objects (not DB queries), so this is fast, but if tables grow large (e.g., 500+ genre entries for comprehensive genre coverage), lookup performance could degrade.

**Mitigation:**
- Keep dimension tables as plain TypeScript objects (not Maps) for now — V8 object property access is O(1) for small objects
- Profile if table size exceeds 200 entries; switch to `Map<EmotionType, Entry>` lookup at that point
- No action needed for MVP

---

### PB-02 — N+1 Query in Dashboard Stats
**Severity:** HIGH
**Description:** A naive implementation of `getDashboardStats` could issue multiple queries: one for blueprint count, one for genre distribution, one for mode distribution, one for recent blueprints. This is an N+1 pattern.

**Mitigation:**
- Dashboard stats must be a **single SQL query** using CTEs (WITH clauses) or a single aggregation query with window functions
- Benchmark target: < 30ms for dashboard stats query

---

### PB-03 — Blueprint History Pagination Not Enforced
**Severity:** MEDIUM
**Description:** If `getBlueprintHistory` default limit is not enforced server-side, a session with 500+ blueprints (heavy tester or automation scenario) returns a 500KB+ payload.

**Mitigation:**
- Server-side hard cap: `LIMIT Math.min(limit ?? 10, 50)` — never allow unlimited queries
- Frontend renders max 20 history entries; "Load More" pattern if needed

---

### PB-04 — Missing DB Index for Genre Distribution Query
**Severity:** MEDIUM
**Description:** The genre distribution query (`GROUP BY genre_primary WHERE artist_id = ?`) requires a composite index on `(artist_id, genre_primary)` for efficient aggregation. Without it, this becomes a full table scan on `sonic_world_blueprints` as the table grows.

**Mitigation:**
- Add `CREATE INDEX idx_swb_artist_genre ON sonic_world_blueprints(artist_id, genre_primary)` in the migration

---

## SECTION 3: STATE EXPLOSION RISKS

### SE-01 — Multiple Blueprint Versions Loaded in Memory
**Severity:** MEDIUM
**Description:** `useSonicWorldStore` holds `currentBlueprint` (1 object) and `blueprintHistory` (array). If the user rapidly cycles through historical blueprints (selecting v1, v2, v3...), the store is updated on each click but the UI transitions are not debounced. With 50 history entries, this could trigger 50 rapid re-renders.

**Mitigation:**
- Selecting a historical blueprint is a local state switch only (no API call) — renders are cheap
- Debounce is not needed; this is not a concern at realistic usage volumes (< 20 history entries)
- Document as a non-issue

---

### SE-02 — Zustand Store Persisted Across Navigation
**Severity:** MEDIUM
**Description:** If `useSonicWorldStore` is not reset when navigating between sessions, stale blueprint data from session A can appear briefly while session B loads, causing a flash of incorrect content.

**Mitigation:**
- Call `reset()` action in `useEffect` on `sessionId` change in `SonicWorld.tsx`
- Show skeleton state while loading, not stale previous data

---

### SE-03 — Reference Artist Input Not Validated
**Severity:** MEDIUM
**Description:** The `referenceArtists` input is freetext. If a user enters 500-character strings, the `sonic_references` field in the blueprint will contain injected content.

**Risk:** Not a security issue (it's stored as user data), but it degrades producer brief quality and wastes DB storage.

**Mitigation:**
- Zod validation: `z.string().max(50)` per artist, max 3 entries
- Frontend input: character counter, enforced max length at input level
- Server: validation enforced even if frontend bypassed

---

## SECTION 4: RENDERING RISKS

### RR-01 — 8-Panel Grid Layout Collapse on Mobile
**Severity:** HIGH
**Description:** The 4×2 grid of dimension panels will collapse to a 1-column stack on mobile viewports. With 8 full panels + producer brief + header + history, the mobile scroll length becomes prohibitively long (estimated 15–20 screens of content).

**Mitigation:**
- Mobile layout: accordion/expand-collapse pattern instead of grid
- Default mobile view: show Producer Brief + Genre DNA + Instrumentation only; other dimensions collapsed
- "Show All Dimensions" toggle expands remaining panels
- See SONIC_WORLD_UI_PLAN.md for full responsive strategy

---

### RR-02 — Producer Brief Text Overflow
**Severity:** LOW
**Description:** The producer brief is a 3–5 sentence paragraph. On small cards or if the brief is poorly assembled, it can overflow its container or be truncated.

**Mitigation:**
- Producer brief panel is always full-width (never in the 4-column grid)
- CSS: `overflow: hidden; text-overflow: ellipsis` with an expand toggle for very long briefs
- Brief assembly should target 150–250 words maximum

---

### RR-03 — Skeleton State Mismatch
**Severity:** LOW
**Description:** If the skeleton component dimensions don't match the actual loaded content dimensions, the layout will shift on data load (Cumulative Layout Shift).

**Mitigation:**
- Skeleton cards must have fixed height matching the average loaded card height
- Use `min-height` on panel cards, not fixed height, to prevent overflow on content-heavy cards

---

### RR-04 — Coherence Score Badge Color Accessibility
**Severity:** MEDIUM
**Description:** The coherence score will likely be displayed as a color-coded badge (red/yellow/green). Color-only distinction fails WCAG 2.1 AA accessibility requirements.

**Mitigation:**
- Badge must include text value (e.g., "0.94 — Coherent") not just color
- Icon/symbol indicator alongside color for accessibility

---

## SECTION 5: DEPLOYMENT RISKS

### DR-01 — New Enum Migration Is Non-Reversible
**Severity:** HIGH
**Description:** Adding `sonic_world_mode` as a PostgreSQL enum is non-reversible without dropping and recreating the type. Adding new values to the enum later requires `ALTER TYPE ... ADD VALUE`, which cannot be done inside a transaction in PostgreSQL < 12 (Supabase uses Postgres 15+, so this is safe).

**Mitigation:**
- Document the enum values as stable/final for Phase 2
- Future mode additions use `ALTER TYPE sonic_world_mode ADD VALUE 'new_mode'` — confirm Supabase Postgres version supports this before adding
- Never remove enum values (would require a migration with temp column + backfill)

---

### DR-02 — Migration 0013 Runs on Existing Production DB
**Severity:** HIGH
**Description:** Migration 0013 adds a new table and new columns to `artist_memory`. The `ALTER TABLE artist_memory ADD COLUMN IF NOT EXISTS` is safe and non-locking on PostgreSQL for nullable columns. No risk.

However, if there is ever a previous failed migration (e.g., 0012 partially applied), the 0013 migration may fail with foreign key errors.

**Mitigation:**
- Verify migration 0012 is fully applied and all tables it creates (`creative_sessions`, `song_blueprints`, etc.) exist before deploying 0013
- Use `IF NOT EXISTS` on all `CREATE TABLE` statements (already in the design)

---

### DR-03 — Feature Flag Gap
**Severity:** LOW
**Description:** There is no feature flag system in DATIAM OS. The Sonic World Engine will be live as soon as deployed. If there is a computation bug in a dimension table, all users are affected immediately.

**Mitigation:**
- Add a simple `SONIC_WORLD_ENABLED=true` environment variable check in the route handler
- If `false`, routes return `503 Service Unavailable` with a clear message
- This is a minimal feature gate, not a full flag system

---

## SECTION 6: API RISKS

### API-01 — Unauthenticated Session Ownership Bypass
**Severity:** CRITICAL
**Description:** The generate endpoint receives `sessionId` as a URL parameter. If the service only checks `WHERE id = sessionId` without also checking `WHERE artist_id = <authenticated artist>`, any authenticated user can generate a blueprint for any session.

**Mitigation:**
- Service layer MUST include `WHERE session_id = ? AND artist_id = ?` on all session lookups
- This must be a code review checklist item before merge
- Add an integration test that verifies cross-artist access returns 403

---

### API-02 — Reference Artists Input as Attack Vector
**Severity:** MEDIUM
**Description:** `referenceArtists` is freetext that gets interpolated into the `sonicReferences` output field and potentially into the Producer Brief. Malicious input (SQL, script tags, special characters) should not be able to cause harm.

**Risk assessment:**
- SQL injection: Not possible (Drizzle ORM uses parameterized queries)
- XSS: Possible if frontend renders `sonicReferences` as `innerHTML` (it must not)
- Prompt injection: Not applicable — no LLM in the pipeline
- Storage: Field is sanitized by Zod max-length constraint

**Mitigation:**
- Frontend must render all blueprint text fields as text content, never `innerHTML`
- Backend: strip HTML tags from all freetext inputs (reference artists, genre preference) before engine use
- A simple `input.replace(/<[^>]*>/g, '').trim()` sanitizer on freetext fields in the service layer

---

### API-03 — Stale Blueprint Served as "Latest"
**Severity:** LOW
**Description:** `getLatestBlueprint` uses `ORDER BY created_at DESC LIMIT 1`. If a blueprint generation fails mid-write (e.g., DB timeout after partial insert), a corrupted partial row could be written with a recent timestamp, causing it to be served as "latest."

**Mitigation:**
- Blueprint writes are a single DB INSERT (not multi-step). Partial writes are prevented by PostgreSQL's transactional INSERT semantics — either the full row is written or nothing is.
- This is a non-issue with proper transaction handling.

---

## SECTION 7: FUTURE SCALING CONCERNS

### FS-01 — Dimension Table Maintenance Burden
**Severity:** MEDIUM
**Description:** The intelligence engine's quality is entirely dependent on the quality of the 8 dimension tables. Each table currently has 12 primary entries (one per emotion), with variants and modifiers. As the system grows (more emotions, more intents, genre sub-genres), maintaining 8 separate TypeScript table files becomes a significant manual effort.

**Future risk:** Stale tables — an "anxiety" entry written in Phase 2 may not reflect artistic evolution or user feedback patterns.

**Mitigation strategy for future:**
- Consider a DB-backed dimension table system in Phase 3 (admin-editable via CMS)
- Track which dimension field values appear most in high-coherence sessions (quality signal)
- Do not over-engineer this in MVP — tables will be small and manageable

---

### FS-02 — Blueprint Storage Growth
**Severity:** LOW
**Description:** The `sonic_world_blueprints` table can accumulate 32 text fields × ~50 chars average × N blueprints. At scale, this grows but is not a current concern (see scalability section in architecture doc).

**Future action:** Add a cleanup policy (e.g., keep last 10 blueprints per session; archive older ones to cold storage) if storage costs become significant.

---

### FS-03 — artist_memory JSONB Bloat
**Severity:** LOW
**description:** The `preferred_genres` and `preferred_sonic_modes` JSONB arrays are capped at 20 entries. Over time with no cleanup, these arrays will always contain the 20 most recent values but lose older pattern information.

**Future action:** Implement a weighted frequency counter (genre → score) instead of simple array in Phase 3's Artist Identity Memory system.

---

## SECTION 8: UI OVERLOAD CONCERNS

### UI-01 — 8 Panels + Brief Is Too Much Information at Once
**Severity:** HIGH
**Description:** Rendering all 8 dimension panels simultaneously presents ~32 text fields to the user at once. Even experienced producers will experience information overload. This is not a technical bug but a UX bug.

**Mitigation:**
- Design the UI as a **progressive disclosure system** (see SONIC_WORLD_UI_PLAN.md)
- Primary view: Producer Brief + Genre DNA + Instrumentation (the "what it sounds like" summary)
- Secondary view: All 8 dimensions expanded (power-user view)
- Keyboard shortcut or toggle to switch between views
- Default to primary view on first load

---

### UI-02 — Sonic World Mode Selector Visual Weight
**Severity:** MEDIUM
**Description:** 7 sonic world modes as buttons or a dropdown adds visual noise to the form. A poor implementation will feel like a settings panel, not a creative tool.

**Mitigation:**
- Mode selector should use a horizontal pill/chip selector with cinematic icon per mode (not a dropdown)
- Active mode is visually prominent; inactive modes are subdued
- Hovering a mode shows a brief tooltip describing its sonic character

---

### UI-03 — Blueprint History Comparison Not Supported
**Severity:** MEDIUM
**Description:** The current design only allows viewing one blueprint at a time. Users cannot compare v1 vs v2 side-by-side to understand what changed between regenerations.

**Mitigation for MVP:** Clicking a history entry replaces the current view (no comparison). Document this as a Phase 2B enhancement.

---

## SECTION 9: PROMPT INJECTION / SECURITY CONCERNS

### SEC-01 — Story Context Field XSS Risk
**Severity:** HIGH
**Description:** The `story` field on `creative_sessions` (already existing from Phase 1) can contain arbitrary text. In the Sonic World frontend, story context is displayed in the session header. If rendered as `innerHTML`, a story containing `<script>alert(1)</script>` would execute.

**Mitigation:**
- ALL dynamic text from the API must be rendered via React's text rendering (JSX text nodes or `textContent`) — never `dangerouslySetInnerHTML`
- This applies to: `story`, `producerBrief`, all 32 dimension fields, session `name`, `genrePreference`, `referenceArtists`
- Audit the existing `MusicIntelligence.tsx` component for any `dangerouslySetInnerHTML` usage

---

### SEC-02 — Genre Preference Input Not Rate-Limited
**Severity:** LOW
**Description:** The generate endpoint accepts a `genrePreference` freetext field. An attacker making 1000 rapid requests with different genre inputs to map the engine's behavior is not blocked by current rate limiting.

**Mitigation:** This is an intelligence reverse-engineering risk, not a data risk. The engine is not a secret — document this as acceptable. Rate limiting on the generate endpoint is sufficient protection.

---

## SECTION 10: TECHNICAL DEBT RISKS

### TD-01 — Phase 1 and Phase 2 Engines Are Not Unified
**Severity:** MEDIUM
**Description:** Phase 1's `blueprint-engine.ts` and Phase 2's `sonic-world-engine/` are two separate codebases with overlapping concern (both handle emotion → descriptor mappings). Over time, they will diverge in code style, table format, and hash behavior.

**Mitigation:** Do not unify them in Phase 2 MVP. Unification is a Phase 3 refactor task. Document the divergence intentionally. Both engines share the same `EmotionType`, `IntentionType`, and `TransformationType` exports from `blueprint-engine.ts` to avoid duplication of type definitions.

---

### TD-02 — Hardcoded Sonic World Mode Default
**Severity:** LOW
**Description:** The default `sonicWorldMode` is `'cinematic'`. If this default changes in the future, it must be updated in: Zod schema, DB column default, TypeScript type, and frontend store initial state — four places.

**Mitigation:** Define a single `DEFAULT_SONIC_WORLD_MODE` constant in `sonic-world.schema.ts` and reference it from all four locations.

---

### TD-03 — Producer Brief Quality Has No Feedback Loop
**Severity:** MEDIUM
**Description:** There is no mechanism for users to rate or flag a producer brief as low quality. Without feedback, table quality degrades silently over time and there is no signal to improve it.

**Future action:** Add a "thumbs up / thumbs down" micro-interaction on the Producer Brief panel (stored in DB, aggregated for table quality scoring). This is a Phase 2B feature.

---

## SIGN-OFF REQUIREMENTS

Before implementation begins, the following items must be resolved or explicitly accepted:

| Item | Status | Owner |
|------|--------|-------|
| AR-01 Phase 1/Phase 2 desync — add Phase 1 snapshot fields to schema | Required | Architect |
| AR-03 Dimension table coverage — validation pass at startup | Required | Engineer |
| API-01 Session ownership check in service layer | Required (critical) | Engineer |
| RR-01 Mobile layout accordion pattern | Required | Frontend |
| UI-01 Progressive disclosure design before implementation | Required | Designer/Engineer |
| PB-04 Composite index on (artist_id, genre_primary) | Required | Engineer |
| SEC-01 Audit all existing innerHTML usage | Required | Engineer |
