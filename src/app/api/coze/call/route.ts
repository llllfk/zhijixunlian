import { NextRequest } from 'next/server';
import { resolveAuth } from '@/lib/server-auth';
import {
  COZE_CONFIG,
  isMockEnabled,
  streamBotTurn,
  iterateCozePassengerEvents,
  buildPassengerKickoff,
} from '@/lib/coze';
import { getMockScript } from '@/lib/mock';

function sseResponse(stream: ReadableStream<Uint8Array>) {
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

function mockStream(profileName: string, signal?: AbortSignal) {
  const enc = new TextEncoder();
  const script = getMockScript(profileName);
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));
      const sleep = (ms: number) =>
        new Promise<void>((r) => {
          const t = setTimeout(r, ms);
          signal?.addEventListener('abort', () => {
            clearTimeout(t);
            r();
          });
        });

      send({ type: 'stage', stage: 'connected', name: script.name });
      for (const line of script.passengerLines) {
        if (signal?.aborted) break;
        await sleep(800 + line.length * 30);
        send({ type: 'passenger', content: line, ts: Date.now() });
      }
      if (!signal?.aborted) send({ type: 'done' });
      try {
        controller.close();
      } catch {
        /* ignore */
      }
    },
  });
}

async function cozePassengerStream(opts: {
  profileName: string;
  description?: string;
  conversationId?: string;
  userMessage?: string;
  userId: string;
  signal?: AbortSignal;
}) {
  const enc = new TextEncoder();
  const isKickoff = !opts.conversationId;
  const content = isKickoff
    ? buildPassengerKickoff(opts.profileName, opts.description)
    : opts.userMessage || '';

  if (!content) {
    return new Response(JSON.stringify({ error: '缺少消息内容' }), { status: 400 });
  }

  let cozeRes: Response;
  try {
    cozeRes = await streamBotTurn(
      COZE_CONFIG.tutorBotId,
      [{ role: 'user', content }],
      { conversationId: opts.conversationId, userId: opts.userId }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || '连接扣子失败' }), { status: 502 });
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));
      send({ type: 'stage', stage: 'connected', name: opts.profileName || '旅客' });
      try {
        for await (const ev of iterateCozePassengerEvents(cozeRes, opts.signal)) {
          if (opts.signal?.aborted) break;
          send(ev);
        }
      } catch (e: any) {
        send({ type: 'error', message: e?.message || '流式读取失败' });
        send({ type: 'done' });
      }
      try {
        controller.close();
      } catch {
        /* ignore */
      }
    },
    cancel() {
      try {
        cozeRes.body?.cancel();
      } catch {
        /* ignore */
      }
    },
  });

  return sseResponse(stream);
}

/** 接通 / 开场：旅客陪练智能体文字流 */
export async function GET(req: NextRequest) {
  const auth = await resolveAuth(req);
  if (!auth) return new Response(JSON.stringify({ error: '请先登录' }), { status: 401 });

  const profileName = req.nextUrl.searchParams.get('profileName') || '';
  const description = req.nextUrl.searchParams.get('description') || '';

  if (isMockEnabled()) {
    return sseResponse(mockStream(profileName, req.signal));
  }

  return cozePassengerStream({
    profileName,
    description,
    userId: auth.user_id,
    signal: req.signal,
  });
}

/** 学员发言后续轮：body = { conversationId, message, profileName } */
export async function POST(req: NextRequest) {
  const auth = await resolveAuth(req);
  if (!auth) return new Response(JSON.stringify({ error: '请先登录' }), { status: 401 });

  const body = await req.json().catch(() => ({}));
  const profileName = String(body.profileName || '');
  const conversationId = String(body.conversationId || '');
  const message = String(body.message || '').trim();

  if (isMockEnabled()) {
    const enc = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (obj: unknown) => controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));
        send({
          type: 'passenger',
          content: message ? `好的，我听到了：「${message.slice(0, 40)}」。请继续帮我办。` : '请继续。',
          ts: Date.now(),
        });
        send({ type: 'done' });
        controller.close();
      },
    });
    return sseResponse(stream);
  }

  if (!conversationId || !message) {
    return new Response(JSON.stringify({ error: '缺少 conversationId 或 message' }), { status: 400 });
  }

  return cozePassengerStream({
    profileName,
    conversationId,
    userMessage: message,
    userId: auth.user_id,
    signal: req.signal,
  });
}
