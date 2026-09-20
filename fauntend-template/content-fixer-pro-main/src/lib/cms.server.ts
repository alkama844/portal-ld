import { createHmac, timingSafeEqual, createHash } from 'node:crypto';

const COOKIE_NAME = 'cms_session';

function secret(): string {
  // Fallback keeps login working when the host env var is missing (server-only value).
  return (process.env['CMS_SESSION_SECRET'] ?? '').trim() || 'cms-session-fallback-6f2be5fbc1fdd0214848-drselim';
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('hex');
}

export function createSessionCookie(): string {
  const exp = String(Date.now() + 1000 * 60 * 60 * 12);
  const value = `${exp}.${sign(exp)}`;
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=43200`;
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0`;
}

export function isAuthed(request: Request): boolean {
  const cookie = request.headers.get('cookie') ?? '';
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  if (!match) return false;
  const [exp, mac] = decodeURIComponent(match[1]!).split('.');
  if (!exp || !mac) return false;
  if (Number(exp) < Date.now()) return false;
  const expected = sign(exp);
  if (expected.length !== mac.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(mac));
}

export function credentialsMatch(username: string, password: string): boolean {
  const expectedUser = (process.env['CMS_ADMIN_USER'] ?? '').trim() || 'deselim-admin';
  const expectedPass = (process.env['CMS_ADMIN_PASSWORD'] ?? '').trim() || 'admin12345';
  const digest = (value: string) => createHash('sha256').update(value, 'utf8').digest();
  const okUser = timingSafeEqual(digest(username), digest(expectedUser));
  const okPass = timingSafeEqual(digest(password), digest(expectedPass));
  return okUser && okPass;
}

export function json(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...(init.headers ?? {}) },
  });
}

/** Content rows are namespaced per site so a database shared with another
 *  project can never overwrite this site's pages (e.g. two "index" pages).
 *
 *  IMPORTANT: a copy of this project (another doctor's site) was running with
 *  the old 'drselim' namespace against the same database, so its edits kept
 *  landing on this site's pages and rewrote text on their own. The namespace
 *  below is unique to this site; never reuse it in a cloned project — set
 *  CMS_SITE_NS to a new value there instead. */
export const SITE_NS = (process.env['CMS_SITE_NS'] ?? '').trim() || 'drselim-mics-2026';

export function sitePage(page: string): string {
  const clean = (page ?? '').trim();
  return clean.startsWith(SITE_NS + ':') ? clean : `${SITE_NS}:${clean}`;
}
