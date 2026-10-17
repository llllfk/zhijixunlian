import { config } from 'dotenv';
config({ path: '.env', override: true });

import { ensureDb, getPool } from '../src/lib/db';
import { signSession, readSession } from '../src/lib/session';
import {
  COZE_CONFIG,
  isMockEnabled,
  streamBotTurn,
  iterateCozePassengerEvents,
  buildPassengerKickoff,
} from '../src/lib/coze';

async function main() {
  await ensureDb();
  const profiles = await getPool().query('select name from passenger_profiles order by sort_order');
  const admins = await getPool().query(`select id, email, role from user_profiles where role = 'admin'`);
  console.log('MOCK', isMockEnabled());
  console.log('PROFILES', profiles.rows.map((r: { name: string }) => r.name).join(','));
  console.log('ADMINS', admins.rows);

  const uid = admins.rows[0]?.id as string;
  const token = signSession(uid);
  console.log('SESSION_OK', !!readSession(token));

  const res = await streamBotTurn(COZE_CONFIG.tutorBotId, [
    { role: 'user', content: buildPassengerKickoff('急脾气', '赶时间') },
  ]);
  console.log('COZE_HTTP', res.status);

  let passenger = '';
  let conv = '';
  let n = 0;
  for await (const ev of iterateCozePassengerEvents(res)) {
    n += 1;
    if (ev.type === 'meta') conv = ev.conversationId;
    if (ev.type === 'passenger') passenger = ev.content;
    if (ev.type === 'done') break;
    if (n > 120) break;
  }
  console.log('CONV', conv);
  console.log('PASSENGER', passenger.slice(0, 200));
  await getPool().end();
  if (!conv || !passenger) process.exitCode = 2;
}

main().catch(async (e) => {
  console.error(e);
  try {
    await getPool().end();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
