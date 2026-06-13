import 'dotenv/config';
import { db } from './dist/db/index.js';
import { activity_log } from './dist/db/schema.js';
import { eq, desc, like } from 'drizzle-orm';

const rows = await db
  .select({
    id: activity_log.id,
    event_type: activity_log.event_type,
    module: activity_log.module,
    entity_type: activity_log.entity_type,
    entity_id: activity_log.entity_id,
    title: activity_log.title,
    severity: activity_log.severity,
    metadata: activity_log.metadata,
    created_at: activity_log.created_at,
  })
  .from(activity_log)
  .where(eq(activity_log.module, 'commercial-intelligence'))
  .orderBy(desc(activity_log.created_at))
  .limit(15);

console.log(JSON.stringify(rows.map(r => ({
  event_type: r.event_type,
  entity_type: r.entity_type,
  entity_id: r.entity_id,
  title: r.title,
  severity: r.severity,
  userId: r.metadata?.userId,
  userEmail: r.metadata?.userEmail,
  userRole: r.metadata?.userRole,
  ip: r.metadata?.ip,
  route: r.metadata?.route,
  success: r.metadata?.success,
  denialReason: r.metadata?.denialReason,
  timestamp: r.metadata?.timestamp,
  created_at: r.created_at,
})), null, 2));

process.exit(0);
