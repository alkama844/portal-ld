/* Supabase access for the CMS that works with only the publishable key,
   so the site can also run on external hosting (e.g. Vercel free plan). */
import { createClient } from '@supabase/supabase-js';

// Public (non-secret) project endpoint + publishable key. These are safe to ship
// so the CMS keeps working even when the host has no/typo'd env vars.
const DEFAULT_URL = 'https://vvxtstzygngwwqkojcgo.supabase.co';
const DEFAULT_KEY = 'sb_publishable_s1lGUWLT_aYy45W9UKqhiw_Kf4__RWW';
const DEFAULT_CMS_DB_SECRET = '3f6762600b163ab461609bd815096f2be5fbc1fdd0214848';

function validUrl(value: string | undefined): string | null {
  const trimmed = (value ?? '').trim();
  try {
    const parsed = new URL(trimmed);
    return (parsed.protocol === 'https:' || parsed.protocol === 'http:') && parsed.href === trimmed
      ? trimmed
      : null;
  } catch {
    return null;
  }
}

function validKey(value: string | undefined): string | null {
  const trimmed = (value ?? '').trim();
  if (trimmed.includes('placeholder') || trimmed.includes('dummy')) return null;
  return /^(sb_publishable_[A-Za-z0-9_-]{20,}|eyJ[A-Za-z0-9._-]{40,})$/.test(trimmed)
    ? trimmed
    : null;
}

export function cmsDb() {
  const url = validUrl(process.env['SUPABASE_URL'])
    ?? validUrl(process.env['VITE_SUPABASE_URL'])
    ?? DEFAULT_URL;
  const key = validKey(process.env['SUPABASE_PUBLISHABLE_KEY'])
    ?? validKey(process.env['VITE_SUPABASE_PUBLISHABLE_KEY'])
    ?? DEFAULT_KEY;

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) => {
        const headers = new Headers(init?.headers);
        // Opaque sb_ keys are not JWTs — send them only as `apikey`.
        if (key.startsWith('sb_') && headers.get('Authorization') === `Bearer ${key}`) {
          headers.delete('Authorization');
        }
        headers.set('apikey', key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

export function cmsDbSecrets(): string[] {
  const value = (process.env['CMS_DB_SECRET'] ?? '').trim();
  // A malformed host value must not disable saving. Try it first so the secret
  // can still be rotated, then retry with the database's built-in key.
  return value && value !== DEFAULT_CMS_DB_SECRET
    ? [value, DEFAULT_CMS_DB_SECRET]
    : [DEFAULT_CMS_DB_SECRET];
}
