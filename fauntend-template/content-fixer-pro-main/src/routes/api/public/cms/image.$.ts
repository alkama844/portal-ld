import { createFileRoute } from '@tanstack/react-router';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const Route = createFileRoute('/api/public/cms/image/$')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const path = String((params as { _splat?: string })._splat ?? '').replace(/^\/+/, '');
        if (!path || path.includes('..')) return new Response('Not found', { status: 404 });

        const headers = {
          'Cache-Control': 'public, max-age=31536000, immutable',
        };

        if (UUID.test(path)) {
          const { cmsDb } = await import('@/lib/cms-db.server');
          const { data, error } = await cmsDb()
            .from('site_images')
            .select('mime, data')
            .eq('id', path)
            .maybeSingle();
          if (error || !data) return new Response('Not found', { status: 404 });
          const row = data as { mime: string; data: string };
          return new Response(Buffer.from(row.data, 'base64'), {
            headers: { ...headers, 'Content-Type': row.mime || 'image/jpeg' },
          });
        }

        // Legacy images stored in the private bucket (only available on Lovable hosting).
        try {
          const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
          const { data, error } = await supabaseAdmin.storage.from('site-images').download(path);
          if (error || !data) return new Response('Not found', { status: 404 });
          return new Response(await data.arrayBuffer(), {
            headers: { ...headers, 'Content-Type': data.type || 'image/jpeg' },
          });
        } catch {
          return new Response('Not found', { status: 404 });
        }
      },
    },
  },
});
