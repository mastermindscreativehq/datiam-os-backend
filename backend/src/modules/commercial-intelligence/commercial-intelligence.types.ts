import type { SyncCategory } from '../sync-intelligence/sync-intelligence.types';

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
}

// ── FULL COMMERCIAL INTELLIGENCE REPORT ──────────────────────────────────────

export interface CommercialIntelligenceReport {
  uploadId: string;
  fileName: string | null;
  overallSyncScore: number;
  generatedAt: string;

  whyScores: WhyScore[];
  executiveSyncAssessment: ExecutiveSyncAssessment;
  commercialPlacementPotential: CommercialPlacementPotential;
  marketAlignment: MarketAlignment[];
  revenueForecast: RevenueForecast[];
  comparableArtists: ComparableArtist[];
  syncRiskAssessment: SyncRiskAssessment;
  decisionEngine: DecisionEngineOutput;
  datiamVerdict: DatiamVerdict;
}

// ── DNA INPUT CONTRACT (re-export friendly alias) ─────────────────────────────

export type { DnaInputForSync, SyncCategory, CategoryScore } from '../sync-intelligence/sync-intelligence.types';
