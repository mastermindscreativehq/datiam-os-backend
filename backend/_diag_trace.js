require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const journal = require('./drizzle/meta/_journal.json');

function splitStatements(sqlContent) {
  return sqlContent.split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean);
}

(async () => {
  const c = new Client({ connectionString: process.env.MIGRATION_DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();

  const wmRow = await c.query(`SELECT created_at FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 1`);
  const watermark = Number(wmRow.rows[0].created_at);
  console.log('Watermark:', watermark, new Date(watermark).toISOString());

  const pending = journal.entries.filter(e => e.when > watermark);
  console.log('Pending migrations in execution order:', pending.map(e => e.tag));

  await c.query('BEGIN');
  try {
    for (const entry of pending) {
      const filePath = path.join(__dirname, 'drizzle', entry.tag + '.sql');
      const content = fs.readFileSync(filePath, 'utf8');
      const statements = splitStatements(content);
      console.log('\n>>> MIGRATION', entry.tag, '(' + statements.length + ' statements)');
      for (let i = 0; i < statements.length; i++) {
        try {
          await c.query(statements[i]);
          console.log('  [' + i + '] OK:', statements[i].slice(0, 70).replace(/\n/g, ' '));
        } catch (e) {
          console.log('  [' + i + '] FAILED:', statements[i].slice(0, 200).replace(/\n/g, ' '));
          console.log('  ERROR:', e.message);
          throw e;
        }
      }
    }
    console.log('\nALL PENDING MIGRATIONS SUCCEEDED (rolling back, this is a dry-run trace)');
  } catch (e) {
    console.log('\nSTOPPED DUE TO ERROR ABOVE');
  } finally {
    await c.query('ROLLBACK');
    await c.end();
  }
})().catch(e => { console.error('FATAL', e); process.exit(1); });
