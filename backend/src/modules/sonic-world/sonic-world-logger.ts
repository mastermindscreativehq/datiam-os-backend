import { logActivity } from '../../lib/activityLogger';

export interface RepairEventData {
  blueprintId: string;
  sessionId: string;
  repairCount: number;
  repairedFields: string[];
  sessionName?: string;
  userEmail?: string;
}

export interface FallbackUsageData {
  blueprintId: string;
  sessionId: string;
  affectedFields: string[];
  userEmail?: string;
}

export interface FailedGenerationData {
  sessionId: string;
  artistId: string;
  error: string;
  userEmail?: string;
}

export interface ValidationWarningData {
  blueprintId: string;
  sessionId: string;
  warningCount: number;
  warnings: Array<{ field: string; issue: string; value?: unknown }>;
}

export function logRepairEvent(data: RepairEventData): void {
  const fieldList = data.repairedFields.slice(0, 5).join(', ');
  const extra = data.repairedFields.length > 5 ? ` +${data.repairedFields.length - 5} more` : '';
  console.warn(
    `[SonicWorld:Repair] blueprint=${data.blueprintId} session=${data.sessionId} ` +
    `repairs=${data.repairCount} fields=[${fieldList}${extra}]`,
  );
  logActivity({
    userEmail:   data.userEmail,
    eventType:   'sonic_world_repair',
    module:      'sonic-world',
    entityType:  'sonic_world_blueprint',
    entityId:    data.blueprintId,
    title:       `Sonic World fields repaired: ${data.sessionName ?? data.sessionId}`,
    description: `${data.repairCount} field(s) repaired: ${fieldList}${extra}`,
    severity:    'warning',
    metadata: {
      repair_count:    data.repairCount,
      repaired_fields: data.repairedFields,
    },
  });
}

export function logFallbackUsage(data: FallbackUsageData): void {
  console.warn(
    `[SonicWorld:Fallback] blueprint=${data.blueprintId} session=${data.sessionId} ` +
    `fields=[${data.affectedFields.join(', ')}]`,
  );
  logActivity({
    userEmail:   data.userEmail,
    eventType:   'sonic_world_fallback_used',
    module:      'sonic-world',
    entityType:  'sonic_world_blueprint',
    entityId:    data.blueprintId,
    title:       'Sonic World fallback values applied',
    description: `${data.affectedFields.length} field(s) used fallback defaults`,
    severity:    'warning',
    metadata: { affected_fields: data.affectedFields },
  });
}

export function logFailedGeneration(data: FailedGenerationData): void {
  console.error(
    `[SonicWorld:Failed] session=${data.sessionId} artist=${data.artistId} error="${data.error}"`,
  );
  logActivity({
    userEmail:   data.userEmail,
    eventType:   'sonic_world_generation_failed',
    module:      'sonic-world',
    entityType:  'sonic_world_blueprint',
    entityId:    data.sessionId,
    title:       'Sonic World generation failed',
    description: data.error,
    severity:    'error',
    metadata: { artist_id: data.artistId },
  });
}

export function logValidationWarning(data: ValidationWarningData): void {
  const summary = data.warnings.map(w => `${w.field}:${w.issue}`).join(', ');
  console.warn(
    `[SonicWorld:Validation] blueprint=${data.blueprintId} session=${data.sessionId} ` +
    `warnings=${data.warningCount} [${summary}]`,
  );
  logActivity({
    eventType:   'sonic_world_validation_warning',
    module:      'sonic-world',
    entityType:  'sonic_world_blueprint',
    entityId:    data.blueprintId,
    title:       `Sonic World validation: ${data.warningCount} warning(s)`,
    description: summary,
    severity:    'warning',
    metadata: {
      warning_count: data.warningCount,
      warnings:      data.warnings,
    },
  });
}
