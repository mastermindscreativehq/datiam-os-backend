import { z } from 'zod';

export const analyzeOpportunitySchema = z.object({
  genre:        z.string().min(1),
  mood:         z.string().min(1),
  bpm:          z.number().int().min(40).max(220),
  territory:    z.string().min(1).default('worldwide'),
  license_type: z.string().optional(),
  song_id:      z.string().uuid().optional(),
  artist_id:    z.string().uuid().optional(),
  upload_id:    z.string().uuid().optional(),
  company_id:   z.string().uuid().optional(),
  contact_id:   z.string().uuid().optional(),
});

export type AnalyzeOpportunityInput = z.infer<typeof analyzeOpportunitySchema>;

export interface Recommendation {
  priority:  'high' | 'medium' | 'low';
  action:    string;
  rationale: string;
  category:  'contact' | 'company' | 'track' | 'territory' | 'timing';
}

export interface ScoreBreakdown {
  placement_score:  number;
  match_score:      number;
  genre_fit:        number;
  bpm_fit:          number;
  mood_fit:         number;
  territory_fit:    number;
  artist_history:   number;
  company_match:    number;
  contact_match:    number;
}

export interface PlacementAnalysisResult {
  placement_probability: number;
  confidence:            number;
  reasoning:             string;
  recommendations:       Recommendation[];
  score_breakdown:       ScoreBreakdown;
  data_points_used:      number;
  prediction_id:         string;
}
