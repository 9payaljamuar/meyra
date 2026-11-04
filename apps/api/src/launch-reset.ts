// Go-live reset: deletes ALL data (demo sellers, products, reviews, orders, uploads metadata) and creates the admin.
// Usage: npm run launch-reset -- --confirm <admin-email> <admin-password> [admin name]
import bcrypt from 'bcryptjs';
import {migrate, one, pool, q} from './db.js';

const args = process.argv.slice(2);
if (args[0] !== '--confirm' || !args[1] || !args[2] || args[2].length < 8) {
  console.error('This permanently deletes every seller, product, order and review.\n' +
    'Usage: npm run launch-reset -- --confirm <admin-email> <admin-password (min 8 chars)> [name]');
  process.exit(1);
}
const [, email, password, name = 'Meyra Admin'] = args;

await q('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
await migrate();
const row = await one(
  `INSERT INTO users(name, email, password_hash, role) VALUES ($1, lower($2), $3, 'admin') RETURNING id, email`,
  [name, email, await bcrypt.hash(password, 10)],
);
console.log(`Clean database ready. Admin: ${row.email}. Next: set Meyra's GSTIN in Admin → Tax & compliance.`);
await pool.end();
