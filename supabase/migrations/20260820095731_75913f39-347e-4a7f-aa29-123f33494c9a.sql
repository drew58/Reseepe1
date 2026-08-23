ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD ($)';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarded boolean NOT NULL DEFAULT false;
UPDATE public.profiles SET onboarded = true WHERE preferences_set = true AND onboarded = false;

ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS post_type text NOT NULL DEFAULT 'post';
UPDATE public.recipes SET post_type = CASE WHEN is_reel THEN 'reel' ELSE 'post' END
WHERE post_type IS DISTINCT FROM (CASE WHEN is_reel THEN 'reel' ELSE 'post' END);