import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { makeContext, makeResults } from './fixtures';
import { recommendTimingCountriesDsps, generateExecutiveBrief } from '../release-intel.service';

describe('recommendTimingCountriesDsps', () => {
  it('flags insufficient lead time when the release date is close', () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 5);
    const ctx = makeContext({ release: { ...makeContext().release, release_date: soon.toISOString().slice(0, 10) } as any });

    const result = recommendTimingCountriesDsps(ctx);

    expect(result.recommendedReleaseWindow.leadTimeDays).toBeLessThan(21);
    expect(result.recommendedReleaseWindow.reasoning).toContain('lead time');
  });

  it('confirms sufficient runway for a release date 6 weeks out', () => {
    const future = new Date();
    future.setDate(future.getDate() + 42);
    const ctx = makeContext({ release: { ...makeContext().release, release_date: future.toISOString().slice(0, 10) } as any });

    const result = recommendTimingCountriesDsps(ctx);

    expect(result.recommendedReleaseWindow.leadTimeDays).toBeGreaterThanOrEqual(21);
    expect(result.recommendedReleaseWindow.reasoning).toContain('sufficient runway');
  });

  it('recommends no release date as an explicit gap, not a fabricated date', () => {
    const ctx = makeContext({ release: { ...makeContext().release, release_date: null } as any });

    const result = recommendTimingCountriesDsps(ctx);

    expect(result.recommendedReleaseWindow.leadTimeDays).toBeNull();
    expect(result.recommendedReleaseWindow.reasoning).toContain('No release date set');
  });

  it('derives target countries from real fan/platform data when available', () => {
    const ctx = makeContext({
      platformTopCountries: ['Nigeria', 'United States'],
      fanCountryBreakdown: { Nigeria: 40, 'United Kingdom': 10 },
    });

    const result = recommendTimingCountriesDsps(ctx);

    expect(result.dataCompleteness).toBe('full');
    expect(result.recommendedCountries[0].country).toBe('Nigeria');
    expect(result.recommendedCountries.every((c) => c.source === 'fan_and_platform_data')).toBe(true);
  });

  it('falls back to the artist home market and flags the gap when there is no geo data', () => {
    const ctx = makeContext({ platformTopCountries: [], fanCountryBreakdown: {}, artist: { id: 'artist-1', genre: null, country: 'NG' } });

    const result = recommendTimingCountriesDsps(ctx);

    expect(result.dataCompleteness).toBe('metadata_only');
    expect(result.recommendedCountries).toHaveLength(1);
    expect(result.recommendedCountries[0].source).toContain('no_fan_or_platform_data');
  });

  it('marks a DSP as ready only when the release actually has that URL filled in', () => {
    const ctx = makeContext({ release: { ...makeContext().release, spotify_url: 'https://open.spotify.com/x', apple_music_url: null } as any });

    const result = recommendTimingCountriesDsps(ctx);

    const spotify = result.recommendedDsps.find((d) => d.platform === 'Spotify')!;
    const apple = result.recommendedDsps.find((d) => d.platform === 'Apple Music')!;
    expect(spotify.priority).toBe('ready');
    expect(apple.priority).toBe('action_needed');
  });

  it('recommends a debut rollout strategy for an artist with no prior releases', () => {
    const ctx = makeContext({ pastReleaseCount: 0 });
    expect(recommendTimingCountriesDsps(ctx).rolloutStrategy.phase).toBe('debut');
  });

  it('recommends an established rollout strategy for an artist with a track record', () => {
    const ctx = makeContext({ pastReleaseCount: 5 });
    expect(recommendTimingCountriesDsps(ctx).rolloutStrategy.phase).toBe('established');
  });
});

describe('generateExecutiveBrief', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-test-mock-key');
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  it('uses the AI response and marks usedAI/confidence accordingly when the call succeeds', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{
          text: JSON.stringify({
            summary: 'AI summary', strengths: ['s1'], weaknesses: ['w1'],
            commercial_outlook: 'co', viral_outlook: 'vo', sync_outlook: 'so', playlist_outlook: 'po',
            audience_recommendations: ['a1'], priority_actions: ['p1'], risk_assessment: 'r1',
            execution_plan_30d: ['Week 1: x'],
          }),
        }],
      }),
    }) as any;

    const ctx = makeContext();
    const timing = recommendTimingCountriesDsps(ctx);
    const brief = await generateExecutiveBrief(ctx, makeResults(), timing);

    expect(brief.usedAI).toBe(true);
    expect(brief.confidenceScore).toBe(0.85);
    expect(brief.content.summary).toBe('AI summary');
  });

  it('falls back to the rule-based brief when the AI call fails, without throwing', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network down')) as any;

    const ctx = makeContext();
    const timing = recommendTimingCountriesDsps(ctx);
    const brief = await generateExecutiveBrief(ctx, makeResults(), timing);

    expect(brief.usedAI).toBe(false);
    expect(brief.confidenceScore).toBe(0.70);
    expect(brief.content.summary).toContain('Test Release');
  });

  it('falls back to the rule-based brief when no API key is configured', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '');
    global.fetch = vi.fn() as any;

    const ctx = makeContext();
    const timing = recommendTimingCountriesDsps(ctx);
    const brief = await generateExecutiveBrief(ctx, makeResults(), timing);

    expect(global.fetch).not.toHaveBeenCalled();
    expect(brief.usedAI).toBe(false);
  });

  it('rule-based brief surfaces missing-audio gaps as priority actions, not fabricated data', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '');

    const ctx = makeContext();
    const timing = recommendTimingCountriesDsps(ctx);
    const results = makeResults({ commercial: { key: 'commercial', score: null, summary: 'no data', dataCompleteness: 'metadata_only' } });
    const brief = await generateExecutiveBrief(ctx, results, timing);

    expect(brief.content.priority_actions.some((a) => a.toLowerCase().includes('sync intelligence'))).toBe(true);
  });
});
