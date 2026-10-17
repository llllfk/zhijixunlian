import { NextRequest, NextResponse } from 'next/server';
import { ensureDb, getPool } from '@/lib/db';
import { resolveAuth } from '@/lib/server-auth';
import { evaluateDialogue } from '@/lib/evaluator';
import { DialogueMsg, RADAR_DIMENSIONS } from '@/lib/types';

export async function POST(req: NextRequest) {
  const ctx = await resolveAuth(req);
  if (!ctx) return NextResponse.json({ error: '请先登录' }, { status: 401 });
  if (!ctx.is_active) return NextResponse.json({ error: '账号已被禁用' }, { status: 403 });

  const body = await req.json().catch(() => null);
  const profileId: string | null = body?.profileId || null;
  const profileName: string | null = body?.profileName || null;
  const durationSeconds: number = Number(body?.durationSeconds || 0) || 0;
  const dialogue: DialogueMsg[] = Array.isArray(body?.dialogue) ? body.dialogue : [];

  await ensureDb();
  const id = crypto.randomUUID();
  await getPool().query(
    `INSERT INTO training_records (id, user_id, profile_id, profile_name, status, duration_seconds)
     VALUES ($1,$2,$3,$4,'completed',$5)`,
    [id, ctx.user_id, profileId, profileName, durationSeconds]
  );

  const { result, source } = await evaluateDialogue(dialogue, profileName, durationSeconds);
  const scores = RADAR_DIMENSIONS.reduce<Record<string, number>>((acc, k) => {
    acc[k] = result.dimensions[k] ?? 0;
    return acc;
  }, {});

  const { rows } = await getPool().query(
    `UPDATE training_records SET score = $2, scores = $3::jsonb, result = $4::jsonb WHERE id = $1 RETURNING *`,
    [id, result.total_score, JSON.stringify(scores), JSON.stringify(result)]
  );
  return NextResponse.json({ record: rows[0], source });
}

export async function GET(req: NextRequest) {
  const ctx = await resolveAuth(req);
  if (!ctx) return NextResponse.json({ error: '请先登录' }, { status: 401 });
  await ensureDb();
  const { rows } = await getPool().query(
    `SELECT * FROM training_records WHERE user_id = $1 ORDER BY created_at DESC LIMIT 200`,
    [ctx.user_id]
  );
  return NextResponse.json({ records: rows });
}
