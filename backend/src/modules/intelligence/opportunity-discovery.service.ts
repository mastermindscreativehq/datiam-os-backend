import { isNull } from 'drizzle-orm';
import { db } from '../../db';
import {
  companies,
  company_memory,
  licensing_contacts,
  contact_memory,
  artist_sync_memory,
  adaptive_weight,
} from '../../db/schema';

// ─── Engine version ───────────────────────────────────────────────────────────

const ENGINE_VERSION = 'discovery-v1';

// ─── Response types ───────────────────────────────────────────────────────────

export interface DiscoveredOpportunity {
  rank:                  number;
  company:               CompanySummary;
  contact:               ContactSummary | null;
  territory:             string;
  genres:                string[];
  opportunity_score:     number;
  predicted_probability: number;
  confidence:            number;
  recommendation:        string;
  explanation:           string;
}

interface CompanySummary {
  id:                   string;
  name:                 string;
  type:                 string;
  tier:                 string;
  country:              string | null;
  city:                 string | null;
  avg_license_fee_usd:  number | null;
  deal_volume_per_year: number | null;
  placement_rate:       number;
  response_rate:        number;
  total_placements:     number;
}

interface ContactSummary {
  id:                    string;
  full_name:             string;
  role:                  string | null;
  email:                 string | null;
  relationship_status:   string;
  relationship_strength: number;
  success_rate:          number;
  placements_closed:     number;
  last_contacted_at:     string | null;
}

export interface DiscoveryResult {
  opportunities:              DiscoveredOpportunity[];
  total_companies_evaluated:  number;
  total_contacts_evaluated:   number;
  artist_sync_data_available: boolean;
  adaptive_weights_applied:   boolean;
  data_sources: {
    companies:           number;
    contacts:            number;
    company_memory_rows: number;
    contact_memory_rows: number;
    adaptive_weights:    number;
    artist_sync_memory:  boolean;
  };
  generated_at:   string;
  engine_version: string;
}

// ─── Internal shorthand types ─────────────────────────────────────────────────

type CompanyRow      = typeof companies.$inferSelect;
type CMRow           = typeof company_memory.$inferSelect;
type ContactRow      = typeof licensing_contacts.$inferSelect;
type ContactMRow     = typeof contact_memory.$inferSelect;
type ArtistSyncRow   = typeof artist_sync_memory.$inferSelect;
type WeightRow       = typeof adaptive_weight.$inferSelect;

// ─── Scoring constants ────────────────────────────────────────────────────────

const TIER_BASE: Record<string, number> = {
  tier_a:  40,
  tier_b:  28,
  tier_c:  15,
  unrated: 10,
};

const RELATIONSHIP_STATUS_MULT: Record<string, number> = {
  active:       1.0,
  prospect:     0.7,
  dormant:      0.4,
  unresponsive: 0.15,
  blacklisted:  0.0,
};

interface WeightMap {
  company_match:  number;
  contact_match:  number;
  genre_fit:      number;
  artist_history: number;
}

const DEFAULT_WEIGHTS: WeightMap = {
  company_match:  30,
  contact_match:  25,
  genre_fit:      25,
  artist_history: 20,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string');
}

// ─── Adaptive weight builder ──────────────────────────────────────────────────

function buildWeights(rows: WeightRow[]): { weights: WeightMap; applied: boolean } {
  const map = new Map(rows.map(r => [r.factor_name, Number(r.current_weight)]));

  const companyW = map.get('company_match')  ?? 0;
  const contactW = map.get('contact_match')  ?? 0;
  const genreW   = map.get('genre_fit')      ?? 0;
  const artistW  = map.get('artist_history') ?? 0;
  const total    = companyW + contactW + genreW + artistW;

  if (total === 0) return { weights: DEFAULT_WEIGHTS, applied: false };

  return {
    weights: {
      company_match:  Math.round((companyW / total) * 100),
      contact_match:  Math.round((contactW / total) * 100),
      genre_fit:      Math.round((genreW   / total) * 100),
      artist_history: Math.round((artistW  / total) * 100),
    },
    applied: true,
  };
}

// ─── Component scorers ────────────────────────────────────────────────────────

function scoreCompanyComponent(company: CompanyRow, mem: CMRow | null): number {
  const tierScore     = TIER_BASE[company.tier] ?? 10;
  const placementRate = mem ? Number(mem.placement_rate) : 0;
  const responseRate  = mem ? Number(mem.response_rate)  : 0;
  const dealVolume    = company.deal_volume_per_year ?? 0;

  const placementScore = Math.round(placementRate * 35);
  const responseScore  = Math.round(responseRate  * 15);
  const volumeBonus    = dealVolume > 20 ? 10 : dealVolume > 10 ? 6 : dealVolume > 3 ? 3 : 0;

  return Math.min(100, tierScore + placementScore + responseScore + volumeBonus);
}

function scoreContactComponent(contact: ContactRow, mem: ContactMRow | null): number {
  const statusMult  = RELATIONSHIP_STATUS_MULT[contact.relationship_status] ?? 0.5;
  const relStrength = mem ? Number(mem.relationship_strength) : 0.3;
  const successRate = mem ? Number(mem.success_rate)          : 0;
  const placements  = mem ? mem.placements_closed             : 0;

  const strengthScore  = Math.round(relStrength * statusMult * 40);
  const successScore   = Math.round(successRate * 35);
  const placementBonus = Math.min(10, placements * 2);

  return Math.min(100, strengthScore + successScore + placementBonus);
}

function scoreGenreAlignment(
  companyPreferred: string[],
  companyFocus:     string[],
  artistStrongest:  string[],
): number {
  const companyGenres = companyPreferred.length > 0 ? companyPreferred : companyFocus;
  if (companyGenres.length === 0 || artistStrongest.length === 0) return 50;

  const artistLow  = artistStrongest.map(g => g.toLowerCase());
  const companyLow = companyGenres.map(g => g.toLowerCase());

  const overlaps = companyLow.filter(cg =>
    artistLow.some(ag => ag.includes(cg) || cg.includes(ag)),
  ).length;

  if (overlaps >= 3) return 95;
  if (overlaps >= 2) return 82;
  if (overlaps === 1) return 62;
  return 28;
}

function scoreArtistComponent(mem: ArtistSyncRow | null): number {
  if (!mem) return 20;

  const successRate    = Number(mem.success_rate);
  const placementsWon  = mem.placements_won;
  const totalRevenue   = Number(mem.total_sync_revenue);

  const rateScore      = Math.round(successRate * 50);
  const placementBonus = Math.min(30, Math.round(Math.log1p(placementsWon) * 8));
  const revenueBonus   =
    totalRevenue > 50_000 ? 10 :
    totalRevenue > 10_000 ? 6  :
    totalRevenue >  1_000 ? 3  : 0;

  return Math.min(100, rateScore + placementBonus + revenueBonus);
}

function computeOpportunityScore(
  companyScore: number,
  contactScore: number,
  genreScore:   number,
  artistScore:  number,
  weights:      WeightMap,
): number {
  const total =
    weights.company_match + weights.contact_match +
    weights.genre_fit     + weights.artist_history;

  const raw =
    (companyScore * weights.company_match +
     contactScore * weights.contact_match +
     genreScore   * weights.genre_fit     +
     artistScore  * weights.artist_history) / total;

  return Math.round(Math.min(100, Math.max(1, raw)));
}

function computeProbability(
  companyPlacementRate: number,
  contactSuccessRate:   number,
  genreScore:           number,
  artistSuccessRate:    number,
): number {
  const base       = companyPlacementRate > 0 ? companyPlacementRate : 0.12;
  const genreMult  = 0.65 + (genreScore / 100) * 0.7;
  const blended    = contactSuccessRate > 0
    ? base * 0.55 + contactSuccessRate * 0.45
    : base;
  const withArtist = artistSuccessRate > 0
    ? blended * 0.65 + artistSuccessRate * 0.35
    : blended;

  return Math.round(Math.min(0.95, Math.max(0.03, withArtist * genreMult)) * 100) / 100;
}

function computeConfidence(
  companyTotalPlacements:       number,
  contactPlacementsClosed:      number,
  artistOpportunitiesSubmitted: number,
): number {
  const points =
    companyTotalPlacements +
    contactPlacementsClosed +
    Math.min(10, Math.floor(artistOpportunitiesSubmitted / 5));

  if (points === 0) return 0.15;
  if (points >= 20) return 0.85;
  if (points >= 10) return 0.68;
  if (points >= 5)  return 0.52;
  if (points >= 2)  return 0.38;
  return 0.25;
}

function buildRecommendation(score: number): string {
  if (score >= 80) return 'Priority pitch — reach out within 48 hours';
  if (score >= 65) return 'High priority — pitch this week';
  if (score >= 50) return 'Warm outreach recommended';
  if (score >= 35) return 'Nurture relationship — build connection before formal pitch';
  return 'Low priority — focus on higher-ranked opportunities first';
}

function buildExplanation(
  company:          CompanyRow,
  companyMem:       CMRow | null,
  contact:          ContactRow | null,
  contactMem:       ContactMRow | null,
  genreScore:       number,
  artistMem:        ArtistSyncRow | null,
  weights:          WeightMap,
  adaptiveApplied:  boolean,
): string {
  const parts: string[] = [];

  const tierLabel = (
    { tier_a: 'Tier A', tier_b: 'Tier B', tier_c: 'Tier C', unrated: 'Unrated' } as Record<string, string>
  )[company.tier] ?? company.tier;

  const placementPct    = companyMem ? Math.round(Number(companyMem.placement_rate) * 100) : 0;
  const totalPlacements = companyMem?.total_placements ?? 0;
  const typeLabel       = company.type.replace(/_/g, ' ');

  parts.push(
    `${company.name} is a ${tierLabel} ${typeLabel}` +
    (totalPlacements > 0
      ? ` with ${totalPlacements} tracked placement${totalPlacements !== 1 ? 's' : ''} (${placementPct}% placement rate).`
      : ' — no tracked placements yet.'),
  );

  if (genreScore >= 80) {
    parts.push('Strong genre alignment between company preferences and your catalog.');
  } else if (genreScore >= 60) {
    parts.push('Moderate genre overlap with your catalog.');
  } else if (genreScore >= 40) {
    parts.push('Limited genre overlap — tailor your pitch narrative.');
  } else {
    parts.push('Genre misalignment detected — approach with a specific use-case pitch.');
  }

  if (contact && contactMem) {
    const relPct = Math.round(Number(contactMem.relationship_strength) * 100);
    const sucPct = Math.round(Number(contactMem.success_rate) * 100);
    parts.push(
      `Best contact: ${contact.full_name} (${contact.relationship_status})` +
      ` — ${relPct}% relationship strength, ${sucPct}% historical success rate.`,
    );
  } else if (contact) {
    parts.push(
      `Contact on file: ${contact.full_name} (${contact.relationship_status}) — no memory data yet.`,
    );
  } else {
    parts.push('No contact on file — direct company outreach or networking required.');
  }

  if (artistMem && artistMem.opportunities_submitted > 0) {
    const artistPct = Math.round(Number(artistMem.success_rate) * 100);
    parts.push(
      `Your artist has a ${artistPct}% sync win rate across ${artistMem.opportunities_submitted} submitted opportunities.`,
    );
  } else {
    parts.push('No artist sync history on record — baseline industry rates applied.');
  }

  const topFactor = (Object.entries(weights) as [string, number][])
    .sort((a, b) => b[1] - a[1])[0];

  parts.push(
    `Scoring driven by ${topFactor[0].replace(/_/g, ' ')} (${topFactor[1]}% weight)` +
    (adaptiveApplied
      ? ' — adaptive weights from your outcome history applied.'
      : ' — default weights applied.'),
  );

  return parts.join(' ');
}

// ─── Main discovery function ──────────────────────────────────────────────────

export const discoverOpportunities = async (): Promise<DiscoveryResult> => {
  // 1. Fetch all data in parallel — 6 queries, no ORM join ambiguity
  const [
    companyRows,
    companyMemoryRows,
    contactRows,
    contactMemoryRows,
    artistMemRows,
    weightRows,
  ] = await Promise.all([
    db.select().from(companies).where(isNull(companies.deleted_at)),
    db.select().from(company_memory),
    db.select().from(licensing_contacts).where(isNull(licensing_contacts.deleted_at)),
    db.select().from(contact_memory),
    db.select().from(artist_sync_memory).limit(1),
    db.select().from(adaptive_weight),
  ]);

  // 2. Build lookup maps
  const companyMemMap = new Map<string, CMRow>(
    companyMemoryRows.map(m => [m.company_id, m]),
  );
  const contactMemMap = new Map<string, ContactMRow>(
    contactMemoryRows.map(m => [m.contact_id, m]),
  );

  // 3. Group contacts by company_id
  const contactsByCompany = new Map<string, ContactRow[]>();
  for (const contact of contactRows) {
    if (contact.company_id) {
      const list = contactsByCompany.get(contact.company_id) ?? [];
      list.push(contact);
      contactsByCompany.set(contact.company_id, list);
    }
  }

  // 4. Resolve adaptive weights
  const artistMem = artistMemRows[0] ?? null;
  const { weights, applied: adaptiveApplied } = buildWeights(weightRows);

  const artistStrongestGenres = artistMem
    ? toStringArray(artistMem.strongest_genres)
    : [];

  // 5. Score each company
  const scored: Array<{ score: number; opportunity: DiscoveredOpportunity }> = [];

  for (const company of companyRows) {
    const companyMem = companyMemMap.get(company.id) ?? null;

    // Identify best contact for this company
    const candidates = contactsByCompany.get(company.id) ?? [];
    let bestContact:    ContactRow      | null = null;
    let bestContactMem: ContactMRow     | null = null;
    let bestContactScore = -1;

    for (const contact of candidates) {
      const mem = contactMemMap.get(contact.id) ?? null;
      const cs  = scoreContactComponent(contact, mem);
      if (cs > bestContactScore) {
        bestContactScore  = cs;
        bestContact       = contact;
        bestContactMem    = mem;
      }
    }

    // Genre alignment
    const companyPreferred = toStringArray(companyMem?.preferred_genres);
    const companyFocus     = toStringArray(company.genre_focus);
    const genreScore       = scoreGenreAlignment(companyPreferred, companyFocus, artistStrongestGenres);

    // Component scores
    const companyScore = scoreCompanyComponent(company, companyMem);
    const contactScore = bestContact ? bestContactScore : 50;
    const artistScore  = scoreArtistComponent(artistMem);

    const opportunityScore = computeOpportunityScore(
      companyScore,
      contactScore,
      genreScore,
      artistScore,
      weights,
    );

    const predictedProbability = computeProbability(
      companyMem ? Number(companyMem.placement_rate) : 0,
      bestContactMem ? Number(bestContactMem.success_rate) : 0,
      genreScore,
      artistMem ? Number(artistMem.success_rate) : 0,
    );

    const confidence = computeConfidence(
      companyMem?.total_placements ?? 0,
      bestContactMem?.placements_closed ?? 0,
      artistMem?.opportunities_submitted ?? 0,
    );

    const genres =
      companyPreferred.length > 0 ? companyPreferred :
      companyFocus.length > 0     ? companyFocus     :
      [];

    const territory = company.country ?? 'worldwide';

    const contactSummary: ContactSummary | null = bestContact
      ? {
          id:                    bestContact.id,
          full_name:             bestContact.full_name,
          role:                  bestContact.role,
          email:                 bestContact.email,
          relationship_status:   bestContact.relationship_status,
          relationship_strength: bestContactMem ? Number(bestContactMem.relationship_strength) : 0,
          success_rate:          bestContactMem ? Number(bestContactMem.success_rate) : 0,
          placements_closed:     bestContactMem?.placements_closed ?? 0,
          last_contacted_at:     bestContact.last_contacted_at?.toISOString() ?? null,
        }
      : null;

    const companySummary: CompanySummary = {
      id:                   company.id,
      name:                 company.name,
      type:                 company.type,
      tier:                 company.tier,
      country:              company.country,
      city:                 company.city,
      avg_license_fee_usd:  company.avg_license_fee_usd != null ? Number(company.avg_license_fee_usd) : null,
      deal_volume_per_year: company.deal_volume_per_year,
      placement_rate:       companyMem ? Number(companyMem.placement_rate) : 0,
      response_rate:        companyMem ? Number(companyMem.response_rate)  : 0,
      total_placements:     companyMem?.total_placements ?? 0,
    };

    const explanation = buildExplanation(
      company,
      companyMem,
      bestContact,
      bestContactMem,
      genreScore,
      artistMem,
      weights,
      adaptiveApplied,
    );

    scored.push({
      score: opportunityScore,
      opportunity: {
        rank:                  0,
        company:               companySummary,
        contact:               contactSummary,
        territory,
        genres,
        opportunity_score:     opportunityScore,
        predicted_probability: predictedProbability,
        confidence,
        recommendation:        buildRecommendation(opportunityScore),
        explanation,
      },
    });
  }

  // 6. Sort descending, assign ranks, take top 25
  scored.sort((a, b) => b.score - a.score);

  const opportunities = scored.slice(0, 25).map((item, idx) => ({
    ...item.opportunity,
    rank: idx + 1,
  }));

  return {
    opportunities,
    total_companies_evaluated:  companyRows.length,
    total_contacts_evaluated:   contactRows.length,
    artist_sync_data_available: artistMem !== null,
    adaptive_weights_applied:   adaptiveApplied,
    data_sources: {
      companies:           companyRows.length,
      contacts:            contactRows.length,
      company_memory_rows: companyMemoryRows.length,
      contact_memory_rows: contactMemoryRows.length,
      adaptive_weights:    weightRows.length,
      artist_sync_memory:  artistMem !== null,
    },
    generated_at:   new Date().toISOString(),
    engine_version: ENGINE_VERSION,
  };
};
