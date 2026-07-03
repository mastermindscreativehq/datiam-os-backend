import { buildReleaseContext } from './intelligence-core.context';
import { runProviders } from './intelligence-core.registry';
import type { IntelligenceContext, ProviderResult } from './intelligence-core.types';
// Side-effect import — registers the Phase 1 providers (commercial/sync/playlist).
import './intelligence-core.providers';

export interface IntelligenceRunResult {
  context: IntelligenceContext;
  results: Record<string, ProviderResult>;
}

/**
 * Deliberately stateless — builds context, runs every registered provider,
 * and returns the raw output. No persistence and no mission creation here;
 * that stays with whichever orchestrator (Release Intel today, others later)
 * calls this, so this module stays reusable across domains.
 */
export async function runIntelligence(releaseId: string): Promise<IntelligenceRunResult> {
  const context = await buildReleaseContext(releaseId);
  const results = await runProviders(context);
  return { context, results };
}

export { buildReleaseContext } from './intelligence-core.context';
export { registerProvider, getProviders, runProviders } from './intelligence-core.registry';
export * from './intelligence-core.types';
