// Create (or reset the password of) an admin account without loading demo data.
// Usage: npm run create-admin -- <email> <password> [name]
import bcrypt from 'bcryptjs';
import {migrate, one, pool} from './db.js';

const [email, password, name = 'Meyra Admin'] = process.argv.slice(2);
if (!email || !password || password.length < 8) {
  console.error('Usage: npm run create-admin -- <email> <password (min 8 chars)> [name]');
  process.exit(1);
}

await migrate();
const hash = await bcrypt.hash(password, 10);
const row = await one(
  `INSERT INTO users(name, email, password_hash, role) VALUES ($1, lower($2), $3, 'admin')
   ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'admin', deleted_at = NULL,
     token_version = users.token_version + 1
   RETURNING id, email`,
  [name, email, hash],
);
console.log(`Admin ready: ${row.email} (id ${row.id})`);
await pool.end();
