import { S3Storage } from 'coze-coding-dev-sdk';

/** 签名链接最长 30 天（扣子对象存储上限） */
const PRESIGN_EXPIRE_SECONDS = 30 * 24 * 60 * 60;

let client: S3Storage | null = null;

function getStorage(): S3Storage {
  if (!client) {
    // 端点 / 桶名由扣子云端自动注入：COZE_BUCKET_ENDPOINT_URL、COZE_BUCKET_NAME
    // 鉴权走 workload identity（x-storage-token），无需 AK/SK
    const endpointUrl = process.env.COZE_BUCKET_ENDPOINT_URL;
    const bucketName = process.env.COZE_BUCKET_NAME;
    if (!endpointUrl || !bucketName) {
      throw new Error(
        '未检测到扣子对象存储环境变量（COZE_BUCKET_ENDPOINT_URL / COZE_BUCKET_NAME）。请在扣子编程中接入对象存储后重试。'
      );
    }
    client = new S3Storage({
      endpointUrl,
      bucketName,
      region: process.env.COZE_BUCKET_REGION || 'cn-beijing',
      accessKey: process.env.COZE_BUCKET_ACCESS_KEY || '',
      secretKey: process.env.COZE_BUCKET_SECRET_KEY || '',
    });
  }
  return client;
}

/** 本地路径或外链，不走 S3 */
export function isDirectBackgroundUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  return value.startsWith('/') || /^https?:\/\//i.test(value);
}

/** 库里存的是 S3 对象键（非 /、非 http） */
export function isS3ObjectKey(value: string | null | undefined): boolean {
  if (!value) return false;
  return !isDirectBackgroundUrl(value);
}

export async function uploadProfileBackground(
  fileContent: Buffer,
  contentType: string,
  ext: string
): Promise<{ key: string; url: string }> {
  const fileName = `profiles/bg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const storage = getStorage();
  const key = await storage.uploadFile({
    fileContent,
    fileName,
    contentType,
  });
  const url = await storage.generatePresignedUrl({
    key,
    expireTime: PRESIGN_EXPIRE_SECONDS,
  });
  return { key, url };
}

export async function signObjectKey(key: string): Promise<string> {
  return getStorage().generatePresignedUrl({
    key,
    expireTime: PRESIGN_EXPIRE_SECONDS,
  });
}

/** 把库中的 background_url（可能是 S3 key）转成浏览器可访问地址 */
export async function resolveBackgroundUrl(value: string | null | undefined): Promise<string | null> {
  if (!value) return null;
  if (isDirectBackgroundUrl(value)) return value;
  try {
    return await signObjectKey(value);
  } catch (err) {
    console.error('[storage] sign background failed', err);
    return null;
  }
}

export async function resolveProfileBackground<T extends { background_url?: string | null }>(
  row: T
): Promise<T & { background_key?: string | null }> {
  const raw = row.background_url ?? null;
  if (!raw || isDirectBackgroundUrl(raw)) {
    return { ...row, background_key: null };
  }
  const url = await resolveBackgroundUrl(raw);
  return { ...row, background_url: url, background_key: raw };
}

export async function resolveProfileBackgrounds<T extends { background_url?: string | null }>(
  rows: T[]
): Promise<Array<T & { background_key?: string | null }>> {
  return Promise.all(rows.map((row) => resolveProfileBackground(row)));
}
