import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/public/cms/upload')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { json, isAuthed } = await import('@/lib/cms.server');
        if (!isAuthed(request)) return json({ ok: false, error: 'unauthorized' }, { status: 401 });
        const { cmsDb, cmsDbSecrets } = await import('@/lib/cms-db.server');

        const form = await request.formData();
        const file = form.get('file');
        if (!(file instanceof File)) return json({ ok: false, error: 'no file' }, { status: 400 });
        if (!file.type.startsWith('image/'))
          return json({ ok: false, error: 'image only' }, { status: 400 });
        if (file.size > 5 * 1024 * 1024)
          return json({ ok: false, error: 'too large (max 5MB)' }, { status: 400 });

        try {
          const base64 = Buffer.from(await file.arrayBuffer()).toString('base64');
          const db = cmsDb();
          let lastError = '';
          for (const secret of cmsDbSecrets()) {
            const { data, error } = await db.rpc('cms_save_image', {
              p_secret: secret,
              p_mime: file.type,
              p_data: base64,
            });
            if (!error && data) return json({ ok: true, url: `/api/public/cms/image/${data}` });
            lastError = error?.message ?? 'image id was not returned';
            if (!/unauthorized/i.test(lastError)) break;
          }
          console.error('CMS image database error:', lastError);
          return json({ ok: false, error: `image save failed: ${lastError || 'unknown error'}` }, { status: 500 });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'unknown server error';
          console.error('CMS image server error:', error);
          return json({ ok: false, error: `image save failed: ${message}` }, { status: 500 });
        }
      },
    },
  },
});
