import 'dotenv/config';
import { db } from '../src/db';
import { users, artist_profiles } from '../src/db/schema';
import { signToken } from '../src/utils/jwt';
import { inArray } from 'drizzle-orm';

async function main() {
  const candidateUsers = await db
    .select({ id: users.id, email: users.email, role: users.role })
    .from(users)
    .where(inArray(users.role, ['owner', 'admin', 'editor', 'team']))
    .limit(1);

  if (candidateUsers.length === 0) {
    console.log('NO_USER_FOUND');
    return;
  }
  const user = candidateUsers[0];
  const token = signToken({ id: user.id, email: user.email, role: user.role });
  console.log('USER_EMAIL=' + user.email);
  console.log('USER_ROLE=' + user.role);
  console.log('TOKEN=' + token);

  const [artist] = await db.select({ id: artist_profiles.id, stage_name: artist_profiles.stage_name }).from(artist_profiles).limit(1);
  if (artist) {
    console.log('ARTIST_ID=' + artist.id);
    console.log('ARTIST_NAME=' + artist.stage_name);
  } else {
    console.log('NO_ARTIST_FOUND');
  }
}

main().catch(err => { console.error(err); process.exit(1); });
