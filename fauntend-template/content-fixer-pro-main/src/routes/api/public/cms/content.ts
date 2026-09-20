import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/public/cms/content')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { json, isAuthed, sitePage } = await import('@/lib/cms.server');
        const { cmsDb } = await import('@/lib/cms-db.server');
        const page = new URL(request.url).searchParams.get('page') ?? '';
        if (!page) return json({ items: [] });
        const { data, error } = await cmsDb()
          .from('site_content')
          .select('content_key, content_type, value')
          .eq('page', sitePage(page));
        if (error) return json({ items: [], error: error.message }, { status: 500 });
        return json(
          { items: data ?? [], authed: isAuthed(request) },
          { headers: { 'cache-control': 'no-store, max-age=0' } },
        );
      },
    },
  },
});
