// 冒烟测试：登录 → 画像 → 保存训练并触发 mock 评价
const base = process.env.BASE_URL || 'http://localhost:5000';
const cfg = await (await fetch(base + '/api/supabase-config')).json();
const t = await (
  await fetch(cfg.url + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { apikey: cfg.anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@coze.dev', password: 'Admin@123456' }),
  })
).json();
if (!t.access_token) {
  console.log('LOGIN_FAIL', JSON.stringify(t));
  process.exit(1);
}
const token = t.access_token;
const names = await (await fetch(base + '/api/profiles', { headers: { 'x-session': token } })).json();
const arr = names.profiles || [];
const pf = arr.length > 0 ? arr[0] : null;
console.log('PROFILES_COUNT', arr.length, 'FIRST', pf ? pf.name : '-');

const body = JSON.stringify({
  profileId: pf ? pf.id : null,
  profileName: pf ? pf.name : '普通旅客',
  durationSeconds: 95,
  dialogue: [
    { role: 'passenger', content: '你好我来办值机', ts: 1 },
    { role: 'agent', content: '您好欢迎请出示证件', ts: 2 },
  ],
});
const rec = await (
  await fetch(base + '/api/trainings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-session': token },
    body,
  })
).json();
console.log('TRAINING_SAVED', rec.record ? 'YES score=' + rec.record.score : 'NO', 'source', rec.source);

// 验证结果详情可读
if (rec.record) {
  const detail = await (await fetch(base + '/api/trainings/' + rec.record.id, { headers: { 'x-session': token } })).json();
  console.log('RESULT_DETAIL', detail.record ? 'OK dims=' + JSON.stringify(detail.record.scores) : 'MISSING');
}

// 验证管理员可见、学员记录列表可见
const adminRec = await (await fetch(base + '/api/admin/records', { headers: { 'x-session': token } })).json();
console.log('ADMIN_RECORDS', Array.isArray(adminRec.records) ? adminRec.records.length : 'ERR');