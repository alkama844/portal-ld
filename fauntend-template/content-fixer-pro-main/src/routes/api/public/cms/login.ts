import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/public/cms/login')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { credentialsMatch, createSessionCookie, json } = await import('@/lib/cms.server');
        let body: { username?: string; password?: string };
        try {
          body = (await request.json()) as { username?: string; password?: string };
        } catch {
          return json({ ok: false }, { status: 400 });
        }
        if (!body.username || !body.password || !credentialsMatch(body.username, body.password)) {
          return json({ ok: false, error: 'ভুল ইউজারনেম বা পাসওয়ার্ড' }, { status: 401 });
        }
        return json({ ok: true }, { headers: { 'Set-Cookie': createSessionCookie() } });
      },
    },
  },
});
