-- Final creator promotion checks: Google identity, normal-user role, complete profile, and unique username.
CREATE OR REPLACE FUNCTION public.promote_to_creator()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  provider_metadata jsonb;
  profile_user_id uuid;
  profile_role text;
  profile_display_name text;
  profile_username text;
  profile_bio text;
  profile_avatar_url text;
  username_owner uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  SELECT raw_app_meta_data INTO provider_metadata FROM auth.users WHERE id = auth.uid();
  IF COALESCE(provider_metadata->>'provider', '') <> 'google'
    AND NOT (COALESCE(provider_metadata->'providers', '[]'::jsonb) ? 'google') THEN
    RAISE EXCEPTION 'Only Google accounts can use this promotion';
  END IF;

  SELECT user_id, role, display_name, username, bio, avatar_url
  INTO profile_user_id, profile_role, profile_display_name, profile_username, profile_bio, profile_avatar_url
  FROM public.profiles WHERE user_id = auth.uid();

  IF profile_user_id IS NULL THEN RAISE EXCEPTION 'Profile not found'; END IF;
  IF COALESCE(profile_role, 'user') <> 'user' THEN RAISE EXCEPTION 'This account is already a creator'; END IF;
  IF NULLIF(trim(profile_display_name), '') IS NULL
    OR NULLIF(trim(profile_username), '') IS NULL
    OR NULLIF(trim(profile_bio), '') IS NULL
    OR profile_avatar_url IS NULL THEN
    RAISE EXCEPTION 'Complete your profile photo, name, username, and bio first';
  END IF;

  SELECT user_id INTO username_owner
  FROM public.profiles
  WHERE lower(username) = lower(trim(profile_username))
    AND user_id <> auth.uid()
  LIMIT 1;
  IF username_owner IS NOT NULL THEN RAISE EXCEPTION 'That username is already taken'; END IF;

  UPDATE public.profiles SET role = 'creator', updated_at = now() WHERE user_id = auth.uid();
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'creator')
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.promote_to_creator() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.promote_to_creator() TO authenticated;