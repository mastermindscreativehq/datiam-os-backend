# DATIAM OS — Frozen Architecture (Ownership Model)

**Status:** FROZEN — no implementation until explicitly unblocked.
**Date:** 2026-07-30
**Scope:** Final entity-ownership model for Playlists, Distribution, and all first-class DATIAM OS entities, plus the resulting system architecture and implementation order.
**Grounding:** Based on direct inspection of `backend/src/modules/*` (68 modules), `backend/src/db/schema.ts` (79 tables), `backend/src/db/growth-schema.ts` (25 tables) as of this date. The `plans/idempotent-dazzling-knuth.md` file referenced in prior memory does not exist on disk — treated as unresolvable, not as ground truth.

---

## 0. Conflicts found in the current codebase (must be resolved by this document)

1. **ISRC/UPC duplication** — `releases.isrc/upc/primary_isrc/isrc_ready/upc_ready` columns vs. the separate per-song `catalog_identifiers` table. Two sources of truth for the same identifier concept.
2. **Two "campaign" concepts** — `growth-schema.campaigns` (campaign-manager) vs. `schema.release_campaigns` (release-intel/release-intelligence), with no shared parent.
3. **`release-intel` vs `release-intelligence`** — two similarly named modules, separate schemas/services, unclear which is canonical.
4. **`catalog-engine` duplicates `artists/` and `releases/`** — catalog-engine has its own `artists.service.ts` and `releases.service.ts`, overlapping the standalone modules, the same overlap that used to exist for Songs before it was partially fixed.
5. **Read-path duplication survives even where write-path was fixed** — Songs writes are unified through `catalog-engine`'s core functions, but `catalog/catalog.service.ts` still has its own independent `getSongs`/`getSongById`, a second, divergent read implementation of the same table.
6. **`fans/` vs `fan-intelligence/`** — both are capable of touching `fan_profiles`/`fan_events`; no enforced write boundary.
7. **AI/intelligence fragmentation** — `ai/`, `intelligence/`, `intelligence-core/`, `music-intelligence/` overlap in purpose with no single owner of the general "recommendation" concept.
8. **No structural enforcement mechanism** — every module imports the same shared `schema.ts` directly; "single owner" today is a comment convention, not something the codebase enforces. Every ruling below assumes this gets enforced going forward (module boundaries via service-layer calls, not direct cross-module table imports), or it will decay exactly as it already has three times.

Each is resolved explicitly in Sections 2–3, not left open.

---

## 1. PLAYLISTS

No `playlists` table exists today — only disconnected fragments (`playlist_curator` enum value, `playlist_saved` fan event, `playlist_adds` analytics column, `playlist_score`/`playlist_outlook` columns on `release_intel_analysis`, `playlist_push` campaign type). This is genuinely greenfield: no existing data to reconcile, only a decision about where the new domain lives.

### Option A — Playlists as a sub-domain of Outreach

- **Canonical owner:** `outreach/`
- **Database owner:** `outreach/` (new tables: `playlists`, `playlist_pitches`, `playlist_placements`, `playlist_analytics`)
- **API owner:** `/api/outreach/playlists/*`
- **UI owner:** Outreach UI gains a Playlists tab
- **Read access:** campaign-manager, analytics-hub, release-intel, mission-control
- **Write access:** outreach only
- **Future scalability:** Weak. Playlist *catalog data* (a DSP editorial playlist's follower count, a curator's roster) and playlist *analytics* (streams-from-playlist, placement history) aren't outreach activity — they're durable facts about an entity that outlives any single pitch. Ingesting DSP playlist data or running playlist analytics from inside a "pitching" module conflates the object with the process acting on it.
- **Advantages:** Fastest to ship — reuses outreach's existing campaign/message infrastructure; outreach already has a `playlist_curator` contact-type enum.
- **Disadvantages:** Every non-pitching feature (DSP ingestion, analytics, curator database maintenance) has to reach into a module conceptually scoped to "the act of contacting someone," recreating the entity/module mismatch already seen with `release_campaigns` living inside release-intel.
- **Recommendation:** Not recommended as the long-term owner. Only acceptable as a deliberate, temporary MVP shortcut with a planned migration off it.

### Option B — Playlists as a sub-domain of Release Intelligence

- **Canonical owner:** `release-intel/` (the active one — see Section 3 ruling on conflict #3)
- **Database owner:** `release-intel/` (new tables: `playlists`, `playlist_pitches`, `playlist_placements`; existing `playlist_score`/`playlist_outlook` columns become FKs into `playlists`)
- **API owner:** `/api/release-intel/playlists/*`
- **UI owner:** Release Intel's existing "Playlist Pitch" tab becomes the real UI (already exists per recent commit history)
- **Read access:** catalog-engine, outreach, campaign-manager, analytics-hub, mission-control
- **Write access:** release-intel only
- **Future scalability:** Better than A for the two columns that already exist here, but still wrong: playlists are not scoped to a release. A curator relationship or a DSP editorial playlist persists across an artist's entire catalog and career; anchoring it to "is this release ready" ties a durable entity's lifetime to a transient readiness-scoring concept.
- **Advantages:** Zero migration for `playlist_score`/`playlist_outlook`; matches current UI direction; release-intel already aggregates cross-song signals.
- **Disadvantages:** Makes release-intel a second God-module competing with the catalog/songs pattern already seen; permanently couples analytics/outreach to a module named after "release readiness" for an entity that has nothing intrinsically to do with any one release.
- **Recommendation:** Not recommended as canonical owner. Release-intel may *consume* playlist signals (read-only) and may be the module that first surfaces "we should pitch this playlist" — but should not hold the table.

### Option C — Playlists as an independent first-class module (RECOMMENDED)

- **Canonical owner:** new module `playlists/`
- **Database owner:** `playlists/` — `playlists` (type: editorial | user | dsp | curator; dsp_platform; curator_contact_id FK), `playlist_placements` (song_id, playlist_id, added_at, removed_at, position, source), `playlist_pitches` (song_id, playlist_id, status, outreach_message_id FK nullable), `playlist_campaigns` (campaign_id FK into campaign-manager), `playlist_analytics` (streams/saves/skip-rate per placement), `playlist_outreach_history` (append-only, sourced from outreach events)
- **API owner:** `/api/playlists/*` exclusively
- **UI owner:** dedicated Playlists section (nav placement per V5's 12-item consolidation is a UI decision, independent of data ownership); release-intel's existing Playlist Pitch tab becomes a deep-link/read surface into this API, not its own implementation
- **Read access:** catalog-engine, release-intel/release-intelligence, outreach, campaign-manager, analytics-hub, mission-control, AI/sonic-world (for curator/playlist matching)
- **Write access:** playlists module only. Outreach records its own `outreach_message`/`outreach_campaign` rows as always, then calls the playlists module's service function to record a `playlist_pitch` — it never inserts into playlist tables directly.
- **Future scalability:** This is the only option built for what was actually asked — editorial/user/DSP/curator types, pitching, campaign tracking, analytics, and outreach history as one durable entity independent of any single release. It absorbs future growth (DSP API ingestion, ML curator-matching, playlist-algorithm modeling, real-time chart monitoring) as new capability inside one module instead of new cross-module dependencies.
- **Advantages:** Matches the one domain in this codebase that's already properly encapsulated (`sonic-world/`); collapses six scattered playlist-adjacent fields into one owned domain; gives `playlist_score` a real backing store instead of a freestanding guess column.
- **Disadvantages:** More upfront setup than A or B — new module, new migration, new API surface — and requires migrating `release_intel_analysis.playlist_score/playlist_outlook` to FK references rather than freestanding columns.
- **Recommendation: Adopt Option C.** The extra setup is small relative to the cost of re-litigating ownership later — exactly the trap Songs/Artists/Releases already fell into once (conflicts #4 and #5) and are still being cleaned up.

---

## 2. DISTRIBUTION

No distribution table or module exists today — only enum fragments (`'distribution'` release status, `'ready_for_distribution'`, a `music_links` type value). No DSP-delivery, territory, takedown, or delivery-log tables exist anywhere. This is greenfield in the same sense Playlists is, but it inherits the ISRC/UPC conflict (#1) as unfinished business.

### Option A — Distribution as part of Releases

- **Canonical owner:** `releases/`
- **Database owner:** `releases/` — extends `releases` table, adds `distribution_deliveries`, `distribution_territories`, `distribution_takedowns` as releases-owned tables; keeps `isrc`/`upc` where they already live
- **API owner:** `/api/releases/distribution/*`
- **UI owner:** Release detail page gains a Distribution tab
- **Relationship to Songs:** read-only via existing releases→songs FK
- **Relationship to Releases:** not a relationship — it IS releases; `release_status` expands to cover distribution's granular states
- **Relationship to Royalties:** royalties reads `distribution_deliveries` for go-live dates
- **Relationship to DSPs:** DSP delivery logic lives inside releases
- **Relationship to Mission Control:** reads release+distribution status for readiness scoring
- **Future scalability:** Weak-to-moderate. Distribution is operationally distinct — DSP webhooks, delivery retries, takedown workflows, high-volume delivery logs — a different lifecycle than human-edited release metadata. This doubles down on conflict #1 instead of resolving it.
- **Advantages:** No new module; smallest initial migration (builds on existing columns).
- **Disadvantages:** Perpetuates the ISRC/UPC ownership conflict rather than fixing it; ops-heavy, high-write-volume delivery logs sharing a module with human-edited metadata; royalties and DSPs both grow releases' API surface indefinitely.
- **Recommendation:** Not recommended long-term; acceptable only as a Phase-1 stub if Distribution isn't being built yet.

### Option B — Distribution as an Automation-orchestrated sub-domain

- **Canonical owner:** `automation/`
- **Database owner:** `automation/` — `distribution_deliveries`, `distribution_territories`, `distribution_takedowns`, `distribution_health`, `delivery_logs`, modeled as a "distribution" workflow type against existing `workflow_registry`/`automation_runs`
- **API owner:** `/api/automation/distribution/*`
- **UI owner:** Automation dashboard gains a Distribution panel
- **Relationship to Songs/Releases:** read-only; writes delivery status back via events
- **Relationship to Royalties:** royalties subscribes to "went live" events
- **Relationship to DSPs:** natural fit — automation already has job/retry/DLQ infrastructure shaped exactly like DSP delivery attempts
- **Future scalability:** Good for delivery *mechanics* (jobs, retries, health, logs); bad for delivery *state* — UPC/ISRC/store-availability/territory-availability are facts that outlive any individual job run and need to be queryable as current state, not job history. "Did the job run" ≠ "what is currently true."
- **Advantages:** Reuses infrastructure that's already exactly the right shape for retries/health/logs; keeps releases from absorbing ops concerns.
- **Disadvantages:** Splits Distribution's identity — the identifiers other modules query most (ISRC/UPC) have no home in this option, worsening conflict #1 rather than fixing it.
- **Recommendation:** Not recommended as sole owner. Its job/retry/health/log machinery is worth reusing as an internal dependency of Option C, not as an ownership claim.

### Option C — Distribution as an independent first-class module (RECOMMENDED)

- **Canonical owner:** new module `distribution/`
- **Database owner:** `distribution/` — `distribution_identifiers` (canonical ISRC/UPC/ISWC per song/release — **absorbs and retires both** `releases.isrc/upc/primary_isrc` **and** `catalog_identifiers`, becoming the single source of truth), `distribution_deliveries`, `distribution_territories`, `distribution_takedowns`, `distribution_health`, `delivery_logs` (internally reusing automation's job/retry pattern, but owned/queried through distribution's own API)
- **API owner:** `/api/distribution/*`
- **UI owner:** dedicated Distribution section (nav placement is a UI decision independent of data ownership)
- **Relationship to Songs:** reads song/release association read-only from catalog-engine/releases; becomes the sole canonical owner of ISRC — catalog-engine keeps ISRC only as a read-through display field
- **Relationship to Releases:** releases owns editorial/business status (draft/scheduled/released); distribution owns granular per-DSP/per-territory delivery status
- **Relationship to Royalties:** royalties reads `distribution_deliveries` (read-only) to anchor royalty periods to actual go-live dates
- **Relationship to DSPs:** distribution is the single DSP integration point — credentials, format adapters, webhook receivers all live here
- **Relationship to Mission Control:** reads `distribution_health` and delivery status for readiness/alerting; never writes
- **Future scalability:** Best fit for every one of the ten listed sub-capabilities (DSP delivery, UPC, ISRC, store availability, territories, release-status linkage, takedowns, re-delivery, health, logs) — each gets a real table, not a bolt-on. Distribution is as large a domain as Royalties or Catalog and will only grow (more DSPs, more territories, DDEX-style compliance, direct licensing).
- **Advantages:** Directly resolves conflict #1 by becoming the single source of truth instead of adding a third location for the same data; clean read-only relationships mirror how a real distributor separates catalog metadata from delivery operations.
- **Disadvantages:** Largest upfront cost of the three options — it's greenfield AND has to absorb/reconcile two existing partial implementations (`releases` columns + `catalog_identifiers`), not just build on a blank slate.
- **Recommendation: Adopt Option C.** Same reasoning as Playlists, plus it's the only option that actually resolves a conflict that already exists in production schema today rather than adding a third ownership location for the same identifiers.

---

## 3. DATIAM ENTITY OWNERSHIP MATRIX

Rule applied throughout: **exactly one canonical owner per entity.** Where the audit found two live owners, one is designated canonical and the other is explicitly demoted to read-only/derived — this is a ruling, not a suggestion, and drives Section 5's roadmap.

| Entity | Canonical Owner | DB Owner | API Owner | UI Owner | Read Access | Write Access |
|---|---|---|---|---|---|---|
| **Artists** | `artists/` | `artists/` | `/api/artists` | Artists pages | catalog-engine, sync, fan-intelligence, memory, mission-control | artists only *(catalog-engine's duplicate `artists.service.ts` is deprecated — Section 5 Phase 4)* |
| **Songs** | `catalog-engine/` | `catalog-engine/` (`songs`, `song_assets`, `contributors`) | `/api/catalog/songs` canonical; legacy `/api/songs` proxies through it | Catalog UI | audio, releases, distribution, playlists, sync, ai | catalog-engine only *(legacy `catalog/catalog.service.ts`'s independent `getSongs`/`getSongById` is retired — Section 5 Phase 2)* |
| **Audio Uploads** | `audio/` | `audio/` (`audio_uploads`, `audio_analysis`, `audio_jobs`, `audio_stems`, `waveform_cache`) | `/api/audio` | Audio upload/analysis UI | catalog-engine, ai, sonic-world | audio only |
| **Albums / EPs / Singles** | *Not separate entities* — no dedicated tables exist; these are `release_type` classifications on Releases | `releases/` | `/api/releases` | Releases UI | — | releases only |
| **Releases** | `releases/` | `releases/` (`releases`, `release_checklists`, `release_tasks`) | `/api/releases` | Releases UI | catalog-engine, distribution, royalties, release-intel, campaign-manager, mission-control | releases only *(catalog-engine's duplicate `releases.service.ts` deprecated — Phase 4; `isrc/upc/primary_isrc` columns migrate to Distribution — Phase 7)* |
| **Distribution** | `distribution/` *(new)* | `distribution/` | `/api/distribution` | Distribution UI | songs, releases, royalties, mission-control | distribution only |
| **Royalties** | `royalties/` | `royalties/` (`royalty_sources`) | `/api/royalties` | Royalties UI | distribution, contracts, payments | royalties only |
| **Playlists** | `playlists/` *(new)* | `playlists/` | `/api/playlists` | Playlists UI | catalog-engine, release-intel, outreach, campaign-manager, analytics-hub, mission-control, ai | playlists only |
| **Fans** | `fans/` | `fans/` (`fan_profiles`, `fan_events`) | `/api/fans` | Fans UI | fan-intelligence, campaign-manager, mission-control | fans only *(`fan-intelligence` restricted to read-only + its own derived score/segment tables — Phase 3)* |
| **Campaigns** | `campaign-manager/` | `campaign-manager/` (`campaigns`, `campaign_stages`, `campaign_tasks`, `campaign_kpis`, `campaign_content`) | `/api/campaigns` | Campaigns UI | outreach, playlists, fans, analytics-hub, release-intel, mission-control | campaign-manager only *(`release_campaigns` migrates into this model as `campaign_type='release'` — Phase 3, resolves conflict #2)* |
| **Outreach** | `outreach/` | `outreach/` (`outreach_campaign`, `outreach_message`) | `/api/outreach` | Outreach UI | playlists, sync, campaign-manager, mission-control | outreach only |
| **Sync Opportunities** | `sync/` | `sync/` (`placement_opportunities`) | `/api/sync/opportunities` | Sync UI | sync-intelligence (read-only), placement-outcomes (read-only), mission-control | sync only |
| **Sync Pitches** | `sync/` | `sync/` (`sync_pitches`) | `/api/sync/pitches` | Sync UI | outreach, campaign-manager, mission-control | sync only *(`sync-intelligence/` and `placement-outcomes/` become read-only signal producers, not writers of pitches — Phase 3)* |
| **Labels** | `companies/` | `companies/` — Labels is a `company_type` classification, not a separate table (none exists) | `/api/companies` | Companies/CRM UI | contracts, royalties, distribution | companies only |
| **Contracts** | `contracts/` | `contracts/` (`contracts`) | `/api/contracts` | Contracts UI | payments, royalties, mission-control | contracts only |
| **Payments** | `payments/` | `payments/` (`payments`) | `/api/payments` | Payments UI | contracts, royalties, mission-control | payments only |
| **Invoices** | `payments/` | *No separate table exists — invoices are generated documents, not a persisted entity today.* | `/api/payments/invoices` | Payments UI | mission-control | payments only *(formalize as a real entity only if a concrete requirement emerges — Section 5 Phase 9)* |
| **Analytics** | `analytics-hub/` | `analytics-hub/` (`analytics_snapshots`, `post_analytics`, `platform_metrics`) | `/api/analytics` | Analytics UI | every domain (read), mission-control | analytics-hub only (other modules emit events/metrics; analytics-hub is sole writer of aggregates) |
| **Automation** | `automation/` | `automation/` (`workflow_registry`, `automation_runs`, `scheduled_jobs`) | `/api/automation` | Automation UI | every domain (as a triggerable service) | automation only |
| **Music Intelligence** | `ai/` | `ai/` (`ai_recommendations`) | `/api/ai` | AI recommendations surfaces | every domain (read-only signal consumption) | ai only *(corrected — see note below: `intelligence/` and `intelligence-core/` are NOT duplicates and are not being merged)* |
| **Sonic World** | `sonic-world/` | `sonic-world/` (16 `sonic_*` tables) | `/api/sonic-world` | Sonic World UI | memory, ai, mission-control | sonic-world only *(already the best-encapsulated module in the codebase — no change needed)* |
| **Creative Sessions** | `music-intelligence/` *(corrected from `memory/` — see note below)* | `music-intelligence/` (`creative_sessions`) | `/api/music-intelligence` | Music Intelligence UI | sonic-world, catalog-engine | music-intelligence only |
| **Blueprints** | `music-intelligence/` *(corrected from `memory/`)* | `music-intelligence/` (`song_blueprints`) | `/api/music-intelligence` | Music Intelligence UI | sonic-world, catalog-engine | music-intelligence only |
| **Artist Memory** | `music-intelligence/` *(corrected from `memory/`)* | `music-intelligence/` (`artist_memory`, `emotional_profiles`) | `/api/music-intelligence` | Music Intelligence UI | sonic-world, ai, artists | music-intelligence only |
| **Mission Control** | `mission-control/` | *None by design* — pure orchestration/read-aggregation layer; may own a thin `mission_control_alerts`/`mission_control_config` table for its own settings only | `/api/mission-control` | Mission Control dashboard | every domain (read-only) | mission-control writes only its own config/alert state, never another domain's tables |

**Correction (post-freeze, during implementation) — FINAL:** Conflict #3 (`release-intel` vs `release-intelligence`) was a misdiagnosis, not an ownership conflict. Reading both full service files during Phase 5 implementation showed they write to entirely disjoint tables and serve different, complementary business capabilities:

- **Release Operations** (backend module `release-intelligence/`, unchanged route `/api/release-intelligence`, migration 0035) — readiness-checklist scoring, DSP submission tracking (`release_dsp_status`), marketing-campaign CRUD (`release_campaigns`), alerts (`release_alerts`), rule-based recs (`release_ai_recs`), dashboard/calendar views.
- **Release Orchestrator** (backend module `release-intel/`, unchanged route `/api/release-intel`, migration 0048) — Intelligence-Core-driven scoring, AI (Anthropic) executive-brief generation with rule-based fallback, the six-mission-type (`release_missions`) BullMQ dispatch pipeline, and n8n webhook callbacks.

**Resolution:** kept as two permanently separate bounded contexts — they represent different business capabilities, not duplicate ownership of the same entity. No code merge, no table merge, no module deletion. Each module owns only its own tables and exposes read access / dispatches events to the other exactly as any two Layer-2 modules would per Section 4's cross-module communication rule — neither writes the other's tables. Only the **user-facing labels** were renamed (module names, routes, and table names are unchanged, to avoid an unnecessary breaking change):
- Sidebar nav + page header "RELEASE CAMPAIGNS"/"RELEASE INTELLIGENCE" → **"RELEASE OPERATIONS"**
- Sidebar nav + page header "RELEASE INTEL" → **"RELEASE ORCHESTRATOR"**

This also fixed a pre-existing, unrelated small bug found along the way: `ReleaseIntelligence.tsx`'s "Back to Release Intel" link actually navigated to `/release-intelligence`, not `/release-intel` — the label now correctly reads "Back to Release Operations," matching where it actually goes.

**Correction #2 (post-freeze, during Phase 6) — FINAL:** Conflict #7 (AI/intelligence fragmentation across `ai/`, `intelligence/`, `intelligence-core/`, `music-intelligence/`) was also a misdiagnosis. Checked actual writes per module:
- `ai/` — sole writer of `ai_recommendations`. Clean, unchanged.
- `intelligence-core/` — zero writes; a shared, read-only scoring-provider registry consumed by Release Orchestrator (`runIntelligence`). Legitimate shared library, not a competing owner of anything.
- `intelligence/` — is actually the **sync placement-matching/scoring engine** (opportunity-analyzer, match-score, placement-scoring, adaptive-weights, confidence-calculator), not general "music intelligence." Owns `adaptive_weight` cleanly.
- `music-intelligence/` — is the actual and only writer of `artist_memory`, `creative_sessions`, `song_blueprints`, `emotional_profiles` — corrected in the matrix above from the original (wrong) `memory/` assignment.
- `memory/` — actually owns `company_memory`, `contact_memory`, `artist_sync_memory` (CRM/sync-relationship memory — a name collision with `artist_memory` caused the original mix-up; these are different tables). This is a real entity but wasn't in the original frozen 27-entity list, so no matrix row is added for it here — noted for a future architecture pass, not resolved now, per "no new ownership changes" during implementation.

**Resolution:** no merge performed. All four AI/intelligence modules already have clean, non-overlapping ownership once actually read; the original flag was based on similar naming, not the code. One separate, smaller finding — out of scope for this freeze — is that `prediction_accuracy_log` is written by both `intelligence/` and `placement-outcomes/`; `prediction_accuracy_log`/`prediction-accuracy/` were never part of the original 27-entity list, so this is logged but not fixed here.

**Decisions flagged as requiring explicit human sign-off, not assumed by this document:**
- Whether Labels ever needs to be more than a `company_type` (e.g., if label-specific deal terms or royalty splits grow complex enough to need their own table).
- Whether Invoices ever needs to be a real persisted entity rather than a generated document.

---

## 4. FINAL PRODUCT ARCHITECTURE

### Business Domains

1. **Music Domain** — Artists, Songs, Audio Uploads, Releases (incl. Albums/EPs/Singles as a type), Sonic World, Memory (Creative Sessions/Blueprints/Artist Memory). The source of truth for "what exists."
2. **Commercial Domain** — Distribution, Royalties, Contracts, Payments/Invoices, Labels (via Companies). The source of truth for "what's been delivered and monetized."
3. **Growth Domain** — Fans, Campaigns, Outreach, Sync Opportunities/Pitches, Playlists, Analytics. The source of truth for "who we're reaching and how."
4. **Intelligence Domain** — AI (`ai/`), the audio-dna/energy analysis outputs of Audio, trend-intelligence, prediction-accuracy. Produces recommendations; owns none of the domains it advises.
5. **Operations Domain** — Automation, Monitoring, Scheduler, Execution. The mechanism that runs scheduled/triggered work on behalf of the other domains, never the owner of domain data.
6. **Orchestration Layer** — Mission Control. Reads everything, owns nothing domain-specific, decides nothing that isn't a human/AI-triggered action delegated back to the owning module.
7. **Platform Layer** — Auth, Companies/CRM, Notifications, System. Dependency of every other domain.

### Ownership Boundaries (the one rule that generalizes everything above)

**A module writes only its own tables. Every other module reaches it through that module's exported service functions or REST API — never through a direct import of another module's schema tables.** This is already how Songs writes work (catalog-engine's core functions are the only INSERT/UPDATE/DELETE path); the ruling in Section 3 extends that same pattern to every entity that didn't already have it, and Section 0 item 8 flags that this needs to become a structural/lint-enforced rule, not a comment, or it will drift again exactly as it already has three times.

### Data Flow / Dependency Layering

```
Layer 0 — Platform:      Auth, Companies/CRM, Notifications, System
Layer 1 — Music (source of truth for existence):
                          Artists, Songs, Audio, Releases, Sonic World, Memory
Layer 2 — Commercial & Growth (reference Layer 1 by read-only FK/API; never write to it):
                          Distribution, Royalties, Contracts, Payments   |   Fans, Campaigns, Outreach, Sync, Playlists, Analytics
Layer 3 — Intelligence:  AI reads Layers 1 & 2, writes only its own recommendation tables
Horizontal — Automation: usable by Layers 2 & 3 to execute scheduled/triggered work; never owns domain data
Top — Mission Control:   reads all layers; writes nothing outside its own config/alert state
```

### Cross-Module Communication

Two lawful channels, no others:
1. **Synchronous reads** — call another module's exported query function or REST endpoint.
2. **Async events** — the existing event bus (Phase 5 Execution Engine) for cross-domain side effects (e.g., Distribution emits `release.delivered`; Royalties and Mission Control subscribe).

Writes are never cross-module. If Automation triggers a delivery retry, it calls Distribution's own service function to perform the write — it does not touch `distribution_deliveries` itself.

### Orchestration Roles

- **Mission Control** — aggregates read-only status/health/score signals from every domain (release readiness from Releases+Distribution, financial signals from Royalties/Payments/Contracts, growth signals from Fans/Campaigns/Playlists/Sync, the AI recommendation feed) into one command view. Triggers Automation workflows on human/AI decision; never writes domain data itself.
- **AI Engine** — consumes read-only signals across all domains, produces recommendations. A recommendation being *accepted* is always an action the owning module performs on itself (e.g., accepting a curator-match suggestion makes Playlists create a `playlist_pitch` row — AI never writes it directly).
- **Automation** — the execution substrate (`scheduled_jobs`/`workflow_registry`/`automation_runs`) used by Distribution (delivery jobs/retries), Royalties (statement generation), Outreach/Playlists/Sync (drip sequences), Analytics (rollups). Always calls into the owning module's own functions to perform writes.
- **Growth orchestration** — campaign-manager coordinates multi-channel motions across Fans/Outreach/Playlists/Sync/Analytics, delegating every actual entity write to the module that owns it.
- **Music orchestration** — Sonic World and Memory produce creative artifacts/blueprints; catalog-engine is the sole gate that turns a promoted concept into a real Song/Release.
- **Commercial orchestration** — a strict forward pipeline: Releases → Distribution (on release) → Royalties (on distribution go-live) → Contracts/Payments (on revenue trigger). Each stage reads the previous stage's status read-only and emits an event when its own stage completes.

---

## 5. IMPLEMENTATION ORDER

Sequenced from lowest to highest migration risk — greenfield additions first, mechanical code-only fixes next, then data migrations in increasing order of blast radius, with the two decisions that require human product judgment placed after the mechanical work, not before.

### Phase 1 — Greenfield: Playlists + Distribution skeleton
- **Objective:** Stand up both new modules per Section 1/2 Option C, additive only. Distribution does NOT yet migrate `releases.isrc/upc` or `catalog_identifiers` — it becomes the go-forward source for new identifiers/deliveries only.
- **Files affected:** new `backend/src/modules/playlists/`, new `backend/src/modules/distribution/`, new schema tables in a new migration file.
- **Database impact:** additive only — new tables, zero changes to existing tables.
- **API impact:** additive — `/api/playlists/*`, `/api/distribution/*` are net-new endpoints.
- **Frontend impact:** additive — new UI sections; existing Release Intel "Playlist Pitch" tab left untouched until Phase 5+.
- **Migration risk:** Minimal — no existing data touched.
- **Rollback strategy:** Drop the two new modules and their tables; nothing else references them yet.
- **Estimated complexity:** Medium (two new modules, but standard pattern already used repeatedly in this codebase).

### Phase 2 — Songs read-path de-duplication
- **Objective:** Retire `catalog/catalog.service.ts`'s independent `getSongs`/`getSongById`; route legacy `/api/songs` through catalog-engine's canonical read functions (resolves conflict #5).
- **Files affected:** `backend/src/modules/catalog/catalog.service.ts` only.
- **Database impact:** none.
- **API impact:** none externally (response shape must be verified to match exactly, since two divergent implementations existed).
- **Frontend impact:** none, assuming shape parity is verified.
- **Migration risk:** Low — code-only, no schema change.
- **Rollback strategy:** Revert the one file.
- **Estimated complexity:** Low.

### Phase 3 — Additive-then-switch consolidations (Campaigns, Fans/Fan-Intelligence, Sync)
- **Objective:** Migrate `release_campaigns` into `campaign-manager`'s `campaigns` model as `campaign_type='release'` (resolves conflict #2); restrict `fan-intelligence/` to read-only + its own derived tables (resolves conflict #6); restrict `sync-intelligence/`/`placement-outcomes/` to read-only signal producers, not pitch/opportunity writers.
- **Files affected:** `campaign-manager/`, `release-intel/` (or whichever survives Phase 5's ruling — see dependency note below), `fans/`, `fan-intelligence/`, `sync/`, `sync-intelligence/`, `placement-outcomes/`.
- **Database impact:** data migration required — backfill `release_campaigns` rows into `campaigns`; no destructive drops yet (old table/columns kept as deprecated until Phase 3 is verified stable).
- **API impact:** moderate — any endpoint consuming `release_campaigns` directly must repoint to `campaign-manager`'s API.
- **Frontend impact:** moderate — any UI reading release-campaign data repoints to the new endpoint.
- **Migration risk:** Medium — real data migration, but reversible (old structures kept as fallback during transition).
- **Rollback strategy:** Keep old tables/columns read-only-deprecated (not dropped) until this phase is verified in production; revert callers to old path if issues surface.
- **Estimated complexity:** Medium-high (three separate consolidations bundled by risk profile, could be split into three sub-phases if preferred).

### Phase 4 — Retire catalog-engine's duplicate Artists/Releases writers
- **Objective:** Make standalone `artists/` and `releases/` the sole writers; catalog-engine's `artists.service.ts`/`releases.service.ts` either deleted or reduced to read-only aggregation (resolves conflict #4, mirroring the fix already applied to Songs).
- **Files affected:** `catalog-engine/artists.service.ts`, `catalog-engine/releases.service.ts`, `artists/`, `releases/`, and every caller of the deprecated functions.
- **Database impact:** none directly (no schema change — this is a write-path consolidation, same pattern as Songs).
- **API impact:** moderate — callers must be repointed to the canonical module.
- **Frontend impact:** low, if API contracts are preserved during the switch.
- **Migration risk:** Medium — the Songs precedent shows this is doable safely, but requires careful caller audit (this is exactly where the Songs/catalog divergence originally came from: two writers silently diverging on which fields they set).
- **Rollback strategy:** Revert service-layer changes; no data was migrated so rollback is clean.
- **Estimated complexity:** Medium.

### Phase 5 — Resolve `release-intel` vs `release-intelligence` (requires human decision)
- **Objective:** Formally deprecate one of the two modules. **This document does not assume which one** — it requires a product decision about which data model and UI the team is actually building toward. Flagged, not resolved, by this architecture freeze.
- **Files affected:** whichever module is deprecated, plus every consumer of its schema/API (including Phase 1's Playlists UI touchpoint and Phase 3's campaign migration, both of which assumed "release-intel" is canonical pending this decision).
- **Database impact:** potentially significant — depends on which module's tables are retired.
- **API impact:** significant — one module's API surface disappears.
- **Frontend impact:** significant — any UI built against the deprecated module's API must be repointed.
- **Migration risk:** High — genuinely unknown until the decision is made and the deprecated module's actual data/usage is audited.
- **Rollback strategy:** Do not delete the deprecated module's tables until a full audit of its data confirms nothing is orphaned; keep it read-only-deprecated for one full release cycle before removal.
- **Estimated complexity:** High (mostly due to the unresolved decision, not the mechanics).

### Phase 6 — AI/Intelligence fragmentation — RESOLVED, no code change
- **Objective:** Originally planned to merge `intelligence/` and `intelligence-core/` into `ai/`. On inspection, no conflict existed — see Correction #2 above. `ai/`, `intelligence/`, `intelligence-core/`, and `music-intelligence/` each already own distinct, non-overlapping tables; `audio-dna/`/`energy/` remain owned by `audio/` as before.
- **Files affected:** none (code) — documentation only (entity matrix correction for Creative Sessions/Blueprints/Artist Memory: owner corrected from `memory/` to `music-intelligence/`).
- **Database impact:** none.
- **API impact:** none.
- **Frontend impact:** none.
- **Migration risk:** none.
- **Rollback strategy:** n/a.
- **Estimated complexity:** Low (turned out to be a documentation fix, not an engineering phase).

### Phase 7 — ISRC/UPC identifier consolidation into Distribution
- **Objective:** Make `distribution_identifiers` (built in Phase 1) the single source of truth; migrate and retire `releases.isrc/upc/primary_isrc/isrc_ready/upc_ready` columns and the `catalog_identifiers` table (resolves conflict #1 completely).
- **Files affected:** `releases/`, `catalog-engine/`, `distribution/`, plus every UI/export/reporting surface currently reading the old columns directly.
- **Database impact:** highest in this roadmap — real backfill migration across two existing production tables, followed by a destructive column/table drop once verified.
- **API impact:** high — any endpoint currently exposing `releases.isrc`/`upc` directly must be repointed to Distribution's API (can keep a read-through compatibility field temporarily).
- **Frontend impact:** moderate — UI displaying ISRC/UPC repoints its data source; no visible UX change if done correctly.
- **Migration risk:** Highest in the roadmap — touches identifiers that other systems (future DDEX delivery, existing exports) may depend on positionally.
- **Rollback strategy:** Dual-write/backfill first, verify parity for a full cycle, only then drop old columns/table. Never drop before parity is confirmed in production.
- **Estimated complexity:** High.

### Phase 8 — Labels as a Companies type
- **Objective:** Formalize Labels as a `company_type` value on `companies/`, per the matrix ruling.
- **Files affected:** `companies/` only.
- **Database impact:** additive — one enum value / classification field, no new table.
- **API impact:** minimal.
- **Frontend impact:** minimal — a filter/tag in the Companies UI.
- **Migration risk:** Minimal.
- **Rollback strategy:** Remove the enum value if unused.
- **Estimated complexity:** Low.

### Phase 9 — Invoices as a real entity (deferred, conditional)
- **Objective:** Only if/when a concrete requirement emerges for invoices as a persisted entity distinct from generated payment documents — do not build ahead of need.
- **Files affected:** `payments/` only, if/when triggered.
- **Database impact:** additive new table, if/when triggered.
- **API impact:** additive.
- **Frontend impact:** additive.
- **Migration risk:** Minimal (net-new).
- **Rollback strategy:** N/A until built.
- **Estimated complexity:** Low, deferred — not scheduled.

---

## Self-Challenge Summary

- Recommending independent modules for both Playlists and Distribution is the more expensive option up front. It is justified because both are explicitly listed with 10+ years of sub-capabilities in the brief, and every cheaper alternative (attaching to Outreach, Release-Intel, Releases, or Automation) was shown to either misalign entity lifetime with module lifetime or actively worsen an existing conflict (#1) rather than resolve it.
- Two rulings in Section 3 (release-intel vs release-intelligence, Labels' future depth) are explicitly flagged as requiring human sign-off rather than assumed, per the "no assumptions" instruction — resolving them here would have been a guess, not an architecture decision.
- The single largest residual risk is structural, not entity-specific: nothing currently stops a future module from importing another module's table directly, which is how three of the eight conflicts in Section 0 were created in the first place. This document's ownership matrix will decay again without an enforcement mechanism (lint rule, module boundary tooling, or code-review discipline) — that mechanism is out of scope for this freeze but should be the first thing considered before Phase 1 begins.
