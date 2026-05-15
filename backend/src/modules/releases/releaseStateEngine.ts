import { AppError } from '../../middleware/errorHandler';

export type ReleaseState =
  | 'draft'
  | 'blocked'
  | 'almost_ready'
  | 'ready_for_distribution'
  | 'scheduled'
  | 'released';

// Required gate fields — all must be true to advance past almost_ready
export const GATE_FIELDS = [
  'metadata_ready',
  'cover_art_ready',
  'mix_ready',
  'master_ready',
  'distributor_ready',
  'release_date_ready',
  'final_approval',
] as const;

export type GateField = (typeof GATE_FIELDS)[number];

export interface ChecklistSnapshot {
  completion_percent: number;
  [key: string]: unknown;
}

export interface ReleaseSnapshot {
  release_date?: string | null;
}

export function computeReleaseState(
  release: ReleaseSnapshot,
  checklist: ChecklistSnapshot | null,
  today: Date = new Date(),
): ReleaseState {
  const pct = checklist?.completion_percent ?? 0;
  const allRequiredDone = checklist
    ? GATE_FIELDS.every(f => checklist[f] === true)
    : false;

  // Date-based states take priority once a release_date is set
  if (release.release_date) {
    const releaseDay = release.release_date.slice(0, 10);
    const todayDay   = today.toISOString().slice(0, 10);
    if (todayDay >= releaseDay) return 'released';
    if (allRequiredDone)       return 'scheduled';
  }

  if (allRequiredDone) return 'ready_for_distribution';
  if (pct >= 70)       return 'almost_ready';
  if (pct > 0)         return 'blocked';
  return 'draft';
}

export function getMissingGateFields(checklist: ChecklistSnapshot | null): GateField[] {
  if (!checklist) return [...GATE_FIELDS];
  return GATE_FIELDS.filter(f => checklist[f] !== true);
}

export function enforceReleaseState(
  targetStatus: 'scheduled' | 'released',
  release: ReleaseSnapshot,
  checklist: ChecklistSnapshot | null,
  today: Date = new Date(),
): void {
  const missing = getMissingGateFields(checklist);

  if (missing.length > 0) {
    const verb = targetStatus === 'scheduled' ? 'schedule' : 'mark as released';
    throw new AppError(
      `Cannot ${verb} this release. Missing required checklist items: ${missing.join(', ')}.`,
      400,
    );
  }

  if (targetStatus === 'scheduled') {
    if (!release.release_date) {
      throw new AppError('Cannot schedule a release without a release date.', 400);
    }
    const releaseDay = release.release_date.slice(0, 10);
    const todayDay   = today.toISOString().slice(0, 10);
    if (todayDay >= releaseDay) {
      throw new AppError('Release date must be in the future to schedule a release.', 400);
    }
  }
}
