import 'dotenv/config';
import { env } from './config/env';
import app from './app';
import { startSchedulerWorker, stopSchedulerWorker } from './modules/scheduler/scheduler.worker';
import { verifySchema } from './db/schemaVerifier';

const port = parseInt(env.PORT, 10);

const server = app.listen(port, () => {
  console.log(`\n🎵 DATIAM OS Backend`);
  console.log(`   Environment : ${env.NODE_ENV}`);
  console.log(`   Port        : ${port}`);
  console.log(`   Health      : http://localhost:${port}/health\n`);

  try {
    startSchedulerWorker();
  } catch (err) {
    console.warn('[Scheduler] Worker failed to start (non-fatal):', err);
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
      }
    })
    .catch(err => {
      console.warn('[SchemaVerifier] could not verify schema (non-fatal):', err instanceof Error ? err.message : String(err));
    });
});

process.on('unhandledRejection', (err) => {
  // Log but do not exit — a single rejected promise should not bring the server down.
  console.error('[Unhandled Rejection]', err);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  stopSchedulerWorker();
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  stopSchedulerWorker();
  server.close(() => process.exit(0));
});
