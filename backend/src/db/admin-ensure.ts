import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import * as schema from './schema';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@datiam.com';

const client = postgres(process.env.DATABASE_URL!, { max: 1, ssl: { rejectUnauthorized: false } });
const db = drizzle(client, { schema });

async function ensureAdmin() {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    console.error('[admin:ensure] FATAL: ADMIN_PASSWORD environment variable is not set.');
    console.error('[admin:ensure] Set ADMIN_PASSWORD in Railway Variables — never commit it to .env.');
    process.exit(1);
  }

  console.log(`[admin:ensure] checking for admin user: ${ADMIN_EMAIL}`);

  const [existing] = await db
    .select({ id: schema.users.id, email: schema.users.email, role: schema.users.role })
    .from(schema.users)
    .where(eq(schema.users.email, ADMIN_EMAIL))
    .limit(1);

  const password_hash = await bcrypt.hash(adminPassword, 12);

  if (existing) {
    await db
      .update(schema.users)
      .set({ password_hash, role: 'owner', updated_at: new Date() })
      .where(eq(schema.users.email, ADMIN_EMAIL));
    console.log(`[admin:ensure] updated existing user ${ADMIN_EMAIL} — password reset, role=owner`);
  } else {
    await db.insert(schema.users).values({
      email: ADMIN_EMAIL,
      password_hash,
      full_name: 'DATIAM Owner',
      role: 'owner',
    });
    console.log(`[admin:ensure] created new admin user ${ADMIN_EMAIL} with role=owner`);
  }

  await client.end();
  console.log('[admin:ensure] done.');
}

ensureAdmin().catch((err) => {
  console.error('[admin:ensure] failed:', err);
  process.exit(1);
});
