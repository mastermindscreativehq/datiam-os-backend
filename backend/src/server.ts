import 'dotenv/config';
import { initSentry, captureException } from './lib/sentry';
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
import { startWatchdog, stopWatchdog } from './modules/monitoring/watchdog.service';
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
    console.log(`\nDATIAM OS Backend`);
    console.log(`   Environment : ${env.NODE_ENV}`);
    console.log(`   Port        : ${port}`);
    console.log(`   Health      : http://localhost:${port}/health\n`);

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
      startWatchdog();
    } catch (err) {
      console.warn('[Watchdog] Failed to start (non-fatal):', err);
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
    void Promise.allSettled([stopSonicWorkers(), stopAudioWorker(), stopEnergyWorker(), stopDnaWorker(), stopSyncWorker()])
      .finally(() => server.close(() => process.exit(0)));
  });

  process.on('SIGINT', () => {
    stopSchedulerWorker();
    stopWatchdog();
    void Promise.allSettled([stopSonicWorkers(), stopAudioWorker(), stopEnergyWorker(), stopDnaWorker(), stopSyncWorker()])
      .finally(() => server.close(() => process.exit(0)));
  });
}

main().catch(err => {
  console.error('[Startup] Fatal error:', err);
  process.exit(1);
});
