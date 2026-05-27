export const ENGINE_VERSIONS = {
  SCORING:        'scoring-v1',
  ALGORITHM:      'exec-v1',
  RECOMMENDATION: 'rec-v1',
  SIMULATION:     'sim-v1',
  SESSION_MODE:   'session-v1',
  MEMORY:         'mem-v2',
  DIRECTOR:       'dir-v2',
} as const;

export type EngineVersionKey = keyof typeof ENGINE_VERSIONS;
export type EngineVersion    = (typeof ENGINE_VERSIONS)[EngineVersionKey];

export function buildVersionMeta(): Record<string, string> {
  return {
    scoring_version:        ENGINE_VERSIONS.SCORING,
    algorithm_version:      ENGINE_VERSIONS.ALGORITHM,
    recommendation_version: ENGINE_VERSIONS.RECOMMENDATION,
  };
}
