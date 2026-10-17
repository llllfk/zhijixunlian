import { config } from 'dotenv';
config({ path: '.env', override: true });
import { Client } from 'pg';
import { hashPassword } from '../src/lib/password';

async function main() {
  const c = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();

  const adminHash = hashPassword('Admin123456');
  const studentHash = hashPassword('123456');

  // 管理员：更新手机号与密码（按现有 admin 邮箱定位，没有则插入）
  const adminUp = await c.query(
    `UPDATE user_profiles
     SET phone = $1, password_hash = $2, name = '管理员', role = 'admin', is_active = true, updated_at = now()
     WHERE email = 'admin@coze.dev' OR phone IN ('13800000000', '13699225251') OR role = 'admin'
     RETURNING id, email, phone, name, role`,
    ['13699225251', adminHash]
  );

  if ((adminUp.rowCount || 0) === 0) {
    await c.query(
      `INSERT INTO user_profiles (id, email, phone, password_hash, name, role, is_active)
       VALUES ($1, 'admin@coze.dev', $2, $3, '管理员', 'admin', true)`,
      [crypto.randomUUID(), '13699225251', adminHash]
    );
    console.log('ADMIN_INSERTED');
  } else {
    console.log('ADMIN_UPDATED', adminUp.rows);
  }

  // 学员：有则更新，无则插入
  const studentUp = await c.query(
    `UPDATE user_profiles
     SET phone = '13888888888', password_hash = $1, name = '学员', role = 'user', is_active = true, updated_at = now()
     WHERE phone IN ('13888888888', '13882049191')
     RETURNING id, phone, name, role`,
    [studentHash]
  );

  if ((studentUp.rowCount || 0) === 0) {
    const ins = await c.query(
      `INSERT INTO user_profiles (id, phone, password_hash, name, role, is_active)
       VALUES ($1, '13888888888', $2, '学员', 'user', true)
       RETURNING id, phone, name, role`,
      [crypto.randomUUID(), studentHash]
    );
    console.log('STUDENT_INSERTED', ins.rows);
  } else {
    console.log('STUDENT_UPDATED', studentUp.rows);
  }

  // 清理其它多余演示账号（可选：只保留这两个业务账号 + admin 邮箱那条）
  const all = await c.query(
    `SELECT id, email, phone, name, role, is_active FROM user_profiles ORDER BY created_at`
  );
  console.log('ALL');
  for (const row of all.rows) console.log(JSON.stringify(row));

  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
