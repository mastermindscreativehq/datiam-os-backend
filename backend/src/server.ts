import 'dotenv/config';
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
import { verifySchema } from './db/schemaVerifier';
import { logActivity } from './lib/activityLogger';

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

async function main(): Promise<void> {
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
  });

  process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    stopSchedulerWorker();
    void Promise.allSettled([stopSonicWorkers(), stopAudioWorker(), stopEnergyWorker()])
      .finally(() => server.close(() => process.exit(0)));
  });

  process.on('SIGINT', () => {
    stopSchedulerWorker();
    void Promise.allSettled([stopSonicWorkers(), stopAudioWorker(), stopEnergyWorker()])
      .finally(() => server.close(() => process.exit(0)));
  });
}

main().catch(err => {
  console.error('[Startup] Fatal error:', err);
  process.exit(1);
});
