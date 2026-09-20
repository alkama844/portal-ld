CREATE TABLE public.cms_secret (
  id int PRIMARY KEY CHECK (id = 1),
  secret_sha text NOT NULL
);
ALTER TABLE public.cms_secret ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.cms_secret TO service_role;
INSERT INTO public.cms_secret (id, secret_sha)
VALUES (1, 'e5fd81f62842611fb26fb45d27b109779c8b37fc35452417f2e8674884b2c629');

CREATE TABLE public.site_images (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mime text NOT NULL,
  data text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_images TO anon;
GRANT SELECT ON public.site_images TO authenticated;
GRANT ALL ON public.site_images TO service_role;
ALTER TABLE public.site_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view site images"
ON public.site_images FOR SELECT
TO anon, authenticated
USING (true);

CREATE OR REPLACE FUNCTION public.cms_secret_ok(p_secret text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.cms_secret
    WHERE id = 1
      AND secret_sha = encode(sha256(convert_to(coalesce(p_secret, ''), 'UTF8')), 'hex')
  );
$$;

CREATE OR REPLACE FUNCTION public.cms_save_content(p_secret text, p_page text, p_items jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  IF NOT public.cms_secret_ok(p_secret) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  IF coalesce(p_page, '') = '' THEN
    RAISE EXCEPTION 'page required';
  END IF;

  WITH rows AS (
    SELECT left(item->>'key', 500) AS content_key,
           coalesce(item->>'type', 'text') AS content_type,
           left(coalesce(item->>'value', ''), 20000) AS value
    FROM jsonb_array_elements(p_items) AS item
    WHERE item->>'key' IS NOT NULL
    LIMIT 500
  ), ins AS (
    INSERT INTO public.site_content (page, content_key, content_type, value, updated_at)
    SELECT left(p_page, 200), content_key, content_type, value, now() FROM rows
    ON CONFLICT (page, content_key)
    DO UPDATE SET value = EXCLUDED.value,
                  content_type = EXCLUDED.content_type,
                  updated_at = now()
    RETURNING 1
  )
  SELECT count(*) INTO n FROM ins;
  RETURN n;
END;
$$;

CREATE OR REPLACE FUNCTION public.cms_save_image(p_secret text, p_mime text, p_data text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  IF NOT public.cms_secret_ok(p_secret) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  INSERT INTO public.site_images (mime, data)
  VALUES (coalesce(p_mime, 'image/jpeg'), p_data)
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.cms_secret_ok(text) FROM public;
REVOKE ALL ON FUNCTION public.cms_save_content(text, text, jsonb) FROM public;
REVOKE ALL ON FUNCTION public.cms_save_image(text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.cms_save_content(text, text, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cms_save_image(text, text, text) TO anon, authenticated;