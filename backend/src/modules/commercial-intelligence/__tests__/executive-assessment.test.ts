import { describe, it, expect } from 'vitest';
import { buildExecutiveSyncAssessment } from '../executive-assessment';
import { baseDna, lowDna } from './fixtures';
import type { DnaInputForSync, SyncCategory } from '../../sync-intelligence/sync-intelligence.types';

// ─────────────────────────────────────────────────────────────────────────────

describe('buildExecutiveSyncAssessment', () => {

  // ── Headline tiers ─────────────────────────────────────────────────────────

  describe('headline', () => {
    it('score >= 75 → headline starts with "Exceptional"', () => {
      const r = buildExecutiveSyncAssessment(baseDna, ['film_trailer'], 75);
      expect(r.headline).toMatch(/^Exceptional/);
    });

    it('score 74 → headline starts with "Strong"', () => {
      const r = buildExecutiveSyncAssessment(baseDna, ['film_trailer'], 74);
      expect(r.headline).toMatch(/^Strong/);
    });

    it('score >= 60 → headline starts with "Strong"', () => {
      const r = buildExecutiveSyncAssessment(baseDna, ['film_trailer'], 62);
      expect(r.headline).toMatch(/^Strong/);
    });

    it('score 59 → headline starts with "Targeted"', () => {
      const r = buildExecutiveSyncAssessment(baseDna, ['film_trailer'], 59);
      expect(r.headline).toMatch(/^Targeted/);
    });

    it('score >= 45 → headline starts with "Targeted"', () => {
      const r = buildExecutiveSyncAssessment(baseDna, ['film_trailer'], 47);
      expect(r.headline).toMatch(/^Targeted/);
    });

    it('score 44 → headline starts with "Specialist"', () => {
      const r = buildExecutiveSyncAssessment(baseDna, ['film_trailer'], 44);
      expect(r.headline).toMatch(/^Specialist/);
    });

    it('score 0 → headline starts with "Specialist"', () => {
      const r = buildExecutiveSyncAssessment(lowDna, ['social_content'], 0);
      expect(r.headline).toMatch(/^Specialist/);
    });

    it('headline references the top category label', () => {
      const r = buildExecutiveSyncAssessment(baseDna, ['gaming'], 65);
      expect(r.headline.toLowerCase()).toContain('gaming');
    });
  });

  // ── Body ───────────────────────────────────────────────────────────────────

  describe('body', () => {
    it('returns a non-empty string', () => {
      const r = buildExecutiveSyncAssessment(baseDna, ['film_trailer'], 60);
      expect(r.body.length).toBeGreaterThan(0);
    });

    it('body contains the primary genre', () => {
      const r = buildExecutiveSyncAssessment(baseDna, ['film_trailer'], 60);
      expect(r.body).toContain('afrobeats');
    });

    it('null primaryGenre falls back to "this genre"', () => {
      const dna = { ...baseDna, primaryGenre: null } as unknown as DnaInputForSync;
      const r = buildExecutiveSyncAssessment(dna, ['film_trailer'], 60);
      expect(r.body).toContain('this genre');
    });

    it('null moodPrimary falls back to "nuanced"', () => {
      const dna = { ...baseDna, moodPrimary: null } as unknown as DnaInputForSync;
      const r = buildExecutiveSyncAssessment(dna, ['film_trailer'], 60);
      expect(r.body).toContain('nuanced');
    });

    it('body with two top categories references both', () => {
      const r = buildExecutiveSyncAssessment(baseDna, ['film_trailer', 'gaming'], 60);
      expect(r.body.toLowerCase()).toContain('gaming');
    });
  });

  // ── Supervisor verdict tiers ───────────────────────────────────────────────

  describe('supervisorVerdict', () => {
    it('score >= 75 → "Immediately pitch..."', () => {
      const r = buildExecutiveSyncAssessment(baseDna, ['film_trailer'], 75);
      expect(r.supervisorVerdict).toMatch(/immediately pitch/i);
    });

    it('score >= 60 → "Focus pitching efforts..."', () => {
      const r = buildExecutiveSyncAssessment(baseDna, ['film_trailer'], 62);
      expect(r.supervisorVerdict).toMatch(/focus pitching/i);
    });

    it('score >= 40 → "Submit to specialist libraries..."', () => {
      const r = buildExecutiveSyncAssessment(baseDna, ['documentary'], 42);
      expect(r.supervisorVerdict).toMatch(/submit to specialist/i);
    });

    it('score < 40 → "Further production work recommended..."', () => {
      const r = buildExecutiveSyncAssessment(lowDna, ['social_content'], 35);
      expect(r.supervisorVerdict).toMatch(/further production work/i);
    });

    it('score 39 → "Submit to specialist" (boundary)', () => {
      const r = buildExecutiveSyncAssessment(baseDna, ['documentary'], 39);
      expect(r.supervisorVerdict).toMatch(/further production work/i);
    });
  });

  // ── Primary opportunities ──────────────────────────────────────────────────

  describe('primaryOpportunities', () => {
    it('returns at most 7 opportunities', () => {
      const cats: SyncCategory[] = ['film_trailer', 'netflix_drama', 'documentary'];
      const r = buildExecutiveSyncAssessment(baseDna, cats, 65);
      expect(r.primaryOpportunities.length).toBeLessThanOrEqual(7);
    });

    it('opportunities are deduplicated', () => {
      const cats: SyncCategory[] = ['film_trailer', 'film_trailer', 'netflix_drama'] as SyncCategory[];
      const r = buildExecutiveSyncAssessment(baseDna, cats, 65);
      const unique = new Set(r.primaryOpportunities);
      expect(unique.size).toBe(r.primaryOpportunities.length);
    });

    it('hip-hop genre adds "Sneaker and Streetwear Brands" opportunity', () => {
      const dna: DnaInputForSync = { ...baseDna, primaryGenre: 'hip-hop' };
      const r = buildExecutiveSyncAssessment(dna, ['sports_content'], 65);
      expect(r.primaryOpportunities).toContain('Sneaker and Streetwear Brands');
    });

    it('electronic genre adds "Tech Brand Campaigns" opportunity', () => {
      const dna: DnaInputForSync = { ...baseDna, primaryGenre: 'electronic' };
      const r = buildExecutiveSyncAssessment(dna, ['gaming'], 65);
      expect(r.primaryOpportunities).toContain('Tech Brand Campaigns');
    });

    it('afrobeats genre adds "Global Brand Campaigns" opportunity', () => {
      const r = buildExecutiveSyncAssessment(baseDna, ['sports_content'], 65);
      expect(r.primaryOpportunities).toContain('Global Brand Campaigns');
    });
  });

  // ── Edge cases ────────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('empty topCategories defaults to social_content', () => {
      const r = buildExecutiveSyncAssessment(baseDna, [], 50);
      expect(r.headline.toLowerCase()).toContain('social');
    });

    it('single top category still produces all four output fields', () => {
      const r = buildExecutiveSyncAssessment(baseDna, ['luxury_brands'], 55);
      expect(r.headline).toBeTruthy();
      expect(r.body).toBeTruthy();
      expect(r.primaryOpportunities.length).toBeGreaterThan(0);
      expect(r.supervisorVerdict).toBeTruthy();
    });

    it('high triumph + brightness builds a strength profile in the body', () => {
      const dna: DnaInputForSync = { ...baseDna, triumph: 70, brightness: 70 };
      const r = buildExecutiveSyncAssessment(dna, ['sports_content'], 65);
      expect(r.body).toContain('achievement');
      expect(r.body).toContain('optimism');
    });

    it('all moderate values produce "balanced, moderate emotional signature" body text', () => {
      const dna: DnaInputForSync = { ...baseDna,
        triumph: 50, brightness: 50, danceability: 50, aggression: 50,
        tension: 50, romance: 50, warmth: 50, melancholy: 50, spirituality: 50, darkness: 50,
      };
      const r = buildExecutiveSyncAssessment(dna, ['commercial_ads'], 55);
      expect(r.body).toContain('balanced');
    });
  });
});
