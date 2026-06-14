import type { SyncCategory } from '../sync-intelligence/sync-intelligence.types';

// ── SYNC READINESS ENGINE™ ────────────────────────────────────────────────────

export interface ReadinessFactor {
  factor: string;
  points: number;
  direction: 'positive' | 'negative';
}

export interface SyncReadinessScore {
  key: string;
  label: string;
  score: number;
  description: string;
  factors: ReadinessFactor[];
}

export interface SyncReadinessScores {
  hookStrength: SyncReadinessScore;
  energyCurve: SyncReadinessScore;
  vocalClarity: SyncReadinessScore;
  instrumentalValue: SyncReadinessScore;
  replayValue: SyncReadinessScore;
  brandSuitability: SyncReadinessScore;
  overallReadiness: number;
}

// ── MARKET MATCHING ENGINE™ ───────────────────────────────────────────────────

export type MarketCategory =
  | 'sports_content'
  | 'fitness_brands'
  | 'lifestyle_brands'
  | 'luxury_brands'
  | 'fashion_brands'
  | 'gaming_content'
  | 'film_tv'
  | 'commercial_ads'
  | 'documentary'
  | 'trailer_music';

export const MARKET_CATEGORIES: MarketCategory[] = [
  'sports_content', 'fitness_brands', 'lifestyle_brands', 'luxury_brands',
  'fashion_brands', 'gaming_content', 'film_tv', 'commercial_ads', 'documentary', 'trailer_music',
];

export const MARKET_CATEGORY_LABELS: Record<MarketCategory, string> = {
  sports_content:   'Sports Content',
  fitness_brands:   'Fitness Brands',
  lifestyle_brands: 'Lifestyle Brands',
  luxury_brands:    'Luxury Brands',
  fashion_brands:   'Fashion Brands',
  gaming_content:   'Gaming Content',
  film_tv:          'Film & TV',
  commercial_ads:   'Commercial Ads',
  documentary:      'Documentary',
  trailer_music:    'Trailer Music',
};

export interface MarketMatch {
  market: MarketCategory;
  label: string;
  matchScore: number;
  confidenceScore: number;
  ranking: number;
  matchReasons: string[];
}

// ── DATIAM VERDICT V2™ ────────────────────────────────────────────────────────

export interface VerdictStrengthFactor {
  label: string;
  description: string;
  impact: number;
}

export interface VerdictRiskFactor {
  label: string;
  description: string;
  impact: number;
}

export interface VerdictRecommendedAction {
  priority: number;
  action: string;
  rationale: string;
}

// ── REVENUE TIER FORECAST™ ────────────────────────────────────────────────────

export interface RevenueTierBreakdown {
  syncPotential:    { min: number; max: number; formatted: string };
  creatorLicensing: { min: number; max: number; formatted: string };
  sportsContent:    { min: number; max: number; formatted: string };
  brandPlacement:   { min: number; max: number; formatted: string };
}

export interface RevenueTierEntry {
  totalMin: number;
  totalMax: number;
  formattedTotal: string;
  breakdown: RevenueTierBreakdown;
  assumptions: string;
}

export interface RevenueTierForecast {
  conservative: RevenueTierEntry;
  expected:     RevenueTierEntry;
  aggressive:   RevenueTierEntry;
}

// ── PROSPECT DISCOVERY ENGINE™ ────────────────────────────────────────────────

export interface ProspectTarget {
  companyName: string;
  category: string;
  matchScore: number;
  reason: string;
  type: 'sync' | 'brand' | 'creator' | 'sports';
}

export interface ProspectDiscovery {
  syncTargets:    ProspectTarget[];
  brandTargets:   ProspectTarget[];
  creatorTargets: ProspectTarget[];
  sportsTargets:  ProspectTarget[];
}

// ── EXECUTIVE REPORT V2™ ──────────────────────────────────────────────────────

export interface ExecutiveReportV2 {
  commercialSummary: string;
  audienceSummary:   string;
  marketSummary:     string;
  revenueSummary:    string;
  improvementPlan:   string[];
}

// ── WHY ENGINE™ ───────────────────────────────────────────────────────────────

export interface ScoreFactor {
  label: string;
  description: string;
  impact: 'positive' | 'negative';
  strength: 'strong' | 'moderate' | 'weak';
}

export interface WhyScore {
  category: SyncCategory;
  label: string;
  score: number;
  confidence: number;
  positiveFactors: ScoreFactor[];
  negativeFactors: ScoreFactor[];
  confidenceLabel: 'Very High' | 'High' | 'Moderate' | 'Low' | 'Very Low';
}

// ── COMMERCIAL PLACEMENT POTENTIAL™ ──────────────────────────────────────────

export type PlacementClass = 'Very Low' | 'Low' | 'Moderate' | 'Strong' | 'Exceptional';

export interface CommercialPlacementPotential {
  score: number;
  classification: PlacementClass;
  description: string;
  colorKey: 'red' | 'orange' | 'yellow' | 'green' | 'cyan';
}

// ── EXECUTIVE SYNC ASSESSMENT™ ────────────────────────────────────────────────

export interface ExecutiveSyncAssessment {
  headline: string;
  body: string;
  primaryOpportunities: string[];
  supervisorVerdict: string;
}

// ── MARKET ALIGNMENT ANALYSIS™ ────────────────────────────────────────────────

export type DemandLevel = 'Very High' | 'High' | 'Medium' | 'Low' | 'Niche';
export type CompetitionLevel = 'Very High' | 'High' | 'Medium' | 'Low';
export type GrowthPotential = 'High' | 'Medium' | 'Low' | 'Declining';

export interface MarketAlignment {
  category: SyncCategory;
  label: string;
  alignmentScore: number;
  demand: DemandLevel;
  competition: CompetitionLevel;
  growth: GrowthPotential;
  marketNote: string;
}

// ── REVENUE FORECAST ENGINE™ ──────────────────────────────────────────────────

export type LikelihoodLevel = 'High' | 'Medium' | 'Low' | 'Very Low';
export type RevenueClass = 'Premium' | 'Emerging' | 'Speculative' | 'Marginal';

export interface RevenueForecast {
  category: SyncCategory;
  label: string;
  licenseRangeMin: number;
  licenseRangeMax: number;
  formattedRange: string;
  likelihood: LikelihoodLevel;
  revenueClass: RevenueClass;
  commercialValue: string;
  annualEstimateMin: number;
  annualEstimateMax: number;
  formattedAnnualEstimate: string;
}

// ── COMPARABLE ARTIST INTELLIGENCE™ ──────────────────────────────────────────

export interface ComparableArtist {
  name: string;
  similarity: number;
  genre: string;
  knownPlacements: string[];
  sharedEmotionalTraits: string[];
  sharedCommercialPatterns: string[];
  similarityReason: string;
}

// ── SYNC RISK ASSESSMENT™ ─────────────────────────────────────────────────────

export type RiskLevel = 'Low' | 'Moderate' | 'High' | 'Critical';
export type RiskStatus = 'clear' | 'flag' | 'warning' | 'unknown';

export interface RiskFactor {
  label: string;
  status: RiskStatus;
  detail: string;
  riskLevel: RiskLevel;
}

export interface SyncRiskAssessment {
  overallRisk: RiskLevel;
  riskScore: number;
  factors: RiskFactor[];
  recommendation: string;
}

// ── DECISION ENGINE™ ──────────────────────────────────────────────────────────

export type ImpactLevel = 'High' | 'Medium' | 'Low';
export type TimeframeLabel = 'Immediate' | 'Short-term' | 'Long-term';

export interface RecommendedAction {
  priority: number;
  title: string;
  description: string;
  impact: ImpactLevel;
  timeframe: TimeframeLabel;
  targetAudience: string;
  channel: string;
}

export interface DecisionEngineOutput {
  actions: RecommendedAction[];
  primaryFocus: string;
  strategyType: 'Aggressive Pitch' | 'Targeted Pitch' | 'Library Submission' | 'Development Needed';
}

// ── DATIAM VERDICT™ ───────────────────────────────────────────────────────────

export type CommercialOutlook = 'Exceptional' | 'Strong' | 'Moderate' | 'Limited' | 'Developing';
export type VerdictRecommendation =
  | 'Pitch Immediately'
  | 'Targeted Outreach'
  | 'Develop Further'
  | 'Niche Placement Only'
  | 'Not Ready';

export interface DatiamVerdict {
  commercialOutlook: CommercialOutlook;
  bestOpportunity: string;
  bestRevenuePath: string;
  bestAudience: string[];
  syncReadiness: number;
  recommendation: VerdictRecommendation;
  executiveSummary: string;
  confidenceScore: number;
  // V2 fields — always present in upgraded engine
  strengthFactors:     VerdictStrengthFactor[];
  riskFactors:         VerdictRiskFactor[];
  recommendedActions:  VerdictRecommendedAction[];
}

// ── FULL COMMERCIAL INTELLIGENCE REPORT ──────────────────────────────────────

export interface CommercialIntelligenceReport {
  uploadId: string;
  fileName: string | null;
  overallSyncScore: number;
  generatedAt: string;

  // V1 engines (preserved)
  whyScores: WhyScore[];
  executiveSyncAssessment: ExecutiveSyncAssessment;
  commercialPlacementPotential: CommercialPlacementPotential;
  marketAlignment: MarketAlignment[];
  revenueForecast: RevenueForecast[];
  comparableArtists: ComparableArtist[];
  syncRiskAssessment: SyncRiskAssessment;
  decisionEngine: DecisionEngineOutput;
  datiamVerdict: DatiamVerdict;

  // V2 engines (new in Music Intelligence upgrade)
  syncReadinessScores: SyncReadinessScores;
  marketMatches: MarketMatch[];
  revenueTierForecast: RevenueTierForecast;
  prospectDiscovery: ProspectDiscovery;
  executiveReportV2: ExecutiveReportV2;
}

// ── DNA INPUT CONTRACT (re-export friendly alias) ─────────────────────────────

export type { DnaInputForSync, SyncCategory, CategoryScore } from '../sync-intelligence/sync-intelligence.types';
