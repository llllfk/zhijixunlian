/**
 * 一次性初始化脚本（仅 DEV 环境）：创建管理员账号。
 * 用法：COZE_PROJECT_ENV=DEV npx tsx scripts/seed-admin.ts
 */
import { getSupabaseClient } from '../src/storage/database/supabase-client';

const ADMIN_EMAIL = 'admin@coze.dev';
const ADMIN_PASSWORD = process.env.ADMIN_INIT_PASSWORD || 'Admin@123456';
const ADMIN_NAME = '管理员';

async function main() {
  if (process.env.COZE_PROJECT_ENV !== 'DEV') {
    console.error('❌ 仅 DEV 环境允许执行管理员初始化');
    process.exit(1);
  }
  const client = getSupabaseClient(); // service_role
  const { data: existing, error: qErr } = await client
    .from('user_profiles')
    .select('id')
    .eq('role', 'admin')
    .limit(1)
    .maybeSingle();
  if (qErr) throw qErr;

  let adminId: string;
  if (existing?.id) {
    adminId = existing.id;
    console.log('ℹ️ 管理员已存在:', adminId);
  } else {
    const { data: user, error: createErr } = await client.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: ADMIN_NAME, is_admin: true },
    });
    if (createErr) throw createErr;
    adminId = user?.user?.id as string;
    // 标记角色
    await client.auth.admin.updateUserById(adminId, { app_metadata: { role: 'admin', is_admin: true } });
    const { error: insErr } = await client.from('user_profiles').insert({
      id: adminId,
      name: ADMIN_NAME,
      role: 'admin',
      is_active: true,
    });
    if (insErr) throw insErr;
    console.log('✅ 管理员创建成功:', adminId);
  }
  console.log('👉 账号:', ADMIN_EMAIL, '| 初始密码:', ADMIN_PASSWORD, '（仅 DEV，请首次登录后修改）');
  process.exit(0);
}

main().catch((e) => {
  console.error('初始化失败:', e);
  process.exit(1);
});