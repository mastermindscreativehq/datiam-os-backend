import 'dotenv/config';
import { db } from './dist/db/index.js';
import { users } from './dist/db/schema.js';

const rows = await db.select({
  id: users.id,
  email: users.email,
  role: users.role,
}).from(users).limit(10);

console.log(JSON.stringify(rows, null, 2));
process.exit(0);
