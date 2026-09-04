-- Sync the role selected before Google OAuth without allowing clients to
-- write arbitrary rows into user_roles.
CREATE OR REPLACE FUNCTION public.sync_google_user_state(
  requested_role text,
  requested_username text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  selected_role public.app_role;
  selected_username text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF requested_role NOT IN ('user', 'creator') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  selected_role := requested_role::public.app_role;
  selected_username := NULLIF(lower(trim(requested_username)), '');

  INSERT INTO public.profiles (user_id, display_name, username, role)
  SELECT auth.uid(), COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', email), selected_username, selected_role::text
  FROM auth.users
  WHERE id = auth.uid()
  ON CONFLICT (user_id) DO UPDATE SET
    username = COALESCE(EXCLUDED.username, public.profiles.username),
    role = EXCLUDED.role;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), selected_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_google_user_state(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_google_user_state(text, text) TO authenticated;