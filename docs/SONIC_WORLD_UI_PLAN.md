# SONIC WORLD ENGINE — UI / UX PLAN
**DATIAM OS | Phase 2 Frontend Design Specification**
**Version:** 1.0.0
**Status:** Architecture Review — Pre-Implementation
**Date:** 2026-05-27

---

## DESIGN PHILOSOPHY

The Sonic World Engine is the most visually ambitious feature in DATIAM OS. It must feel like a **professional intelligence terminal** — not a consumer music app, not a form wizard, not a dashboard.

The reference aesthetic is **cyberpunk cinematic**: deep blacks, measured use of electric accent colors, typographic hierarchy with purpose, animation that communicates state not decoration. Every visual decision should reinforce the idea that the user is operating powerful creative infrastructure.

The guiding question for every design decision: *Does this feel like a tool a serious producer would use in their creative process, or does it feel like a feature demo?*

---

## 1. DASHBOARD RESTRUCTURING RECOMMENDATIONS

### Current Dashboard Problem

The existing DATIAM OS dashboard is modular but flat — all features are presented at equal visual weight. As the Music Intelligence suite grows (Phase 1 DMIE + Phase 2 Sonic World + Phase 2B Sync Intelligence), the navigation must reflect a hierarchy: the music intelligence features are the **core of the product**, not a module among many.

### Recommended Dashboard Restructuring

**Introduce a "CREATIVE INTELLIGENCE" hub section** in the sidebar that groups:
- Music Intelligence (DMIE Phase 1 — session management)
- Sonic World Engine (Phase 2 — blueprint generation)
- Artist Identity (Phase 2B — future, placeholder nav entry)
- Sync Intelligence (Phase 2B — future, placeholder nav entry)

This section sits at the **top of the sidebar**, above catalog, releases, and CRM. Creative work is the core; commercial tracking is secondary.

**Sidebar Hierarchy (Revised):**
```
DATIAM OS
├── OVERVIEW                      ← Dashboard stats
│
├── CREATIVE INTELLIGENCE         ← New section header
│   ├── Music Intelligence        ← Existing DMIE page
│   ├── Sonic World Engine        ← New page (Phase 2)
│   ├── Artist Identity           ← Phase 2B placeholder (disabled/coming soon)
│   └── Sync Intelligence         ← Phase 2B placeholder
│
├── CATALOG & RELEASES
│   ├── Releases
│   ├── Songs
│   └── Distribution
│
├── AUDIENCE
│   ├── Fan Intelligence
│   └── CRM
│
├── REVENUE
│   ├── Royalties
│   └── Sync Licensing
│
└── SYSTEM
    ├── Content
    ├── Automation
    └── Settings
```

### Dashboard Widget Addition

The main dashboard (`/`) gains a new "Creative Intelligence Summary" widget:
- 2-column widget (medium size)
- Shows: last session name + emotion badge, last Sonic World blueprint summary (genre primary + sonic mode), overall session count, coherence score average
- "Open Sonic World →" CTA link
- Visual: dark card with minimal accent color, genre displayed as a glowing tag

---

## 2. NEW NAVIGATION HIERARCHY

### Route Structure

```
/                           → Dashboard
/music-intelligence         → DMIE session management (existing, minor enhancements)
/sonic-world                → Sonic World Engine main page
/sonic-world?sessionId=X    → Sonic World with session context loaded
/sonic-world/history        → All blueprints across all sessions (Phase 2A)
/artist-identity            → Phase 2B (placeholder, disabled)
/sync-intelligence          → Phase 2B (placeholder, disabled)
```

### Page-Level Navigation

The Sonic World page has its own in-page navigation for users who have multiple sessions with blueprints:

```
[← Music Intelligence]    SONIC WORLD ENGINE    [History ▾] [New Session +]
```

- Back link always visible (escape hatch)
- "History" dropdown shows last 5 sessions that have Sonic World blueprints
- "New Session +" links to `/music-intelligence` with the create session form pre-opened

---

## 3. PANEL LAYOUT STRATEGY

### Desktop Layout (≥ 1280px)

The Sonic World page is designed as a **professional workstation layout** — wide, information-dense but organized.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  HEADER BAND: Session context + Phase 1 snapshot + Coherence badge        │
│  [GRIEF]  Heal Listener  →  From Pain to Peace   BPM: 68  Eb minor        │
│  [Coherence: 0.94]                              [Engine v2]  [History ▾]  │
├──────────────────────────────────────────────────────────────────────────┤
│  GENERATE FORM                                                             │
│  Mode: [DARK] [ATMOSPHERIC] [CINEMATIC●] [RAW] [TRANSCEND] [ANTHEMIC]    │
│         [INTIMATE]          Genre: [___________]  Refs: [+Artist][+][+]  │
│                                                   [GENERATE SONIC WORLD ▶]│
├────────────┬────────────┬────────────┬─────────────────────────────────── │
│ GENRE DNA  │ INSTRUMEN- │ VOCAL      │ CINEMATIC ENVIRONMENT              │
│            │ TATION     │ ENERGY     │                                    │
│ Primary    │ Core Inst. │ Style      │ Landscape                         │
│ Sub-Blend  │ Roles      │ Intensity  │ Spatial Feel                      │
│ Lineage    │ Layering   │ Stacking   │ Reverb                            │
│ References │ Technique  │ Presence   │ Color Palette                     │
├────────────┼────────────┼────────────┼────────────────────────────────────│
│ RHYTHM     │ HARMONIC   │ HOOK       │ PRODUCTION DENSITY                 │
│ INTEL.     │ EMOTION    │ STRATEGY   │                                    │
│ Groove     │ Chord Map  │ Placement  │ Arrangement                       │
│ Pattern    │ Tension    │ Payoff     │ Frequency                         │
│ Syncopat.  │ Harm. Rhy. │ Memorabil. │ Mix Balance                       │
│ Pocket     │ Arc        │ Signature  │ Sonic Space                       │
├────────────┴────────────┴────────────┴────────────────────────────────────│
│  PRODUCER BRIEF                                                [Copy ⎘]   │
│  "In the key of Eb minor at 68 BPM, this production inhabits the dark     │
│   quiet of late night contemplation — a neo-soul / alt-R&B world..."      │
├──────────────────────────────────────────────────────────────────────────┤
│  BLUEPRINT HISTORY    [v3 — 2h ago] [v2 — yesterday] [v1 — 3d ago]       │
└──────────────────────────────────────────────────────────────────────────┘
```

### Tablet Layout (768px–1279px)

- Header band: unchanged (single row)
- Generate form: unchanged
- Dimension panels: 2 columns × 4 rows (not 4×2)
- Producer Brief: full width
- History: full width

### Mobile Layout (< 768px)

- Header band: 2-line stacked (emotion/intention on line 1, BPM/key on line 2)
- Generate form: Sonic mode as horizontal scrollable chip row; genre/refs stacked vertically
- Dimension panels: **Accordion style** — only Producer Brief + Genre DNA expanded by default; others collapsed with expand chevron
- Panel expand/collapse: smooth slide animation, chevron rotates
- "Show All Dimensions" floating action button at bottom of screen (expands all)
- Producer Brief: full width, 3-line truncated with "Read more" expand
- History: horizontal scroll row (pill cards)

---

## 4. RESPONSIVE DESIGN PLANNING

### Breakpoints

Matching the existing DATIAM OS breakpoint system:

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Mobile | < 768px | Single column, accordion panels |
| Tablet | 768px–1023px | 2-column grid, compact cards |
| Laptop | 1024px–1279px | 2-column with wider cards |
| Desktop | ≥ 1280px | 4-column grid, full layout |

### Component Adaptive Behavior

| Component | Mobile | Tablet | Desktop |
|-----------|--------|--------|---------|
| Mode selector | Horizontal scroll, 4 visible | All 7 visible, wrap | All 7 visible, single row |
| Dimension panels | Accordion (collapsed) | 2-col grid | 4-col grid |
| Producer Brief | Truncated + expand | Full | Full |
| Blueprint History | Horizontal pill scroll | Horizontal pill scroll | Vertical list |
| Header band | 2 rows | 1 row compact | 1 row full |

### Typography Scaling

- Panel headers: `text-xs uppercase tracking-widest` (consistent with existing DATIAM OS style)
- Field labels: `text-xs` muted color
- Field values: `text-sm` primary color, slightly heavier weight
- Producer Brief: `text-base` with wider line-height for readability
- Session context badges: `text-xs` with colored background per emotion

---

## 5. CARD HIERARCHY

The Sonic World Engine uses 3 tiers of cards with distinct visual weight:

### Tier 1: Context Header Band
- Not a card — a full-width horizontal band
- Dark background, single bottom border accent line
- Contains: emotion badge (colored per emotion type), intention text, transformation text, BPM, key, scale
- Coherence score badge: right-aligned, color indicates quality (see accessibility note in Bug Ledger)
- This band is sticky on scroll (always visible while scrolling through panels)

### Tier 2: Dimension Cards (8 cards)
- Dark card with subtle border (1px, slightly lighter than background)
- Card header: dimension name in uppercase small caps, icon left-aligned
- Card body: 4 field rows, each `label / value` separated by subtle divider
- Hover state: border brightens to accent color (subtle, not jarring)
- Active state (when a historical blueprint is selected from history): left border accent stripe

Design tokens:
```
background: var(--card-dark)          ← near-black, slightly lighter than page
border: 1px solid var(--border-dim)   ← very subtle
border-radius: var(--radius-md)       ← matches existing card system
padding: 1.25rem
header-color: var(--text-muted)       ← subdued header text
value-color: var(--text-primary)      ← bright for values
accent-line: 3px solid var(--accent-electric)  ← for selected state
```

### Tier 3: Producer Brief Card
- Full width, always rendered (never collapsed)
- Visually distinct from dimension cards: slightly wider inner padding, larger body text
- Left border: thick accent stripe (cinematic letterbox effect)
- Header: "PRODUCER BRIEF" in electric accent color
- Body text: white, line-height 1.75 for readability
- Copy button: top-right corner, icon only (clipboard), expands to show "Copied!" on click

---

## 6. ANIMATION STRATEGY

All animations serve **functional purpose**. No animation exists purely as decoration.

### Generation Animation

When the user clicks "Generate Sonic World":
1. Button transitions to loading state (spinner replaces arrow icon)
2. All 8 dimension cards fade to skeleton state (pulsing gray blocks)
3. Producer Brief card shows "Generating sonic world..." centered text
4. On API response: cards fill from left-to-right, top-to-bottom in a cascade (50ms stagger per card)
5. Producer Brief fades in last (it's the assembled summary of all dimensions)

The cascade stagger creates the impression of a system "building" the world in stages — cinematically appropriate.

**Implementation:** CSS animation with staggered `animation-delay` via Tailwind's `delay-{n}` utilities, not JS animation libraries.

### Mode Selector Animation

When switching Sonic World Mode:
- Active chip scales up slightly (1.05) and brightens
- Inactive chips dim (opacity 0.6)
- Transition: 150ms ease-out (quick, responsive feel)
- No re-generation triggered by mode switch alone — generation is always explicit via button

### History Version Switch

When selecting a historical blueprint:
- Current panels fade out (100ms)
- New panels fade in (150ms)
- Version badge updates
- No sliding or page-change animation (instant content swap, clean)

### Coherence Score Badge

When first rendered after generation:
- Score counts up from 0.00 to final value over 600ms (count-up animation)
- Color transitions from neutral to final color during count-up
- Purpose: makes the coherence score feel like a system measurement, not a static label

### Skeleton Loading

- All dimension cards render skeleton immediately on page load (before API call completes)
- Skeleton: pulsing gray blocks at label and value positions within each card
- Matches exact card dimensions to prevent layout shift when data loads
- Implementation: Tailwind `animate-pulse` on placeholder divs

### Page Entry

When navigating to `/sonic-world`:
- Header band slides in from top (200ms, ease-out)
- Generate form fades in (150ms, 50ms delay)
- If a session is already loaded, dimension cards animate in staggered (matching generation cascade)
- If no blueprint exists yet, cards show "No blueprint yet" empty state with generate CTA

---

## 7. VISUAL LOAD BALANCING

With 8 dimension panels + producer brief + header + form + history, the page contains significant information. Visual load balancing prevents cognitive overload.

### Hierarchy Through Visual Weight

1. **Producer Brief** — highest visual weight (largest text, accent border, full width)
2. **Genre DNA** — first panel, slightly elevated importance through position
3. **Instrumentation + Vocal Energy** — second tier (the "how it sounds" dimensions)
4. **Remaining 5 dimensions** — equal third tier (the "how it's built" dimensions)

The user's eye should land on Producer Brief first, then Genre DNA, then scan the grid.

### Color Usage

The existing DATIAM OS cyberpunk palette uses a single electric accent color. The Sonic World Engine **introduces a secondary accent system** tied to Sonic World Mode:

| Mode | Accent Modifier |
|------|----------------|
| Dark | Deep blue-purple accent |
| Atmospheric | Teal/cyan accent |
| Cinematic | Default electric accent (gold/amber) |
| Raw | Deep red/crimson accent |
| Transcendent | Soft white/platinum accent |
| Anthemic | Bright electric blue accent |
| Intimate | Warm amber accent |

The mode accent color appears on:
- The active mode chip border
- The Producer Brief card left border stripe
- The header band bottom border
- Coherence score badge background

This creates a subtle ambient color shift when the user switches modes — the interface "feels" different for each world.

**Important:** This is a subtle tint, not a full palette swap. Base colors remain consistent. Only accent points shift.

### Information Density Controls

Each dimension card displays exactly 4 fields. This is a fixed constraint — not 3, not 5. This uniformity creates visual rhythm in the grid and ensures all cards have identical height, producing a clean grid without ragged edges.

If a future dimension needs more than 4 fields, it must use either:
a) A collapsible secondary section within the card (show/hide)
b) A redesigned card layout with a "detail" expand

---

## 8. CYBERPUNK CINEMATIC UI CONTINUITY

The Sonic World Engine must feel like a natural evolution of the DATIAM OS visual system, not a new product bolted on. Continuity principles:

### Match Existing Patterns

- Use the same card component base (`rounded-xl border bg-[var(--card-dark)]`) as existing cards
- Use the same badge system for emotion, status, and mode labels
- Maintain the same sidebar and top nav structure
- Typography: same font stack (assumed monospaced headers + sans-serif body)

### Amplify the Aesthetic

The Sonic World page is the most visually intentional page in the OS. Where the rest of the product is a clean dark theme, Sonic World leans harder into the cinematic aesthetic:

- The sticky header band uses a slightly more dramatic gradient (horizontal subtle gradient, darkest at edges)
- Panel grid uses a `1px solid var(--grid-line)` overlay to create a subtle grid background effect (like a professional mixing board layout)
- The Generate button has a more prominent treatment than standard buttons (wider, with a subtle glow state on hover)
- Coherence score uses a circular gauge indicator (not just a badge number)

### What NOT To Do

- Do not add particle effects, animated backgrounds, or video loops — this is a professional tool, not a music video
- Do not use gradient text on primary content — reserved for logos/branding only
- Do not use more than 2 accent colors simultaneously on the same page
- Do not break the existing component system — extend it, don't replace it
- Do not use font sizes below 12px — even in labels, everything must be legible

---

## 9. EMPTY STATES

Every empty or first-time state must be handled with purpose.

| State | Treatment |
|-------|----------|
| No session loaded (direct `/sonic-world` navigation) | "Select a session" prompt with link to Music Intelligence |
| Session has no Phase 1 blueprint | Warning card: "Generate a Music Intelligence blueprint first" with CTA |
| Session has Phase 1 but no Phase 2 | Dimension cards show "Ready to generate" placeholder, prominent Generate button |
| Blueprint generating | Skeleton state + generating indicator |
| Blueprint generation error | Error card in place of panels with retry button |
| No blueprint history | History section hidden (not empty state — just absent) |

---

## 10. ACCESSIBILITY

- All color-only indicators have accompanying text or icons
- Coherence score badge: shows numeric value + descriptive text ("Coherent" / "Check" / "Review")
- Sonic World Mode selector: keyboard navigable (arrow keys cycle modes)
- All cards are keyboard focusable for screen reader access
- Copy-to-clipboard buttons: include aria-label with what is being copied
- Accordion panels on mobile: proper aria-expanded state management
- Minimum touch target: 44×44px for all interactive elements on mobile
- Focus ring: visible, matches accent color system
