import 'dotenv/config';
import { initSentry, captureException } from './lib/sentry';
// TEMP STARTUP DIAG — remove after Railway SENTRY_DSN injection is confirmed
console.log({
  envKeys: Object.keys(process.env).filter(k => k.includes("SENTRY")),
  sentryPresent: !!process.env.SENTRY_DSN,
  sentryLength: process.env.SENTRY_DSN?.length || 0
});
initSentry(); // must run before other imports
import './lib/node-websocket';
import path from 'path';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { env } from './config/env';
import app from './app';
import { startSchedulerWorker, stopSchedulerWorker } from './modules/scheduler/scheduler.worker';
import { startSonicWorkers, stopSonicWorkers } from './modules/sonic-world/sonic-queue-workers';
import { startAudioWorker, stopAudioWorker } from './modules/audio/audio.worker';
import { startEnergyWorker, stopEnergyWorker } from './modules/energy/energy.worker';
import { startDnaWorker, stopDnaWorker } from './modules/audio-dna/audio-dna.worker';
import { startSyncWorker, stopSyncWorker } from './modules/sync-intelligence/sync-intelligence.worker';
import { startReleaseIntelWorker, stopReleaseIntelWorker } from './modules/release-intel/release-intel.worker';
import { startWatchdog, stopWatchdog } from './modules/monitoring/watchdog.service';
import { startPublishWorker, stopPublishWorker } from './modules/publishing-engine/publish.worker';
import { startAnalyticsSyncWorker, stopAnalyticsSyncWorker } from './modules/analytics-hub/analytics-sync.worker';
import { startTrendScanWorker, stopTrendScanWorker } from './modules/trend-intelligence/trend-scan.worker';
import { startAmbassadorScoreWorker, stopAmbassadorScoreWorker } from './modules/fan-intelligence/ambassador-score.worker';
import { startAIGenerationWorker, stopAIGenerationWorker } from './modules/ai/ai-generation.worker';
import { startContentSyncWorker, stopContentSyncWorker } from './modules/analytics-hub/content-sync.worker';
import { verifySchema } from './db/schemaVerifier';
import { logActivity } from './lib/activityLogger';
import { detectProvider } from './lib/emailProviders';

const port = parseInt(env.PORT, 10);

async function runMigrations(): Promise<void> {
  const migrationUrl = process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL;
  if (!migrationUrl) return;

  const client = postgres(migrationUrl, { max: 1, ssl: { rejectUnauthorized: false } });
  try {
    await migrate(drizzle(client), {
      migrationsFolder: path.join(process.cwd(), 'drizzle'),
    });
    console.log('[Migrations] All pending migrations applied');
  } catch (err) {
    console.error('[Migrations] Auto-migration failed (non-fatal):', err instanceof Error ? err.message : String(err));
  } finally {
    await client.end();
  }
}

function validateEmailProvider(): void {
  try {
    const provider = detectProvider();
    console.log(`[Email] Provider detected: ${provider}`);
  } catch {
    console.error('[Email] FATAL: No email provider configured.');
    console.error('[Email] Set one of: RESEND_API_KEY, SENDGRID_API_KEY, or SMTP_HOST in Railway Variables.');
    process.exit(1);
  }
}

async function main(): Promise<void> {
  validateEmailProvider();
  await runMigrations();

  const server = app.listen(port, () => {
    console.log(JSON.stringify({
      event:       'startup',
      version:     env.APP_VERSION,
      environment: env.NODE_ENV,
      port,
      redis:       process.env.REDIS_URL ? 'configured' : 'not_configured',
      sentry:      process.env.SENTRY_DSN ? 'enabled' : 'disabled',
      email:       process.env.RESEND_API_KEY ? 'resend' : process.env.SENDGRID_API_KEY ? 'sendgrid' : process.env.SMTP_HOST ? 'smtp' : 'none',
      ping:        `http://localhost:${port}/ping`,
      health:      `http://localhost:${port}/health (protected)`,
    }));

    try {
      startSchedulerWorker();
    } catch (err) {
      console.warn('[Scheduler] Worker failed to start (non-fatal):', err);
    }

    try {
      startSonicWorkers();
    } catch (err) {
      console.warn('[SonicQueue] Workers failed to start (non-fatal):', err);
    }

    try {
      startAudioWorker();
    } catch (err) {
      console.warn('[AudioWorker] Worker failed to start (non-fatal):', err);
    }

    try {
      startEnergyWorker();
    } catch (err) {
      console.warn('[EnergyWorker] Worker failed to start (non-fatal):', err);
    }

    try {
      startDnaWorker();
    } catch (err) {
      console.warn('[DnaWorker] Worker failed to start (non-fatal):', err);
    }

    try {
      startSyncWorker();
    } catch (err) {
      console.warn('[SyncWorker] Worker failed to start (non-fatal):', err);
    }

    try {
      startReleaseIntelWorker();
    } catch (err) {
      console.warn('[ReleaseIntelWorker] Worker failed to start (non-fatal):', err);
    }

    try {
      startWatchdog();
    } catch (err) {
      console.warn('[Watchdog] Failed to start (non-fatal):', err);
    }

    // ---- Growth OS Workers ----
    try {
      startPublishWorker();
    } catch (err) {
      console.warn('[PublishWorker] Failed to start (non-fatal):', err);
    }

    try {
      startAnalyticsSyncWorker();
    } catch (err) {
      console.warn('[AnalyticsSyncWorker] Failed to start (non-fatal):', err);
    }

    try {
      startTrendScanWorker();
    } catch (err) {
      console.warn('[TrendScanWorker] Failed to start (non-fatal):', err);
    }

    try {
      startAmbassadorScoreWorker();
    } catch (err) {
      console.warn('[AmbassadorWorker] Failed to start (non-fatal):', err);
    }

    try {
      startAIGenerationWorker();
    } catch (err) {
      console.warn('[AIGenerationWorker] Failed to start (non-fatal):', err);
    }

    try {
      startContentSyncWorker();
    } catch (err) {
      console.warn('[ContentSyncWorker] Failed to start (non-fatal):', err);
    }

    verifySchema()
      .then(report => {
        if (report.healthy) {
          console.log('[SchemaVerifier] schema healthy');
        } else {
          console.error('[SchemaVerifier] CRITICAL: drift detected', JSON.stringify({
            event: 'schema_drift',
            missingTables: report.missingTables,
            missingColumns: report.missingColumns,
          }));
          logActivity({
            eventType: 'schema.drift_detected',
            module: 'system',
            title: 'Schema drift detected',
            description: [
              report.missingTables.length ? `Missing tables: ${report.missingTables.join(', ')}` : '',
              report.missingColumns.length ? `Missing columns: ${report.missingColumns.map(c => `${c.table}.${c.column}`).join(', ')}` : '',
            ].filter(Boolean).join('; '),
            severity: 'critical',
            metadata: { missingTables: report.missingTables, missingColumns: report.missingColumns },
          });
        }
      })
      .catch(err => {
        console.warn('[SchemaVerifier] could not verify schema (non-fatal):', err instanceof Error ? err.message : String(err));
      });
  });

  process.on('unhandledRejection', (err) => {
    console.error('[Unhandled Rejection]', err);
    captureException(err, { source: 'unhandledRejection' });
  });

  process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    stopSchedulerWorker();
    stopWatchdog();
    void Promise.allSettled([
      stopSonicWorkers(), stopAudioWorker(), stopEnergyWorker(), stopDnaWorker(), stopSyncWorker(), stopReleaseIntelWorker(),
      stopPublishWorker(), stopAnalyticsSyncWorker(), stopTrendScanWorker(),
      stopAmbassadorScoreWorker(), stopAIGenerationWorker(), stopContentSyncWorker(),
    ]).finally(() => server.close(() => process.exit(0)));
  });

  process.on('SIGINT', () => {
    stopSchedulerWorker();
    stopWatchdog();
    void Promise.allSettled([
      stopSonicWorkers(), stopAudioWorker(), stopEnergyWorker(), stopDnaWorker(), stopSyncWorker(), stopReleaseIntelWorker(),
      stopPublishWorker(), stopAnalyticsSyncWorker(), stopTrendScanWorker(),
      stopAmbassadorScoreWorker(), stopAIGenerationWorker(), stopContentSyncWorker(),
    ]).finally(() => server.close(() => process.exit(0)));
  });
}

main().catch(err => {
  console.error('[Startup] Fatal error:', err);
  process.exit(1);
});
