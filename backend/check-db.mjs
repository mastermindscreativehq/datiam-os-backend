import pg from 'pg';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = readFileSync(resolve(__dirname, '.env'), 'utf8');
const dbUrl = env.match(/DATABASE_URL=(.+)/)?.[1]?.trim();

const pool = new pg.Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

const { rows } = await pool.query(
  `SELECT id, model_version, prediction_type, predicted_value, resolved, actual_label, actual_revenue, accuracy_score
   FROM prediction_accuracy_log ORDER BY created_at DESC LIMIT 5`
);
console.log('=== existing prediction_accuracy_log rows ===');
console.log(JSON.stringify(rows, null, 2));

await pool.end();
