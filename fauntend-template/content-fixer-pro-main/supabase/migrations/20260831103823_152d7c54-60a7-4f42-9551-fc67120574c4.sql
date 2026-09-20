CREATE TABLE public.site_content (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page text NOT NULL,
  content_key text NOT NULL,
  content_type text NOT NULL DEFAULT 'text',
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (page, content_key)
);

GRANT SELECT ON public.site_content TO anon;
GRANT SELECT ON public.site_content TO authenticated;
GRANT ALL ON public.site_content TO service_role;

ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read site content"
ON public.site_content FOR SELECT
TO anon, authenticated
USING (true);