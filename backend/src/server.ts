import 'dotenv/config';
import { env } from './config/env';
import app from './app';
import { startSchedulerWorker, stopSchedulerWorker } from './modules/scheduler/scheduler.worker';

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
