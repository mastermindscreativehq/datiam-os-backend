import { describe, it, expect, beforeEach } from 'vitest';
import { registerProvider, getProviders, runProviders } from '../intelligence-core.registry';
import { makeContext } from './fixtures';
import type { IntelligenceProvider } from '../intelligence-core.types';

describe('intelligence-core registry', () => {
  beforeEach(() => {
    // Registry is a module-level singleton — overwrite the same keys each test
    // rather than trying to clear it, since production providers self-register
    // on import elsewhere in the suite.
  });

  it('replaces a provider registered under the same key', () => {
    const v1: IntelligenceProvider = { key: 'test-key', analyze: async () => ({ key: 'test-key', score: 1, summary: 'v1', dataCompleteness: 'full' }) };
    const v2: IntelligenceProvider = { key: 'test-key', analyze: async () => ({ key: 'test-key', score: 2, summary: 'v2', dataCompleteness: 'full' }) };

    registerProvider(v1);
    registerProvider(v2);

    const registered = getProviders().filter((p) => p.key === 'test-key');
    expect(registered).toHaveLength(1);
  });

  it('isolates one provider throwing from the rest of the run', async () => {
    registerProvider({ key: 'ok-provider', analyze: async () => ({ key: 'ok-provider', score: 50, summary: 'fine', dataCompleteness: 'full' }) });
    registerProvider({ key: 'broken-provider', analyze: async () => { throw new Error('boom'); } });

    const results = await runProviders(makeContext(), ['ok-provider', 'broken-provider']);

    expect(results['ok-provider'].score).toBe(50);
    expect(results['broken-provider'].score).toBeNull();
    expect(results['broken-provider'].summary).toContain('boom');
  });

  it('only runs the providers whose keys are requested', async () => {
    registerProvider({ key: 'a', analyze: async () => ({ key: 'a', score: 1, summary: '', dataCompleteness: 'full' }) });
    registerProvider({ key: 'b', analyze: async () => ({ key: 'b', score: 2, summary: '', dataCompleteness: 'full' }) });

    const results = await runProviders(makeContext(), ['a']);

    expect(results.a).toBeDefined();
    expect(results.b).toBeUndefined();
  });
});
