import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import * as schema from './schema';

const client = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(client, { schema });

async function seed() {
  console.log('Seeding DATIAM OS database...');

  const existingUser = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, 'admin@datiam.com'))
    .limit(1);

  if (existingUser.length === 0) {
    const password_hash = await bcrypt.hash('DatiamOS2024!', 12);
    await db.insert(schema.users).values({
      email: 'admin@datiam.com',
      password_hash,
      full_name: 'DATIAM Owner',
      role: 'owner',
    });
    console.log('✓ Admin user created  →  admin@datiam.com  /  DatiamOS2024!');
  } else {
    console.log('  Admin user already exists, skipping.');
  }

  const existingProfile = await db.select().from(schema.artist_profiles).limit(1);

  if (existingProfile.length === 0) {
    await db.insert(schema.artist_profiles).values({
      stage_name: 'DATIAM',
      legal_name: 'DATIAM Artist',
      bio: 'Independent artist building label-level infrastructure. Music + Business.',
      country: 'Nigeria',
      genre_primary: 'Afro spiritual',
      genre_secondary: 'Afrobeat / RnB / Soul / Afrodark',
      brand_statement: 'Authentic music. Business-first mindset.',
    });
    console.log('✓ DATIAM artist profile created');
  } else {
    console.log('  Artist profile already exists, skipping.');
  }

  await client.end();
  console.log('\nSeed complete.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
