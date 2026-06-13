import { describe, it, expect } from 'vitest';
import { buildSyncRiskAssessment } from '../risk-assessment';
import { baseDna, cinematicDna, lowDna, riskDna, makeScores } from './fixtures';
import type { DnaInputForSync } from '../../sync-intelligence/sync-intelligence.types';

// ─────────────────────────────────────────────────────────────────────────────

describe('buildSyncRiskAssessment', () => {

  // ── Output structure ───────────────────────────────────────────────────────

  describe('output structure', () => {
    it('returns exactly 7 risk factors', () => {
      const r = buildSyncRiskAssessment(baseDna, makeScores(), 55);
      expect(r.factors).toHaveLength(7);
    });

    it('has overallRisk, riskScore, factors, and recommendation', () => {
      const r = buildSyncRiskAssessment(baseDna, makeScores(), 55);
      expect(r).toMatchObject({
        overallRisk:     expect.any(String),
        riskScore:       expect.any(Number),
        factors:         expect.any(Array),
        recommendation:  expect.any(String),
      });
    });

    it('riskScore is between 0 and 100', () => {
      for (const dna of [baseDna, cinematicDna, riskDna, lowDna]) {
        const r = buildSyncRiskAssessment(dna, makeScores(), 50);
        expect(r.riskScore).toBeGreaterThanOrEqual(0);
        expect(r.riskScore).toBeLessThanOrEqual(100);
      }
    });
  });

  // ── Content risk ──────────────────────────────────────────────────────────

  describe('ContentRisk factor (always unknown)', () => {
    it('always has status "unknown" and riskLevel "Low"', () => {
      const r = buildSyncRiskAssessment(baseDna, makeScores(), 55);
      const factor = r.factors.find(f => f.label === 'Explicit Content')!;
      expect(factor.status).toBe('unknown');
      expect(factor.riskLevel).toBe('Low');
    });
  });

  // ── Sample clearance risk ──────────────────────────────────────────────────

  describe('ClearanceRisk factor', () => {
    it('hip-hop genre → "Sample Clearance Risk" warning, Moderate', () => {
      const dna: DnaInputForSync = { ...baseDna, primaryGenre: 'hip-hop' };
      const factor = buildSyncRiskAssessment(dna, makeScores(), 55)
        .factors.find(f => f.label === 'Sample Clearance Risk')!;
      expect(factor.status).toBe('warning');
      expect(factor.riskLevel).toBe('Moderate');
    });

    it('trap genre → "Sample Clearance Risk" warning', () => {
      const dna: DnaInputForSync = { ...baseDna, primaryGenre: 'trap' };
      const factor = buildSyncRiskAssessment(dna, makeScores(), 55)
        .factors.find(f => f.label === 'Sample Clearance Risk')!;
      expect(factor.status).toBe('warning');
    });

    it('r&b genre → "Sample Clearance Risk" warning', () => {
      const dna: DnaInputForSync = { ...baseDna, primaryGenre: 'r&b' };
      const factor = buildSyncRiskAssessment(dna, makeScores(), 55)
        .factors.find(f => f.label === 'Sample Clearance Risk')!;
      expect(factor.status).toBe('warning');
    });

    it('cinematic genre → "Sample Clearance" clear, Low', () => {
      const factor = buildSyncRiskAssessment(cinematicDna, makeScores(), 55)
        .factors.find(f => f.label === 'Sample Clearance')!;
      expect(factor.status).toBe('clear');
      expect(factor.riskLevel).toBe('Low');
    });
  });

  // ── Cinematic utility risk ─────────────────────────────────────────────────

  describe('CinematicUtility factor', () => {
    it('film_trailer < 35 AND netflix_drama < 35 → "Low Cinematic Utility" flag, Moderate', () => {
      const scores = makeScores({ film_trailer: { score: 30 }, netflix_drama: { score: 25 } });
      const factor = buildSyncRiskAssessment(baseDna, scores, 45)
        .factors.find(f => f.label === 'Low Cinematic Utility')!;
      expect(factor.status).toBe('flag');
      expect(factor.riskLevel).toBe('Moderate');
    });

    it('film_trailer < 50 AND netflix_drama < 50 → "Limited Cinematic Range" warning, Low', () => {
      const scores = makeScores({ film_trailer: { score: 40 }, netflix_drama: { score: 40 } });
      const factor = buildSyncRiskAssessment(baseDna, scores, 50)
        .factors.find(f => f.label === 'Limited Cinematic Range')!;
      expect(factor.status).toBe('warning');
      expect(factor.riskLevel).toBe('Low');
    });

    it('film_trailer >= 50 → "Cinematic Utility" clear', () => {
      const scores = makeScores({ film_trailer: { score: 65 }, netflix_drama: { score: 55 } });
      const factor = buildSyncRiskAssessment(baseDna, scores, 60)
        .factors.find(f => f.label === 'Cinematic Utility')!;
      expect(factor.status).toBe('clear');
    });
  });

  // ── Genre competition risk ─────────────────────────────────────────────────

  describe('GenreCompetition factor', () => {
    it('pop genre → "High Genre Competition" flag, Moderate', () => {
      const factor = buildSyncRiskAssessment(riskDna, makeScores(), 50)
        .factors.find(f => f.label === 'High Genre Competition')!;
      expect(factor.status).toBe('flag');
      expect(factor.riskLevel).toBe('Moderate');
    });

    it('hip-hop genre → "High Genre Competition" flag', () => {
      const dna: DnaInputForSync = { ...baseDna, primaryGenre: 'hip-hop' };
      const factor = buildSyncRiskAssessment(dna, makeScores(), 50)
        .factors.find(f => f.label === 'High Genre Competition')!;
      expect(factor.status).toBe('flag');
    });

    it('afrobeats genre → "Medium Genre Competition" warning, Low', () => {
      const factor = buildSyncRiskAssessment(baseDna, makeScores(), 50)
        .factors.find(f => f.label === 'Medium Genre Competition')!;
      expect(factor.status).toBe('warning');
      expect(factor.riskLevel).toBe('Low');
    });

    it('cinematic genre → "Niche Genre Positioning" clear, Low', () => {
      const factor = buildSyncRiskAssessment(cinematicDna, makeScores(), 60)
        .factors.find(f => f.label === 'Niche Genre Positioning')!;
      expect(factor.status).toBe('clear');
      expect(factor.riskLevel).toBe('Low');
    });
  });

  // ── Commercial saturation risk ─────────────────────────────────────────────

  describe('CommercialSaturation factor', () => {
    it('pop + uplifting mood + score < 60 → "Moderate Commercial Saturation" warning', () => {
      const factor = buildSyncRiskAssessment(riskDna, makeScores(), 55)
        .factors.find(f => f.label === 'Moderate Commercial Saturation')!;
      expect(factor.status).toBe('warning');
      expect(factor.riskLevel).toBe('Moderate');
    });

    it('pop + uplifting mood + score >= 60 → "Commercial Saturation" clear', () => {
      const factor = buildSyncRiskAssessment(riskDna, makeScores(), 65)
        .factors.find(f => f.label === 'Commercial Saturation')!;
      expect(factor.status).toBe('clear');
    });

    it('cinematic genre → "Commercial Saturation" clear (not in saturated list)', () => {
      const factor = buildSyncRiskAssessment(cinematicDna, makeScores(), 50)
        .factors.find(f => f.label === 'Commercial Saturation')!;
      expect(factor.status).toBe('clear');
    });
  });

  // ── Broadcast suitability risk ─────────────────────────────────────────────

  describe('BroadcastSuitability factor', () => {
    it('aggression > 80 AND darkness > 75 → "Broadcast Restriction Risk" flag, Moderate', () => {
      const factor = buildSyncRiskAssessment(riskDna, makeScores(), 50)
        .factors.find(f => f.label === 'Broadcast Restriction Risk')!;
      // riskDna: aggression=85, darkness=78
      expect(factor.status).toBe('flag');
      expect(factor.riskLevel).toBe('Moderate');
    });

    it('normal aggression/darkness → "Broadcast Suitability" clear', () => {
      const factor = buildSyncRiskAssessment(baseDna, makeScores(), 55)
        .factors.find(f => f.label === 'Broadcast Suitability')!;
      expect(factor.status).toBe('clear');
    });

    it('high aggression but low darkness → "Broadcast Suitability" clear', () => {
      const dna: DnaInputForSync = { ...baseDna, aggression: 85, darkness: 50 };
      const factor = buildSyncRiskAssessment(dna, makeScores(), 55)
        .factors.find(f => f.label === 'Broadcast Suitability')!;
      expect(factor.status).toBe('clear');
    });
  });

  // ── Vocal dependency risk ──────────────────────────────────────────────────

  describe('VocalDependency factor', () => {
    it('pop genre → "Vocal Dependency Risk" warning, Low', () => {
      const factor = buildSyncRiskAssessment(riskDna, makeScores(), 55)
        .factors.find(f => f.label === 'Vocal Dependency Risk')!;
      expect(factor.status).toBe('warning');
      expect(factor.riskLevel).toBe('Low');
    });

    it('r&b genre → "Vocal Dependency Risk" warning', () => {
      const dna: DnaInputForSync = { ...baseDna, primaryGenre: 'r&b' };
      const factor = buildSyncRiskAssessment(dna, makeScores(), 55)
        .factors.find(f => f.label === 'Vocal Dependency Risk')!;
      expect(factor.status).toBe('warning');
    });

    it('cinematic genre → "Version Availability" unknown, Low', () => {
      const factor = buildSyncRiskAssessment(cinematicDna, makeScores(), 60)
        .factors.find(f => f.label === 'Version Availability')!;
      expect(factor.status).toBe('unknown');
      expect(factor.riskLevel).toBe('Low');
    });
  });

  // ── Overall risk level ────────────────────────────────────────────────────

  describe('overallRisk', () => {
    it('no flags and no warnings → "Low"', () => {
      // cinematic: clear clearance, clear broadcast, niche genre, clear saturation, clear vocal
      // but cinematic utility might flag if scores are low
      const scores = makeScores({
        film_trailer: { score: 60 },
        netflix_drama: { score: 55 },
      });
      const r = buildSyncRiskAssessment(cinematicDna, scores, 60);
      expect(r.overallRisk).toBe('Low');
    });

    it('at least one flag or warning → "Moderate"', () => {
      // afrobeats: medium genre competition (warning) → mediumCount >= 1
      const r = buildSyncRiskAssessment(baseDna, makeScores(), 55);
      expect(r.overallRisk).toBe('Moderate');
    });

    it('"High" overallRisk is unreachable with current evaluators (no High/Critical flagged factors exist)', () => {
      // All current evaluators max out at riskLevel "Moderate" — highCount is always 0
      for (const dna of [baseDna, cinematicDna, lowDna, riskDna]) {
        const r = buildSyncRiskAssessment(dna, makeScores(), 50);
        expect(r.overallRisk).not.toBe('High');
      }
    });
  });

  // ── Risk score calculation ────────────────────────────────────────────────

  describe('riskScore', () => {
    it('completely clean track has riskScore 0', () => {
      // cinematic + high cinematic scores + no saturated genres
      const scores = makeScores({
        film_trailer: { score: 65 },
        netflix_drama: { score: 60 },
      });
      const r = buildSyncRiskAssessment(cinematicDna, scores, 65);
      expect(r.riskScore).toBe(0);
    });

    it('each Moderate flag adds 20 and each Low warning adds 5', () => {
      // riskDna: pop (High Competition flag=Moderate=20) + uplifting+pop+score<60 (saturation warning=Moderate=20)
      //          + broadcast flag (aggression>80 && darkness>75) (=Moderate=20)
      //          + vocal warning (pop) (=Low=5)
      //          + clearance: pop not hip-hop/trap/r&b so status='clear'
      // So flags: GenreCompetition(Moderate=20) + BroadcastSuitability(Moderate=20) = 40
      // Warnings: CommercialSaturation(Moderate=20) + VocalDependency(Low=5) = 25
      // Total = 65
      const scores = makeScores({ film_trailer: { score: 65 }, netflix_drama: { score: 60 } });
      const r = buildSyncRiskAssessment(riskDna, scores, 55);
      expect(r.riskScore).toBe(65);
    });
  });

  // ── Recommendation messages ───────────────────────────────────────────────

  describe('recommendation', () => {
    it('"Low" risk → recommendation mentions "Proceed with active pitch"', () => {
      const scores = makeScores({ film_trailer: { score: 65 }, netflix_drama: { score: 60 } });
      const r = buildSyncRiskAssessment(cinematicDna, scores, 65);
      expect(r.recommendation).toMatch(/proceed with active pitch/i);
    });

    it('"Moderate" risk → recommendation mentions "Address flagged items"', () => {
      const r = buildSyncRiskAssessment(baseDna, makeScores(), 55);
      expect(r.recommendation).toMatch(/address flagged items/i);
    });
  });
});
