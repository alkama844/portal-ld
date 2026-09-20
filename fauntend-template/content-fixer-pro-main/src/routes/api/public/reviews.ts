import { createFileRoute } from '@tanstack/react-router';

type Review = {
  id: string;
  name: string;
  stars: number;
  text: string;
  photo: string;
  at: string;
};

const PAGE = 'drselim:reviews';

function clean(value: unknown, max: number): string {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .trim()
    .slice(0, max);
}

export const Route = createFileRoute('/api/public/reviews')({
  server: {
    handlers: {
      GET: async () => {
        const { json } = await import('@/lib/cms.server');
        const { cmsDb } = await import('@/lib/cms-db.server');
        const { data, error } = await cmsDb()
          .from('site_content')
          .select('content_key, value')
          .eq('page', PAGE);
        if (error) return json({ reviews: [], error: error.message }, { status: 500 });

        const reviews: Review[] = [];
        for (const row of (data ?? []) as { content_key: string; value: string }[]) {
          try {
            const parsed = JSON.parse(row.value) as Partial<Review> & { deleted?: boolean };
            if (!parsed || parsed.deleted === true || typeof parsed.text !== 'string') continue;
            reviews.push({
              id: row.content_key,
              name: clean(parsed.name, 80) || 'একজন রোগী',
              stars: Math.min(5, Math.max(1, Number(parsed.stars) || 5)),
              text: clean(parsed.text, 2000),
              photo: typeof parsed.photo === 'string' ? parsed.photo : '',
              at: typeof parsed.at === 'string' ? parsed.at : '',
            });
          } catch {
            /* skip malformed rows */
          }
        }
        reviews.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
        return json({ reviews }, { headers: { 'cache-control': 'no-store, max-age=0' } });
      },

      POST: async ({ request }) => {
        const { json } = await import('@/lib/cms.server');
        const { cmsDb, cmsDbSecrets } = await import('@/lib/cms-db.server');

        let name = '';
        let text = '';
        let stars = 5;
        let file: File | null = null;

        try {
          const contentType = request.headers.get('content-type') ?? '';
          if (contentType.includes('multipart/form-data')) {
            const form = await request.formData();
            name = clean(form.get('name'), 80);
            text = clean(form.get('text'), 2000);
            stars = Number(form.get('stars')) || 0;
            const upload = form.get('photo');
            if (upload instanceof File && upload.size > 0) file = upload;
          } else {
            const body = (await request.json()) as { name?: string; text?: string; stars?: number };
            name = clean(body.name, 80);
            text = clean(body.text, 2000);
            stars = Number(body.stars) || 0;
          }
        } catch {
          return json({ ok: false, error: 'bad request' }, { status: 400 });
        }

        if (text.length < 3) return json({ ok: false, error: 'রিভিউ লিখুন' }, { status: 400 });
        if (!(stars >= 1 && stars <= 5))
          return json({ ok: false, error: 'স্টার রেটিং দিন' }, { status: 400 });

        const secrets = cmsDbSecrets();
        const db = cmsDb();
        let photo = '';

        if (file) {
          if (!file.type.startsWith('image/'))
            return json({ ok: false, error: 'শুধু ছবি আপলোড করুন' }, { status: 400 });
          if (file.size > 4 * 1024 * 1024)
            return json({ ok: false, error: 'ছবি ৪MB এর কম হতে হবে' }, { status: 400 });
          const base64 = Buffer.from(await file.arrayBuffer()).toString('base64');
          for (const secret of secrets) {
            const { data, error } = await db.rpc('cms_save_image', {
              p_secret: secret,
              p_mime: file.type,
              p_data: base64,
            });
            if (!error && data) {
              photo = `/api/public/cms/image/${data}`;
              break;
            }
            if (error && !/unauthorized/i.test(error.message)) break;
          }
        }

        const at = new Date().toISOString();
        const token = crypto.randomUUID();
        const review = {
          name: name || 'একজন রোগী',
          stars: Math.round(stars),
          text,
          photo,
          at,
        };
        const key = `review:${at}:${crypto.randomUUID()}`;

        let lastError = '';
        for (const secret of secrets) {
          const { error } = await db.rpc('cms_save_content', {
            p_secret: secret,
            p_page: PAGE,
            p_items: [{ key, type: 'text', value: JSON.stringify({ ...review, token }) }],
          });
          if (!error) return json({ ok: true, token, review: { id: key, ...review } });
          lastError = error.message;
          if (!/unauthorized/i.test(lastError)) break;
        }
        console.error('Review save error:', lastError);
        return json({ ok: false, error: 'রিভিউ সেভ করা যায়নি' }, { status: 500 });
      },

      DELETE: async ({ request }) => {
        const { json, isAuthed } = await import('@/lib/cms.server');
        const { cmsDb, cmsDbSecrets } = await import('@/lib/cms-db.server');

        let id = '';
        let token = '';
        try {
          const body = (await request.json()) as { id?: string; token?: string };
          id = clean(body.id, 500);
          token = clean(body.token, 100);
        } catch {
          return json({ ok: false, error: 'bad request' }, { status: 400 });
        }
        const admin = isAuthed(request);
        if (!id) return json({ ok: false, error: 'unauthorized' }, { status: 403 });
        if (!token && !admin) return json({ ok: false, error: 'unauthorized' }, { status: 403 });

        const db = cmsDb();
        const { data, error } = await db
          .from('site_content')
          .select('value')
          .eq('page', PAGE)
          .eq('content_key', id)
          .maybeSingle();
        if (error) return json({ ok: false, error: error.message }, { status: 500 });
        if (!data) return json({ ok: false, error: 'রিভিউ পাওয়া যায়নি' }, { status: 404 });

        if (!admin) {
          let saved: { token?: string } = {};
          try {
            saved = JSON.parse((data as { value: string }).value) as { token?: string };
          } catch {
            return json({ ok: false, error: 'unauthorized' }, { status: 403 });
          }
          if (!saved.token || saved.token !== token)
            return json({ ok: false, error: 'এই রিভিউ মুছার অনুমতি নেই' }, { status: 403 });
        }

        let lastError = '';
        for (const secret of cmsDbSecrets()) {
          const { error: delError } = await db.rpc('cms_save_content', {
            p_secret: secret,
            p_page: PAGE,
            p_items: [{ key: id, type: 'text', value: JSON.stringify({ deleted: true }) }],
          });
          if (!delError) return json({ ok: true });
          lastError = delError.message;
          if (!/unauthorized/i.test(lastError)) break;
        }
        console.error('Review delete error:', lastError);
        return json({ ok: false, error: 'রিভিউ মুছা যায়নি' }, { status: 500 });
      },
    },
  },
});
