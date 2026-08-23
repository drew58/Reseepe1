CREATE TABLE IF NOT EXISTS public.featured_creators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL,
  username text NOT NULL UNIQUE,
  avatar_url text,
  bio text,
  country text,
  verified boolean NOT NULL DEFAULT false,
  is_premium boolean NOT NULL DEFAULT false,
  followers_seed int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.featured_creators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Featured creators viewable by everyone"
ON public.featured_creators FOR SELECT USING (true);

CREATE POLICY "Admins manage featured creators"
ON public.featured_creators FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.featured_creators REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.featured_creators;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;