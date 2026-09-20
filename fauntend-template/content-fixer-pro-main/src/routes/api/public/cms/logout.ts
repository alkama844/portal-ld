import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/public/cms/logout')({
  server: {
    handlers: {
      POST: async () => {
        const { clearSessionCookie, json } = await import('@/lib/cms.server');
        return json({ ok: true }, { headers: { 'Set-Cookie': clearSessionCookie() } });
      },
    },
  },
});
