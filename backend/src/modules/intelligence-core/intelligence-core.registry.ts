import type { IntelligenceContext, IntelligenceProvider, ProviderResult } from './intelligence-core.types';

const providers = new Map<string, IntelligenceProvider>();

/**
 * Registers a provider under its key, replacing any provider already
 * registered under that key. This is how a future dedicated module (e.g. a
 * standalone Playlist Intel engine) takes over scoring for its domain
 * without the orchestrator changing at all.
 */
export function registerProvider(provider: IntelligenceProvider): void {
  providers.set(provider.key, provider);
}

export function getProviders(): IntelligenceProvider[] {
  return Array.from(providers.values());
}

/**
 * Runs providers independently — one provider's failure or missing data
 * never blocks another's result.
 */
export async function runProviders(
  ctx: IntelligenceContext,
  keys?: string[],
): Promise<Record<string, ProviderResult>> {
  const selected = keys ? getProviders().filter((p) => keys.includes(p.key)) : getProviders();
  const settled = await Promise.allSettled(selected.map((p) => p.analyze(ctx)));

  const results: Record<string, ProviderResult> = {};
  settled.forEach((outcome, i) => {
    const key = selected[i].key;
    if (outcome.status === 'fulfilled') {
      results[key] = outcome.value;
    } else {
      const reason = outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason);
      results[key] = {
        key,
        score: null,
        summary: `Provider "${key}" failed: ${reason}`,
        dataCompleteness: 'metadata_only',
      };
    }
  });
  return results;
}
