-- Never roll back auth.users because optional application profile provisioning fails.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  selected_role text;
  selected_username text;
  display_name_value text;
BEGIN
  selected_role := CASE
    WHEN NEW.raw_user_meta_data->>'role' IN ('creator', 'admin') THEN NEW.raw_user_meta_data->>'role'
    ELSE 'user'
  END;
  selected_username := NULLIF(lower(trim(NEW.raw_user_meta_data->>'username')), '');
  display_name_value := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'display_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'name', ''),
    NEW.email
  );

  BEGIN
    INSERT INTO public.profiles (user_id, display_name, username, role)
    VALUES (NEW.id, display_name_value, selected_username, selected_role)
    ON CONFLICT (user_id) DO UPDATE SET
      display_name = COALESCE(EXCLUDED.display_name, public.profiles.display_name),
      username = COALESCE(EXCLUDED.username, public.profiles.username),
      role = EXCLUDED.role;
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      INSERT INTO public.profiles (user_id, display_name, role)
      VALUES (NEW.id, display_name_value, selected_role)
      ON CONFLICT (user_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END;

  BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, selected_role::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Repair the profile after OAuth has created the auth user.
CREATE OR REPLACE FUNCTION public.ensure_google_user_profile()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  auth_user auth.users;
BEGIN
  SELECT * INTO auth_user FROM auth.users WHERE id = auth.uid();
  IF auth_user.id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO public.profiles (user_id, display_name, role)
  VALUES (
    auth_user.id,
    COALESCE(NULLIF(auth_user.raw_user_meta_data->>'full_name', ''), NULLIF(auth_user.raw_user_meta_data->>'name', ''), auth_user.email),
    'user'
  )
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_google_user_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_google_user_profile() TO authenticated;