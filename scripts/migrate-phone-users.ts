/**
 * 将现有账号对齐到「手机号登录」方案：
 * - 确保 phone 列与唯一索引存在
 * - 修复乱码姓名
 * - 管理员保留邮箱，可选补演示手机号（不覆盖已有 phone）
 */
import { config } from 'dotenv';
config({ path: '.env', override: true });
import { Client } from 'pg';

async function main() {
  const c = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();

  await c.query(`ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS phone varchar(20)`);
  await c.query(`CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_phone_uidx ON user_profiles(phone)`);

  // 修复刚才注册测试账号的乱码姓名
  const fix = await c.query(
    `UPDATE user_profiles
     SET name = '测试学员', updated_at = now()
     WHERE phone = '13882049191'
     RETURNING id, phone, name`
  );
  console.log('FIXED_NAME', fix.rows);

  // 管理员补一个可手机登录的演示号（若尚未有 phone）
  const adminPhone = process.env.ADMIN_PHONE || '13800000000';
  const admin = await c.query(
    `UPDATE user_profiles
     SET phone = COALESCE(phone, $1), updated_at = now()
     WHERE role = 'admin' AND email = 'admin@coze.dev' AND phone IS NULL
     RETURNING id, email, phone, name, role`,
    [adminPhone]
  );
  console.log('ADMIN_PHONE', admin.rows);

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
