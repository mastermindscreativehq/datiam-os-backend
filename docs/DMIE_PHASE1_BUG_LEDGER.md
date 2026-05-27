# DMIE Phase 1 — Bug Ledger

**Module:** DATIAM Music Intelligence Engine (DMIE)  
**Phase:** 1 — Foundation & Blueprint Engine  
**Ledger Version:** 1.0.0  
**Last Updated:** 2026-05-27  
**Maintainer:** DATIAM Engineering

---

## Legend

| Severity | Definition |
|---|---|
| P0 | Data corruption or complete feature failure in production |
| P1 | Significant functional defect; expected behavior diverges from spec |
| P2 | Minor behavioral defect; workarounds exist |
| P3 | UX friction or code quality issue; no user-facing impact |

| Status | Meaning |
|---|---|
| OPEN | Unresolved, awaiting fix |
| IN PROGRESS | Fix underway |
| RESOLVED | Fix merged and verified |
| WONT FIX | Accepted as design limitation for this phase |

---

## Bug Registry

---

### BUG-DMIE-001

| Field | Value |
|---|---|
| **Bug ID** | BUG-DMIE-001 |
| **Severity** | P1 |
| **Status** | OPEN |
| **Affected Module** | `music-intelligence.service.ts` → `regenerateBlueprint()` |
| **Discovered** | 2026-05-27 |

**Title:** Blueprint regeneration produces identical output to original blueprint

**Reproduction Steps:**
1. Create a session with any emotion/intention/transformation combination and optional story text.
2. View the generated blueprint — note BPM, key, and all eight fields.
3. Click "Regenerate Blueprint" on the same session.
4. Compare the new blueprint to the original.

**Expected:** A meaningfully varied blueprint that explores alternative musical directions for the same emotional intent.

**Actual:** The regenerated blueprint is byte-for-byte identical to the original. `computeBlueprint()` is called with the same `session.emotion`, `session.intention`, `session.story`, and `session.listener_transformation` — all unchanged from the database. Because `storyHash()` is purely deterministic, the output is always identical.

**Root Cause:**  
`regenerateBlueprint()` in `music-intelligence.service.ts` (line 168) calls `computeBlueprint()` with the original session fields without introducing any variance seed. The inline comment ("using current timestamp") describes an intent that was never implemented — no timestamp or counter value is passed into the hash function.

```typescript
// service.ts:168 — hash seed is always storyHash(session.story), never varies
const blueprint = computeBlueprint({
  emotion: session.emotion,
  intention: session.intention,
  story: session.story,    // same story → same hash → same output
  listener_transformation: session.listener_transformation,
});
```

**Fix Notes:**  
Append a variation counter or UTC timestamp string to `story` before hashing, or add a `varianceSeed?: string` parameter to `BlueprintInput` that is mixed into the hash. The counter approach (regeneration #1, #2, …) preserves reproducibility for a given regeneration index. Example:

```typescript
const variationStory = (session.story ?? '') + `__v${Date.now()}`;
const blueprint = computeBlueprint({ ...sessionFields, story: variationStory });
```

**Impact:** Every regeneration call costs a database write and returns a blueprint that is functionally useless as an alternative. The feature is non-functional for its stated purpose.

---

### BUG-DMIE-002

| Field | Value |
|---|---|
| **Bug ID** | BUG-DMIE-002 |
| **Severity** | P1 |
| **Status** | OPEN |
| **Affected Module** | `music-intelligence.service.ts` → `updateArtistMemory()` |
| **Discovered** | 2026-05-27 |

**Title:** `dominant_emotion` stores most-recent emotion, not most-frequent emotion

**Reproduction Steps:**
1. Create 5 sessions with emotion `joy`.
2. Create 1 session with emotion `trauma`.
3. Query `GET /api/music-intelligence/memory?artist_id=<id>`.
4. Inspect `dominant_emotion` in the response.

**Expected:** `dominant_emotion: "joy"` — the emotion appearing in the majority of sessions.

**Actual:** `dominant_emotion: "trauma"` — the emotion from the most recently created session.

**Root Cause:**  
`updateArtistMemory()` unconditionally overwrites `dominant_emotion` with the emotion argument of the current call (line 50 of `music-intelligence.service.ts`). There is no aggregation query to determine true dominance.

```typescript
await db.update(artist_memory).set({
  dominant_emotion: emotion,  // always overwrites with current session's emotion
  ...
})
```

**Fix Notes:**  
Issue a `GROUP BY emotion ORDER BY count DESC LIMIT 1` query against `creative_sessions` for the given `artist_id` during the memory update, and persist the result as `dominant_emotion`. This query is cheap given the per-artist session volumes expected in Phase 1.

**Impact:** The Artist Memory panel displays misleading intelligence. Any downstream features (future AI suggestions, Python integration) that consume `dominant_emotion` as a signal will receive corrupted input.

---

### BUG-DMIE-003

| Field | Value |
|---|---|
| **Bug ID** | BUG-DMIE-003 |
| **Severity** | P1 |
| **Status** | OPEN |
| **Affected Module** | `music-intelligence.service.ts` → `createSession()` |
| **Discovered** | 2026-05-27 |

**Title:** `regenerateBlueprint` does not update `artist_memory`

**Reproduction Steps:**
1. Create a session with emotion `peace` (BPM ~62, key `D major`).
2. Assuming BUG-DMIE-001 is resolved, regenerate the blueprint — it now returns a different BPM (e.g., 58) and key (`A major`).
3. Query `GET /api/music-intelligence/memory?artist_id=<id>`.
4. Inspect `avg_bpm_min`, `avg_bpm_max`, and `preferred_keys`.

**Expected:** Memory reflects the new blueprint's BPM and key.

**Actual:** Memory is unchanged from session creation. Regenerated blueprint data is silently discarded from the memory model.

**Root Cause:**  
`regenerateBlueprint()` inserts a new `song_blueprints` row and returns the result, but never calls `updateArtistMemory()`. Only `createSession()` calls this function.

**Fix Notes:**  
Call `updateArtistMemory(session.artist_id, session.emotion, bp.bpm, bp.musical_key)` after inserting the regenerated blueprint row. Artist memory should reflect all blueprints, not just initial ones.

**Impact:** Artist memory BPM range and preferred key list become stale after first regeneration.

---

### BUG-DMIE-004

| Field | Value |
|---|---|
| **Bug ID** | BUG-DMIE-004 |
| **Severity** | P1 |
| **Status** | OPEN |
| **Affected Module** | `music-intelligence.service.ts` → `listSessions()`, `getDashboard()` |
| **Discovered** | 2026-05-27 |

**Title:** Unauthenticated cross-artist data exposure via omitted `artist_id` parameter

**Reproduction Steps:**
1. Authenticate as any valid user.
2. Issue `GET /api/music-intelligence/sessions` without an `artist_id` query param.
3. Issue `GET /api/music-intelligence/dashboard` without an `artist_id` query param.

**Expected:** Either a 400 error requiring `artist_id`, or results scoped to the authenticated user's artist profile.

**Actual:** All sessions and dashboard aggregates across all artists in the database are returned to any authenticated user.

**Root Cause:**  
Both `listSessions()` and `getDashboard()` treat `artistId` as an optional filter — when absent, the Drizzle queries have no `WHERE` clause and return the full table.

```typescript
// service.ts:128 — no artistId → full table scan returned to caller
export const listSessions = async (artistId?: string, limit = 50) => {
  const query = db.select().from(creative_sessions)...
  if (artistId) { return query.where(eq(creative_sessions.artist_id, artistId)); }
  return query; // returns everyone's sessions
};
```

**Fix Notes:**  
Require `artist_id` in both endpoints (return 400 if absent), or extract the artist profile ID from `req.user` in the middleware and scope all queries to it automatically. Treat the latter as the Phase 2 preferred architecture.

**Impact:** Any authenticated user can read any other artist's creative sessions, blueprint history, and emotional profiles. This is a privacy violation.

---

### BUG-DMIE-005

| Field | Value |
|---|---|
| **Bug ID** | BUG-DMIE-005 |
| **Severity** | P2 |
| **Status** | OPEN |
| **Affected Module** | `music-intelligence.service.ts` → `createSession()` |
| **Discovered** | 2026-05-27 |

**Title:** `logActivity` called fire-and-forget — errors silently dropped

**Reproduction Steps:**
1. Configure the activity log database connection to be unavailable or misconfigured.
2. Create a session via `POST /api/music-intelligence/sessions`.

**Expected:** The session creation either fails cleanly with an error, or the activity log failure is surfaced in server logs.

**Actual:** Session creation succeeds; the `logActivity` error is silently swallowed because the call is not awaited.

**Root Cause:**  
`logActivity(...)` at line 115 of `music-intelligence.service.ts` is called without `await`. If the activity logger throws or rejects, Node.js produces an unhandled promise rejection that may or may not be caught depending on the process-level unhandledRejection handler.

**Fix Notes:**  
Either `await` the call and wrap it in a try/catch that logs to stderr without re-throwing (preserving session creation success), or use a fire-and-forget pattern explicitly annotated as intentional. The current state is an unintentional omission.

**Impact:** Activity log entries for session creation may be missing with no observable error. Audit trail is unreliable.

---

### BUG-DMIE-006

| Field | Value |
|---|---|
| **Bug ID** | BUG-DMIE-006 |
| **Severity** | P2 |
| **Status** | OPEN |
| **Affected Module** | `0012_music_intelligence.sql` → `song_blueprints` table |
| **Discovered** | 2026-05-27 |

**Title:** `song_blueprints.artist_id` is nullable at the database level

**Reproduction Steps:**
1. Inspect `0012_music_intelligence.sql` lines 48–61.
2. Note `artist_id UUID REFERENCES artist_profiles(id) ON DELETE CASCADE` — no `NOT NULL` constraint.
3. Attempt to insert a `song_blueprints` row with `artist_id = NULL` directly via SQL.

**Expected:** Constraint violation — `artist_id` should always reference a valid artist.

**Actual:** Insert succeeds; the row is persisted with no artist owner.

**Root Cause:**  
The `NOT NULL` constraint was specified on `creative_sessions.artist_id` but omitted from the analogous column on `song_blueprints`. The application layer always passes `artist_id` when inserting, so this has not manifested in practice, but the schema does not enforce it.

**Fix Notes:**  
Add a migration to alter `song_blueprints.artist_id` to `NOT NULL`. The column should mirror `creative_sessions.artist_id` — every blueprint belongs to an artist.

**Impact:** Low immediate risk (application always supplies the value), but represents a schema integrity gap that could be exploited or triggered by direct database access.

---

### BUG-DMIE-007

| Field | Value |
|---|---|
| **Bug ID** | BUG-DMIE-007 |
| **Severity** | P2 |
| **Status** | OPEN |
| **Affected Module** | `0012_music_intelligence.sql` → `emotional_profiles` table |
| **Discovered** | 2026-05-27 |

**Title:** `emotional_profiles.session_id` is nullable — orphaned profiles are schema-valid

**Reproduction Steps:**
1. Inspect `0012_music_intelligence.sql` lines 66–79.
2. Note `session_id UUID REFERENCES creative_sessions(id) ON DELETE CASCADE` — no `NOT NULL`.

**Expected:** Every emotional profile must be linked to a session.

**Actual:** A profile with `session_id = NULL` is schema-valid and would be stranded (no cascade delete path, never surfaced by any query).

**Root Cause:**  
`NOT NULL` was omitted from `emotional_profiles.session_id` in the migration, unlike `song_blueprints.session_id` which correctly declares `NOT NULL`.

**Fix Notes:**  
Add a migration to add `NOT NULL` to `emotional_profiles.session_id`. Verify no existing rows have `NULL` in this column before applying.

**Impact:** No current production impact (application always supplies the value), but a schema integrity gap.

---

### BUG-DMIE-008

| Field | Value |
|---|---|
| **Bug ID** | BUG-DMIE-008 |
| **Severity** | P2 |
| **Status** | OPEN |
| **Affected Module** | `music-intelligence.service.ts` → `updateArtistMemory()` |
| **Discovered** | 2026-05-27 |

**Title:** `preferred_keys` eviction order is FIFO on insertion, not frequency-based

**Reproduction Steps:**
1. Create 11 sessions for one artist, each using a distinct musical key.
2. Query artist memory.

**Expected:** The 10 most creatively significant keys are retained (e.g., by frequency or recency with recency as tiebreaker).

**Actual:** The 11th key causes the first key ever used to be evicted, regardless of how frequently that key appeared. The `Set` deduplicates then slices to 10, meaning the order is insertion-order and the oldest unique key is always dropped first.

**Root Cause:**  
```typescript
// service.ts:43
const updatedKeys = Array.from(new Set([...(mem.preferred_keys as string[]), musicalKey])).slice(0, 10);
```
`Array.from(new Set(...))` preserves insertion order. New keys are appended, old keys are evicted from the front.

**Fix Notes:**  
For Phase 1 the cap of 10 is reasonable. The fix is a move-to-front strategy: remove `musicalKey` from its current position (if present) and re-append it, then slice. This makes the list LRU rather than FIFO.

**Impact:** Artists with diverse key usage will lose historical key preferences incorrectly.

---

### BUG-DMIE-009

| Field | Value |
|---|---|
| **Bug ID** | BUG-DMIE-009 |
| **Severity** | P2 |
| **Status** | OPEN |
| **Affected Module** | `music-intelligence.controller.ts` → `listSessions`, `getDashboard` |
| **Discovered** | 2026-05-27 |

**Title:** `artist_id` query parameter not validated as UUID before database query

**Reproduction Steps:**
1. Issue `GET /api/music-intelligence/sessions?artist_id=not-a-uuid`.
2. Observe the server response.

**Expected:** 400 Bad Request with a validation error message.

**Actual:** The malformed value is passed to Drizzle's `eq()` comparator against a UUID column. PostgreSQL may return an error (invalid UUID syntax) which surfaces as an unhandled 500, or return zero rows depending on driver behavior.

**Root Cause:**  
`req.query.artist_id` is cast directly to `string | undefined` and forwarded to the service without any UUID format validation. Only `POST /sessions` goes through Zod validation via the `validate` middleware.

**Fix Notes:**  
Add UUID validation (e.g., via `z.string().uuid().optional().parse(...)`) in the controller before forwarding, or add a shared query-param validation middleware for all endpoints that accept `artist_id`.

**Impact:** Malformed requests produce confusing 500 errors instead of actionable 400 responses.

---

### BUG-DMIE-010

| Field | Value |
|---|---|
| **Bug ID** | BUG-DMIE-010 |
| **Severity** | P3 |
| **Status** | OPEN |
| **Affected Module** | `music-intelligence.service.ts` → `deleteSession()` |
| **Discovered** | 2026-05-27 |

**Title:** Hard delete permanently destroys blueprint history with no archive path

**Reproduction Steps:**
1. Create a session and regenerate its blueprint 3 times.
2. Delete the session via `DELETE /api/music-intelligence/sessions/:id`.
3. Attempt to retrieve any of the 4 blueprints.

**Expected:** Either the blueprints are archived and recoverable, or the UI warns that deletion is permanent and includes blueprint history.

**Actual:** The session and all associated `song_blueprints`, `emotional_profiles`, and artist memory contribution are permanently deleted. There is no soft-delete, archive, or recycle mechanism.

**Root Cause:**  
`deleteSession()` issues a hard `DELETE` against `creative_sessions`. All child rows cascade per `ON DELETE CASCADE` constraints in the migration.

**Fix Notes:**  
For Phase 2: add a `deleted_at TIMESTAMP` column to `creative_sessions` and filter it in all queries. Hard deletes should be restricted to an admin operation. The current behavior should at minimum warn in the UI that blueprint history will be lost.

**Impact:** Irrecoverable data loss on session deletion. Low immediate risk (explicit user action required), high risk as blueprint value grows.

---

### BUG-DMIE-011

| Field | Value |
|---|---|
| **Bug ID** | BUG-DMIE-011 |
| **Severity** | P3 |
| **Status** | WONT FIX (Phase 1) |
| **Affected Module** | `blueprint-engine.ts` → `computeBlueprint()` |
| **Discovered** | 2026-05-27 |

**Title:** Scale is never modified by transformation modifiers — always reflects base emotion

**Reproduction Steps:**
1. Create sessions with the same emotion (`grief`, scale `natural minor`) and different transformations (e.g., `from_pain_to_peace` vs. `from_chaos_to_order`).
2. Compare the `scale` field across blueprints.

**Expected:** Transformations that imply a shift toward resolution (e.g., `from_grief_to_acceptance`) might shift to a different scale (e.g., dorian or major).

**Actual:** Scale is always the emotion's base scale regardless of transformation. The comment in the engine reads `// Scale: base (transformations don't override scale in v1)`.

**Root Cause:**  
Intentional design decision documented in the engine source code. `TRANSFORMATION_MOD` entries do not include a `scaleSuffix` or `scaleOverride` field.

**Fix Notes:**  
Phase 2 enhancement: add `scaleOverride?: string` to `TransformationMod` and populate it for applicable transformations. Accepted as known limitation for v1.

**Impact:** Blueprint scale field provides less musical nuance than achievable. No data integrity concern.

---

## Summary Table

| Bug ID | Severity | Title | Status |
|---|---|---|---|
| BUG-DMIE-001 | P1 | Blueprint regeneration produces identical output | OPEN |
| BUG-DMIE-002 | P1 | `dominant_emotion` stores most-recent, not most-frequent | OPEN |
| BUG-DMIE-003 | P1 | `regenerateBlueprint` does not update `artist_memory` | OPEN |
| BUG-DMIE-004 | P1 | Cross-artist data exposure via omitted `artist_id` param | OPEN |
| BUG-DMIE-005 | P2 | `logActivity` fire-and-forget silently drops errors | OPEN |
| BUG-DMIE-006 | P2 | `song_blueprints.artist_id` nullable at schema level | OPEN |
| BUG-DMIE-007 | P2 | `emotional_profiles.session_id` nullable at schema level | OPEN |
| BUG-DMIE-008 | P2 | `preferred_keys` eviction is FIFO, not LRU or frequency-based | OPEN |
| BUG-DMIE-009 | P2 | `artist_id` query param not validated as UUID | OPEN |
| BUG-DMIE-010 | P3 | Hard delete destroys blueprint history permanently | OPEN |
| BUG-DMIE-011 | P3 | Scale field unaffected by transformation modifiers in v1 | WONT FIX |
