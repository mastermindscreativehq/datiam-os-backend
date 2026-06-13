import type { Request } from 'express';
import { logActivity } from '../../lib/activityLogger';

export type CiRoute = 'get_by_upload' | 'get_by_artist';

export interface CiAuditEvent {
  route: CiRoute;
  uploadId?: string;
  artistId?: string;
  success: boolean;
  denialReason?: string;
}

/**
 * Writes a structured audit entry to activity_log for every CI report access.
 *
 * Fields captured per entry:
 *   userId, userEmail, userRole, artistId, uploadId,
 *   route, ip, userAgent, timestamp, success, denialReason
 */
export function auditCiAccess(req: Request, event: CiAuditEvent): void {
  const ip = req.ip ?? (req.socket?.remoteAddress ?? 'unknown');
  const userAgent = (req.headers['user-agent'] as string | undefined) ?? 'unknown';
  const isSuccess = event.success;

  logActivity({
    userId: req.user?.id,
    userEmail: req.user?.email,
    eventType: isSuccess
      ? `ci.${event.route}.success`
      : `ci.${event.route}.denied`,
    module: 'commercial-intelligence',
    entityType: event.route === 'get_by_artist' ? 'artist' : 'upload',
    entityId: event.artistId ?? event.uploadId,
    title: isSuccess
      ? `CI Report accessed — ${event.uploadId ?? event.artistId ?? 'unknown'}`
      : `CI Report access denied — ${event.denialReason ?? 'unknown'}`,
    description: isSuccess
      ? `User ${req.user?.email ?? 'unknown'} (${req.user?.role ?? 'unknown'}) accessed CI report`
      : `Access denied for user ${req.user?.email ?? 'unknown'}: ${event.denialReason ?? 'unknown'}`,
    severity: isSuccess ? 'info' : 'warning',
    requestId: req.requestId,
    metadata: {
      userId: req.user?.id ?? null,
      userEmail: req.user?.email ?? null,
      userRole: req.user?.role ?? null,
      artistId: event.artistId ?? null,
      uploadId: event.uploadId ?? null,
      route: event.route,
      ip,
      userAgent,
      timestamp: new Date().toISOString(),
      success: isSuccess,
      denialReason: event.denialReason ?? null,
    },
  });
}
