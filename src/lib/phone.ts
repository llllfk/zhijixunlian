/** 中国大陆手机号：1 开头第二位 3-9，共 11 位 */
const CN_MOBILE_RE = /^1[3-9]\d{9}$/;

export function normalizePhone(input: string): string {
  return String(input || '')
    .trim()
    .replace(/[\s\-()]/g, '')
    .replace(/^\+86/, '');
}

export function isValidCnMobile(input: string): boolean {
  return CN_MOBILE_RE.test(normalizePhone(input));
}

export function assertCnMobile(input: string): string {
  const phone = normalizePhone(input);
  if (!isValidCnMobile(phone)) {
    throw Object.assign(new Error('请输入正确的11位手机号'), { status: 400 });
  }
  return phone;
}
