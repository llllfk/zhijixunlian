import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server-auth';
import { uploadProfileBackground } from '@/lib/storage';

const MAX_BYTES = 8 * 1024 * 1024;
const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

/** 管理端上传画像背景图到扣子 S3，返回对象键与可预览签名 URL */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch (e: unknown) {
    const err = e as { message?: string; status?: number };
    return NextResponse.json({ error: err?.message || '无权限' }, { status: err?.status || 403 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: '请选择图片文件' }, { status: 400 });
  }
  const ext = EXT[file.type];
  if (!ext) {
    return NextResponse.json({ error: '仅支持 jpg、png、webp、gif' }, { status: 400 });
  }
  if (file.size <= 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: '图片请小于 8MB' }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { key, url } = await uploadProfileBackground(buffer, file.type, ext);
    // key 入库；url 仅用于前端即时预览
    return NextResponse.json({ key, url });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error('[uploads] S3 upload failed', err);
    return NextResponse.json(
      { error: err?.message || '上传到对象存储失败，请确认已接入扣子对象存储' },
      { status: 500 }
    );
  }
}
