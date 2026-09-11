-- Promote a Google-created normal user only after their profile is complete.
CREATE OR REPLACE FUNCTION public.promote_to_creator()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_profile public.profiles;
  provider_metadata jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT raw_app_meta_data INTO provider_metadata
  FROM auth.users
  WHERE id = auth.uid();

  IF COALESCE(provider_metadata->>'provider', '') <> 'google'
    AND NOT (COALESCE(provider_metadata->'providers', '[]'::jsonb) ? 'google') THEN
    RAISE EXCEPTION 'Only Google accounts can use this promotion';
  END IF;

  SELECT * INTO current_profile
  FROM public.profiles
  WHERE user_id = auth.uid();

  IF current_profile.user_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF current_profile.role <> 'user' THEN
    RAISE EXCEPTION 'This account is already a creator';
  END IF;

  IF NULLIF(trim(current_profile.display_name), '') IS NULL
    OR NULLIF(trim(current_profile.username), '') IS NULL
    OR NULLIF(trim(current_profile.bio), '') IS NULL
    OR current_profile.avatar_url IS NULL THEN
    RAISE EXCEPTION 'Complete your profile photo, name, username, and bio first';
  END IF;

  UPDATE public.profiles
  SET role = 'creator', updated_at = now()
  WHERE user_id = auth.uid();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), 'creator')
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.promote_to_creator() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.promote_to_creator() TO authenticated;