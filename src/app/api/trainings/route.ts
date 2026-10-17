import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { resolveAuth } from '@/lib/server-auth';
import { evaluateDialogue } from '@/lib/evaluator';
import { DialogueMsg, RADAR_DIMENSIONS, EvalResult } from '@/lib/types';

// 保存一轮训练并触发评价（真实 / mock 均由后端判断）
export async function POST(req: NextRequest) {
  const ctx = await resolveAuth(req);
  if (!ctx) return NextResponse.json({ error: '请先登录' }, { status: 401 });
  if (!ctx.is_active) return NextResponse.json({ error: '账号已被禁用' }, { status: 403 });

  const body = await req.json().catch(() => null);
  const profileId: string | undefined = body?.profileId;
  const profileName: string | undefined = body?.profileName;
  const durationSeconds: number = Number(body?.durationSeconds || 0) || 0;
  const dialogue: DialogueMsg[] = Array.isArray(body?.dialogue) ? body.dialogue : [];

  const db = getSupabaseClient();

  // 先插入初始记录（prenting 状态）
  const { data: inserted, error: insErr } = await db
    .from('training_records')
    .insert({
      user_id: ctx.user_id,
      profile_id: profileId || null,
      profile_name: profileName || null,
      status: 'completed',
      duration_seconds: durationSeconds,
    })
    .select()
    .maybeSingle();
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  // 评价
  const { result, source } = await evaluateDialogue(dialogue, profileName, durationSeconds);

  const scores = pickRadarScores(result);

  const { data: updated, error: upErr } = await db
    .from('training_records')
    .update({
      score: result.total_score,
      scores: normalizeScores(result),
      result,
    })
    .eq('id', inserted.id)
    .select()
    .maybeSingle();
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  return NextResponse.json({ record: updated, source });
}

function normalizeScores(result: EvalResult) {
  return RADAR_DIMENSIONS.reduce<Record<string, number>>((acc, k) => {
    acc[k] = result.dimensions[k] ?? 0;
    return acc;
  }, {});
}

function pickRadarScores(result: EvalResult) {
  return normalizeScores(result);
}

// 学员端：我的训练记录
export async function GET(req: NextRequest) {
  const ctx = await resolveAuth(req);
  if (!ctx) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  const db = getSupabaseClient();
  const { data, error } = await db
    .from('training_records')
    .select('*')
    .eq('user_id', ctx.user_id)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ records: data });
}