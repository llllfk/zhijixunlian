import { Client } from 'pg';

const url =
  process.env.DATABASE_URL ||
  'postgresql://postgres:7LEGMZj2K3P2P81qLs@cp-giddy-ray-cf5b5087.pg2.aidap-global.cn-beijing.volces.com:5432/postgres?sslmode=require&channel_binding=require';

async function main() {
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const tables = await c.query(
    `select table_name from information_schema.tables where table_schema='public' order by 1`
  );
  console.log('TABLES', tables.rows.map((r) => r.table_name));
  for (const t of ['user_profiles', 'passenger_profiles', 'training_records']) {
    const cols = await c.query(
      `select column_name, data_type from information_schema.columns where table_name=$1 order by ordinal_position`,
      [t]
    );
    console.log('---', t, cols.rows);
  }
  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
