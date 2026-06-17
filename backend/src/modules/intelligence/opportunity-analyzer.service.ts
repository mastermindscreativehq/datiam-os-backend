import { eq, and, isNull, count, avg, sql } from 'drizzle-orm';
import { db } from '../../db';
import {
  placement_outcomes,
  companies,
  licensing_contacts,
  prediction_accuracy_log,
  artist_profiles,
  songs,
} from '../../db/schema';
import type { AnalyzeOpportunityInput } from './intelligence.schema';

export interface HistoricalContext {
  artist_win_rate:          number;
  artist_total_outcomes:    number;
  territory_win_rate:       number;
  territory_total_outcomes: number;
  genre_win_rate:           number;
  genre_total_outcomes:     number;
  company:                  CompanyContext | null;
  contact:                  ContactContext | null;
  prediction_accuracy:      number;
  total_data_points:        number;
}

export interface CompanyContext {
  id:                   string;
  name:                 string;
  type:                 string;
  tier:                 string;
  genre_focus:          string[];
  deal_volume_per_year: number | null;
  avg_license_fee_usd:  number | null;
}

export interface ContactContext {
  id:                  string;
  full_name:           string;
  relationship_status: string;
  relationship_score:  number | null;
  genre_preferences:   string[];
  last_contacted_at:   Date | null;
}

export const gatherHistoricalContext = async (
  input: AnalyzeOpportunityInput,
): Promise<HistoricalContext> => {
  const [
    artistOutcomes,
    territoryOutcomes,
    companyRow,
    contactRow,
    accuracyStats,
  ] = await Promise.all([
    // Artist win rate
    input.artist_id
      ? db
          .select({ outcome: placement_outcomes.outcome, count: count() })
          .from(placement_outcomes)
          .where(eq(placement_outcomes.artist_id, input.artist_id))
          .groupBy(placement_outcomes.outcome)
      : Promise.resolve([]),

    // Territory win rate
    db
      .select({ outcome: placement_outcomes.outcome, count: count() })
      .from(placement_outcomes)
      .where(eq(placement_outcomes.territory, input.territory))
      .groupBy(placement_outcomes.outcome),

    // Company profile
    input.company_id
      ? db
          .select()
          .from(companies)
          .where(and(eq(companies.id, input.company_id), isNull(companies.deleted_at)))
          .limit(1)
      : Promise.resolve([]),

    // Contact profile
    input.contact_id
      ? db
          .select()
          .from(licensing_contacts)
          .where(
            and(
              eq(licensing_contacts.id, input.contact_id),
              isNull(licensing_contacts.deleted_at),
            ),
          )
          .limit(1)
      : Promise.resolve([]),

    // Recent prediction accuracy
    db
      .select({ avg_accuracy: avg(prediction_accuracy_log.accuracy_score) })
      .from(prediction_accuracy_log)
      .where(
        and(
          eq(prediction_accuracy_log.prediction_type, 'placement_likelihood'),
          eq(prediction_accuracy_log.resolved, true),
          eq(prediction_accuracy_log.model_version, 'datiam-intelligence-v1'),
        ),
      ),
  ]);

  const artistTotal = artistOutcomes.reduce((s, r) => s + Number(r.count), 0);
  const artistPlaced = Number(
    artistOutcomes.find(r => r.outcome === 'placed')?.count ?? 0,
  );
  const artist_win_rate = artistTotal > 0 ? artistPlaced / artistTotal : 0;

  const territoryTotal = territoryOutcomes.reduce((s, r) => s + Number(r.count), 0);
  const territoryPlaced = Number(
    territoryOutcomes.find(r => r.outcome === 'placed')?.count ?? 0,
  );
  const territory_win_rate = territoryTotal > 0 ? territoryPlaced / territoryTotal : 0.15;

  // Genre-level win rate: count outcomes where license_type contains a known genre-aligned type
  const genreRows = await db
    .select({ outcome: placement_outcomes.outcome, count: count() })
    .from(placement_outcomes)
    .where(
      sql`lower(${placement_outcomes.notes}) like ${'%' + input.genre.toLowerCase() + '%'}
      OR lower(${placement_outcomes.rejection_reason}) like ${'%' + input.genre.toLowerCase() + '%'}`,
    )
    .groupBy(placement_outcomes.outcome);

  const genreTotal = genreRows.reduce((s, r) => s + Number(r.count), 0);
  const genrePlaced = Number(genreRows.find(r => r.outcome === 'placed')?.count ?? 0);
  const genre_win_rate = genreTotal > 0 ? genrePlaced / genreTotal : 0.2;

  const companyRaw = companyRow[0] ?? null;
  const company: CompanyContext | null = companyRaw
    ? {
        id:                   companyRaw.id,
        name:                 companyRaw.name,
        type:                 companyRaw.type,
        tier:                 companyRaw.tier,
        genre_focus:          (companyRaw.genre_focus as string[] | null) ?? [],
        deal_volume_per_year: companyRaw.deal_volume_per_year,
        avg_license_fee_usd:  companyRaw.avg_license_fee_usd
          ? Number(companyRaw.avg_license_fee_usd)
          : null,
      }
    : null;

  const contactRaw = contactRow[0] ?? null;
  const contact: ContactContext | null = contactRaw
    ? {
        id:                  contactRaw.id,
        full_name:           contactRaw.full_name,
        relationship_status: contactRaw.relationship_status,
        relationship_score:  contactRaw.relationship_score,
        genre_preferences:   (contactRaw.genre_preferences as string[] | null) ?? [],
        last_contacted_at:   contactRaw.last_contacted_at,
      }
    : null;

  const prediction_accuracy = accuracyStats[0]?.avg_accuracy
    ? Number(accuracyStats[0].avg_accuracy)
    : 0;

  const total_data_points =
    artistTotal + territoryTotal + genreTotal + (companyRaw ? 1 : 0) + (contactRaw ? 1 : 0);

  return {
    artist_win_rate,
    artist_total_outcomes:    artistTotal,
    territory_win_rate,
    territory_total_outcomes: territoryTotal,
    genre_win_rate,
    genre_total_outcomes:     genreTotal,
    company,
    contact,
    prediction_accuracy,
    total_data_points,
  };
};
