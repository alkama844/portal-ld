import { createFileRoute } from '@tanstack/react-router';

type Item = { key: string; type: string; value: string };

const TYPES = ['text', 'html', 'src', 'bg', 'placeholder'];

export const Route = createFileRoute('/api/public/cms/save')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { json, isAuthed, sitePage } = await import('@/lib/cms.server');
        if (!isAuthed(request)) return json({ ok: false, error: 'unauthorized' }, { status: 401 });
        const { cmsDb, cmsDbSecrets } = await import('@/lib/cms-db.server');

        let body: { page?: string; items?: Item[] };
        try {
          body = (await request.json()) as { page?: string; items?: Item[] };
        } catch {
          return json({ ok: false, error: 'bad request' }, { status: 400 });
        }
        const page = (body.page ?? '').trim();
        const items = Array.isArray(body.items) ? body.items : [];
        if (!page || items.length === 0)
          return json({ ok: false, error: 'nothing to save' }, { status: 400 });

        const rows = items
          // Empty values would blank elements on every page load — never store them.
          .filter((item) => item && typeof item.key === 'string' && typeof item.value === 'string' && item.value.trim().length > 0)
          .slice(0, 500)
          .map((item) => ({
            key: item.key.slice(0, 500),
            type: TYPES.includes(item.type) ? item.type : 'text',
            value: item.value.slice(0, 20000),
          }));

        if (rows.length === 0)
          return json({ ok: false, error: 'nothing valid to save' }, { status: 400 });

        try {
          const db = cmsDb();
          let lastError = '';
          for (const secret of cmsDbSecrets()) {
            const { data, error } = await db.rpc('cms_save_content', {
              p_secret: secret,
              p_page: sitePage(page).slice(0, 200),
              p_items: rows,
            });
            if (!error) {
              let files: string[] = [];
              try {
                const { patchHtmlFiles } = await import('@/lib/cms-html.server');
                files = await patchHtmlFiles(page, rows);
              } catch (fileError) {
                console.warn('CMS html patch skipped:', fileError);
              }
              return json({ ok: true, saved: data ?? rows.length, files });
            }
            lastError = error.message;
            if (!/unauthorized/i.test(error.message)) break;
          }
          console.error('CMS save database error:', lastError);
          return json({ ok: false, error: `database save failed: ${lastError || 'unknown error'}` }, { status: 500 });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'unknown server error';
          console.error('CMS save server error:', error);
          return json({ ok: false, error: `save failed: ${message}` }, { status: 500 });
        }
      },
    },
  },
});
