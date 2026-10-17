import { NextRequest } from 'next/server';
import { resolveAuth } from '@/lib/server-auth';
import { COZE_CONFIG, isMockEnabled, streamBotTurn } from '@/lib/coze';
import { getMockScript } from '@/lib/mock';

/**
 * 通话页流式会话（SSE）。
 *
 * 对接「旅客陪练」智能体的调用位置：
 * - 当配置了 COZE_TUTOR_BOT_ID + COZE_WORKLOAD_API_TOKEN → 走真正 Coze 实时对话（这里预留，真实语音通话需接入通话类插件/管线）。
 * - 未配置时 → 按画像脚本流式返回旅客台词（mock），保证 UI 可跑通。
 *
 * 前端用 fetch + ReadableStream Reader 消费，实现打字机式渲染。
 */
export async function GET(req: NextRequest) {
  const auth = await resolveAuth(req);
  if (!auth) return new Response(JSON.stringify({ error: '请先登录' }), { status: 401 });

  const profileName = req.nextUrl.searchParams.get('profileName') || '';
  const enc = new TextEncoder();

  if (!isMockEnabled() && COZE_CONFIG.tutorBotId && COZE_CONFIG.token) {
    // TODO(真实通话接入位)：此处应建立与「旅客陪练」智能体的实时语音/文字会话。
    // 当前预留，先回退 H2 说明。
    return new Response(
      JSON.stringify({
        error: 'voice_not_configured',
        message: '已配置 COZE_TUTOR_BOT_ID，但实时语音管线尚未接入；请在前端通话页接入语音通话插件后启用。',
      }),
      { status: 501 }
    );
  }

  // mock 阶段：按画像脚本流式输出旅客台词
  const script = getMockScript(profileName);
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) => {
        controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };
      const sleep = (ms: number) =>
        new Promise<void>((r) => {
          const t = setTimeout(r, ms);
          req.signal?.addEventListener('abort', () => {
            clearTimeout(t);
            r();
          });
        });

      send({ type: 'stage', stage: 'connected', name: script.name });
      for (const line of script.passengerLines) {
        if (req.signal?.aborted) break;
        await sleep(1500 + line.length * 45);
        send({ type: 'passenger', content: line, ts: Date.now() });
      }
      if (!req.signal?.aborted) send({ type: 'done' });
      try {
        controller.close();
      } catch {
        /* ignore */
      }
    },
    cancel() {
      /* 客户端挂断时触发 */
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}