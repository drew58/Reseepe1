-- Public creator discovery for the home feed and subscriptions page.
CREATE OR REPLACE FUNCTION public.discover_creators(search text DEFAULT NULL, limit_count integer DEFAULT 50)
RETURNS TABLE (
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  bio text,
  follower_count bigint,
  recipe_count bigint,
  is_trending boolean,
  is_premium boolean,
  verified boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.user_id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.bio,
    (SELECT count(*) FROM public.follows f WHERE f.following_id = p.user_id),
    (SELECT count(*) FROM public.recipes r WHERE r.creator_id = p.user_id),
    EXISTS (
      SELECT 1 FROM public.recipes recent
      WHERE recent.creator_id = p.user_id
        AND recent.created_at > now() - interval '30 days'
    ),
    p.subscription_tier <> 'free',
    COALESCE(fc.verified, false)
  FROM public.profiles p
  INNER JOIN public.user_roles ur
    ON ur.user_id = p.user_id
   AND ur.role = 'creator'
  LEFT JOIN public.featured_creators fc ON fc.username = p.username
  WHERE p.username IS NOT NULL
    AND (search IS NULL OR p.username ILIKE '%' || search || '%' OR p.display_name ILIKE '%' || search || '%')
  ORDER BY EXISTS (
    SELECT 1 FROM public.recipes recent
    WHERE recent.creator_id = p.user_id
      AND recent.created_at > now() - interval '30 days'
  ) DESC,
  (SELECT count(*) FROM public.recipes r WHERE r.creator_id = p.user_id) DESC,
  p.created_at DESC
  LIMIT GREATEST(1, LEAST(limit_count, 100));
$$;

GRANT EXECUTE ON FUNCTION public.discover_creators(text, integer) TO anon, authenticated;