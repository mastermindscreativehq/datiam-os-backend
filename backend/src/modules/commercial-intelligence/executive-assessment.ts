import type { DnaInputForSync, SyncCategory } from '../sync-intelligence/sync-intelligence.types';
import { SYNC_CATEGORY_LABELS } from '../sync-intelligence/sync-intelligence.types';
import type { ExecutiveSyncAssessment, ExecutiveReportV2 } from './commercial-intelligence.types';

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

// ── Executive Report V2 (A&R Style) ──────────────────────────────────────────

export function buildExecutiveReportV2(
  d: DnaInputForSync,
  topCategories: SyncCategory[],
  overallScore: number,
): ExecutiveReportV2 {
  const cats = topCategories.length > 0 ? topCategories : (['social_content'] as SyncCategory[]);
  const primaryLabel = SYNC_CATEGORY_LABELS[cats[0]];
  const secondaryLabel = cats[1] ? SYNC_CATEGORY_LABELS[cats[1]] : null;
  const genre = d.primaryGenre ?? 'this genre';
  const mood = d.moodPrimary?.toLowerCase() ?? 'nuanced';
  const outlook = overallScore >= 75 ? 'exceptional' : overallScore >= 60 ? 'strong' : overallScore >= 45 ? 'moderate' : 'limited';

  const commercialSummary = (() => {
    if (overallScore >= 75) {
      return `This ${genre} track demonstrates exceptional commercial viability with a ${mood} emotional signature commanding premium consideration from major sync buyers. Overall commercial score of ${overallScore}/100 places this track in the top tier of placement-ready material. The combination of ${buildStrengthProfile(d)} positions this work for immediate pitch to first-tier supervisors across multiple categories.`;
    }
    if (overallScore >= 60) {
      return `A commercially strong ${genre} track with a ${mood} profile that demonstrates clear placement utility across targeted sync categories. With an overall commercial score of ${overallScore}/100, this track is well-positioned for a focused outreach campaign to ${primaryLabel.toLowerCase()} supervisors and relevant brand partners. The emotional architecture is commercially coherent and consistently aligns with buyer expectations in this space.`;
    }
    if (overallScore >= 45) {
      return `This ${genre} track presents moderate commercial sync utility with a ${mood} emotional character best suited for specialist categories. The commercial score of ${overallScore}/100 reflects genuine potential in ${primaryLabel.toLowerCase()} contexts, though broader market appeal requires further positioning. Library submissions and niche channel pitching are recommended as the primary strategy.`;
    }
    return `This ${genre} track is currently at an early stage of commercial sync viability. The ${mood} emotional profile has foundational qualities that require further development and production refinement. At ${overallScore}/100, the track is best suited for library deposit and targeted development rather than active pitching to major supervisors.`;
  })();

  const audienceSummary = (() => {
    const primary = cats[0];
    const audienceMap: Record<SyncCategory, string> = {
      film_trailer:     'Major studio music supervisors, trailer production companies, and cinematic advertising agencies represent the primary audience. These buyers require technically polished, high-impact tracks with clear build-and-release structure.',
      netflix_drama:    'Streaming platform music supervisors and prestige TV production companies are the core buyers. This audience prioritizes emotional depth, character alignment, and scene-specific suitability.',
      documentary:      'Independent documentary filmmakers, streaming documentary divisions, and editorial content producers. Budget ranges are moderate but volume is consistent for tracks that serve authentic storytelling.',
      sports_content:   'Sports media brands (ESPN, Sky Sports), athlete-facing marketing agencies, and fitness content creators. This audience rewards high energy, triumph, and motivational emotional profiles.',
      gaming:           'AAA game studio music directors, esports production teams, and gaming content creators. Technical precision and dynamic range are prioritized alongside emotional impact.',
      fashion:          'Fashion brand creative directors, editorial production agencies, and runway event producers. Aesthetic coherence and visual-music alignment drive purchasing decisions.',
      luxury_brands:    'Premium automotive, fragrance, and jewelry brand campaigns. This is the highest per-placement revenue category with the most selective buyer criteria.',
      travel_campaigns: 'Airline, hotel, and tourism board creative teams. Seasonal purchasing peaks, with preference for aspirational, warm emotional profiles.',
      commercial_ads:   'National advertising agencies, digital campaign producers, and in-house brand teams. Highest volume category — diverse emotional range is acceptable, but commercial clarity is essential.',
      social_content:   'Content creators, brand social media teams, and influencer partnerships. Fastest-moving category — hook-forward, short-form suitability is a primary driver.',
    };
    let summary = audienceMap[primary];
    if (secondaryLabel) {
      summary += ` Secondary audience opportunity in ${secondaryLabel.toLowerCase()} adds breadth to the outreach strategy.`;
    }
    return summary;
  })();

  const marketSummary = (() => {
    const topTwo = cats.slice(0, 2).map(c => SYNC_CATEGORY_LABELS[c]).join(' and ');
    const demand = overallScore >= 65 ? 'high demand with limited competition in this emotional tier' : 'moderate demand with clear category-specific niche';
    return `Primary market strength lies in ${topTwo} contexts, where current market conditions show ${demand}. ${overallScore >= 60 ? `The ${genre} genre continues to perform well in ${primaryLabel.toLowerCase()} placements, with buyer appetite for ${mood} emotional profiles remaining strong through 2025–2026.` : `The ${genre} genre occupies a specialist position in the ${primaryLabel.toLowerCase()} category, where targeted placement through specialist channels will outperform broad-market submissions.`}`;
  })();

  const revenueSummary = (() => {
    if (overallScore >= 70) {
      return `Based on current market rates and commercial score, expected annual sync revenue in the ${primaryLabel} category ranges from $8,000–$45,000/yr under realistic placement scenarios. Total cross-category potential (including brand, sports, and creator licensing) projects to $20,000–$80,000/yr with active representation. Aggressive scenario with major brand placement: $100,000+/yr.`;
    }
    if (overallScore >= 50) {
      return `Estimated annual sync potential of $3,000–$18,000/yr based on primary category rates and placement frequency. With targeted outreach and library placement across 2–3 categories, creator and brand licensing can add $5,000–$15,000/yr. Conservative library submission approach projects $2,000–$8,000/yr.`;
    }
    return `At current commercial score, passive library licensing represents the primary near-term revenue path, projecting $500–$4,000/yr. Active development of a commercial edit and instrumental version could unlock $3,000–$12,000/yr in improved placement scenarios.`;
  })();

  const improvementPlan: string[] = [];
  if (d.aggression > 70 || d.darkness > 70) improvementPlan.push('Create brand-safe edit with reduced aggression and darkness for mainstream commercial use');
  if (overallScore < 70) improvementPlan.push('Develop instrumental version to unlock underscore, trailer, and brand placement categories');
  if (d.dropStrength < 50) improvementPlan.push('Strengthen chorus and drop sections to improve hook score and immediate commercial appeal');
  if (d.retention < 50) improvementPlan.push('Improve arrangement dynamics and variation to increase replay value and campaign durability');
  if (overallScore < 65) improvementPlan.push('Create 30-second and 60-second commercial edits optimized for ad placement');
  improvementPlan.push(`Register all rights and metadata with PRO and music licensing databases before active pitching`);
  if (overallScore >= 55) improvementPlan.push('Engage specialized sync licensing agency for representation in primary target categories');
  if (cats[0] === 'sports_content' || cats[0] === 'gaming') improvementPlan.push('Target sports media and gaming editorial calendars for seasonal placement opportunities');

  return { commercialSummary, audienceSummary, marketSummary, revenueSummary, improvementPlan: improvementPlan.slice(0, 5) };
}
