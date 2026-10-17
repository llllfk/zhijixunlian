import { config } from 'dotenv';
config({ path: '.env', override: true });
import { Client } from 'pg';

async function main() {
  const c = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();
  const users = await c.query(
    `SELECT id, email, phone, name, role, is_active, left(password_hash, 20) AS pwd_prefix, created_at
     FROM user_profiles ORDER BY created_at`
  );
  console.log('COUNT', users.rowCount);
  for (const row of users.rows) {
    console.log(JSON.stringify(row));
  }
  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
