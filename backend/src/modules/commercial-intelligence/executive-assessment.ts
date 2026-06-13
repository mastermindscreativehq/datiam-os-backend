import type { DnaInputForSync, SyncCategory } from '../sync-intelligence/sync-intelligence.types';
import { SYNC_CATEGORY_LABELS } from '../sync-intelligence/sync-intelligence.types';
import type { ExecutiveSyncAssessment } from './commercial-intelligence.types';

function titleCase(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function buildStrengthProfile(d: DnaInputForSync): string {
  const traits: string[] = [];

  if (d.triumph > 65) traits.push('achievement');
  if (d.brightness > 65) traits.push('optimism');
  if (d.danceability > 65) traits.push('kinetic energy');
  if (d.aggression > 65) traits.push('raw power');
  if (d.tension > 65) traits.push('cinematic tension');
  if (d.romance > 60) traits.push('emotional intimacy');
  if (d.warmth > 60) traits.push('warmth');
  if (d.melancholy > 60) traits.push('melancholic depth');
  if (d.spirituality > 60) traits.push('spiritual resonance');
  if (d.darkness > 60) traits.push('dark atmosphere');

  if (traits.length === 0) return 'a balanced, moderate emotional signature';
  if (traits.length === 1) return traits[0];
  const last = traits.pop()!;
  return traits.join(', ') + ', and ' + last;
}

function buildLimitationProfile(d: DnaInputForSync, topCats: SyncCategory[]): string {
  const limits: string[] = [];

  const hasFilmTrailer = topCats.includes('film_trailer');
  const hasNetflixDrama = topCats.includes('netflix_drama');

  if (!hasFilmTrailer && d.tension < 45) limits.push('trailers and cinematic productions');
  if (!hasNetflixDrama && d.melancholy < 40 && d.romance < 40) limits.push('emotionally complex streaming drama');
  if (d.danceability < 45) limits.push('commercial advertising and social campaigns');
  if (d.aggression < 40 && d.triumph < 40) limits.push('sports media and action-driven content');
  if (d.warmth < 35 && d.romance < 35) limits.push('luxury brand and lifestyle campaigns');

  if (limits.length === 0) return 'No significant limitations identified. This track demonstrates broad commercial utility.';
  if (limits.length === 1) return `Limited suitability for ${limits[0]}.`;
  const last = limits.pop()!;
  return `The emotional profile limits placement potential in ${limits.join(', ')} and ${last}.`;
}

function buildPrimaryOpportunities(topCats: SyncCategory[], d: DnaInputForSync): string[] {
  const opportunities: string[] = [];

  // Map categories to concrete placement opportunities
  const categoryOpportunityMap: Record<SyncCategory, string[]> = {
    film_trailer:     ['Studio Film Trailers', 'Cinematic Advertising', 'Premium VOD Campaigns'],
    netflix_drama:    ['Streaming Drama Series', 'Prestige TV Placements', 'Film Score Applications'],
    documentary:      ['Feature Documentaries', 'News Magazine Programming', 'Brand Documentary Content'],
    sports_content:   ['Sports Media Broadcasts', 'Athlete Branding Campaigns', 'Fitness Content Creators'],
    gaming:           ['AAA Game Soundtracks', 'Esports Event Scoring', 'Gaming Content Creators'],
    fashion:          ['Fashion Week Campaigns', 'Editorial Film and Photography', 'Luxury Fashion Advertising'],
    luxury_brands:    ['Premium Brand Advertising', 'Automotive Campaigns', 'High-End Retail Environments'],
    travel_campaigns: ['Airline and Hotel Advertising', 'Tourism Board Campaigns', 'Lifestyle Content Creators'],
    commercial_ads:   ['National TV Advertising', 'Digital Ad Campaigns', 'Brand Lifestyle Campaigns'],
    social_content:   ['Social Media Content Creators', 'Viral Campaign Music', 'Influencer Partnerships'],
  };

  for (const cat of topCats.slice(0, 3)) {
    opportunities.push(...categoryOpportunityMap[cat].slice(0, 2));
  }

  // Add genre-specific opportunities
  const genre = d.primaryGenre?.toLowerCase() ?? '';
  if (genre.includes('afrobeats') || genre.includes('afropop')) {
    opportunities.push('Global Brand Campaigns', 'International Sports Events');
  }
  if (genre.includes('hip-hop') || genre.includes('trap')) {
    opportunities.push('Sneaker and Streetwear Brands', 'Urban Lifestyle Campaigns');
  }
  if (genre.includes('electronic') || genre.includes('edm')) {
    opportunities.push('Tech Brand Campaigns', 'Festival and Event Promotion');
  }

  return [...new Set(opportunities)].slice(0, 7);
}

function buildHeadline(topCats: SyncCategory[], overallScore: number, d: DnaInputForSync): string {
  const primary = topCats[0];
  const strengthProfile = buildStrengthProfile(d);

  if (overallScore >= 75) {
    return `Exceptional multi-placement candidate with strong ${SYNC_CATEGORY_LABELS[primary]} utility`;
  }
  if (overallScore >= 60) {
    return `Strong commercial utility with primary strength in ${SYNC_CATEGORY_LABELS[primary]} placements`;
  }
  if (overallScore >= 45) {
    return `Targeted placement candidate — best positioned for ${SYNC_CATEGORY_LABELS[primary]} contexts`;
  }
  return `Specialist placement candidate — niche utility in ${SYNC_CATEGORY_LABELS[primary]}`;
}

function buildBody(d: DnaInputForSync, topCats: SyncCategory[], overallScore: number): string {
  const strengthProfile = buildStrengthProfile(d);
  const limitProfile = buildLimitationProfile(d, topCats);
  const primaryLabel = SYNC_CATEGORY_LABELS[topCats[0]];
  const genre = d.primaryGenre ?? 'this genre';
  const mood = d.moodPrimary?.toLowerCase() ?? 'nuanced';

  let body = `This track demonstrates ${overallScore >= 65 ? 'strong' : overallScore >= 45 ? 'targeted' : 'specialist'} commercial utility`;
  body += ` for ${primaryLabel.toLowerCase()}-oriented`;

  if (topCats.length > 1) {
    body += ` and ${SYNC_CATEGORY_LABELS[topCats[1]].toLowerCase()} campaigns.`;
  } else {
    body += ' campaigns.';
  }

  body += ` Its emotional profile strongly favors ${strengthProfile}. `;

  body += `The ${mood} mood and ${genre} genre identity position this track within a ${overallScore >= 65 ? 'high-demand' : 'defined niche'} placement segment. `;

  body += limitProfile;

  return body;
}

// ── Public API ─────────────────────────────────────────────────────────────────

export function buildExecutiveSyncAssessment(
  d: DnaInputForSync,
  topCategories: SyncCategory[],
  overallScore: number,
): ExecutiveSyncAssessment {
  const cats = topCategories.length > 0 ? topCategories : (['social_content'] as SyncCategory[]);

  const headline = buildHeadline(cats, overallScore, d);
  const body = buildBody(d, cats, overallScore);
  const primaryOpportunities = buildPrimaryOpportunities(cats, d);

  let supervisorVerdict: string;
  if (overallScore >= 75) {
    supervisorVerdict = 'Immediately pitch to top-tier sync agencies and in-house music supervisors. Priority submission for all identified placement categories.';
  } else if (overallScore >= 60) {
    supervisorVerdict = `Focus pitching efforts on ${SYNC_CATEGORY_LABELS[cats[0]]} and ${cats[1] ? SYNC_CATEGORY_LABELS[cats[1]] : 'adjacent categories'}. Curated, targeted outreach will outperform broad library submissions.`;
  } else if (overallScore >= 40) {
    supervisorVerdict = `Submit to specialist libraries aligned with ${SYNC_CATEGORY_LABELS[cats[0]]}. Avoid broad-market pitching. Track requires targeted positioning to reach relevant buyers.`;
  } else {
    supervisorVerdict = 'Further production work recommended before active sync pitching. Consider enhancing the commercial profile through remixing, additional production, or creating an instrumental version.';
  }

  return { headline, body, primaryOpportunities, supervisorVerdict };
}
