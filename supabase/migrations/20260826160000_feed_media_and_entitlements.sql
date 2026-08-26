-- Return one oldest comment per recipe in one query for HomeFeed previews.
CREATE OR REPLACE FUNCTION public.get_first_comments(recipe_ids uuid[])
RETURNS TABLE (
  recipe_id uuid,
  id uuid,
  content text,
  created_at timestamptz,
  user_id uuid,
  display_name text,
  avatar_url text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT DISTINCT ON (c.recipe_id)
    c.recipe_id,
    c.id,
    c.content,
    c.created_at,
    c.user_id,
    p.display_name,
    p.avatar_url
  FROM public.comments AS c
  LEFT JOIN public.profiles AS p ON p.user_id = c.user_id
  WHERE c.recipe_id = ANY(recipe_ids)
  ORDER BY c.recipe_id, c.created_at ASC, c.id ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_first_comments(uuid[]) TO anon, authenticated;

-- Persist the storage object path so media cleanup does not need to parse public URLs.
ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS media_path text;

-- Premium visibility is metadata only until a payment provider verifies an entitlement.
ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS access_tier text NOT NULL DEFAULT 'free'
  CHECK (access_tier IN ('free', 'premium', 'pro'));

CREATE INDEX IF NOT EXISTS recipes_feed_page_idx
  ON public.recipes (post_type, created_at DESC, id DESC);

-- Webhook-managed billing state. Clients can read only their own rows; no client write policy exists.
CREATE TABLE IF NOT EXISTS public.billing_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_customer_id text,
  provider_subscription_id text UNIQUE,
  tier text NOT NULL CHECK (tier IN ('free', 'premium', 'pro')),
  status text NOT NULL CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'expired')),
  current_period_ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.billing_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own billing subscription" ON public.billing_subscriptions;
CREATE POLICY "Users can view own billing subscription"
  ON public.billing_subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- This function is intentionally not scheduled here: invoke it from a trusted cron job
-- or an Edge Function using the service role. It removes expired rows and their objects.
CREATE OR REPLACE FUNCTION public.cleanup_expired_stories()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM storage.objects
  WHERE bucket_id = 'videos'
    AND name IN (
      SELECT media_path
      FROM public.stories
      WHERE expires_at <= now() AND media_path IS NOT NULL
    );

  DELETE FROM public.stories WHERE expires_at <= now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_expired_stories() FROM PUBLIC, anon, authenticated;
