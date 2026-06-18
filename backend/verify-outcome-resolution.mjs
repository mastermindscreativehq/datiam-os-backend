import pg from 'pg';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = readFileSync(resolve(__dirname, '.env'), 'utf8');
const dbUrl = env.match(/DATABASE_URL=(.+)/)?.[1]?.trim();

const pool = new pg.Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
const q = async (sql, p = []) => (await pool.query(sql, p)).rows;

const PLACED = new Set(['placed','accepted','contracted','approved','won','success','yes']);

function calcAccuracy(predictedValue, actualResult) {
  const raw = Number(predictedValue);
  const p = raw >= 1 ? raw / 100 : raw;
  return PLACED.has(actualResult.toLowerCase().trim()) ? p : 1 - p;
}

// ── Step 1: Show existing rows ──────────────────────────────────────────────
console.log('\n=== STEP 1: All prediction_accuracy_log rows ===');
const all = await q(
  `SELECT id, model_version, prediction_type, predicted_value, resolved,
          actual_label, actual_revenue, accuracy_score, created_at
   FROM prediction_accuracy_log ORDER BY created_at DESC`
);
console.log(JSON.stringify(all, null, 2));

// ── Step 2: Pick an unresolved prediction ───────────────────────────────────
const unresolved = all.filter(r => !r.resolved);
let target = unresolved[0];
if (!target) {
  console.log('\n=== STEP 2: Inserting test row ===');
  const [ins] = await q(
    `INSERT INTO prediction_accuracy_log
       (model_version, prediction_type, predicted_value, predicted_label, resolved)
     VALUES ('datiam-intelligence-v1', 'placement_likelihood', 77, 'high_probability', false)
     RETURNING id, model_version, predicted_value`
  );
  target = ins;
  console.log('Inserted:', JSON.stringify(ins));
} else {
  console.log(`\n=== STEP 2: Using existing unresolved prediction ${target.id} ===`);
}

// ── Step 3: Resolve (placed, $5,000) ────────────────────────────────────────
console.log('\n=== STEP 3: Resolving outcome — actual_result=placed, revenue=$5000 ===');
const accuracy = calcAccuracy(target.predicted_value, 'placed');
console.log(`  predicted_value=${target.predicted_value} → accuracy=${accuracy}`);

const [resolved] = await q(
  `UPDATE prediction_accuracy_log
   SET actual_label   = $1,
       actual_revenue = $2,
       accuracy_score = $3,
       resolved       = true,
       resolved_at    = now(),
       notes          = $4
   WHERE id = $5
   RETURNING id, model_version, prediction_type, predicted_value,
             actual_label, actual_revenue, accuracy_score, resolved, resolved_at, notes`,
  ['placed', 5000.00, accuracy.toFixed(4), 'Demo resolution', target.id]
);
console.log('Updated row:', JSON.stringify(resolved, null, 2));

// ── Step 4: Show row after resolution ───────────────────────────────────────
console.log('\n=== STEP 4: Row state after resolve ===');
const [after] = await q(
  `SELECT id, model_version, prediction_type, predicted_value, resolved,
          actual_label, actual_revenue, accuracy_score, resolved_at
   FROM prediction_accuracy_log WHERE id = $1`,
  [target.id]
);
console.log(JSON.stringify(after, null, 2));

// ── Step 5: Model performance ────────────────────────────────────────────────
console.log('\n=== STEP 5: GET /api/intelligence/model-performance ===');

const [totals] = await q(
  `SELECT COUNT(*) AS total_predictions, COUNT(resolved_at) AS resolved_predictions
   FROM prediction_accuracy_log`
);
const [acc] = await q(
  `SELECT AVG(accuracy_score::numeric) AS average_accuracy
   FROM prediction_accuracy_log WHERE resolved = true`
);
const [rev] = await q(
  `SELECT SUM(actual_revenue::numeric) AS revenue_actual
   FROM prediction_accuracy_log WHERE resolved = true AND actual_revenue IS NOT NULL`
);
const [revP] = await q(
  `SELECT SUM(predicted_value::numeric) AS revenue_predicted
   FROM prediction_accuracy_log WHERE prediction_type = 'fee_estimate'`
);
const genres = await q(
  `SELECT s.genre, AVG(pal.accuracy_score::numeric) AS avg_accuracy, COUNT(*) AS prediction_count
   FROM prediction_accuracy_log pal
   JOIN songs s ON pal.song_id = s.id
   WHERE pal.resolved = true AND s.genre IS NOT NULL
   GROUP BY s.genre ORDER BY avg_accuracy DESC LIMIT 5`
);
const territories = await q(
  `SELECT po.territory, AVG(pal.accuracy_score::numeric) AS avg_accuracy, COUNT(*) AS prediction_count
   FROM prediction_accuracy_log pal
   JOIN placement_opportunities po ON pal.opportunity_id = po.id
   WHERE pal.resolved = true
   GROUP BY po.territory ORDER BY avg_accuracy DESC LIMIT 5`
);
const contacts = await q(
  `SELECT lc.id AS contact_id, lc.full_name AS contact_name,
          AVG(pal.accuracy_score::numeric) AS avg_accuracy, COUNT(*) AS prediction_count
   FROM prediction_accuracy_log pal
   JOIN placement_opportunities po ON pal.opportunity_id = po.id
   JOIN licensing_contacts lc ON po.contact_id = lc.id
   WHERE pal.resolved = true
   GROUP BY lc.id, lc.full_name ORDER BY avg_accuracy DESC LIMIT 5`
);

const performance = {
  total_predictions:    Number(totals.total_predictions),
  resolved_predictions: Number(totals.resolved_predictions),
  average_accuracy:     acc.average_accuracy ? Number(Number(acc.average_accuracy).toFixed(4)) : null,
  revenue_predicted:    revP.revenue_predicted ? Number(Number(revP.revenue_predicted).toFixed(2)) : 0,
  revenue_actual:       rev.revenue_actual ? Number(Number(rev.revenue_actual).toFixed(2)) : 0,
  best_genres:          genres,
  best_territories:     territories,
  best_contacts:        contacts,
};

console.log(JSON.stringify(performance, null, 2));
console.log('\n=== ALL STEPS COMPLETE ===');
await pool.end();
