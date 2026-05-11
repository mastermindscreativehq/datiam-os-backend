import 'dotenv/config';
import { verifySchema } from './schemaVerifier';

async function main() {
  const report = await verifySchema();

  if (report.healthy) {
    console.log('[SchemaVerifier] schema healthy');
  } else {
    console.error('[SchemaVerifier] CRITICAL: drift detected');
    if (report.missingTables.length > 0) {
      console.error('  Missing tables:', report.missingTables.join(', '));
    }
    if (report.missingColumns.length > 0) {
      console.error(
        '  Missing columns:',
        report.missingColumns.map(c => `${c.table}.${c.column}`).join(', '),
      );
    }
    process.exit(1);
  }

  process.exit(0);
}

main().catch(err => {
  console.error('[SchemaVerifier] error:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
